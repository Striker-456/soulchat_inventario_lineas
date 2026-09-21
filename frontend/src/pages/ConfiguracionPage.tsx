import { useState } from 'react';
import { ApiError, errorMessage } from '../api';
import { Badge, Button, Card, ErrorBanner, EyeIcon, EyeOffIcon, Input, Spinner } from '../components/ui';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatDateTime } from '../lib/format';

const ROL_LABELS = { Admin: 'Administrador', Editor: 'Editor', Consulta: 'Solo consulta' } as const;

/** Mensaje para mostrar dentro de un formulario: los errores de validación traen el motivo en `details`. */
function mensajeDe(err: unknown): string {
  if (err instanceof ApiError && err.status === 400 && err.details.length > 0) return err.details.join(' ');
  return errorMessage(err);
}

export default function ConfiguracionPage() {
  const { session, logout } = useAuth();
  if (!session) return null;

  const displayName = session.nombre?.trim() || session.email;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1A202C]">Configuración</h1>
        <p className="text-sm text-[#64748B] mt-0.5">Tu cuenta y tu sesión</p>
      </div>

      <div className="max-w-xl space-y-4">
        {/* Perfil */}
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#3FB6C4] to-[#3A7BC8] flex items-center justify-center text-white text-xl font-bold uppercase flex-shrink-0">
              {displayName.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="text-base font-semibold text-[#1A202C] truncate">{displayName}</div>
              <div className="text-xs text-[#64748B] truncate">{session.email}</div>
              <Badge variant="secondary" className="mt-1">{ROL_LABELS[session.rol]}</Badge>
            </div>
          </div>
          <p className="text-xs text-[#94A3B8] mt-4 pt-4 border-t border-[#E2E8F0]">
            Para cambiar cualquier dato de tu cuenta necesitas confirmar tu contraseña actual. Tu sesión expira el {formatDateTime(session.expiresAt)}.
          </p>
        </Card>

        <NombreCard />
        <EmailCard />
        <PasswordCard />

        <div className="flex justify-end pt-2">
          <button onClick={logout} className="text-sm text-[#DC2626] hover:underline">Cerrar sesión</button>
        </div>
      </div>
    </div>
  );
}

