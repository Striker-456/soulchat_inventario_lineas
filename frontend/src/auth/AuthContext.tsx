import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { api, type LoginResponse, type Permisos, type Rol } from '../api';
import { setAuthToken, setForbiddenHandler, setUnauthorizedHandler } from '../api/client';

const STORAGE_KEY = 'soulchat.session';

interface Session {
  token: string;
  email: string;
  /** Nombre de la persona; nulo en cuentas antiguas que aún no lo tienen. */
  nombre: string | null;
  rol: Rol;
  expiresAt: string;
  /** módulo → acciones permitidas (ver, crear, editar, eliminar). */
  permisos: Permisos;
}

interface AuthState {
  session: Session | null;
  isAdmin: boolean;
  /** ¿Puede el usuario ejecutar `accion` en `modulo`? Ej.: can('lineas', 'editar'). */
  can: (modulo: string, accion: string) => boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  /** Vuelve a leer nombre, rol y permisos del servidor (el administrador pudo haberlos cambiado). */
  refreshPermisos: () => Promise<void>;
  // Cambios sobre la propia cuenta. Todos exigen la contraseña actual y actualizan la sesión.
  cambiarNombre: (nombre: string, passwordActual: string) => Promise<void>;
  cambiarEmail: (email: string, passwordActual: string) => Promise<void>;
  cambiarPassword: (passwordActual: string, nuevaPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

function readStoredSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Partial<Session>;
    // Sesiones guardadas antes de existir los permisos no sirven: se pide iniciar sesión de nuevo.
    if (!s.token || !s.permisos || !s.expiresAt || new Date(s.expiresAt).getTime() <= Date.now()) return null;
    // Las sesiones guardadas antes de existir el nombre no lo traen; se completa al sincronizar con el servidor.
    return { ...s, nombre: s.nombre ?? null } as Session;
  } catch {
    return null;
  }
}

function storeSession(s: Session | null) {
  try {
    if (s) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // sessionStorage no disponible: la sesión vive solo en memoria.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // El token se entrega al cliente HTTP al crear el estado (síncrono), para que las peticiones
  // que disparan los componentes hijos al recargar la página ya lo lleven.
  const [session, setSession] = useState<Session | null>(() => {
    const stored = readStoredSession();
    setAuthToken(stored?.token ?? null);
    return stored;
  });
  const refreshing = useRef(false);

  const logout = useCallback(() => {
    setAuthToken(null);
    storeSession(null);
    setSession(null);
  }, []);

  const refreshPermisos = useCallback(async () => {
    if (refreshing.current) return;
    refreshing.current = true;
    try {
      const me = await api.auth.me();
      setSession(prev => {
        if (!prev) return prev;
        const same =
          prev.rol === me.rol && prev.nombre === me.nombre && prev.email === me.email &&
          JSON.stringify(prev.permisos) === JSON.stringify(me.permisos);
        if (same) return prev;
        const next = { ...prev, rol: me.rol, nombre: me.nombre, email: me.email, permisos: me.permisos };
        storeSession(next);
        return next;
      });
    } catch {
      // Un 401 ya cierra la sesión desde el cliente HTTP; cualquier otro error se ignora aquí.
    } finally {
      refreshing.current = false;
    }
  }, []);

  // Ante un 401 con token (sesión vencida o cuenta desactivada) se vuelve al login;
  // ante un 403 se refrescan los permisos por si el administrador los cambió.
  useEffect(() => {
    setUnauthorizedHandler(logout);
    setForbiddenHandler(() => void refreshPermisos());
    return () => {
      setUnauthorizedHandler(null);
      setForbiddenHandler(null);
    };
  }, [logout, refreshPermisos]);

  // Al abrir la app con una sesión guardada, sincroniza los permisos con el servidor.
  const hasSession = session !== null;
  useEffect(() => {
    if (hasSession) void refreshPermisos();
  }, [hasSession, refreshPermisos]);

  // Cierra sesión automáticamente cuando vence el JWT.
  useEffect(() => {
    if (!session) return;
    const ms = new Date(session.expiresAt).getTime() - Date.now();
    if (ms <= 0) {
      logout();
      return;
    }
    // setTimeout admite hasta ~24.8 días; el JWT dura 60 min por configuración.
    const t = setTimeout(logout, Math.min(ms, 2 ** 31 - 1));
    return () => clearTimeout(t);
  }, [session?.expiresAt, logout]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Guarda una sesión nueva (login o cambio de correo, que reemplaza el token). */
  const startSession = useCallback((res: LoginResponse) => {
    const s: Session = { token: res.token, email: res.email, nombre: res.nombre, rol: res.rol, expiresAt: res.expiresAt, permisos: res.permisos };
    setAuthToken(s.token);
    storeSession(s);
    setSession(s);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    startSession(await api.auth.login(email.trim(), password));
  }, [startSession]);

  const cambiarNombre = useCallback(async (nombre: string, passwordActual: string) => {
    const me = await api.auth.cambiarNombre({ nombre, passwordActual });
    setSession(prev => {
      if (!prev) return prev;
      const next = { ...prev, nombre: me.nombre };
      storeSession(next);
      return next;
    });
  }, []);

  const cambiarEmail = useCallback(async (email: string, passwordActual: string) => {
    // El correo viaja dentro del token: el servidor entrega una sesión nueva que hay que adoptar.
    startSession(await api.auth.cambiarEmail({ email, passwordActual }));
  }, [startSession]);

  const cambiarPassword = useCallback(async (passwordActual: string, nuevaPassword: string) => {
    await api.auth.cambiarPassword({ passwordActual, nuevaPassword });
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      session,
      isAdmin: session?.rol === 'Admin',
      can: (modulo, accion) => session?.permisos[modulo]?.includes(accion) ?? false,
      login,
      logout,
      refreshPermisos,
      cambiarNombre,
      cambiarEmail,
      cambiarPassword,
    }),
    [session, login, logout, refreshPermisos, cambiarNombre, cambiarEmail, cambiarPassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>.');
  return ctx;
}
