import { useCallback, useMemo, useRef, useState } from "react";
import {
  api,
  errorMessage,
  type ImportConnectly,
  type ImportCreado,
  type ImportFila,
  type ImportSmart,
} from "../api";
import { useCatalogos } from "../context/CatalogosContext";
import { normalize } from "../lib/format";
import { Modal, Button, Badge, ErrorBanner, Spinner } from "./ui";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_FILAS_POR_ENVIO = 500; // límite del endpoint /lineas/importar

interface ImportRow extends ImportFila {
  /** Número de renglón en el archivo (el 1 es el encabezado, si no hay comentarios antes). */
  linea: number;
  errores: string[];
  /** Nombres de catálogo que no existen y el servidor creará ("Cliente: Acme"). */
  nuevos: string[];
}

interface Resultado {
  total: number;
  creadas: number;
  /** Errores que devolvió el servidor, con el renglón del archivo. */
  errores: { linea: number; numero: string | null; mensajes: string[] }[];
  catalogosCreados: ImportCreado[];
}

// ─── CSV ──────────────────────────────────────────────────────────────────────
const esComentario = (texto: string) => texto.trimStart().startsWith("#");

/**
 * Parser CSV mínimo (RFC 4180): comillas dobles, separadores y saltos de línea dentro de comillas.
 * Devuelve cada registro con el renglón del archivo donde empieza.
 */
function parseCsv(text: string): { cells: string[]; line: number }[] {
  const clean = text.replace(/^﻿/, "");
  // El separador se deduce de la primera línea que no es comentario (el encabezado).
  const headerLine =
    clean.split(/\r?\n/).find((l) => l.trim() !== "" && !esComentario(l)) ?? "";
  const sep = [";", "\t", ","].sort(
    (a, b) => headerLine.split(b).length - headerLine.split(a).length,
  )[0];

  const rows: { cells: string[]; line: number }[] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let line = 1;
  let rowStart = 1;

  const pushRow = () => {
    row.push(field);
    field = "";
    if (row.some((f) => f.trim() !== ""))
      rows.push({ cells: row, line: rowStart });
    row = [];
  };

  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (c === "\n" || (c === "\r" && clean[i + 1] !== "\n")) line++;
    if (quoted) {
      if (c === '"' && clean[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && clean[i + 1] === "\n") {
        i++;
        line++;
      }
      pushRow();
      rowStart = line;
    } else field += c;
  }
  pushRow();
  return rows;
}

type GeneralKey = Exclude<keyof ImportFila, "connectly" | "smart">;

const ALIASES: Record<GeneralKey, string[]> = {
  numero: ["numero", "number", "telefono", "linea"],
  cliente: ["cliente", "client", "empresa"],
  status: ["status", "estado"],
  coordinador: ["coordinador", "coordinator"],
  programador: ["programador", "developer"],
  tenencia: ["tenencia", "tenencia_sim", "tenencia_sim_card"],
  descripcionUso: ["descripcion", "descripcion_uso", "descripcionuso", "uso"],
};

const CONNECTLY_COLS: Record<keyof ImportConnectly, string> = {
  usuario: "connectly_usuario",
  contrasena: "connectly_contrasena",
  businessId: "connectly_business_id",
  apiKey: "connectly_api_key",
  webhook: "connectly_webhook",
  dns: "connectly_dns",
};

const SMART_COLS: Record<keyof ImportSmart, string> = {
  tipoActivacion: "smart_tipo_activacion",
  companyCampanasBotai: "smart_company_campanas_botai",
  bsp: "smart_bsp",
  webhookCos: "smart_webhook_cos",
  webhookSda: "smart_webhook_sda",
  usuarioCompanyId: "smart_usuario_companyid",
  clave: "smart_clave",
  companyBot: "smart_company_bot",
  botId: "smart_bot_id",
  botVersion: "smart_bot_version",
  appChannel: "smart_app_channel",
  companyIdCampanas: "smart_company_id_campanas",
  envioPush: "smart_envio_push",
  uso: "smart_uso",
  observaciones: "smart_observaciones",
  fechaVerificacion: "smart_fecha_verificacion",
  facturado: "smart_facturado",
};