// ─── Secciones ────────────────────────────────────────────────────────────────
function NombreCard() {
  const { session, cambiarNombre } = useAuth();
  const toast = useToast();
  const actual = session?.nombre?.trim() ?? '';
  const [nombre, setNombre] = useState(actual);
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ nombre?: string; password?: string }>({});

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v: typeof errors = {};
    if (!nombre.trim()) v.nombre = 'Ingresa tu nombre';
    if (!password) v.password = 'Ingresa tu contraseña actual';
    setErrors(v);
    if (Object.keys(v).length > 0) return;

    setSaving(true);
    setError(null);
    try {
      await cambiarNombre(nombre.trim(), password);
      setPassword('');
      toast.success('Nombre actualizado');
    } catch (err) {
      setError(mensajeDe(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard title="Nombre" description="Así te ven los demás en el sistema." onSubmit={submit}>
      {error && <ErrorBanner message={error} />}
      <Input
        label="Nombre completo"
        value={nombre}
        onChange={e => { setNombre(e.target.value); setErrors(x => ({ ...x, nombre: undefined })); }}
        maxLength={150}
        autoComplete="name"
        error={errors.nombre}
      />
      <PasswordInput
        label="Contraseña actual"
        value={password}
        onChange={v => { setPassword(v); setErrors(x => ({ ...x, password: undefined })); }}
        autoComplete="current-password"
        error={errors.password}
      />
      <SubmitButton saving={saving} disabled={nombre.trim() === actual}>Guardar nombre</SubmitButton>
    </SectionCard>
  );
}

function EmailCard() {
  const { session, cambiarEmail } = useAuth();
  const toast = useToast();
  const actual = session?.email ?? '';
  const [email, setEmail] = useState(actual);
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v: typeof errors = {};
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) v.email = 'Ingresa un correo válido';
    if (!password) v.password = 'Ingresa tu contraseña actual';
    setErrors(v);
    if (Object.keys(v).length > 0) return;

    setSaving(true);
    setError(null);
    try {
      await cambiarEmail(email.trim(), password);
      setPassword('');
      toast.success('Correo actualizado. Úsalo la próxima vez que inicies sesión.');
    } catch (err) {
      setError(mensajeDe(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard title="Correo electrónico" description="Es el que usas para iniciar sesión." onSubmit={submit}>
      {error && <ErrorBanner message={error} />}
      <Input
        label="Correo"
        type="email"
        value={email}
        onChange={e => { setEmail(e.target.value); setErrors(x => ({ ...x, email: undefined })); }}
        maxLength={150}
        autoComplete="email"
        error={errors.email}
      />
      <PasswordInput
        label="Contraseña actual"
        value={password}
        onChange={v => { setPassword(v); setErrors(x => ({ ...x, password: undefined })); }}
        autoComplete="current-password"
        error={errors.password}
      />
      <SubmitButton saving={saving} disabled={email.trim() === actual}>Cambiar correo</SubmitButton>
    </SectionCard>
  );
}

function PasswordCard() {
  const { cambiarPassword } = useAuth();
  const toast = useToast();
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ actual?: string; nueva?: string; confirmar?: string }>({});

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v: typeof errors = {};
    if (!actual) v.actual = 'Ingresa tu contraseña actual';
    if (nueva.length < 8) v.nueva = 'Mínimo 8 caracteres';
    else if (nueva === actual) v.nueva = 'Debe ser distinta de la actual';
    if (confirmar !== nueva) v.confirmar = 'Las contraseñas no coinciden';
    setErrors(v);
    if (Object.keys(v).length > 0) return;

    setSaving(true);
    setError(null);
    try {
      await cambiarPassword(actual, nueva);
      setActual(''); setNueva(''); setConfirmar('');
      toast.success('Contraseña actualizada');
    } catch (err) {
      setError(mensajeDe(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard title="Contraseña" description="Usa al menos 8 caracteres." onSubmit={submit}>
      {error && <ErrorBanner message={error} />}
      <PasswordInput
        label="Contraseña actual"
        value={actual}
        onChange={v => { setActual(v); setErrors(x => ({ ...x, actual: undefined })); }}
        autoComplete="current-password"
        error={errors.actual}
      />
      <PasswordInput
        label="Nueva contraseña"
        value={nueva}
        onChange={v => { setNueva(v); setErrors(x => ({ ...x, nueva: undefined })); }}
        autoComplete="new-password"
        error={errors.nueva}
      />
      <PasswordInput
        label="Confirmar nueva contraseña"
        value={confirmar}
        onChange={v => { setConfirmar(v); setErrors(x => ({ ...x, confirmar: undefined })); }}
        autoComplete="new-password"
        error={errors.confirmar}
      />
      <SubmitButton saving={saving} disabled={!actual && !nueva && !confirmar}>Cambiar contraseña</SubmitButton>
    </SectionCard>
  );
}

// ─── Piezas ───────────────────────────────────────────────────────────────────
function SectionCard({ title, description, onSubmit, children }: {
  title: string;
  description: string;
  onSubmit: (e: React.FormEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-6">
      <h3 className="text-sm font-semibold text-[#1A202C]">{title}</h3>
      <p className="text-xs text-[#94A3B8] mt-0.5 mb-4">{description}</p>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {children}
      </form>
    </Card>
  );
}

function SubmitButton({ saving, disabled, children }: { saving: boolean; disabled?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex justify-end pt-1">
      <Button type="submit" variant="primary" disabled={saving || disabled}>
        {saving && <Spinner />}
        {children}
      </Button>
    </div>
  );
}

function PasswordInput({ label, value, onChange, autoComplete, error }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: 'current-password' | 'new-password';
  error?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-[#374151]">{label}</label>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          autoComplete={autoComplete}
          className={`w-full px-3 py-2 pr-10 text-sm border rounded-md bg-white text-[#1A202C] focus:outline-none focus:ring-2 focus:ring-[#3FB6C4] focus:border-transparent transition ${error ? 'border-[#DC2626]' : 'border-[#E2E8F0]'}`}
        />
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          title={visible ? 'Ocultar' : 'Mostrar'}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B]"
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      {error && <span className="text-xs text-[#DC2626]">{error}</span>}
    </div>
  );
}
