/** El backend serializa DateTime en UTC; si llega sin zona horaria lo tratamos como UTC. */
export function parseServerDate(value: string): Date {
  const hasZone = /(Z|[+-]\d{2}:?\d{2})$/.test(value);
  return new Date(hasZone ? value : `${value}Z`);
}

const pad = (n: number) => String(n).padStart(2, '0');

/** "2026-09-21 14:32" en hora local. */
export function formatDateTime(value: string): string {
  const d = parseServerDate(value);
  if (Number.isNaN(d.getTime())) return value;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "2026-09-21 14:32:11" en hora local (los logs necesitan los segundos). */
export function formatDateTimeSeconds(value: string): string {
  const d = parseServerDate(value);
  if (Number.isNaN(d.getTime())) return value;
  return `${formatDateTime(value)}:${pad(d.getSeconds())}`;
}

/** "Hace 2 min", "Hace 3 h", "Ayer 18:42" o la fecha completa si es más antigua. */
export function formatRelative(value: string): string {
  const d = parseServerDate(value);
  if (Number.isNaN(d.getTime())) return value;

  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return 'Hace un momento';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Hace ${diffH} h`;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `Ayer ${pad(d.getHours())}:${pad(d.getMinutes())}`;

  return formatDateTime(value);
}

/** Minúsculas y sin acentos, para comparar nombres de catálogo ("Producción" → "produccion"). */
export function normalize(text: string | null | undefined): string {
  return (text ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

/** Cadena vacía → null, para enviar campos opcionales a la API. */
export function emptyToNull(value: string): string | null {
  const v = value.trim();
  return v === '' ? null : v;
}

/** "" → null, "7" → 7. Para los <select> de catálogos opcionales. */
export function toIdOrNull(value: string): number | null {
  return value === '' ? null : Number(value);
}

export const idToString = (id: number | null | undefined): string => (id == null ? '' : String(id));
