import { useCallback, useMemo, useRef, useState } from 'react';
import { api, errorMessage, type ImportFila } from '../api';
import { useCatalogos } from '../context/CatalogosContext';
import { normalize } from '../lib/format';
import { Modal, Button, Badge, ErrorBanner, Spinner } from './ui';

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_FILAS_POR_ENVIO = 500; // límite del endpoint /lineas/importar

interface ImportRow extends ImportFila {
  /** Número de renglón en el archivo (el 1 es el encabezado). */
  linea: number;
  errores: string[];
}

interface Resultado {
  total: number;
  creadas: number;
  /** Errores que devolvió el servidor, con el renglón del archivo. */
  errores: { linea: number; numero: string | null; mensajes: string[] }[];
}

// ─── CSV ──────────────────────────────────────────────────────────────────────
/** Parser CSV mínimo (RFC 4180): comillas dobles, comas/punto y coma/tabulador dentro de comillas y saltos de línea. */
function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, '');
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? '';
  const sep = [';', '\t', ','].sort((a, b) => firstLine.split(b).length - firstLine.split(a).length)[0];

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (quoted) {
      if (c === '"' && clean[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && clean[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some(f => f.trim() !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some(f => f.trim() !== '')) rows.push(row);
  return rows;
}

const ALIASES: Record<keyof ImportFila, string[]> = {
  numero: ['numero', 'number', 'telefono', 'linea'],
  cliente: ['cliente', 'client', 'empresa'],
  status: ['status', 'estado'],
  coordinador: ['coordinador', 'coordinator'],
  programador: ['programador', 'developer'],
  tenencia: ['tenencia', 'tenencia_sim', 'tenencia_sim_card'],
  descripcionUso: ['descripcion', 'descripcion_uso', 'descripcionuso', 'uso'],
};

function toRows(csv: string[][]): ImportRow[] {
  if (csv.length < 2) return [];
  const headers = csv[0].map(h => normalize(h).replace(/\s+/g, '_'));
  const col = (key: keyof ImportFila) => headers.findIndex(h => ALIASES[key].includes(h));
  const idx = Object.fromEntries((Object.keys(ALIASES) as (keyof ImportFila)[]).map(k => [k, col(k)])) as Record<keyof ImportFila, number>;

  return csv.slice(1).map((cells, i) => {
    const get = (k: keyof ImportFila) => (idx[k] >= 0 ? (cells[idx[k]] ?? '').trim() : '');
    return {
      linea: i + 2,
      numero: get('numero'),
      cliente: get('cliente'),
      status: get('status'),
      coordinador: get('coordinador'),
      programador: get('programador'),
      tenencia: get('tenencia'),
      descripcionUso: get('descripcionUso'),
      errores: [],
    };
  });
}

// ─── Componente ───────────────────────────────────────────────────────────────
export default function ImportModal({ open, onClose, onDone }: {
  open: boolean;
  onClose: () => void;
  /** Se llama al cerrar si se importó al menos una línea (para recargar la lista). */
  onDone: (creadas: number) => void;
}) {
  const { clientes, empleados, status, tenencias } = useCatalogos();
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Nombre normalizado de cada catálogo, para avisar en la vista previa antes de enviar.
  const index = useMemo(() => {
    const set = (items: { nombre: string }[]) => new Set(items.map(i => normalize(i.nombre)));
    return { clientes: set(clientes), empleados: set(empleados), status: set(status), tenencias: set(tenencias) };
  }, [clientes, empleados, status, tenencias]);

  const validar = useCallback((parsed: ImportRow[]): ImportRow[] => {
    const vistos = new Set<string>();
    return parsed.map(r => {
      const errores: string[] = [];
      if (!r.numero) errores.push('El número es requerido.');
      else if (r.numero.length > 20) errores.push('El número no puede superar 20 caracteres.');
      else if (vistos.has(r.numero)) errores.push('El número está repetido en el archivo.');
      else vistos.add(r.numero);

      if (!r.cliente) errores.push('El cliente es requerido.');
      else if (!index.clientes.has(normalize(r.cliente))) errores.push(`No existe el cliente '${r.cliente}'.`);
      if (r.status && !index.status.has(normalize(r.status))) errores.push(`No existe el status '${r.status}'.`);
      if (r.coordinador && !index.empleados.has(normalize(r.coordinador))) errores.push(`No existe el coordinador '${r.coordinador}'.`);
      if (r.programador && !index.empleados.has(normalize(r.programador))) errores.push(`No existe el programador '${r.programador}'.`);
      if (r.tenencia && !index.tenencias.has(normalize(r.tenencia))) errores.push(`No existe la tenencia '${r.tenencia}'.`);
      return { ...r, errores };
    });
  }, [index]);

  const reset = () => {
    setStep('upload'); setRows([]); setResultado(null); setFileName(''); setError(''); setImporting(false);
  };

  const handleClose = () => {
    if (importing) return;
    const creadas = resultado?.creadas ?? 0;
    reset();
    onClose();
    if (creadas > 0) onDone(creadas);
  };

  const processFile = (file: File) => {
    setError('');
    if (!/\.(csv|txt)$/i.test(file.name)) { setError('Solo se aceptan archivos CSV (.csv o .txt)'); return; }
    if (file.size > MAX_BYTES) { setError('El archivo supera el máximo de 5 MB.'); return; }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = e => {
      const parsed = toRows(parseCsv(String(e.target?.result ?? '')));
      if (parsed.length === 0) {
        setError('El archivo no contiene registros o no tiene fila de encabezado (numero, cliente, ...).');
        return;
      }
      setRows(validar(parsed));
      setStep('preview');
    };
    reader.readAsText(file, 'UTF-8');
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleDownloadTemplate = () => {
    const c = clientes[0]?.nombre ?? 'Nombre del cliente';
    const s = status[0]?.nombre ?? 'En desarrollo';
    const coord = empleados[0]?.nombre ?? '';
    const t = tenencias[0]?.nombre ?? '';
    const csv = `numero,cliente,status,coordinador,programador,tenencia,descripcion\r\n+52 55 1234 5678,${c},${s},${coord},,${t},Atención al cliente\r\n+52 33 9876 5432,${c},,,,,`;
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_importacion_lineas.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const validas = rows.filter(r => r.errores.length === 0);
  const invalidas = rows.filter(r => r.errores.length > 0);

  const handleImport = async () => {
    setImporting(true);
    setError('');
    const acumulado: Resultado = { total: validas.length, creadas: 0, errores: [] };
    try {
      for (let i = 0; i < validas.length; i += MAX_FILAS_POR_ENVIO) {
        const lote = validas.slice(i, i + MAX_FILAS_POR_ENVIO);
        const res = await api.lineas.importar(lote.map(({ linea: _l, errores: _e, ...fila }) => fila));
        acumulado.creadas += res.creadas;
        for (const err of res.errores) {
          acumulado.errores.push({ linea: lote[err.fila - 1].linea, numero: err.numero, mensajes: err.mensajes });
        }
      }
      setResultado(acumulado);
      setStep('result');
    } catch (e) {
      // Si un lote falló a mitad, lo ya creado se conserva: informarlo evita reimportar duplicados.
      setError(acumulado.creadas > 0
        ? `${errorMessage(e)} Se alcanzaron a crear ${acumulado.creadas} línea(s) antes del error; revisa la lista antes de reintentar.`
        : errorMessage(e));
    } finally {
      setImporting(false);
    }
  };

  const footer =
    step === 'upload' ? (
      <>
        <Button variant="outline" onClick={handleClose}>Cancelar</Button>
        <Button variant="outline" onClick={handleDownloadTemplate}><DownloadIcon /> Descargar plantilla</Button>
      </>
    ) : step === 'preview' ? (
      <>
        <Button variant="outline" onClick={reset} disabled={importing}>← Volver</Button>
        <Button variant="primary" disabled={validas.length === 0 || importing} onClick={handleImport}>
          {importing && <Spinner />}
          {importing ? 'Importando...' : `Importar ${validas.length} línea${validas.length !== 1 ? 's' : ''}`}
        </Button>
      </>
    ) : (
      <Button variant="primary" onClick={handleClose}>Cerrar</Button>
    );

  return (
    <Modal title="Importación masiva de líneas" open={open} onClose={handleClose} footer={footer} wide={step !== 'upload'}>
      {step === 'upload' && (
        <div className="space-y-4">
          <div className="bg-[#e8f7f9] border border-[#3FB6C4]/30 rounded-lg p-4 text-sm text-[#2fa0ad]">
            <p className="font-semibold mb-1">Formato requerido (CSV)</p>
            <p className="text-xs leading-relaxed">
              Encabezado en la primera fila. Columnas: <code className="font-mono bg-white/60 px-1 rounded">numero, cliente, status, coordinador, programador, tenencia, descripcion</code>.
              Solo <strong>numero</strong> y <strong>cliente</strong> son obligatorias. Cliente, status, coordinador, programador y tenencia deben existir con el mismo nombre que en el sistema.
            </p>
          </div>

          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
              dragging ? 'border-[#3FB6C4] bg-[#e8f7f9]' : 'border-[#E2E8F0] bg-[#F8F9FA] hover:border-[#3FB6C4] hover:bg-[#e8f7f9]/40'
            }`}
          >
            <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileChange} />
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center shadow-sm">
                <UploadIcon />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#374151]">{dragging ? 'Suelta el archivo aquí' : 'Arrastra tu archivo CSV aquí'}</p>
                <p className="text-xs text-[#94A3B8] mt-1">o haz clic para seleccionar · Máx. 5 MB</p>
              </div>
            </div>
          </div>

          {error && <ErrorBanner message={error} />}

          <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
            <InfoIcon />
            ¿Primera vez? Descarga la plantilla con el botón de abajo y llénala con tus datos.
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-4">
          {error && <ErrorBanner message={error} />}

          <div className="flex items-center gap-3">
            <div className="flex-1 bg-[#DCFCE7] border border-[#16A34A]/20 rounded-lg px-4 py-2.5 text-center">
              <div className="text-xl font-bold text-[#15803D]">{validas.length}</div>
              <div className="text-xs text-[#16A34A]">Listas para importar</div>
            </div>
            {invalidas.length > 0 && (
              <div className="flex-1 bg-[#FEE2E2] border border-[#DC2626]/20 rounded-lg px-4 py-2.5 text-center">
                <div className="text-xl font-bold text-[#B91C1C]">{invalidas.length}</div>
                <div className="text-xs text-[#DC2626]">Con errores (se omitirán)</div>
              </div>
            )}
            <div className="flex-1 bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg px-4 py-2.5 text-center">
              <div className="text-xl font-bold text-[#374151]">{rows.length}</div>
              <div className="text-xs text-[#64748B]">Total en archivo</div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#64748B] bg-[#F8F9FA] rounded-lg px-3 py-2">
            <CsvIcon />
            <span className="font-medium">{fileName}</span>
            <button onClick={reset} className="ml-auto text-[#3FB6C4] hover:underline">Cambiar archivo</button>
          </div>

          <div className="border border-[#E2E8F0] rounded-lg overflow-hidden max-h-72 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[#F8F9FA] border-b border-[#E2E8F0]">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold text-[#64748B]">Fila</th>
                  <th className="text-left px-3 py-2 font-semibold text-[#64748B]">Número</th>
                  <th className="text-left px-3 py-2 font-semibold text-[#64748B]">Cliente</th>
                  <th className="text-left px-3 py-2 font-semibold text-[#64748B]">Status</th>
                  <th className="text-left px-3 py-2 font-semibold text-[#64748B]">Tenencia</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {rows.map(row => (
                  <tr key={row.linea} className={row.errores.length === 0 ? 'bg-white' : 'bg-[#FFF7F7]'}>
                    <td className="px-3 py-2 text-[#94A3B8]">{row.linea}</td>
                    <td className="px-3 py-2 font-mono text-[#1A202C]">{row.numero || <span className="text-[#DC2626]">—</span>}</td>
                    <td className="px-3 py-2 text-[#374151]">{row.cliente || <span className="text-[#DC2626]">—</span>}</td>
                    <td className="px-3 py-2 text-[#374151]">{row.status || <span className="text-[#94A3B8]">—</span>}</td>
                    <td className="px-3 py-2 text-[#64748B]">{row.tenencia || <span className="text-[#94A3B8]">—</span>}</td>
                    <td className="px-3 py-2">
                      {row.errores.length === 0 ? (
                        <Badge variant="success">OK</Badge>
                      ) : (
                        <span title={row.errores.join(' · ')} className="inline-flex items-center gap-1 text-[#B91C1C] cursor-help">
                          <AlertIcon />
                          <span>{row.errores[0]}{row.errores.length > 1 ? ` (+${row.errores.length - 1})` : ''}</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {invalidas.length > 0 && (
            <p className="text-xs text-[#94A3B8]">
              Las filas con errores no se importarán. Corrígelas en el archivo y vuelve a subirlo si las necesitas.
            </p>
          )}
        </div>
      )}

      {step === 'result' && resultado && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-[#DCFCE7] border border-[#16A34A]/20 rounded-lg px-4 py-3 text-center">
              <div className="text-2xl font-bold text-[#15803D]">{resultado.creadas}</div>
              <div className="text-xs text-[#16A34A]">Línea{resultado.creadas !== 1 ? 's' : ''} creada{resultado.creadas !== 1 ? 's' : ''}</div>
            </div>
            {resultado.errores.length > 0 && (
              <div className="flex-1 bg-[#FEE2E2] border border-[#DC2626]/20 rounded-lg px-4 py-3 text-center">
                <div className="text-2xl font-bold text-[#B91C1C]">{resultado.errores.length}</div>
                <div className="text-xs text-[#DC2626]">Rechazada{resultado.errores.length !== 1 ? 's' : ''} por el servidor</div>
              </div>
            )}
          </div>

          {resultado.errores.length > 0 && (
            <div className="border border-[#E2E8F0] rounded-lg overflow-hidden max-h-64 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-[#F8F9FA] border-b border-[#E2E8F0]">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold text-[#64748B]">Fila</th>
                    <th className="text-left px-3 py-2 font-semibold text-[#64748B]">Número</th>
                    <th className="text-left px-3 py-2 font-semibold text-[#64748B]">Motivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {resultado.errores.map(e => (
                    <tr key={e.linea} className="bg-[#FFF7F7]">
                      <td className="px-3 py-2 text-[#94A3B8]">{e.linea}</td>
                      <td className="px-3 py-2 font-mono text-[#1A202C]">{e.numero || '—'}</td>
                      <td className="px-3 py-2 text-[#B91C1C]">{e.mensajes.join(' ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

// ─── Iconos ───────────────────────────────────────────────────────────────────
const UploadIcon = () => (
  <svg className="w-6 h-6 text-[#94A3B8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const AlertIcon = () => (
  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const InfoIcon = () => (
  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CsvIcon = () => (
  <svg className="w-3.5 h-3.5 text-[#3FB6C4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);
