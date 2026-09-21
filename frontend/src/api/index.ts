import { http } from './client';
import type {
  AuditoriaEntry,
  CatalogoItem,
  CambiarEmailInput,
  CambiarNombreInput,
  CambiarPasswordInput,
  CatalogoKey,
  Cliente,
  ClienteInput,
  Connectly,
  ConnectlyInput,
  ConnectlyReveal,
  Empleado,
  EmpleadoCatalogo,
  EmpleadoInput,
  ImportFila,
  ImportResult,
  Linea,
  LineaInput,
  LoginResponse,
  LogsFiltro,
  LogsPagina,
  MeResponse,
  Permisos,
  PermisosCatalogo,
  Smart,
  SmartInput,
  SmartReveal,
  Usuario,
  UsuarioCreateInput,
  UsuarioUpdateInput,
} from './types';

export * from './types';
export { ApiError, errorMessage } from './client';

const qs = (params: Record<string, string | number | undefined>) => {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') q.set(k, String(v));
  const s = q.toString();
  return s ? `?${s}` : '';
};

export const api = {
  auth: {
    login: (email: string, password: string) => http.post<LoginResponse>('/auth/login', { email, password }),
    /** Nombre, rol y permisos vigentes (el administrador puede haberlos cambiado desde el login). */
    me: () => http.get<MeResponse>('/auth/me'),
    // Cambios sobre la propia cuenta (cualquier rol). Todos exigen la contraseña actual.
    cambiarNombre: (dto: CambiarNombreInput) => http.put<MeResponse>('/auth/me/nombre', dto),
    /** Devuelve una sesión nueva: el token lleva el correo, así que hay que reemplazarlo. */
    cambiarEmail: (dto: CambiarEmailInput) => http.put<LoginResponse>('/auth/me/email', dto),
    cambiarPassword: (dto: CambiarPasswordInput) => http.put<void>('/auth/me/password', dto),
  },

  lineas: {
    list: () => http.get<Linea[]>('/lineas'),
    get: (id: number) => http.get<Linea>(`/lineas/${id}`),
    create: (dto: LineaInput) => http.post<Linea>('/lineas', dto),
    update: (id: number, dto: LineaInput) => http.put<Linea>(`/lineas/${id}`, dto),
    remove: (id: number) => http.delete(`/lineas/${id}`),
    /** Las filas válidas se crean; las inválidas vuelven con su motivo. */
    importar: (filas: ImportFila[]) => http.post<ImportResult>('/lineas/importar', { filas }),
  },

  connectly: {
    get: (lineaId: number) => http.get<Connectly>(`/lineas/${lineaId}/connectly`),
    create: (lineaId: number, dto: ConnectlyInput) => http.post<Connectly>(`/lineas/${lineaId}/connectly`, dto),
    update: (lineaId: number, dto: ConnectlyInput) => http.put<Connectly>(`/lineas/${lineaId}/connectly`, dto),
    remove: (lineaId: number) => http.delete(`/lineas/${lineaId}/connectly`),
    reveal: (lineaId: number) => http.post<ConnectlyReveal>(`/lineas/${lineaId}/connectly/revelar-credenciales`),
  },

  smart: {
    get: (lineaId: number) => http.get<Smart>(`/lineas/${lineaId}/smart`),
    create: (lineaId: number, dto: SmartInput) => http.post<Smart>(`/lineas/${lineaId}/smart`, dto),
    update: (lineaId: number, dto: SmartInput) => http.put<Smart>(`/lineas/${lineaId}/smart`, dto),
    remove: (lineaId: number) => http.delete(`/lineas/${lineaId}/smart`),
    reveal: (lineaId: number) => http.post<SmartReveal>(`/lineas/${lineaId}/smart/revelar-credenciales`),
  },

  clientes: {
    list: () => http.get<Cliente[]>('/clientes'),
    create: (dto: ClienteInput) => http.post<Cliente>('/clientes', dto),
    update: (id: number, dto: ClienteInput) => http.put<Cliente>(`/clientes/${id}`, dto),
    remove: (id: number) => http.delete(`/clientes/${id}`),
  },

  empleados: {
    list: () => http.get<Empleado[]>('/empleados'),
    create: (dto: EmpleadoInput) => http.post<Empleado>('/empleados', dto),
    update: (id: number, dto: EmpleadoInput) => http.put<Empleado>(`/empleados/${id}`, dto),
    remove: (id: number) => http.delete(`/empleados/${id}`),
  },

  usuarios: {
    list: () => http.get<Usuario[]>('/usuarios'),
    create: (dto: UsuarioCreateInput) => http.post<Usuario>('/usuarios', dto),
    /** Cambiar el rol descarta los permisos personalizados del usuario. */
    update: (id: number, dto: UsuarioUpdateInput) => http.put<Usuario>(`/usuarios/${id}`, dto),
    resetPassword: (id: number, nuevaPassword: string) =>
      http.post<void>(`/usuarios/${id}/reset-password`, { nuevaPassword }),
    remove: (id: number) => http.delete(`/usuarios/${id}`),
    permisosCatalogo: () => http.get<PermisosCatalogo>('/usuarios/permisos/catalogo'),
    setPermisos: (id: number, permisos: Permisos) => http.put<Usuario>(`/usuarios/${id}/permisos`, { permisos }),
    resetPermisos: (id: number) => http.delete<Usuario>(`/usuarios/${id}/permisos`),
  },

  catalogos: {
    // Lecturas: disponibles para cualquier usuario autenticado (alimentan los desplegables).
    clientes: () => http.get<CatalogoItem[]>('/catalogos/clientes'),
    empleados: () => http.get<EmpleadoCatalogo[]>('/catalogos/empleados'),
    statusDesarrollo: () => http.get<CatalogoItem[]>('/catalogos/status-desarrollo'),
    tipoActivacion: () => http.get<CatalogoItem[]>('/catalogos/tipo-activacion'),
    bsp: () => http.get<CatalogoItem[]>('/catalogos/bsp'),
    tenenciaSim: () => http.get<CatalogoItem[]>('/catalogos/tenencia-sim'),
    appChannel: () => http.get<CatalogoItem[]>('/catalogos/app-channel'),
    // Escrituras: requieren permiso sobre el módulo Catálogos.
    create: (catalogo: CatalogoKey, nombre: string) => http.post<CatalogoItem>(`/catalogos/${catalogo}`, { nombre }),
    update: (catalogo: CatalogoKey, id: number, nombre: string) =>
      http.put<CatalogoItem>(`/catalogos/${catalogo}/${id}`, { nombre }),
    remove: (catalogo: CatalogoKey, id: number) => http.delete(`/catalogos/${catalogo}/${id}`),
  },

  auditoria: {
    list: (filtro: { tabla?: string; registroId?: number } = {}) =>
      http.get<AuditoriaEntry[]>(`/auditoria${qs(filtro)}`),
  },

  logs: {
    list: (filtro: LogsFiltro = {}) => http.get<LogsPagina>(`/logs${qs({ ...filtro })}`),
  },
};
