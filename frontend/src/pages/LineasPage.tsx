import { useMemo, useState } from 'react';
import { api, errorMessage, type Linea } from '../api';
import {
  Button, StatusBadge, FilterDropdown, Pagination, Modal, Input, Select, Textarea, IconButton, ConfirmModal, LoadingBlock, ErrorBanner, Spinner,
  PlusIcon, SearchIcon, EditIcon, TrashIcon, EyeViewIcon, Badge,
} from '../components/ui';
import { LineaLabel, ModulosBadges, lineaTexto } from '../components/LineaCells';
import ImportModal from '../components/ImportModal';
import { useAuth } from '../auth/AuthContext';
import { useCatalogos } from '../context/CatalogosContext';
import { useToast } from '../context/ToastContext';
import { useAsync } from '../lib/useAsync';
import { emptyToNull, normalize, toIdOrNull } from '../lib/format';
import type { LineaDetailOptions } from './LineaDetailPage';

const PER_PAGE = 10;

const th = 'text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide';

const soloDigitos = (s: string | null | undefined) => (s ?? '').replace(/\D/g, '');

export default function LineasPage({ onViewDetalle }: { onViewDetalle: (id: number, options?: LineaDetailOptions) => void }) {
  const { can } = useAuth();
  const canCreate = can('lineas', 'crear');
  const canEdit = can('lineas', 'editar');
  const canDelete = can('lineas', 'eliminar');
  const canImport = can('importar', 'crear');

  const toast = useToast();
  const { clientes, status } = useCatalogos();
  const { data: lineas, loading, error, reload } = useAsync(() => api.lineas.list());

  const [search, setSearch] = useState('');
  const [filterCliente, setFilterCliente] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCoord, setFilterCoord] = useState('');
  const [page, setPage] = useState(1);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [toDelete, setToDelete] = useState<Linea | null>(null);
  const [deleting, setDeleting] = useState(false);

  const all = lineas ?? [];
  const coords = useMemo(
    () => [...new Set(all.map(l => l.coordinadorNombre).filter((n): n is string => !!n))].sort(),
    [all],
  );

  const filtered = useMemo(() => {
    const q = normalize(search);
    const qDigitos = soloDigitos(search);
    return all.filter(l => {
      if (q) {
        const coincide =
          normalize(l.numero).includes(q) ||
          // "5512345678" debe encontrar "+52 55 1234 5678": comparar solo dígitos si hay suficientes.
          (qDigitos.length >= 4 && soloDigitos(l.numero).includes(qDigitos)) ||
          normalize(l.clienteNombre).includes(q) ||
          normalize(l.descripcionUso).includes(q);
        if (!coincide) return false;
      }
      if (filterCliente && l.clienteNombre !== filterCliente) return false;
      if (filterStatus && l.statusDesarrolloNombre !== filterStatus) return false;
      if (filterCoord && l.coordinadorNombre !== filterCoord) return false;
      return true;
    });
  }, [all, search, filterCliente, filterStatus, filterCoord]);

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const hasFilters = !!(filterCliente || filterStatus || filterCoord || search);

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.lineas.remove(toDelete.id);
      toast.success(`Línea ${lineaTexto(toDelete)} eliminada`);
      setToDelete(null);
      await reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1A202C]">Líneas</h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            {lineas ? `${filtered.length} ${filtered.length === 1 ? 'línea encontrada' : 'líneas encontradas'}` : 'Cargando...'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canImport && (
            <Button variant="outline" onClick={() => setShowImport(true)}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              Importar masivo
            </Button>
          )}
          {canCreate && (
            <Button variant="primary" onClick={() => setShowNewModal(true)}>
              <PlusIcon /> Nueva línea
            </Button>
          )}
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={reload} />}

      {/* Filters */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]"><SearchIcon /></span>
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por número, cliente o descripción..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-[#E2E8F0] rounded-md bg-[#F8F9FA] text-[#1A202C] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#3FB6C4] focus:border-transparent"
          />
        </div>
        <FilterDropdown label="Cliente" options={clientes.map(c => c.nombre)} value={filterCliente} onChange={v => { setFilterCliente(v); setPage(1); }} />
        <FilterDropdown label="Status" options={status.map(s => s.nombre)} value={filterStatus} onChange={v => { setFilterStatus(v); setPage(1); }} />
        <FilterDropdown label="Coordinador" options={coords} value={filterCoord} onChange={v => { setFilterCoord(v); setPage(1); }} />
        {hasFilters && (
          <button onClick={() => { setFilterCliente(''); setFilterStatus(''); setFilterCoord(''); setSearch(''); setPage(1); }} className="text-xs text-[#94A3B8] hover:text-[#64748B] underline">
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
        {loading && !lineas ? <LoadingBlock /> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F8F9FA] border-b border-[#E2E8F0]">
                    <th className={`${th} px-5`}>Número</th>
                    <th className={th}>Cliente</th>
                    <th className={th}>Status</th>
                    <th className={th}>Coordinador</th>
                    <th className={th}>Programador</th>
                    <th className={th}>Tenencia</th>
                    <th className={th}>Módulos</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {paginated.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-12 text-sm text-[#94A3B8]">{all.length === 0 ? 'Aún no hay líneas registradas' : 'No se encontraron líneas'}</td></tr>
                  ) : paginated.map(line => (
                    <tr key={line.id} className="hover:bg-[#FAFAFA] transition-colors group">
                      <td className="px-5 py-3"><LineaLabel linea={line} /></td>
                      <td className="px-4 py-3 text-sm text-[#374151]">{line.clienteNombre}</td>
                      <td className="px-4 py-3"><StatusBadge status={line.statusDesarrolloNombre} /></td>
                      <td className="px-4 py-3 text-sm text-[#374151]">{line.coordinadorNombre ?? <span className="text-[#94A3B8]">—</span>}</td>
                      <td className="px-4 py-3 text-sm text-[#374151]">{line.programadorNombre ?? <span className="text-[#94A3B8]">—</span>}</td>
                      <td className="px-4 py-3 text-xs text-[#64748B]">{line.tenenciaSimCardNombre ?? '—'}</td>
                      <td className="px-4 py-3"><ModulosBadges linea={line} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                          <IconButton title="Ver detalle" onClick={() => onViewDetalle(line.id)}><EyeViewIcon /></IconButton>
                          {canEdit && <IconButton title="Editar" onClick={() => onViewDetalle(line.id)}><EditIcon /></IconButton>}
                          {canDelete && (
                            <IconButton title="Eliminar" className="hover:text-[#DC2626] hover:bg-[#FEE2E2]" onClick={() => setToDelete(line)}><TrashIcon /></IconButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
          </>
        )}
      </div>

      {/* Modals */}
      <NewLineaModal
        open={showNewModal}
        onClose={() => setShowNewModal(false)}
        onCreated={(linea, options) => {
          setShowNewModal(false);
          toast.success(`Línea ${lineaTexto(linea)} creada exitosamente`);
          if (options.addConnectly || options.addSmart) onViewDetalle(linea.id, options);
          else void reload();
        }}
      />

      {canImport && (
        <ImportModal
          open={showImport}
          onClose={() => setShowImport(false)}
          onDone={creadas => {
            toast.success(`${creadas} línea${creadas !== 1 ? 's' : ''} importada${creadas !== 1 ? 's' : ''} exitosamente`);
            void reload();
          }}
        />
      )}

      <ConfirmModal
        open={toDelete !== null}
        title="Eliminar línea"
        message={
          <>
            ¿Eliminar la línea <strong>{toDelete ? lineaTexto(toDelete) : ''}</strong> de <strong>{toDelete?.clienteNombre}</strong>? Se eliminarán también sus configuraciones
            {toDelete?.tieneConnectly || toDelete?.tieneSmart ? ' (' + [toDelete?.tieneConnectly && 'Connectly', toDelete?.tieneSmart && 'Smart'].filter(Boolean).join(' y ') + ')' : ''}. Esta acción no se puede deshacer.
          </>
        }
        busy={deleting}
        onConfirm={handleDelete}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}

// ─── Nueva línea ──────────────────────────────────────────────────────────────
function NewLineaModal({ open, onClose, onCreated }: {
  open: boolean;
  onClose: () => void;
  onCreated: (linea: Linea, options: LineaDetailOptions) => void;
}) {
  const { clientes, empleados, status, tenencias } = useCatalogos();
  const [numero, setNumero] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [statusId, setStatusId] = useState('');
  const [tenenciaId, setTenenciaId] = useState('');
  const [coordinadorId, setCoordinadorId] = useState('');
  const [programadorId, setProgramadorId] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [addConnectly, setAddConnectly] = useState(false);
  const [addSmart, setAddSmart] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ numero?: string; cliente?: string }>({});

  const reset = () => {
    setNumero(''); setClienteId(''); setStatusId(''); setTenenciaId(''); setCoordinadorId(''); setProgramadorId('');
    setDescripcion(''); setAddConnectly(false); setAddSmart(false); setError(null); setErrors({});
  };

  const close = () => { if (saving) return; reset(); onClose(); };

  const save = async () => {
    const e: typeof errors = {};
    if (!numero.trim()) e.numero = 'Ingresa el número de la línea';
    if (!clienteId) e.cliente = 'Selecciona un cliente';
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setSaving(true);
    setError(null);
    try {
      const linea = await api.lineas.create({
        numero: numero.trim(),
        clienteId: Number(clienteId),
        descripcionUso: emptyToNull(descripcion),
        statusDesarrolloId: toIdOrNull(statusId),
        coordinadorId: toIdOrNull(coordinadorId),
        programadorId: toIdOrNull(programadorId),
        tenenciaSimCardId: toIdOrNull(tenenciaId),
      });
      const options: LineaDetailOptions = {
        addConnectly,
        addSmart,
        tab: addConnectly ? 'Connectly' : addSmart ? 'Smart' : undefined,
      };
      reset();
      onCreated(linea, options);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const opts = (items: { id: number; nombre: string }[]) => [{ value: '', label: 'Seleccionar...' }, ...items.map(i => ({ value: String(i.id), label: i.nombre }))];
  const empleadoOpts = (rolMatch: string) => {
    const preferidos = empleados.filter(e => normalize(e.rol).includes(rolMatch));
    return opts(preferidos.length > 0 ? preferidos : empleados);
  };

  return (
    <Modal
      title="Nueva línea"
      open={open}
      onClose={close}
      footer={
        <>
          <Button variant="outline" onClick={close} disabled={saving}>Cancelar</Button>
          <Button variant="primary" onClick={save} disabled={saving}>
            {saving && <Spinner />}
            Crear línea
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <ErrorBanner message={error} />}

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Número de línea *"
            value={numero}
            onChange={e => { setNumero(e.target.value); setErrors(x => ({ ...x, numero: undefined })); }}
            maxLength={20}
            placeholder="+52 55 0000 0000"
            autoFocus
            error={errors.numero}
          />
          <Select
            label="Cliente *"
            value={clienteId}
            onChange={e => { setClienteId(e.target.value); setErrors(x => ({ ...x, cliente: undefined })); }}
            options={opts(clientes)}
            error={errors.cliente ?? (clientes.length === 0 ? 'No hay clientes registrados.' : undefined)}
          />
          <Select label="Status" value={statusId} onChange={e => setStatusId(e.target.value)} options={opts(status)} />
          <Select label="Tenencia SIM" value={tenenciaId} onChange={e => setTenenciaId(e.target.value)} options={opts(tenencias)} />
          <Select label="Coordinador" value={coordinadorId} onChange={e => setCoordinadorId(e.target.value)} options={empleadoOpts('coord')} />
          <Select label="Programador" value={programadorId} onChange={e => setProgramadorId(e.target.value)} options={empleadoOpts('program')} />
          <Textarea
            label="Descripción de uso"
            wrapperClassName="col-span-2"
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
            maxLength={4000}
            placeholder="Para qué se usa esta línea..."
          />
        </div>

        <div className="border-t border-[#E2E8F0] pt-4">
          <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-3">Configuraciones a agregar</p>
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer p-3 border border-[#E2E8F0] rounded-lg hover:bg-[#F8F9FA] transition-colors">
              <input type="checkbox" checked={addConnectly} onChange={e => setAddConnectly(e.target.checked)} className="accent-[#3FB6C4]" />
              <div>
                <div className="text-sm font-medium text-[#374151]">Connectly</div>
                <div className="text-xs text-[#94A3B8]">Configurar integración con Connectly</div>
              </div>
              <Badge variant="secondary" className="ml-auto">Módulo</Badge>
            </label>
            <label className="flex items-center gap-3 cursor-pointer p-3 border border-[#E2E8F0] rounded-lg hover:bg-[#F8F9FA] transition-colors">
              <input type="checkbox" checked={addSmart} onChange={e => setAddSmart(e.target.checked)} className="accent-[#3FB6C4]" />
              <div>
                <div className="text-sm font-medium text-[#374151]">Smart</div>
                <div className="text-xs text-[#94A3B8]">Configurar integración con Smart</div>
              </div>
              <Badge variant="primary" className="ml-auto">Módulo</Badge>
            </label>
          </div>
          <p className="text-xs text-[#94A3B8] mt-2">Al crear la línea se abrirá su detalle para completar los datos de cada configuración.</p>
        </div>
      </div>
    </Modal>
  );
}
