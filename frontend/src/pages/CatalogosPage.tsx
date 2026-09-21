import { useState } from 'react';
import { api, errorMessage, type CatalogoItem, type CatalogoKey } from '../api';
import {
  Button, ConfirmModal, ErrorBanner, IconButton, Input, LoadingBlock, Modal, Spinner, PlusIcon, EditIcon, TrashIcon,
} from '../components/ui';
import { useAuth } from '../auth/AuthContext';
import { useCatalogos } from '../context/CatalogosContext';
import { useToast } from '../context/ToastContext';

type CatalogId = 'status' | 'tipo_activacion' | 'bsp' | 'tenencia_sim' | 'app_channel';

const CATALOGOS: { id: CatalogId; label: string; key: CatalogoKey }[] = [
  { id: 'status', label: 'Status', key: 'status-desarrollo' },
  { id: 'tipo_activacion', label: 'Tipo de activación', key: 'tipo-activacion' },
  { id: 'bsp', label: 'BSP (Business Service Provider)', key: 'bsp' },
  { id: 'tenencia_sim', label: 'Tenencia SIM', key: 'tenencia-sim' },
  { id: 'app_channel', label: 'App Channel', key: 'app-channel' },
];

export default function CatalogosPage() {
  const { can } = useAuth();
  const canCreate = can('catalogos', 'crear');
  const canEdit = can('catalogos', 'editar');
  const canDelete = can('catalogos', 'eliminar');

  const c = useCatalogos();
  const toast = useToast();
  const [activeCatalog, setActiveCatalog] = useState<CatalogId>('status');
  const [editing, setEditing] = useState<CatalogoItem | 'new' | null>(null);
  const [toDelete, setToDelete] = useState<CatalogoItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const itemsById: Record<CatalogId, CatalogoItem[]> = {
    status: c.status,
    tipo_activacion: c.tiposActivacion,
    bsp: c.bsps,
    tenencia_sim: c.tenencias,
    app_channel: c.appChannels,
  };

  const catalog = CATALOGOS.find(x => x.id === activeCatalog)!;
  const currentItems = itemsById[activeCatalog];

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.catalogos.remove(catalog.key, toDelete.id);
      toast.success('Valor eliminado');
      await c.reload();
    } catch (e) {
      // Típico: el valor está en uso; el mensaje del servidor dice dónde.
      toast.error(errorMessage(e));
    } finally {
      setToDelete(null);
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-[#1A202C]">Catálogos</h1>
        <p className="text-sm text-[#64748B] mt-0.5">Gestiona los valores de referencia del sistema</p>
      </div>

      {c.error && <ErrorBanner message={c.error} onRetry={() => void c.reload()} />}

      <div className="flex gap-4">
        {/* Catalog nav */}
        <div className="w-56 flex-shrink-0 self-start bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E2E8F0]">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Catálogos</span>
          </div>
          <nav className="py-2">
            {CATALOGOS.map(x => (
              <button
                key={x.id}
                onClick={() => setActiveCatalog(x.id)}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${activeCatalog === x.id ? 'bg-[#e8f7f9] text-[#3FB6C4] font-medium' : 'text-[#64748B] hover:bg-[#F8F9FA]'}`}
              >
                {x.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Catalog content */}
        <div className="flex-1 bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0]">
            <div>
              <h3 className="text-sm font-semibold text-[#1A202C]">{catalog.label}</h3>
              <p className="text-xs text-[#94A3B8]">{currentItems.length} {currentItems.length === 1 ? 'valor' : 'valores'}</p>
            </div>
            {canCreate && <Button variant="primary" onClick={() => setEditing('new')}><PlusIcon /> Agregar</Button>}
          </div>

          {c.loading && currentItems.length === 0 ? <LoadingBlock /> : (
            <div className="divide-y divide-[#F1F5F9]">
              {currentItems.length === 0 && (
                <div className="py-12 text-center text-sm text-[#94A3B8]">Sin valores registrados</div>
              )}
              {currentItems.map((item, i) => (
                <div key={item.id} className="flex items-center justify-between px-5 py-3 group hover:bg-[#FAFAFA] transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#F1F5F9] flex items-center justify-center text-[10px] font-bold text-[#94A3B8]">{i + 1}</span>
                    <span className="text-sm text-[#374151]">{item.nombre}</span>
                  </div>
                  {(canEdit || canDelete) && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      {canEdit && <IconButton onClick={() => setEditing(item)} title="Editar"><EditIcon /></IconButton>}
                      {canDelete && <IconButton onClick={() => setToDelete(item)} className="hover:text-[#DC2626] hover:bg-[#FEE2E2]" title="Eliminar"><TrashIcon /></IconButton>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {editing !== null && (
        <ValorModal
          catalogo={catalog}
          item={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async msg => { setEditing(null); toast.success(msg); await c.reload(); }}
        />
      )}

      <ConfirmModal
        open={toDelete !== null}
        title={`Eliminar de ${catalog.label}`}
        message={<>¿Eliminar <strong>{toDelete?.nombre}</strong>? Si algún registro lo usa, el sistema no permitirá eliminarlo.</>}
        busy={deleting}
        onConfirm={handleDelete}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}

function ValorModal({ catalogo, item, onClose, onSaved }: {
  catalogo: { label: string; key: CatalogoKey };
  item: CatalogoItem | null;
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
  const [nombre, setNombre] = useState(item?.nombre ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | undefined>();

  const save = async () => {
    if (!nombre.trim()) { setFieldError('Escribe el valor'); return; }
    setSaving(true);
    setError(null);
    try {
      if (item) await api.catalogos.update(catalogo.key, item.id, nombre.trim());
      else await api.catalogos.create(catalogo.key, nombre.trim());
      await onSaved(item ? 'Catálogo actualizado' : 'Valor agregado');
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  };

  return (
    <Modal
      title={item ? `Editar: ${catalogo.label}` : `Nuevo: ${catalogo.label}`}
      open
      onClose={saving ? () => {} : onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="primary" onClick={save} disabled={saving}>
            {saving && <Spinner />}
            Guardar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <ErrorBanner message={error} />}
        <Input
          label="Nombre del valor"
          value={nombre}
          onChange={e => { setNombre(e.target.value); setFieldError(undefined); }}
          onKeyDown={e => { if (e.key === 'Enter') void save(); }}
          maxLength={60}
          placeholder="Escribe el valor..."
          autoFocus
          error={fieldError}
        />
      </div>
    </Modal>
  );
}
