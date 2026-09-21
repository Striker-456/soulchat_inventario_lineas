// Tipos que reflejan los DTOs del backend (backend/SoulChat.Application/DTOs).
// ASP.NET serializa en camelCase por defecto.

export type Rol = 'Admin' | 'Editor' | 'Consulta';

export const ROLES: Rol[] = ['Admin', 'Editor', 'Consulta'];

// ─── Permisos ─────────────────────────────────────────────────────────────────
export type Accion = 'ver' | 'crear' | 'editar' | 'eliminar';

/** Claves de los módulos sobre los que el administrador concede o limita acciones. */
export type Modulo =
  | 'dashboard' | 'lineas' | 'clientes' | 'empleados' | 'catalogos'
  | 'auditoria' | 'logs' | 'importar' | 'credenciales';

/** módulo → acciones permitidas. */
export type Permisos = Record<string, string[]>;

export interface ModuloPermiso {
  clave: string;
  etiqueta: string;
  acciones: Accion[];
}

export interface PermisosCatalogo {
  modulos: ModuloPermiso[];
  plantillas: Record<Rol, Permisos>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface LoginResponse {
  token: string;
  expiresAt: string;
  email: string;
  /** Nulo solo en cuentas antiguas que aún no tienen nombre. */
  nombre: string | null;
  rol: Rol;
  permisos: Permisos;
}

export interface MeResponse {
  email: string;
  nombre: string | null;
  rol: Rol;
  permisos: Permisos;
}

// Cambios sobre la propia cuenta: todos exigen la contraseña actual.
export interface CambiarNombreInput {
  nombre: string;
  passwordActual: string;
}

export interface CambiarEmailInput {
  email: string;
  passwordActual: string;
}

export interface CambiarPasswordInput {
  passwordActual: string;
  nuevaPassword: string;
}

// ─── Catálogos ────────────────────────────────────────────────────────────────
export interface CatalogoItem {
  id: number;
  nombre: string;
}

export interface EmpleadoCatalogo {
  id: number;
  nombre: string;
  rol: string | null;
}

/** Catálogos cuyos valores se pueden dar de alta, cambiar y eliminar. */
export type CatalogoKey = 'status-desarrollo' | 'tipo-activacion' | 'bsp' | 'tenencia-sim' | 'app-channel';

// ─── Clientes ─────────────────────────────────────────────────────────────────
export type EstadoCliente = 'Activo' | 'Pausado';

export interface ClienteInput {
  nombre: string;
  rfc: string | null;
  estado: EstadoCliente;
}

export interface Cliente {
  id: number;
  nombre: string;
  rfc: string | null;
  estado: EstadoCliente;
  totalLineas: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Líneas ───────────────────────────────────────────────────────────────────
export interface LineaInput {
  numero: string;
  clienteId: number;
  descripcionUso: string | null;
  statusDesarrolloId: number | null;
  coordinadorId: number | null;
  programadorId: number | null;
  tenenciaSimCardId: number | null;
}

export interface Linea {
  id: number;
  /** Nulo solo en líneas registradas antes de que existiera el número. */
  numero: string | null;
  clienteId: number;
  clienteNombre: string;
  descripcionUso: string | null;
  statusDesarrolloId: number | null;
  statusDesarrolloNombre: string | null;
  coordinadorId: number | null;
  coordinadorNombre: string | null;
  programadorId: number | null;
  programadorNombre: string | null;
  tenenciaSimCardId: number | null;
  tenenciaSimCardNombre: string | null;
  tieneConnectly: boolean;
  tieneSmart: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Importación masiva ───────────────────────────────────────────────────────
/** Una fila del CSV. Cliente, status, coordinador, programador y tenencia van por nombre. */
export interface ImportFila {
  numero: string;
  cliente: string;
  status: string;
  coordinador: string;
  programador: string;
  tenencia: string;
  descripcionUso: string;
}

export interface ImportError {
  /** Posición de la fila en la solicitud, empezando en 1. */
  fila: number;
  numero: string | null;
  mensajes: string[];
}

export interface ImportResult {
  total: number;
  creadas: number;
  errores: ImportError[];
}

// ─── Connectly ────────────────────────────────────────────────────────────────
// En el PUT, una credencial en null = no cambiar; "" = borrar; otro valor = re-cifrar.
export interface ConnectlyInput {
  numeroConnectly: string;
  usuario: string;
  contrasena: string | null;
  businessId: string | null;
  apiKey: string | null;
  webhook: string | null;
  dns: string | null;
}

export interface Connectly {
  id: number;
  lineaId: number;
  numeroConnectly: string;
  usuario: string;
  contrasenaMasked: string | null;
  businessId: string | null;
  apiKeyMasked: string | null;
  webhook: string | null;
  dns: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectlyReveal {
  contrasena: string;
  apiKey: string | null;
}

// ─── Smart ────────────────────────────────────────────────────────────────────
export interface SmartInput {
  numeroLinea: string;
  tipoActivacionId: number | null;
  companyCampanasBotai: string | null;
  bspId: number | null;
  webhookCos: string | null;
  webhookSda: string | null;
  usuarioCompanyId: string | null;
  clave: string | null;
  companyBot: string | null;
  botId: string | null;
  botVersion: string | null;
  appChannelId: number | null;
  companyIdCampanas: string | null;
  envioPush: boolean;
  uso: string | null;
  observaciones: string | null;
  fechaVerificacion: string | null; // yyyy-MM-dd
  facturado: boolean;
}

export interface Smart {
  id: number;
  lineaId: number;
  numeroLinea: string;
  tipoActivacionId: number | null;
  tipoActivacionNombre: string | null;
  companyCampanasBotai: string | null;
  bspId: number | null;
  bspNombre: string | null;
  webhookCos: string | null;
  webhookSda: string | null;
  usuarioCompanyId: string | null;
  claveMasked: string | null;
  companyBot: string | null;
  botId: string | null;
  botVersion: string | null;
  appChannelId: number | null;
  appChannelNombre: string | null;
  companyIdCampanas: string | null;
  envioPush: boolean;
  uso: string | null;
  observaciones: string | null;
  fechaVerificacion: string | null;
  facturado: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SmartReveal {
  clave: string | null;
}

// ─── Empleados ────────────────────────────────────────────────────────────────
export interface EmpleadoInput {
  nombre: string;
  rol: string | null;
}

export interface Empleado {
  id: number;
  nombre: string;
  rol: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Usuarios del sistema ─────────────────────────────────────────────────────
export interface Usuario {
  id: number;
  nombre: string | null;
  email: string;
  rol: Rol;
  activo: boolean;
  /** Permisos efectivos (plantilla del rol o matriz personalizada). */
  permisos: Permisos;
  /** true si el administrador ajustó la plantilla del rol para este usuario. */
  permisosPersonalizados: boolean;
}

export interface UsuarioCreateInput {
  nombre: string;
  email: string;
  password: string;
  rol: Rol;
}

export interface UsuarioUpdateInput {
  rol: Rol;
  activo: boolean;
  /** Si se omite, el nombre no cambia. */
  nombre?: string;
}

// ─── Logs del sistema ─────────────────────────────────────────────────────────
export type LogNivel = 'info' | 'success' | 'warning' | 'error';

export interface LogEntry {
  id: number;
  fecha: string;
  nivel: LogNivel;
  usuarioId: number | null;
  usuarioEmail: string | null;
  modulo: string;
  accion: string;
  detalle: string;
  ip: string | null;
}

export interface LogsPagina {
  total: number;
  pagina: number;
  tamano: number;
  items: LogEntry[];
  /** Total por nivel dentro de los filtros de módulo/usuario/texto (ignora el filtro de nivel). */
  conteoPorNivel: Record<LogNivel, number>;
  modulos: string[];
  usuarios: string[];
}

export interface LogsFiltro {
  nivel?: LogNivel;
  modulo?: string;
  usuario?: string;
  texto?: string;
  pagina?: number;
  tamano?: number;
}

// ─── Auditoría ────────────────────────────────────────────────────────────────
export interface AuditoriaEntry {
  id: number;
  tablaAfectada: string;
  registroId: number;
  campo: string;
  valorAnterior: string | null;
  valorNuevo: string | null;
  usuarioId: number | null;
  usuarioEmail: string | null;
  fecha: string;
}
