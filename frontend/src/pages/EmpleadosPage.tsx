import { useMemo, useState } from 'react';
import { api, errorMessage, type Empleado } from '../api';
import { Badge, Button, ConfirmModal, ErrorBanner, IconButton, Input, LoadingBlock, Modal, PlusIcon, EditIcon, TrashIcon, Spinner } from '../components/ui';
import { useAuth } from '../auth/AuthContext';
import { useCatalogos } from '../context/CatalogosContext';
import { useToast } from '../context/ToastContext';
import { useAsync } from '../lib/useAsync';
import { emptyToNull, normalize } from '../lib/format';

const th = 'text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide';
const ROL_SUGERIDOS = ['Coordinador', 'Programador'];

export default function EmpleadosPage() {
  const { can } = useAuth();
  const canCreate = can('empleados', 'crear');
  const canEdit = can('empleados', 'editar');
  const canDelete = can('empleados', 'eliminar');
  const toast = useToast();
  const catalogos = useCatalogos();
  const { data: empleados, loading, error, reload } = useAsync(() => api.empleados.list());
  const { data: lineas } = useAsync(() => api.lineas.list());

  const [editing, setEditing] = useState<Empleado | 'new' | null>(null);
  const [toDelete, setToDelete] = useState<Empleado | null>(null);
  const [deleting, setDeleting] = useState(false);

  const lineasAsignadas = useMemo(() => {
    const counts = new Map<number, number>();
    for (const l of lineas ?? []) {
      const ids = new Set([l.coordinadorId, l.programadorId].filter((id): id is number => id != null));
      for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return counts;
  }, [lineas]);

  const refresh = async () => {
    // Los catálogos (selects de líneas) también dependen de los empleados.
    await Promise.all([reload(), catalogos.reload()]);
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.empleados.remove(toDelete.id);
      toast.success('Empleado eliminado');
      setToDelete(null);
      await refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setDeleting(false);
    }
  };

  const rows = empleados ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1A202C]">Empleados</h1>
          <p className="text-sm text-[#64748B] mt-0.5">{rows.length} {rows.length === 1 ? 'empleado registrado' : 'empleados registrados'}</p>
        </div>
        {canCreate && (
          <Button variant="primary" onClick={() => setEditing('new')}>
            <PlusIcon /> Nuevo empleado
          </Button>
        )}
      </div>

      {error && <ErrorBanner message={error} onRetry={reload} />}

      <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
        {loading && !empleados ? <LoadingBlock /> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F8F9FA] border-b border-[#E2E8F0]">
                <th className={`${th} px-5`}>Empleado</th>
                <th className={th}>Rol</th>
                <th className={th}>Líneas asignadas</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {rows.length === 0 && (
                <tr><td colSpan={4} className="text-center py-12 text-sm text-[#94A3B8]">Sin empleados registrados</td></tr>
              )}
              {rows.map(e => (
                <tr key={e.id} className="hover:bg-[#FAFAFA] transition-colors group">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#3FB6C4] to-[#3A7BC8] flex items-center justify-center text-white text-xs font-semibold">
                        {e.nombre.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-[#1A202C]">{e.nombre}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {e.rol
                      ? <Badge variant={normalize(e.rol).includes('coord') ? 'secondary' : 'primary'}>{e.rol}</Badge>
                      : <span className="text-xs text-[#94A3B8]">—</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-[#374151]">{lineasAsignadas.get(e.id) ?? 0}</td>
                  <td className="px-4 py-3">
                    {(canEdit || canDelete) && (
                      <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        {canEdit && <IconButton title="Editar" onClick={() => setEditing(e)}><EditIcon /></IconButton>}
                        {canDelete && <IconButton title="Eliminar" className="hover:text-[#DC2626] hover:bg-[#FEE2E2]" onClick={() => setToDelete(e)}><TrashIcon /></IconButton>}
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
        <EmpleadoModal
          empleado={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async (msg) => { setEditing(null); toast.success(msg); await refresh(); }}
        />
      )}

      <ConfirmModal
        open={toDelete !== null}
        title="Eliminar empleado"
        message={
          <>
            ¿Eliminar a <strong>{toDelete?.nombre}</strong>?
            {(lineasAsignadas.get(toDelete?.id ?? -1) ?? 0) > 0 && ' Las líneas donde figura como coordinador o programador quedarán sin asignar.'}
          </>
        }
        busy={deleting}
        onConfirm={handleDelete}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}

function EmpleadoModal({ empleado, onClose, onSaved }: {
  empleado: Empleado | null;
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
  const [nombre, setNombre] = useState(empleado?.nombre ?? '');
  const [rol, setRol] = useState(empleado?.rol ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nombreError, setNombreError] = useState<string | undefined>();

  const save = async () => {
    if (!nombre.trim()) { setNombreError('El nombre es requerido'); return; }
    setSaving(true);
    setError(null);
    try {
      const dto = { nombre: nombre.trim(), rol: emptyToNull(rol) };
      if (empleado) await api.empleados.update(empleado.id, dto);
      else await api.empleados.create(dto);
      await onSaved(empleado ? 'Empleado actualizado' : 'Empleado creado exitosamente');
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  };

  return (
    <Modal
      title={empleado ? 'Editar empleado' : 'Nuevo empleado'}
      open
      onClose={saving ? () => {} : onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="primary" onClick={save} disabled={saving}>
            {saving && <Spinner />}
            {empleado ? 'Guardar cambios' : 'Crear empleado'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <ErrorBanner message={error} />}
        <Input
          label="Nombre completo *"
          value={nombre}
          onChange={e => { setNombre(e.target.value); setNombreError(undefined); }}
          maxLength={150}
          autoFocus
          error={nombreError}
        />
        <div>
          <Input label="Rol" value={rol} onChange={e => setRol(e.target.value)} maxLength={50} list="roles-empleado" placeholder="Coordinador, Programador..." />
          <datalist id="roles-empleado">
            {ROL_SUGERIDOS.map(r => <option key={r} value={r} />)}
          </datalist>
        </div>
      </div>
    </Modal>
  );
}