/** Lee las columnas de un módulo; si todas vienen vacías el módulo se omite. */
function leerModulo<K extends string>(
  cols: Record<K, string>,
  get: (col: string) => string,
): Record<K, string> | undefined {
  const values = Object.fromEntries(
    (Object.keys(cols) as K[]).map((k) => [k, get(cols[k])]),
  ) as Record<K, string>;
  return Object.values<string>(values).some((v) => v !== "")
    ? values
    : undefined;
}

function toRows(csv: { cells: string[]; line: number }[]): ImportRow[] {
  const data = csv.filter((r) => !esComentario(r.cells[0] ?? ""));
  if (data.length < 2) return [];
  const headers = data[0].cells.map((h) => normalize(h).replace(/\s+/g, "_"));
  const idxGeneral = Object.fromEntries(
    (Object.keys(ALIASES) as GeneralKey[]).map((k) => [
      k,
      headers.findIndex((h) => ALIASES[k].includes(h)),
    ]),
  ) as Record<GeneralKey, number>;

  return data.slice(1).map(({ cells, line }) => {
    const at = (i: number) => (i >= 0 ? (cells[i] ?? "").trim() : "");
    const get = (k: GeneralKey) => at(idxGeneral[k]);
    const getCol = (col: string) => at(headers.indexOf(col));
    return {
      linea: line,
      numero: get("numero"),
      cliente: get("cliente"),
      status: get("status"),
      coordinador: get("coordinador"),
      programador: get("programador"),
      tenencia: get("tenencia"),
      descripcionUso: get("descripcionUso"),
      connectly: leerModulo(CONNECTLY_COLS, getCol),
      smart: leerModulo(SMART_COLS, getCol),
      errores: [],
      nuevos: [],
    };
  });
}

// ─── Plantilla ────────────────────────────────────────────────────────────────
const TEMPLATE_HEADER = [
  "numero",
  "cliente",
  "status",
  "coordinador",
  "programador",
  "tenencia",
  "descripcion",
  ...Object.values(CONNECTLY_COLS),
  ...Object.values(SMART_COLS),
];

/** Arma una fila de la plantilla a partir de las columnas que se quieran llenar. */
const templateRow = (values: Record<string, string>) =>
  TEMPLATE_HEADER.map((h) => {
    const v = values[h] ?? "";
    return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  }).join(",");

