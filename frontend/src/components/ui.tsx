import React, { useState, useRef, useEffect } from 'react';
import { normalize } from '../lib/format';

// ─── Badge ────────────────────────────────────────────────────────────────────
export type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral' | 'primary' | 'secondary';

const badgeStyles: Record<BadgeVariant, string> = {
  success: 'bg-[#DCFCE7] text-[#15803D]',
  warning: 'bg-[#FEF3C7] text-[#B45309]',
  danger: 'bg-[#FEE2E2] text-[#B91C1C]',
  neutral: 'bg-[#F1F5F9] text-[#475569]',
  primary: 'bg-[#e8f7f9] text-[#2fa0ad]',
  secondary: 'bg-[#EFF6FF] text-[#3A7BC8]',
};

export function Badge({ variant = 'neutral', children, className = '' }: { variant?: BadgeVariant; children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badgeStyles[variant]} ${className}`}>
      {children}
    </span>
  );
}

/** Color del status según su nombre en el catálogo (status_desarrollo). Desconocidos → neutral. */
export function statusVariant(nombre: string | null | undefined): BadgeVariant {
  switch (normalize(nombre)) {
    case 'produccion': return 'success';
    case 'en desarrollo': return 'warning';
    case 'cancelado': return 'danger';
    default: return 'neutral';
  }
}

export function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <Badge variant="neutral">Sin status</Badge>;
  return <Badge variant={statusVariant(status)}>{status}</Badge>;
}

// ─── Button ───────────────────────────────────────────────────────────────────
type BtnVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';

const btnBase = 'inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed';
const btnStyles: Record<BtnVariant, string> = {
  primary: 'bg-[#3FB6C4] text-white hover:bg-[#2fa0ad] focus:ring-[#3FB6C4]',
  secondary: 'bg-[#3A7BC8] text-white hover:bg-[#2d62a8] focus:ring-[#3A7BC8]',
  outline: 'bg-white text-[#1A202C] border border-[#E2E8F0] hover:bg-[#F8F9FA] focus:ring-[#3FB6C4]',
  danger: 'bg-[#DC2626] text-white hover:bg-[#B91C1C] focus:ring-[#DC2626]',
  ghost: 'bg-transparent text-[#64748B] hover:bg-[#F1F5F9] focus:ring-[#3FB6C4]',
};

export function Button({ variant = 'primary', className = '', children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  return (
    <button className={`${btnBase} ${btnStyles[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function IconButton({ className = '', children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`p-1.5 rounded-md text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1A202C] transition-colors focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${className}`} {...props}>
      {children}
    </button>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  /** Clases del contenedor (p. ej. `col-span-2` dentro de un grid). */
  wrapperClassName?: string;
}

export function Input({ label, error, hint, className = '', wrapperClassName = '', ...props }: InputProps) {
  return (
    <div className={`flex flex-col gap-1 ${wrapperClassName}`}>
      {label && <label className="text-xs font-medium text-[#374151]">{label}</label>}
      <input
        className={`w-full px-3 py-2 text-sm border rounded-md bg-white text-[#1A202C] placeholder-[#94A3B8] border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#3FB6C4] focus:border-transparent transition ${error ? 'border-[#DC2626]' : ''} ${className}`}
        {...props}
      />
      {hint && !error && <span className="text-xs text-[#94A3B8]">{hint}</span>}
      {error && <span className="text-xs text-[#DC2626]">{error}</span>}
    </div>
  );
}

// ─── Masked / Credential Input ─────────────────────────────────────────────────
/**
 * Cambio pendiente sobre una credencial cifrada en el backend.
 * En los PUT: `keep` → null (no cambiar), `clear` → "" (borrar), `set` → valor nuevo.
 */
export type CredentialChange = { mode: 'keep' } | { mode: 'clear' } | { mode: 'set'; value: string };

export const KEEP_CREDENTIAL: CredentialChange = { mode: 'keep' };

/** Convierte el cambio pendiente al valor que espera la API. */
export function credentialToPayload(c: CredentialChange): string | null {
  if (c.mode === 'keep') return null;
  if (c.mode === 'clear') return '';
  return c.value;
}

interface CredentialFieldProps {
  label: string;
  /** Valor enmascarado que devuelve la API (null = sin valor guardado). */
  masked: string | null;
  /** Valor en texto plano, disponible solo tras "revelar" (rol Admin). */
  revealed?: string | null;
  change: CredentialChange;
  onChange: (c: CredentialChange) => void;
  /** Si es false (rol sin permiso) no se ofrece ver ni copiar el valor real. */
  canReveal: boolean;
  /** Pide al backend los valores reales. Resuelve true si se obtuvieron (y ya están en `revealed`). */
  onReveal?: () => Promise<boolean>;
  /** Permite borrar el valor guardado (campos opcionales). */
  clearable?: boolean;
  placeholder?: string;
}

/**
 * Campo de credencial para líneas existentes: muestra el valor enmascarado, permite revelarlo
 * (solo Admin), copiarlo y reemplazarlo. Para líneas nuevas usa `CredentialCreateInput`.
 */
export function CredentialField({ label, masked, revealed, change, onChange, canReveal, onReveal, clearable, placeholder }: CredentialFieldProps) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const editing = change.mode === 'set' || change.mode === 'clear';
  const hasStored = masked != null && masked !== '';
  const shown = revealed ?? masked ?? '';

  const toggleVisible = async () => {
    if (visible) return setVisible(false);
    if (revealed === undefined && onReveal) {
      setBusy(true);
      let ok = false;
      try { ok = await onReveal(); } finally { setBusy(false); }
      if (!ok) return;
    }
    setVisible(true);
  };

  const handleCopy = async () => {
    if (!revealed) return;
    await navigator.clipboard.writeText(revealed);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-[#374151]">{label}</label>

      {editing ? (
        <div className="flex items-center gap-1">
          <input
            autoFocus
            type="password"
            autoComplete="new-password"
            value={change.mode === 'set' ? change.value : ''}
            disabled={change.mode === 'clear'}
            onChange={e => onChange({ mode: 'set', value: e.target.value })}
            placeholder={change.mode === 'clear' ? 'Se borrará al guardar' : placeholder ?? 'Nuevo valor'}
            className="flex-1 min-w-0 px-3 py-2 text-sm border rounded-md bg-white text-[#1A202C] placeholder-[#94A3B8] border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#3FB6C4] font-mono disabled:bg-[#F8F9FA]"
          />
          <button type="button" onClick={() => onChange(KEEP_CREDENTIAL)} className="px-2 py-1 text-xs text-[#64748B] hover:text-[#1A202C] underline">
            Cancelar
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <input
            readOnly
            type={visible ? 'text' : 'password'}
            value={hasStored ? shown : ''}
            placeholder={hasStored ? undefined : 'Sin valor'}
            className="flex-1 min-w-0 px-3 py-2 text-sm border rounded-md bg-[#F8F9FA] text-[#1A202C] border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#3FB6C4] font-mono"
          />
          {hasStored && canReveal && (
            <>
              <IconButton type="button" onClick={toggleVisible} disabled={busy} title={visible ? 'Ocultar' : 'Mostrar'}>
                {visible ? <EyeOffIcon /> : <EyeIcon />}
              </IconButton>
              <IconButton type="button" onClick={handleCopy} disabled={!revealed} title={revealed ? 'Copiar' : 'Muestra el valor para copiarlo'}>
                {copied ? <CheckIcon className="text-[#16A34A]" /> : <CopyIcon />}
              </IconButton>
            </>
          )}
          <IconButton type="button" onClick={() => onChange({ mode: 'set', value: '' })} title={hasStored ? 'Cambiar valor' : 'Definir valor'}>
            <EditIcon />
          </IconButton>
          {clearable && hasStored && (
            <IconButton type="button" onClick={() => onChange({ mode: 'clear' })} className="hover:text-[#DC2626] hover:bg-[#FEE2E2]" title="Borrar valor">
              <TrashIcon />
            </IconButton>
          )}
        </div>
      )}
      {change.mode === 'set' && change.value === '' && hasStored && (
        <span className="text-xs text-[#94A3B8]">Déjalo vacío para conservar el valor actual.</span>
      )}
    </div>
  );
}

/** Credencial para una configuración nueva: se escribe directamente (con opción de mostrar). */
export function CredentialCreateInput({ label, value, onChange, placeholder, required, error }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean; error?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-[#374151]">{label}{required && <span className="text-[#DC2626]"> *</span>}</label>
      <div className="flex items-center gap-1">
        <input
          type={visible ? 'text' : 'password'}
          autoComplete="new-password"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder ?? '••••••••'}
          className={`flex-1 min-w-0 px-3 py-2 text-sm border rounded-md bg-white text-[#1A202C] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#3FB6C4] font-mono ${error ? 'border-[#DC2626]' : 'border-[#E2E8F0]'}`}
        />
        <IconButton type="button" onClick={() => setVisible(v => !v)} title={visible ? 'Ocultar' : 'Mostrar'}>
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </IconButton>
      </div>
      {error && <span className="text-xs text-[#DC2626]">{error}</span>}
    </div>
  );
}

// ─── Select ───────────────────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
  /** Clases del contenedor (p. ej. `col-span-2` dentro de un grid). */
  wrapperClassName?: string;
  error?: string;
}

export function Select({ label, options, className = '', wrapperClassName = '', error, ...props }: SelectProps) {
  return (
    <div className={`flex flex-col gap-1 ${wrapperClassName}`}>
      {label && <label className="text-xs font-medium text-[#374151]">{label}</label>}
      <select
        className={`w-full px-3 py-2 text-sm border rounded-md bg-white text-[#1A202C] focus:outline-none focus:ring-2 focus:ring-[#3FB6C4] appearance-none ${error ? 'border-[#DC2626]' : 'border-[#E2E8F0]'} ${className}`}
        {...props}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <span className="text-xs text-[#DC2626]">{error}</span>}
    </div>
  );
}

