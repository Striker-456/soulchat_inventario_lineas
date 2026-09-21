// Cliente HTTP mínimo sobre fetch para hablar con la API de SoulChat.

const BASE_URL = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/+$/, '');

/** Error devuelto por la API (o de red, con status 0). */
export class ApiError extends Error {
  readonly status: number;
  /** Mensajes de validación aplanados (FluentValidation), si los hay. */
  readonly details: string[];

  constructor(status: number, message: string, details: string[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }

  /** Mensaje listo para mostrar al usuario, incluyendo detalles de validación. */
  get userMessage(): string {
    return this.details.length > 0 ? `${this.message} ${this.details.join(' · ')}` : this.message;
  }
}

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;
let onForbidden: (() => void) | null = null;

/**
 * Token JWT que se adjunta a cada petición. Debe fijarse de forma síncrona (no en un efecto):
 * los componentes hijos piden datos en su primer efecto, antes que cualquier efecto del padre.
 */
export function setAuthToken(token: string | null) {
  authToken = token;
}

/** Qué hacer cuando la API responde 401 a una petición que sí llevaba token (sesión vencida). */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

/** Qué hacer ante un 403: normalmente refrescar los permisos, porque el administrador pudo haberlos cambiado. */
export function setForbiddenHandler(handler: (() => void) | null) {
  onForbidden = handler;
}

function flattenErrors(errors: unknown): string[] {
  if (!errors || typeof errors !== 'object') return [];
  return Object.values(errors as Record<string, unknown>).flatMap(v =>
    Array.isArray(v) ? v.filter((m): m is string => typeof m === 'string') : [],
  );
}

const FALLBACK_MESSAGES: Record<number, string> = {
  401: 'Tu sesión no es válida o expiró. Vuelve a iniciar sesión.',
  403: 'No tienes permisos para realizar esta acción.',
  404: 'No se encontró el recurso solicitado.',
};

export async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const token = authToken;
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor. Verifica que la API esté en ejecución.');
  }

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    // Un 401 con token = sesión vencida. Sin token es simplemente "credenciales inválidas" (login).
    if (res.status === 401 && token) onUnauthorized?.();
    if (res.status === 403 && token) onForbidden?.();

    const payload = (data ?? {}) as { title?: string; errors?: unknown };
    const message = payload.title ?? FALLBACK_MESSAGES[res.status] ?? `Error ${res.status} al contactar el servidor.`;
    throw new ApiError(res.status, message, flattenErrors(payload.errors));
  }

  return data as T;
}

export const http = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  delete: <T = void>(path: string) => request<T>('DELETE', path),
};

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.userMessage;
  if (err instanceof Error) return err.message;
  return 'Ocurrió un error inesperado.';
}
