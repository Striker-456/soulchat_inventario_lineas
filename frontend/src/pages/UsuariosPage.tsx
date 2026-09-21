import { useState } from 'react';
import { api, errorMessage, ROLES, type Accion, type Permisos, type Rol, type Usuario } from '../api';
import { Badge, Button, ConfirmModal, ErrorBanner, IconButton, Input, LoadingBlock, Modal, PlusIcon, EditIcon, TrashIcon, Spinner, Toggle } from '../components/ui';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../context/ToastContext';
import { useAsync } from '../lib/useAsync';

const th = 'text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide';

const ROL_INFO: Record<Rol, { label: string; color: string; description: string }> = {
  Admin: { label: 'Administrador', color: 'bg-[#FEE2E2] text-[#B91C1C]', description: 'Acceso total: usuarios y credenciales' },
  Editor: { label: 'Editor', color: 'bg-[#EFF6FF] text-[#3A7BC8]', description: 'Puede crear y modificar líneas y empleados' },
  Consulta: { label: 'Solo consulta', color: 'bg-[#F1F5F9] text-[#475569]', description: 'Solo lectura, sin modificar' },
};

const RolPill = ({ rol }: { rol: Rol }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ROL_INFO[rol].color}`}>{ROL_INFO[rol].label}</span>
);

type ModalState = { kind: 'create' } | { kind: 'edit'; user: Usuario } | { kind: 'password'; user: Usuario } | { kind: 'perms'; user: Usuario } | null;

const totalPermisos = (p: Permisos) => Object.values(p).reduce((n, acciones) => n + acciones.length, 0);

export default function UsuariosPage() {
  const { session } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => api.usuarios.list());
  const [modal, setModal] = useState<ModalState>(null);
  const [toDelete, setToDelete] = useState<Usuario | null>(null);
  const [deleting, setDeleting] = useState(false);

  const users = data ?? [];
  const isSelf = (u: Usuario) => u.email.toLowerCase() === session?.email.toLowerCase();

  const handleToggleActive = async (u: Usuario) => {
    try {
      await api.usuarios.update(u.id, { rol: u.rol, activo: !u.activo });
      toast.success(u.activo ? 'Usuario desactivado' : 'Usuario activado');
      await reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.usuarios.remove(toDelete.id);
      toast.success('Usuario eliminado');
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1A202C]">Usuarios</h1>
          <p className="text-sm text-[#64748B] mt-0.5">{users.length} usuarios registrados · {users.filter(u => u.activo).length} activos</p>
        </div>
        <Button variant="primary" onClick={() => setModal({ kind: 'create' })}>
          <PlusIcon /> Nuevo usuario
        </Button>
      </div>

      {error && <ErrorBanner message={error} onRetry={reload} />}

      {/* Role summary */}
      <div className="grid grid-cols-3 gap-3">
        {ROLES.map(rol => (
          <div key={rol} className="bg-white border border-[#E2E8F0] rounded-xl p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full ${ROL_INFO[rol].color} flex items-center justify-center text-sm font-bold`}>
              {users.filter(u => u.rol === rol).length}
            </div>
            <div>
              <div className="text-xs font-semibold text-[#374151]">{ROL_INFO[rol].label}</div>
              <div className="text-[10px] text-[#94A3B8]">{ROL_INFO[rol].description}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Users table */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
        {loading && !data ? <LoadingBlock /> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F8F9FA] border-b border-[#E2E8F0]">
                <th className={`${th} px-5`}>Usuario</th>
                <th className={th}>Rol</th>
                <th className={th}>Estado</th>
                <th className={th}>Permisos</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {users.length === 0 && (
                <tr><td colSpan={5} className="text-center py-12 text-sm text-[#94A3B8]">Sin usuarios registrados</td></tr>
              )}
              {users.map(u => (
                <tr key={u.id} className="hover:bg-[#FAFAFA] transition-colors group">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold uppercase ${u.activo ? 'bg-gradient-to-br from-[#3FB6C4] to-[#3A7BC8] text-white' : 'bg-[#F1F5F9] text-[#94A3B8]'}`}>
                        {(u.nombre?.trim() || u.email).charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-[#1A202C]">
                          {u.nombre?.trim() || <span className="text-[#94A3B8] italic font-normal">Sin nombre</span>}
                          {isSelf(u) && <span className="ml-2 text-[10px] font-normal text-[#94A3B8]">(tú)</span>}
                        </div>
                        <div className="text-xs text-[#94A3B8]">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><RolPill rol={u.rol} /></td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleActive(u)}
                      disabled={isSelf(u)}
                      title={isSelf(u) ? 'No puedes desactivar tu propia cuenta' : u.activo ? 'Desactivar' : 'Activar'}
                      className={`flex items-center gap-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed ${u.activo ? 'text-[#16A34A]' : 'text-[#94A3B8]'}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${u.activo ? 'bg-[#16A34A]' : 'bg-[#CBD5E1]'}`} />
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setModal({ kind: 'perms', user: u })}
                      className="flex items-center gap-1.5 text-xs text-[#3A7BC8] hover:underline"
                      title="Administrar permisos"
                    >
                      <ShieldIcon />
                      {u.rol === 'Admin' ? 'Acceso total' : `${totalPermisos(u.permisos)} permisos activos`}
                    </button>
                    {u.permisosPersonalizados && <Badge variant="warning" className="mt-1">Personalizado</Badge>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      <IconButton onClick={() => setModal({ kind: 'perms', user: u })} title="Permisos"><ShieldIcon /></IconButton>
                      <IconButton onClick={() => setModal({ kind: 'password', user: u })} title="Restablecer contraseña"><KeyIcon /></IconButton>
                      <IconButton onClick={() => setModal({ kind: 'edit', user: u })} title="Editar"><EditIcon /></IconButton>
                      {!isSelf(u) && (
                        <IconButton onClick={() => setToDelete(u)} className="hover:text-[#DC2626] hover:bg-[#FEE2E2]" title="Eliminar"><TrashIcon /></IconButton>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal?.kind === 'create' && (
        <UserFormModal onClose={() => setModal(null)} onSaved={async () => { setModal(null); toast.success('Usuario creado exitosamente'); await reload(); }} />
      )}
      {modal?.kind === 'edit' && (
        <UserFormModal
          user={modal.user}
          isSelf={isSelf(modal.user)}
          onClose={() => setModal(null)}
          onSaved={async () => { setModal(null); toast.success('Usuario actualizado'); await reload(); }}
        />
      )}
      {modal?.kind === 'perms' && (
        <PermissionsModal
          user={modal.user}
          onClose={() => setModal(null)}
          onSaved={async msg => { setModal(null); toast.success(msg); await reload(); }}
        />
      )}
      {modal?.kind === 'password' && (
        <ResetPasswordModal user={modal.user} onClose={() => setModal(null)} onSaved={() => { setModal(null); toast.success('Contraseña restablecida'); }} />
      )}

      <ConfirmModal
        open={toDelete !== null}
        title="Eliminar usuario"
        message={<>¿Eliminar a <strong>{toDelete?.email}</strong>? Perderá el acceso al sistema de inmediato.</>}
        busy={deleting}
        onConfirm={handleDelete}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}

// ─── Alta / edición ───────────────────────────────────────────────────────────
function UserFormModal({ user, isSelf, onClose, onSaved }: {
  user?: Usuario;
  isSelf?: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [nombre, setNombre] = useState(user?.nombre ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [rol, setRol] = useState<Rol>(user?.rol ?? 'Consulta');
  const [activo, setActivo] = useState(user?.activo ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ nombre?: string; email?: string; password?: string }>({});

  const save = async () => {
    const e: typeof errors = {};
    // El nombre es obligatorio al crear; al editar solo si la cuenta ya lo tiene o se escribe uno.
    if (!nombre.trim() && (!user || user.nombre)) e.nombre = 'Ingresa el nombre de la persona';
    if (!user) {
      if (!/^\S+@\S+\.\S+$/.test(email.trim())) e.email = 'Ingresa un correo válido';
      if (password.length < 8) e.password = 'Mínimo 8 caracteres';
    }
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setSaving(true);
    setError(null);
    try {
      if (user) await api.usuarios.update(user.id, { rol, activo, nombre: nombre.trim() || undefined });
      else await api.usuarios.create({ nombre: nombre.trim(), email: email.trim(), password, rol });
      await onSaved();
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  };

  return (
    <Modal
      title={user ? 'Editar usuario' : 'Nuevo usuario'}
      open
      onClose={saving ? () => {} : onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="primary" onClick={save} disabled={saving}>
            {saving && <Spinner />}
            {user ? 'Guardar cambios' : 'Crear usuario'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <ErrorBanner message={error} />}

        <Input
          label="Nombre completo *"
          value={nombre}
          onChange={e => { setNombre(e.target.value); setErrors(x => ({ ...x, nombre: undefined })); }}
          placeholder="Nombre y apellido"
          maxLength={150}
          autoFocus
          error={errors.nombre}
        />

        <Input
          label="Correo electrónico"
          type="email"
          value={email}
          onChange={e => { setEmail(e.target.value); setErrors(x => ({ ...x, email: undefined })); }}
          placeholder="usuario@soulchat.mx"
          maxLength={150}
          disabled={!!user}
          hint={user ? 'Cada persona cambia su propio correo desde Configuración.' : undefined}
          error={errors.email}
        />

        {!user && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#374151]">Contraseña inicial</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={e => { setPassword(e.target.value); setErrors(x => ({ ...x, password: undefined })); }}
                placeholder="Mínimo 8 caracteres"
                className={`w-full px-3 py-2 pr-10 text-sm border rounded-md bg-white text-[#1A202C] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#3FB6C4] ${errors.password ? 'border-[#DC2626]' : 'border-[#E2E8F0]'}`}
              />
              <button type="button" onClick={() => setShowPwd(v => !v)} title={showPwd ? 'Ocultar' : 'Mostrar'} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B]">
                <EyeToggleIcon off={showPwd} />
              </button>
            </div>
            {errors.password && <span className="text-xs text-[#DC2626]">{errors.password}</span>}
          </div>
        )}

        {/* Role selector */}
        <div>
          <label className="text-xs font-medium text-[#374151] block mb-2">Rol</label>
          <div className="grid grid-cols-3 gap-2">
            {ROLES.map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setRol(r)}
                className={`p-3 rounded-lg border text-left transition-all ${rol === r ? 'border-[#3FB6C4] bg-[#e8f7f9]' : 'border-[#E2E8F0] hover:bg-[#F8F9FA]'}`}
              >
                <div className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium mb-1 ${ROL_INFO[r].color}`}>{ROL_INFO[r].label}</div>
                <div className="text-[10px] text-[#94A3B8] leading-relaxed">{ROL_INFO[r].description}</div>
              </button>
            ))}
          </div>
        </div>

        {user && user.rol !== rol && (
          <p className="text-xs text-[#B45309] bg-[#FEF3C7] rounded-lg px-3 py-2">
            Al cambiar el rol, los permisos del usuario vuelven a la plantilla del nuevo rol.
          </p>
        )}

        {user && (
          <div className="flex items-center justify-between p-3 bg-[#F8F9FA] rounded-lg">
            <div>
              <div className="text-sm font-medium text-[#374151]">Usuario activo</div>
              <div className="text-xs text-[#94A3B8]">
                {isSelf ? 'No puedes desactivar tu propia cuenta' : 'Los usuarios inactivos no pueden iniciar sesión'}
              </div>
            </div>
            {isSelf ? <Toggle checked={activo} onChange={() => {}} /> : <Toggle checked={activo} onChange={setActivo} />}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Restablecer contraseña ───────────────────────────────────────────────────
function ResetPasswordModal({ user, onClose, onSaved }: { user: Usuario; onClose: () => void; onSaved: () => void }) {
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | undefined>();

  const save = async () => {
    if (password.length < 8) { setFieldError('Mínimo 8 caracteres'); return; }
    setSaving(true);
    setError(null);
    try {
      await api.usuarios.resetPassword(user.id, password);
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Restablecer contraseña"
      open
      onClose={saving ? () => {} : onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="primary" onClick={save} disabled={saving}>
            {saving && <Spinner />}
            Restablecer
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <ErrorBanner message={error} />}
        <p className="text-sm text-[#64748B]">Define una nueva contraseña para <strong className="text-[#1A202C]">{user.email}</strong>.</p>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[#374151]">Nueva contraseña</label>
          <div className="relative">
            <input
              type={showPwd ? 'text' : 'password'}
              autoComplete="new-password"
              autoFocus
              value={password}
              onChange={e => { setPassword(e.target.value); setFieldError(undefined); }}
              placeholder="Mínimo 8 caracteres"
              className={`w-full px-3 py-2 pr-10 text-sm border rounded-md bg-white text-[#1A202C] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#3FB6C4] ${fieldError ? 'border-[#DC2626]' : 'border-[#E2E8F0]'}`}
            />
            <button type="button" onClick={() => setShowPwd(v => !v)} title={showPwd ? 'Ocultar' : 'Mostrar'} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B]">
              <EyeToggleIcon off={showPwd} />
            </button>
          </div>
          {fieldError && <span className="text-xs text-[#DC2626]">{fieldError}</span>}
        </div>
      </div>
    </Modal>
  );
}