// ─── Textarea ─────────────────────────────────────────────────────────────────
export function Textarea({ label, wrapperClassName = '', className = '', ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; wrapperClassName?: string }) {
  return (
    <div className={`flex flex-col gap-1 ${wrapperClassName}`}>
      {label && <label className="text-xs font-medium text-[#374151]">{label}</label>}
      <textarea
        rows={3}
        className={`w-full px-3 py-2 text-sm border rounded-md bg-white text-[#1A202C] placeholder-[#94A3B8] border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#3FB6C4] focus:border-transparent resize-none ${className}`}
        {...props}
      />
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#3FB6C4] focus:ring-offset-1 ${checked ? 'bg-[#3FB6C4]' : 'bg-[#CBD5E1]'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>
      {label && <span className="text-sm text-[#374151]">{label}</span>}
    </label>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
export function Tabs({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) {
  return (
    <div className="flex border-b border-[#E2E8F0]">
      {tabs.map(tab => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors focus:outline-none ${
            active === tab
              ? 'border-[#3FB6C4] text-[#3FB6C4]'
              : 'border-transparent text-[#64748B] hover:text-[#1A202C]'
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export function Modal({ title, open, onClose, children, footer, wide }: { title: string; open: boolean; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative z-10 bg-white rounded-xl shadow-2xl w-full mx-4 max-h-[90vh] flex flex-col ${wide ? 'max-w-3xl' : 'max-w-lg'}`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
          <h3 className="text-base font-semibold text-[#1A202C]">{title}</h3>
          <IconButton onClick={onClose}><XIcon /></IconButton>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-[#E2E8F0] flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
export function Toast({ message, type = 'success', onClose }: { message: string; type?: 'success' | 'error' | 'info'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, type === 'error' ? 7000 : 3000); return () => clearTimeout(t); }, [onClose, type]);
  const styles = { success: 'bg-[#DCFCE7] text-[#15803D] border-[#16A34A]', error: 'bg-[#FEE2E2] text-[#B91C1C] border-[#DC2626]', info: 'bg-[#e8f7f9] text-[#2fa0ad] border-[#3FB6C4]' };
  return (
    <div role={type === 'error' ? 'alert' : 'status'} className={`fixed bottom-6 right-6 z-[60] flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg text-sm font-medium max-w-md ${styles[type]}`}>
      {type === 'success' && <CheckIcon />}
      {message}
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100"><XIcon /></button>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-[#F1F5F9] flex items-center justify-center mb-4">
        <InboxIcon className="w-8 h-8 text-[#94A3B8]" />
      </div>
      <h4 className="text-sm font-semibold text-[#374151] mb-1">{title}</h4>
      {description && <p className="text-xs text-[#94A3B8] mb-4 max-w-xs">{description}</p>}
      {action}
    </div>
  );
}

// ─── Loading / Error / Confirm ────────────────────────────────────────────────
export function Spinner({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export function LoadingBlock({ label = 'Cargando...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#94A3B8]" role="status">
      <Spinner className="w-5 h-5 text-[#3FB6C4]" />
      {label}
    </div>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3 p-3 bg-[#FEE2E2] border border-[#DC2626]/20 rounded-lg text-sm text-[#B91C1C]" role="alert">
      <span>{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="text-xs font-medium underline whitespace-nowrap hover:text-[#7F1D1D]">
          Reintentar
        </button>
      )}
    </div>
  );
}

export function ConfirmModal({ open, title, message, confirmLabel = 'Eliminar', busy, onConfirm, onClose }: {
  open: boolean; title: string; message: React.ReactNode; confirmLabel?: string; busy?: boolean; onConfirm: () => void; onClose: () => void;
}) {
  return (
    <Modal
      title={title}
      open={open}
      onClose={busy ? () => {} : onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button variant="danger" onClick={onConfirm} disabled={busy}>
            {busy && <Spinner />}
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-[#374151] leading-relaxed">{message}</p>
    </Modal>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 flex flex-col gap-1">
      <span className="text-xs font-medium text-[#64748B] uppercase tracking-wide">{label}</span>
      <span className={`text-3xl font-bold ${accent ?? 'text-[#1A202C]'}`}>{value}</span>
      {sub && <span className="text-xs text-[#94A3B8]">{sub}</span>}
    </div>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────
export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-xl border border-[#E2E8F0] ${className}`}>{children}</div>;
}

export function CardHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0]">
      <h3 className="text-sm font-semibold text-[#1A202C]">{title}</h3>
      {action}
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────
export function Pagination({ page, total, perPage, onChange }: { page: number; total: number; perPage: number; onChange: (p: number) => void }) {
  const pages = Math.ceil(total / perPage);
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-[#E2E8F0] text-sm text-[#64748B]">
      <span>Mostrando {Math.min((page - 1) * perPage + 1, total)}–{Math.min(page * perPage, total)} de {total} registros</span>
      <div className="flex items-center gap-1">
        <Button variant="outline" className="px-2 py-1 text-xs" disabled={page <= 1} onClick={() => onChange(page - 1)}>‹ Anterior</Button>
        {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map(p => (
          <button key={p} onClick={() => onChange(p)} className={`w-8 h-8 rounded text-xs font-medium ${p === page ? 'bg-[#3FB6C4] text-white' : 'text-[#64748B] hover:bg-[#F1F5F9]'}`}>{p}</button>
        ))}
        <Button variant="outline" className="px-2 py-1 text-xs" disabled={page >= pages} onClick={() => onChange(page + 1)}>Siguiente ›</Button>
      </div>
    </div>
  );
}

// ─── Collapsible Section ─────────────────────────────────────────────────────
export function CollapsibleSection({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-[#E2E8F0] rounded-lg overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-4 py-3 bg-[#F8F9FA] text-sm font-semibold text-[#374151] hover:bg-[#F1F5F9] transition-colors">
        {title}
        <ChevronIcon className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="p-4 grid grid-cols-2 gap-4">{children}</div>}
    </div>
  );
}

// ─── Dropdown Filter ─────────────────────────────────────────────────────────
export function FilterDropdown({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-2 text-sm border border-[#E2E8F0] rounded-md bg-white text-[#374151] hover:bg-[#F8F9FA] transition-colors"
      >
        <span className="text-[#94A3B8]">{label}:</span>
        <span className="font-medium">{value || 'Todos'}</span>
        <ChevronIcon className="w-3 h-3 text-[#94A3B8]" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-[#E2E8F0] rounded-lg shadow-lg z-10 py-1">
          <button onClick={() => { onChange(''); setOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-[#64748B] hover:bg-[#F8F9FA]">Todos</button>
          {options.map(o => (
            <button key={o} onClick={() => { onChange(o); setOpen(false); }} className={`w-full text-left px-3 py-2 text-sm hover:bg-[#F8F9FA] ${value === o ? 'text-[#3FB6C4] font-medium' : 'text-[#374151]'}`}>{o}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────
export const EyeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

export const EyeOffIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
);

export const CopyIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

export const CheckIcon = ({ className = '' }: { className?: string }) => (
  <svg className={`w-4 h-4 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

export const XIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export const ChevronIcon = ({ className = '' }: { className?: string }) => (
  <svg className={`w-4 h-4 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

export const InboxIcon = ({ className = '' }: { className?: string }) => (
  <svg className={`${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
  </svg>
);

export const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

export const SearchIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

export const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

export const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

export const EyeViewIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);