// ─── Componente ───────────────────────────────────────────────────────────────
export default function ImportModal({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  /** Se llama al cerrar si se importó al menos una línea (para recargar la lista y los catálogos). */
  onDone: (creadas: number, catalogosCreados: number) => void;
}) {
  const {
    clientes,
    empleados,
    status,
    tenencias,
    tiposActivacion,
    bsps,
    appChannels,
  } = useCatalogos();
  const [step, setStep] = useState<"upload" | "preview" | "result">("upload");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Nombre normalizado de cada catálogo, para anticipar en la vista previa qué se creará.
  const index = useMemo(() => {
    const set = (items: { nombre: string }[]) =>
      new Set(items.map((i) => normalize(i.nombre).replace(/\s+/g, " ")));
    return {
      clientes: set(clientes),
      empleados: set(empleados),
      status: set(status),
      tenencias: set(tenencias),
      tiposActivacion: set(tiposActivacion),
      bsps: set(bsps),
      appChannels: set(appChannels),
    };
  }, [
    clientes,
    empleados,
    status,
    tenencias,
    tiposActivacion,
    bsps,
    appChannels,
  ]);

  const validar = useCallback(
    (parsed: ImportRow[]): ImportRow[] => {
      const vistos = new Set<string>();
      return parsed.map((r) => {
        // Solo el número es obligatorio; lo demás es opcional y los catálogos faltantes se crean en el servidor.
        const errores: string[] = [];
        if (!r.numero) errores.push("El número es requerido.");
        else if (r.numero.length > 20)
          errores.push("El número no puede superar 20 caracteres.");
        else if (vistos.has(r.numero))
          errores.push("El número está repetido en el archivo.");
        else vistos.add(r.numero);

        const nuevos: string[] = [];
        const revisar = (
          valor: string | undefined,
          catalogo: Set<string>,
          etiqueta: string,
        ) => {
          if (valor && !catalogo.has(normalize(valor).replace(/\s+/g, " ")))
            nuevos.push(`${etiqueta}: ${valor}`);
        };
        revisar(r.cliente, index.clientes, "Cliente");
        revisar(r.coordinador, index.empleados, "Empleado");
        revisar(r.programador, index.empleados, "Empleado");
        revisar(r.status, index.status, "Status");
        revisar(r.tenencia, index.tenencias, "Tenencia");
        revisar(
          r.smart?.tipoActivacion,
          index.tiposActivacion,
          "Tipo de activación",
        );
        revisar(r.smart?.bsp, index.bsps, "BSP");
        revisar(r.smart?.appChannel, index.appChannels, "App channel");
        return { ...r, errores, nuevos };
      });
    },
    [index],
  );

  const reset = () => {
    setStep("upload");
    setRows([]);
    setResultado(null);
    setFileName("");
    setError("");
    setImporting(false);
  };

  const handleClose = () => {
    if (importing) return;
    const creadas = resultado?.creadas ?? 0;
    const catalogosCreados = resultado?.catalogosCreados.length ?? 0;
    reset();
    onClose();
    if (creadas > 0) onDone(creadas, catalogosCreados);
  };

  const processFile = (file: File) => {
    setError("");
    if (!/\.(csv|txt)$/i.test(file.name)) {
      setError("Solo se aceptan archivos CSV (.csv o .txt)");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("El archivo supera el máximo de 5 MB.");
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const parsed = toRows(parseCsv(String(e.target?.result ?? "")));
      if (parsed.length === 0) {
        setError(
          "El archivo no contiene registros o no tiene fila de encabezado (numero, cliente, ...).",
        );
        return;
      }
      setRows(validar(parsed));
      setStep("preview");
    };
    reader.readAsText(file, "UTF-8");
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
    e.target.value = "";
  };

  const handleDownloadTemplate = () => {
    const clienteExistente = clientes[0]?.nombre ?? "Cliente existente";
    const csv = [
      "# Plantilla de importación de líneas. Las filas que empiezan con # se ignoran.",
      '# Solo la columna "numero" es obligatoria (formato E.164 recomendado: +525512345678). Todas las demás son opcionales.',
      "# Cliente / coordinador / programador / status / tenencia y los catálogos de Smart se crean automáticamente si no existen.",
      "# Las columnas connectly_* y smart_* solo crean la configuración del módulo si al menos una trae datos.",
      "# smart_envio_push y smart_facturado: Sí o No. smart_fecha_verificacion: AAAA-MM-DD.",
      TEMPLATE_HEADER.join(","),
      templateRow({ numero: "+525512345678" }),
      templateRow({
        numero: "+525598765432",
        cliente: "Cliente Nuevo SA de CV",
        coordinador: "Nombre del coordinador",
      }),
      templateRow({
        numero: "+523312345678",
        cliente: clienteExistente,
        status: status[0]?.nombre ?? "En desarrollo",
        descripcion: "Atención al cliente",
        connectly_usuario: "usuario@empresa.com",
        connectly_contrasena: "contraseña",
        connectly_business_id: "123456789",
      }),
      templateRow({
        numero: "+528112345678",
        cliente: clienteExistente,
        smart_tipo_activacion: tiposActivacion[0]?.nombre ?? "",
        smart_bsp: bsps[0]?.nombre ?? "",
        smart_company_bot: "Company bot",
        smart_bot_id: "bot-001",
        smart_envio_push: "No",
        smart_facturado: "Sí",
      }),
    ].join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla_importacion_lineas.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const validas = rows.filter((r) => r.errores.length === 0);
  const invalidas = rows.filter((r) => r.errores.length > 0);
  // Un mismo nombre nuevo en varias filas se crea una sola vez.
  const nuevosTotal = new Set(
    validas.flatMap((r) => r.nuevos.map((n) => normalize(n))),
  ).size;

  const handleImport = async () => {
    setImporting(true);
    setError("");
    const acumulado: Resultado = {
      total: validas.length,
      creadas: 0,
      errores: [],
      catalogosCreados: [],
    };
    try {
      for (let i = 0; i < validas.length; i += MAX_FILAS_POR_ENVIO) {
        const lote = validas.slice(i, i + MAX_FILAS_POR_ENVIO);
        const res = await api.lineas.importar(
          lote.map(({ linea: _l, errores: _e, nuevos: _n, ...fila }) => fila),
        );
        acumulado.creadas += res.creadas;
        acumulado.catalogosCreados.push(...res.catalogosCreados);
        for (const err of res.errores) {
          acumulado.errores.push({
            linea: lote[err.fila - 1].linea,
            numero: err.numero,
            mensajes: err.mensajes,
          });
        }
      }
      setResultado(acumulado);
      setStep("result");
    } catch (e) {
      // Si un lote falló a mitad, lo ya creado se conserva: informarlo evita reimportar duplicados.
      setError(
        acumulado.creadas > 0
          ? `${errorMessage(e)} Se alcanzaron a crear ${acumulado.creadas} línea(s) antes del error; revisa la lista antes de reintentar.`
          : errorMessage(e),
      );
    } finally {
      setImporting(false);
    }
  };

  const creadosPorCatalogo = useMemo(() => {
    const grupos = new Map<string, string[]>();
    for (const c of resultado?.catalogosCreados ?? [])
      grupos.set(c.catalogo, [...(grupos.get(c.catalogo) ?? []), c.nombre]);
    return [...grupos.entries()];
  }, [resultado]);

  const footer =
    step === "upload" ? (
      <>
        <Button variant="outline" onClick={handleClose}>
          Cancelar
        </Button>
        <Button variant="outline" onClick={handleDownloadTemplate}>
          <DownloadIcon /> Descargar plantilla
        </Button>
      </>
    ) : step === "preview" ? (
      <>
        <Button variant="outline" onClick={reset} disabled={importing}>
          ← Volver
        </Button>
        <Button
          variant="primary"
          disabled={validas.length === 0 || importing}
          onClick={handleImport}
        >
          {importing && <Spinner />}
          {importing
            ? "Importando..."
            : `Importar ${validas.length} línea${validas.length !== 1 ? "s" : ""}`}
        </Button>
      </>
    ) : (
      <Button variant="primary" onClick={handleClose}>
        Cerrar
      </Button>
    );

  return (
    <Modal
      title="Importación masiva de líneas"
      open={open}
      onClose={handleClose}
      footer={footer}
      wide={step !== "upload"}
    >
      {step === "upload" && (
        <div className="space-y-4">
          <div className="bg-[#e8f7f9] border border-[#3FB6C4]/30 rounded-lg p-4 text-sm text-[#2fa0ad]">
            <p className="font-semibold mb-1">Formato requerido (CSV)</p>
            <p className="text-xs leading-relaxed">
              Encabezado en la primera fila. Columnas:{" "}
              <code className="font-mono bg-white/60 px-1 rounded">
                numero, cliente, status, coordinador, programador, tenencia,
                descripcion
              </code>
              , más las opcionales{" "}
              <code className="font-mono bg-white/60 px-1 rounded">
                connectly_*
              </code>{" "}
              y{" "}
              <code className="font-mono bg-white/60 px-1 rounded">
                smart_*
              </code>
              . Solo <strong>numero</strong> es obligatorio (formato E.164
              recomendado, p. ej. +525512345678)
            </p>
          </div>

          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
              dragging
                ? "border-[#3FB6C4] bg-[#e8f7f9]"
                : "border-[#E2E8F0] bg-[#F8F9FA] hover:border-[#3FB6C4] hover:bg-[#e8f7f9]/40"
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center shadow-sm">
                <UploadIcon />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#374151]">
                  {dragging
                    ? "Suelta el archivo aquí"
                    : "Arrastra tu archivo CSV aquí"}
                </p>
                <p className="text-xs text-[#94A3B8] mt-1">
                  o haz clic para seleccionar · Máx. 5 MB
                </p>
              </div>
            </div>
          </div>

          {error && <ErrorBanner message={error} />}

          <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
            <InfoIcon />
            ¿Primera vez? Descarga la plantilla con el botón de abajo y llénala
            con tus datos.
          </div>
        </div>
      )}

      {step === "preview" && (
        <div className="space-y-4">
          {error && <ErrorBanner message={error} />}

          <div className="flex items-center gap-3">
            <div className="flex-1 bg-[#DCFCE7] border border-[#16A34A]/20 rounded-lg px-4 py-2.5 text-center">
              <div className="text-xl font-bold text-[#15803D]">
                {validas.length}
              </div>
              <div className="text-xs text-[#16A34A]">Listas para importar</div>
            </div>
            {invalidas.length > 0 && (
              <div className="flex-1 bg-[#FEE2E2] border border-[#DC2626]/20 rounded-lg px-4 py-2.5 text-center">
                <div className="text-xl font-bold text-[#B91C1C]">
                  {invalidas.length}
                </div>
                <div className="text-xs text-[#DC2626]">
                  Con errores (se omitirán)
                </div>
              </div>
            )}
            <div className="flex-1 bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg px-4 py-2.5 text-center">
              <div className="text-xl font-bold text-[#374151]">
                {rows.length}
              </div>
              <div className="text-xs text-[#64748B]">Total en archivo</div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#64748B] bg-[#F8F9FA] rounded-lg px-3 py-2">
            <CsvIcon />
            <span className="font-medium">{fileName}</span>
            <button
              onClick={reset}
              className="ml-auto text-[#3FB6C4] hover:underline"
            >
              Cambiar archivo
            </button>
          </div>

          {nuevosTotal > 0 && (
            <div className="flex items-center gap-2 text-xs text-[#3A7BC8] bg-[#EEF4FB] border border-[#3A7BC8]/20 rounded-lg px-3 py-2">
              <InfoIcon />
              Se crearán automáticamente {nuevosTotal} registro
              {nuevosTotal !== 1 ? "s" : ""} nuevo{nuevosTotal !== 1 ? "s" : ""}{" "}
              en los catálogos (marcados como «Nuevo»).
            </div>
          )}

          <div className="border border-[#E2E8F0] rounded-lg overflow-hidden max-h-72 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[#F8F9FA] border-b border-[#E2E8F0]">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold text-[#64748B]">
                    Fila
                  </th>
                  <th className="text-left px-3 py-2 font-semibold text-[#64748B]">
                    Número
                  </th>
                  <th className="text-left px-3 py-2 font-semibold text-[#64748B]">
                    Cliente
                  </th>
                  <th className="text-left px-3 py-2 font-semibold text-[#64748B]">
                    Status
                  </th>
                  <th className="text-left px-3 py-2 font-semibold text-[#64748B]">
                    Módulos
                  </th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {rows.map((row) => (
                  <tr
                    key={row.linea}
                    className={
                      row.errores.length === 0 ? "bg-white" : "bg-[#FFF7F7]"
                    }
                  >
                    <td className="px-3 py-2 text-[#94A3B8]">{row.linea}</td>
                    <td className="px-3 py-2 font-mono text-[#1A202C]">
                      {row.numero || <span className="text-[#DC2626]">—</span>}
                    </td>
                    <td className="px-3 py-2 text-[#374151]">
                      {row.cliente || <span className="text-[#94A3B8]">—</span>}
                      {row.nuevos.some((n) => n.startsWith("Cliente:")) && (
                        <span className="ml-1.5">
                          <Badge variant="secondary">Nuevo</Badge>
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-[#374151]">
                      {row.status || <span className="text-[#94A3B8]">—</span>}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        {row.connectly && (
                          <Badge variant="primary">Connectly</Badge>
                        )}
                        {row.smart && <Badge variant="neutral">Smart</Badge>}
                        {!row.connectly && !row.smart && (
                          <span className="text-[#94A3B8]">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {row.errores.length > 0 ? (
                        <span
                          title={row.errores.join(" · ")}
                          className="inline-flex items-center gap-1 text-[#B91C1C] cursor-help"
                        >
                          <AlertIcon />
                          <span>
                            {row.errores[0]}
                            {row.errores.length > 1
                              ? ` (+${row.errores.length - 1})`
                              : ""}
                          </span>
                        </span>
                      ) : row.nuevos.length > 0 ? (
                        <span
                          title={`Se creará: ${row.nuevos.join(" · ")}`}
                          className="cursor-help"
                        >
                          <Badge variant="success">
                            OK · {row.nuevos.length} nuevo
                            {row.nuevos.length !== 1 ? "s" : ""}
                          </Badge>
                        </span>
                      ) : (
                        <Badge variant="success">OK</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {invalidas.length > 0 && (
            <p className="text-xs text-[#94A3B8]">
              Las filas con errores no se importarán. Corrígelas en el archivo y
              vuelve a subirlo si las necesitas.
            </p>
          )}
        </div>
      )}

      {step === "result" && resultado && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-[#DCFCE7] border border-[#16A34A]/20 rounded-lg px-4 py-3 text-center">
              <div className="text-2xl font-bold text-[#15803D]">
                {resultado.creadas}
              </div>
              <div className="text-xs text-[#16A34A]">
                Línea{resultado.creadas !== 1 ? "s" : ""} creada
                {resultado.creadas !== 1 ? "s" : ""}
              </div>
            </div>
            {resultado.catalogosCreados.length > 0 && (
              <div className="flex-1 bg-[#EEF4FB] border border-[#3A7BC8]/20 rounded-lg px-4 py-3 text-center">
                <div className="text-2xl font-bold text-[#3A7BC8]">
                  {resultado.catalogosCreados.length}
                </div>
                <div className="text-xs text-[#3A7BC8]">
                  Registro{resultado.catalogosCreados.length !== 1 ? "s" : ""}{" "}
                  nuevo{resultado.catalogosCreados.length !== 1 ? "s" : ""} en
                  catálogos
                </div>
              </div>
            )}
            {resultado.errores.length > 0 && (
              <div className="flex-1 bg-[#FEE2E2] border border-[#DC2626]/20 rounded-lg px-4 py-3 text-center">
                <div className="text-2xl font-bold text-[#B91C1C]">
                  {resultado.errores.length}
                </div>
                <div className="text-xs text-[#DC2626]">
                  Rechazada{resultado.errores.length !== 1 ? "s" : ""} por el
                  servidor
                </div>
              </div>
            )}
          </div>

          {creadosPorCatalogo.length > 0 && (
            <div className="border border-[#E2E8F0] rounded-lg px-4 py-3 text-xs space-y-1 max-h-40 overflow-y-auto">
              <p className="font-semibold text-[#374151] mb-1">
                Creados automáticamente
              </p>
              {creadosPorCatalogo.map(([catalogo, nombres]) => (
                <p key={catalogo} className="text-[#64748B]">
                  <span className="font-medium text-[#374151]">
                    {catalogo}:
                  </span>{" "}
                  {nombres.join(", ")}
                </p>
              ))}
            </div>
          )}

          {resultado.errores.length > 0 && (
            <div className="border border-[#E2E8F0] rounded-lg overflow-hidden max-h-64 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-[#F8F9FA] border-b border-[#E2E8F0]">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold text-[#64748B]">
                      Fila
                    </th>
                    <th className="text-left px-3 py-2 font-semibold text-[#64748B]">
                      Número
                    </th>
                    <th className="text-left px-3 py-2 font-semibold text-[#64748B]">
                      Motivo
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {resultado.errores.map((e) => (
                    <tr key={e.linea} className="bg-[#FFF7F7]">
                      <td className="px-3 py-2 text-[#94A3B8]">{e.linea}</td>
                      <td className="px-3 py-2 font-mono text-[#1A202C]">
                        {e.numero || "—"}
                      </td>
                      <td className="px-3 py-2 text-[#B91C1C]">
                        {e.mensajes.join(" ")}
                      </td>
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
  <svg
    className="w-6 h-6 text-[#94A3B8]"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
    />
  </svg>
);

const DownloadIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
    />
  </svg>
);

const AlertIcon = () => (
  <svg
    className="w-3.5 h-3.5 flex-shrink-0"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
    />
  </svg>
);

const InfoIcon = () => (
  <svg
    className="w-3.5 h-3.5 flex-shrink-0"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const CsvIcon = () => (
  <svg
    className="w-3.5 h-3.5 text-[#3FB6C4]"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);