// ─── Permisos ─────────────────────────────────────────────────────────────────
const ACCION_LABEL: Record<Accion, string> = { ver: 'Ver', crear: 'Crear', editar: 'Editar', eliminar: 'Eliminar' };
const ACCION_COLOR: Record<Accion, string> = { ver: 'text-[#3A7BC8]', crear: 'text-[#16A34A]', editar: 'text-[#D97706]', eliminar: 'text-[#DC2626]' };
const PLANTILLAS: { rol: Rol; label: string }[] = [
  { rol: 'Admin', label: 'Acceso completo' },
  { rol: 'Editor', label: 'Editor' },
  { rol: 'Consulta', label: 'Solo consulta' },
];

/** Copia y aplica la misma regla que el servidor: cualquier acción exige "ver"; quitar "ver" quita todo. */
function conReglas(acciones: string[], accion: Accion, activar: boolean, tieneVer: boolean): string[] {
  let next = activar ? [...new Set([...acciones, accion])] : acciones.filter(a => a !== accion);
  if (activar && accion !== 'ver' && tieneVer) next = [...new Set([...next, 'ver'])];
  if (!activar && accion === 'ver') next = [];
  return next;
}

function PermissionsModal({ user, onClose, onSaved }: {
  user: Usuario;
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
  const { data: catalogo, loading, error: loadError } = useAsync(() => api.usuarios.permisosCatalogo());
  const [perms, setPerms] = useState<Permisos>(() => JSON.parse(JSON.stringify(user.permisos)) as Permisos);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const esAdmin = user.rol === 'Admin';
  const total = totalPermisos(perms);

  const toggle = (modulo: string, accion: Accion, tieneVer: boolean) => {
    const actuales = perms[modulo] ?? [];
    setPerms(p => ({ ...p, [modulo]: conReglas(actuales, accion, !actuales.includes(accion), tieneVer) }));
  };

  const toggleModulo = (modulo: string, acciones: Accion[]) => {
    const todas = acciones.every(a => (perms[modulo] ?? []).includes(a));
    setPerms(p => ({ ...p, [modulo]: todas ? [] : [...acciones] }));
  };

  const aplicarPlantilla = (rol: Rol) => {
    if (catalogo) setPerms(JSON.parse(JSON.stringify(catalogo.plantillas[rol])) as Permisos);
  };

  const run = async (fn: () => Promise<unknown>, mensaje: string) => {
    setSaving(true);
    setError(null);
    try {
      await fn();
      await onSaved(mensaje);
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  };

  return (
    <Modal
      title={`Permisos — ${user.email}`}
      open
      wide
      onClose={saving ? () => {} : onClose}
      footer={
        <>
          {!esAdmin && user.permisosPersonalizados && (
            <Button variant="ghost" className="mr-auto" disabled={saving} onClick={() => run(() => api.usuarios.resetPermisos(user.id), 'Permisos restablecidos a la plantilla del rol')}>
              Restablecer a la plantilla de {user.rol}
            </Button>
          )}
          <Button variant="outline" onClick={onClose} disabled={saving}>{esAdmin ? 'Cerrar' : 'Cancelar'}</Button>
          {!esAdmin && (
            <Button variant="primary" disabled={saving || !catalogo} onClick={() => run(() => api.usuarios.setPermisos(user.id, perms), 'Permisos actualizados')}>
              {saving && <Spinner />}
              Guardar permisos
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        {error && <ErrorBanner message={error} />}
        {loadError && <ErrorBanner message={loadError} />}

        {esAdmin ? (
          <p className="text-sm text-[#374151] bg-[#F8F9FA] rounded-lg px-4 py-3">
            Los administradores siempre tienen acceso total y sus permisos no se pueden limitar (así nadie se queda sin poder administrar el sistema).
            Para personalizar los permisos de este usuario, cámbiale primero el rol a Editor o Consulta.
          </p>
        ) : loading && !catalogo ? <LoadingBlock /> : catalogo && (
          <>
            <div>
              <p className="text-xs font-medium text-[#64748B] mb-2">Aplicar plantilla</p>
              <div className="flex gap-2 flex-wrap">
                {PLANTILLAS.map(p => (
                  <button
                    key={p.rol}
                    type="button"
                    onClick={() => aplicarPlantilla(p.rol)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border bg-white border-[#E2E8F0] text-[#64748B] hover:bg-[#F8F9FA] transition-all"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-[#94A3B8] border-t border-[#F1F5F9] pt-3">
              <span>Haz clic para activar o desactivar. Crear, editar o eliminar implican poder ver el módulo.</span>
              <span className="font-semibold text-[#3A7BC8] whitespace-nowrap ml-3">{total} activos</span>
            </div>

            <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
              {catalogo.modulos.map(m => {
                const activas = perms[m.clave] ?? [];
                const tieneVer = m.acciones.includes('ver');
                const todas = m.acciones.every(a => activas.includes(a));
                return (
                  <div key={m.clave} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#F8F9FA]">
                    <button
                      type="button"
                      onClick={() => toggleModulo(m.clave, m.acciones)}
                      title={todas ? 'Quitar todo' : 'Conceder todo'}
                      aria-label={`${todas ? 'Quitar' : 'Conceder'} todos los permisos de ${m.etiqueta}`}
                      className={`w-4 h-4 rounded border-2 flex-shrink-0 transition-colors ${todas ? 'bg-[#3FB6C4] border-[#3FB6C4]' : 'border-[#CBD5E1]'}`}
                    >
                      {todas && <svg className="w-full h-full text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </button>
                    <span className="text-xs font-medium text-[#374151] w-40 flex-shrink-0">{m.etiqueta}</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {m.acciones.map(accion => {
                        const on = activas.includes(accion);
                        return (
                          <button
                            key={accion}
                            type="button"
                            aria-pressed={on}
                            onClick={() => toggle(m.clave, accion, tieneVer)}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all ${
                              on ? `${ACCION_COLOR[accion]} bg-current/10 border-current/20` : 'text-[#CBD5E1] border-[#F1F5F9] bg-[#F8F9FA]'
                            }`}
                          >
                            {on && <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                            {ACCION_LABEL[accion]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function ShieldIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

// ─── Iconos ───────────────────────────────────────────────────────────────────
function KeyIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  );
}

function EyeToggleIcon({ off }: { off: boolean }) {
  return off ? (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
  ) : (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
  );
}
