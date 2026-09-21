import { useMemo, useState } from 'react';
import { api, errorMessage, type Cliente, type EstadoCliente } from '../api';
import {
  Badge, Button, ConfirmModal, ErrorBanner, IconButton, Input, LoadingBlock, Modal, Select, Spinner,
  PlusIcon, EditIcon, TrashIcon,
} from '../components/ui';
import { useAuth } from '../auth/AuthContext';
import { useCatalogos } from '../context/CatalogosContext';
import { useToast } from '../context/ToastContext';
import { useAsync } from '../lib/useAsync';
import { emptyToNull } from '../lib/format';

const th = 'text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide';

// Mismo criterio que el backend: 3 letras (persona moral) o 4 (física) + fecha AAMMDD + homoclave de 3.
const RFC_RE = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i;

export default function ClientesPage() {
  const { can } = useAuth();
  const canCreate = can('clientes', 'crear');
  const canEdit = can('clientes', 'editar');
  const canDelete = can('clientes', 'eliminar');

  const toast = useToast();
  const catalogos = useCatalogos();
  const { data, loading, error, reload } = useAsync(() => api.clientes.list());

  const [editing, setEditing] = useState<Cliente | 'new' | null>(null);
  const [toDelete, setToDelete] = useState<Cliente | null>(null);
  const [deleting, setDeleting] = useState(false);

  const clientes = data ?? [];
  const rows = useMemo(() => [...clientes].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')), [clientes]);

  const refresh = async () => {
    // Los desplegables de Líneas usan el catálogo de clientes: mantenerlo al día.
    await Promise.all([reload(), catalogos.reload()]);
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.clientes.remove(toDelete.id);
      toast.success('Cliente eliminado');
      setToDelete(null);
      await refresh();
    } catch (e) {
      toast.error(errorMessage(e));
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1A202C]">Clientes</h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            {data ? `${clientes.length} ${clientes.length === 1 ? 'cliente registrado' : 'clientes registrados'}` : 'Cargando...'}
          </p>
        </div>
        {canCreate && (
          <Button variant="primary" onClick={() => setEditing('new')}>
            <PlusIcon /> Nuevo cliente
          </Button>
        )}
      </div>

      {error && <ErrorBanner message={error} onRetry={reload} />}

      <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
        {loading && !data ? <LoadingBlock /> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F8F9FA] border-b border-[#E2E8F0]">
                <th className={`${th} px-5`}>Empresa</th>
                <th className={th}>RFC</th>
                <th className={th}>Líneas</th>
                <th className={th}>Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {rows.length === 0 && (
                <tr><td colSpan={5} className="text-center py-12 text-sm text-[#94A3B8]">Sin clientes registrados</td></tr>
              )}
              {rows.map(c => (
                <tr key={c.id} className="hover:bg-[#FAFAFA] transition-colors group">
                  <td className="px-5 py-3 text-sm font-medium text-[#1A202C]">{c.nombre}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[#64748B]">{c.rfc ?? <span className="text-[#94A3B8]">—</span>}</td>
                  <td className="px-4 py-3"><Badge variant="primary">{c.totalLineas}</Badge></td>
                  <td className="px-4 py-3"><Badge variant={c.estado === 'Activo' ? 'success' : 'neutral'}>{c.estado}</Badge></td>
                  <td className="px-4 py-3">
                    {(canEdit || canDelete) && (
                      <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        {canEdit && <IconButton title="Editar" onClick={() => setEditing(c)}><EditIcon /></IconButton>}
                        {canDelete && <IconButton title="Eliminar" className="hover:text-[#DC2626] hover:bg-[#FEE2E2]" onClick={() => setToDelete(c)}><TrashIcon /></IconButton>}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing !== null && (
        <ClienteModal
          cliente={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async msg => { setEditing(null); toast.success(msg); await refresh(); }}
        />
      )}

      <ConfirmModal
        open={toDelete !== null}
        title="Eliminar cliente"
        message={
          <>
            ¿Eliminar a <strong>{toDelete?.nombre}</strong>?
            {(toDelete?.totalLineas ?? 0) > 0
              ? ` Tiene ${toDelete?.totalLineas} línea(s) asociada(s), por lo que el sistema no permitirá eliminarlo; puedes marcarlo como Pausado.`
              : ' Esta acción no se puede deshacer.'}
          </>
        }
        busy={deleting}
        onConfirm={handleDelete}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}

function ClienteModal({ cliente, onClose, onSaved }: {
  cliente: Cliente | null;
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
  const [nombre, setNombre] = useState(cliente?.nombre ?? '');
  const [rfc, setRfc] = useState(cliente?.rfc ?? '');
  const [estado, setEstado] = useState<EstadoCliente>(cliente?.estado ?? 'Activo');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ nombre?: string; rfc?: string }>({});

  const save = async () => {
    const e: typeof errors = {};
    if (!nombre.trim()) e.nombre = 'El nombre es requerido';
    if (rfc.trim() && !RFC_RE.test(rfc.trim())) e.rfc = 'RFC de 12 (persona moral) o 13 caracteres (persona física), p. ej. GPS920315R12';
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setSaving(true);
    setError(null);
    try {
      const dto = { nombre: nombre.trim(), rfc: emptyToNull(rfc.toUpperCase()), estado };
      if (cliente) await api.clientes.update(cliente.id, dto);
      else await api.clientes.create(dto);
      await onSaved(cliente ? 'Cliente actualizado' : 'Cliente creado exitosamente');
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <Modal
      title={cliente ? 'Editar cliente' : 'Nuevo cliente'}
      open
      onClose={saving ? () => {} : onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="primary" onClick={save} disabled={saving}>
            {saving && <Spinner />}
            {cliente ? 'Guardar cambios' : 'Crear cliente'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <ErrorBanner message={error} />}
        <Input
          label="Empresa *"
          value={nombre}
          onChange={e => { setNombre(e.target.value); setErrors(x => ({ ...x, nombre: undefined })); }}
          maxLength={150}
          autoFocus
          error={errors.nombre}
        />
        <Input
          label="RFC"
          value={rfc}
          onChange={e => { setRfc(e.target.value.toUpperCase()); setErrors(x => ({ ...x, rfc: undefined })); }}
          maxLength={13}
          placeholder="Opcional"
          className="font-mono"
          error={errors.rfc}
        />
        <Select
          label="Estado"
          value={estado}
          onChange={e => setEstado(e.target.value as EstadoCliente)}
          options={[{ value: 'Activo', label: 'Activo' }, { value: 'Pausado', label: 'Pausado' }]}
        />
      </div>
    </Modal>
  );
}
