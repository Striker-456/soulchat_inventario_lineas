# API Endpoints — SoulChat Inventario Líneas

Base URL local: `https://localhost:{puerto}` (ver `Properties/launchSettings.json`). Documentación interactiva en `/swagger`.

Todos los endpoints requieren `Authorization: Bearer <token>` salvo `POST /auth/login`.

## Permisos

Además de estar autenticado, cada endpoint exige una **acción** sobre un **módulo**, según los permisos del usuario. Los permisos se leen de la base de datos en **cada petición**: si el administrador cambia los permisos de alguien (o desactiva su cuenta), el efecto es inmediato, sin esperar a que venza el token.

| Módulo | Acciones asignables |
|---|---|
| `dashboard` | ver |
| `lineas` | ver, crear, editar, eliminar |
| `clientes` | ver, crear, editar, eliminar |
| `empleados` | ver, crear, editar, eliminar |
| `catalogos` | ver, crear, editar, eliminar |
| `auditoria` | ver |
| `logs` | ver |
| `importar` | crear |
| `credenciales` | ver (revelar credenciales en texto plano) |

Crear, editar o eliminar en un módulo implica poder verlo (el servidor lo garantiza al guardar).

**Roles** (`Admin`, `Editor`, `Consulta`) son *plantillas*: al crear un usuario hereda los permisos de su rol. El administrador puede **personalizar** la matriz de un usuario (`PUT /usuarios/{id}/permisos`); cambiarle el rol descarta la personalización.

| Rol | Plantilla |
|---|---|
| Admin | Todo. **Siempre** acceso total: sus permisos no se pueden limitar. Es el único rol que gestiona usuarios y permisos. |
| Editor | Dashboard; líneas (todo); clientes y catálogos (ver, crear, editar); empleados (todo); auditoría; importación. Sin logs ni credenciales. |
| Consulta | Solo ver: dashboard, líneas, clientes y catálogos. |

Un `403` incluye en `title` el motivo (p. ej. *"No tienes permiso para editar en Líneas."*). Un `401` significa token inválido o cuenta inexistente/desactivada.

Salvaguardas: no se puede desactivar ni eliminar la propia cuenta, ni dejar al sistema sin ningún administrador activo.

## Auth
| Método | Ruta | Descripción |
|---|---|---|
| POST | /auth/login | Autentica y devuelve JWT, `nombre`, rol y **permisos efectivos** |
| GET | /auth/me | Nombre, rol y permisos vigentes del token (pueden haber cambiado desde el login). 401 si la cuenta está desactivada |

### Cambios sobre la propia cuenta
Disponibles para **cualquier rol** (no dependen de los permisos por módulo). **Todos exigen la contraseña actual** en `passwordActual`: si es incorrecta responde `400` con el motivo (no `401`, para no cerrar la sesión por un error de tecleo). Cada cambio queda en la auditoría (la contraseña nunca se registra) y en los logs.

| Método | Ruta | Cuerpo | Descripción |
|---|---|---|---|
| PUT | /auth/me/nombre | `{ nombre, passwordActual }` | Cambia el nombre (máx. 150). Devuelve nombre, rol y permisos |
| PUT | /auth/me/email | `{ email, passwordActual }` | Cambia el correo con el que se inicia sesión. 409 si ya lo usa otra cuenta (sin distinguir mayúsculas). **Devuelve una sesión nueva** (token con el correo actualizado): el cliente debe reemplazar el token |
| PUT | /auth/me/password | `{ passwordActual, nuevaPassword }` | Cambia la contraseña (mín. 8 y distinta de la actual). 204 |

## Líneas
Cada línea tiene un `numero` (único, máx. 20 caracteres, obligatorio al crear/editar).

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| GET | /lineas | lineas.ver | Lista con filtros `cliente`, `status`, `coordinador`, `programador`, `texto` (busca en número, descripción y cliente) |
| GET | /lineas/{id} | lineas.ver | Detalle de una línea |
| POST | /lineas | lineas.crear | Crea una línea (409 si el número ya existe) |
| PUT | /lineas/{id} | lineas.editar | Actualiza una línea |
| DELETE | /lineas/{id} | lineas.eliminar | Elimina una línea (cascada sobre sus configs) |
| POST | /lineas/importar | importar.crear | Alta masiva (hasta 500 filas). Cliente, status, coordinador, programador y tenencia se indican **por nombre** (sin acentos ni mayúsculas). Las filas válidas se crean; las inválidas se devuelven con su motivo: `{ total, creadas, errores: [{ fila, numero, mensajes }] }` |

## Connectly (por línea)
| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| GET | /lineas/{lineaId}/connectly | lineas.ver | Config Connectly (credenciales enmascaradas) |
| POST | /lineas/{lineaId}/connectly | lineas.editar | Crea config Connectly |
| PUT | /lineas/{lineaId}/connectly | lineas.editar | Actualiza config Connectly |
| DELETE | /lineas/{lineaId}/connectly | lineas.editar | Elimina config Connectly |
| POST | /lineas/{lineaId}/connectly/revelar-credenciales | credenciales.ver | Devuelve contraseña/API key en texto plano |

## Smart (por línea)
| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| GET | /lineas/{lineaId}/smart | lineas.ver | Config Smart (clave enmascarada) |
| POST | /lineas/{lineaId}/smart | lineas.editar | Crea config Smart |
| PUT | /lineas/{lineaId}/smart | lineas.editar | Actualiza config Smart |
| DELETE | /lineas/{lineaId}/smart | lineas.editar | Elimina config Smart |
| POST | /lineas/{lineaId}/smart/revelar-credenciales | credenciales.ver | Devuelve clave en texto plano |

## Clientes
| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| GET | /clientes | clientes.ver | Lista con `rfc`, `estado` y `totalLineas` |
| GET | /clientes/{id} | clientes.ver | Detalle |
| POST | /clientes | clientes.crear | Crea un cliente. `rfc` opcional (12 o 13 caracteres, formato oficial; se guarda en mayúsculas). `estado`: `Activo` (por omisión) o `Pausado`. 409 si el nombre ya existe |
| PUT | /clientes/{id} | clientes.editar | Actualiza un cliente |
| DELETE | /clientes/{id} | clientes.eliminar | Elimina un cliente. **409 si tiene líneas asociadas** (márcalo como Pausado en su lugar) |

## Empleados
| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| GET | /empleados | empleados.ver | Lista empleados |
| GET | /empleados/{id} | empleados.ver | Detalle de un empleado |
| POST | /empleados | empleados.crear | Crea un empleado |
| PUT | /empleados/{id} | empleados.editar | Actualiza un empleado |
| DELETE | /empleados/{id} | empleados.eliminar | Elimina un empleado (las líneas que lo tenían como coordinador/programador quedan con esa referencia en null) |

## Usuarios del sistema
**Todos los endpoints requieren rol `Admin`.**

| Método | Ruta | Descripción |
|---|---|---|
| GET | /usuarios | Lista usuarios con sus permisos efectivos y si están personalizados (sin exponer el hash de contraseña) |
| GET | /usuarios/{id} | Detalle de un usuario |
| POST | /usuarios | Crea un usuario: `nombre` (obligatorio, máx. 150), `email`, `password` (mín. 8) y `rol` (`Admin`, `Editor` o `Consulta`) |
| PUT | /usuarios/{id} | Actualiza rol y estado activo, y opcionalmente `nombre` (si se omite no cambia; sirve para completar cuentas antiguas sin nombre). Cambiar el rol **descarta los permisos personalizados**. El correo y la contraseña los cambia cada persona desde `/auth/me/*` |
| POST | /usuarios/{id}/reset-password | Fuerza una nueva contraseña para el usuario |
| DELETE | /usuarios/{id} | Elimina un usuario |
| GET | /usuarios/permisos/catalogo | Módulos, acciones disponibles y plantilla de cada rol (para pintar la matriz) |
| PUT | /usuarios/{id}/permisos | Reemplaza la matriz de permisos `{ "permisos": { "lineas": ["ver","editar"], ... } }`. 400 si hay módulos o acciones inválidos; 409 si el usuario es Admin |
| DELETE | /usuarios/{id}/permisos | Descarta la personalización: vuelve a la plantilla de su rol |

## Catálogos
Las **lecturas** están disponibles para cualquier usuario autenticado (alimentan los desplegables de los formularios).

| Método | Ruta |
|---|---|
| GET | /catalogos/clientes |
| GET | /catalogos/empleados |
| GET | /catalogos/status-desarrollo |
| GET | /catalogos/tipo-activacion |
| GET | /catalogos/bsp |
| GET | /catalogos/tenencia-sim |
| GET | /catalogos/app-channel |

Las **escrituras** aplican a `status-desarrollo`, `tipo-activacion`, `bsp`, `tenencia-sim` y `app-channel` (los clientes y empleados tienen sus propios endpoints):

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| POST | /catalogos/{catalogo} | catalogos.crear | Agrega un valor `{ "nombre": "..." }` (máx. 60; 409 si ya existe, sin distinguir mayúsculas) |
| PUT | /catalogos/{catalogo}/{id} | catalogos.editar | Renombra un valor |
| DELETE | /catalogos/{catalogo}/{id} | catalogos.eliminar | Elimina un valor. **409 si está en uso** por líneas o configuraciones Smart |

## Auditoría
Historial campo por campo de los cambios en líneas, configuraciones, clientes, empleados, usuarios (rol, activo, permisos; nunca contraseñas) y catálogos.

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| GET | /auditoria?tabla=&registroId= | auditoria.ver | Historial de cambios (filtros opcionales) |

## Logs del sistema
Registro de **eventos** (a diferencia de la auditoría, no detalla campo por campo). Se escribe automáticamente:

- `LOGIN` / `LOGIN_FAILED` (con el correo intentado y la IP; nunca la contraseña).
- `CREATE` / `UPDATE` / `DELETE` de cualquier `POST`/`PUT`/`DELETE`, con nivel `success`, `warning` (4xx, con el motivo) o `error` (5xx).
- `ACCESS_DENIED` cuando falta un permiso.
- `IMPORT`, `REVEAL_CREDENTIALS`, `RESET_PASSWORD`, `UPDATE_PERMISSIONS`, `RESET_PERMISSIONS`.

Las lecturas (`GET`) no se registran. La IP es la del socket; si la API queda detrás de un proxy inverso hay que habilitar los *forwarded headers* para registrar la IP real. No hay purga automática: conviene definir una política de retención.

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| GET | /logs?nivel=&modulo=&usuario=&texto=&pagina=1&tamano=25 | logs.ver | Página de eventos, del más reciente al más antiguo (`tamano` máx. 200). Incluye `total`, `conteoPorNivel` (ignora el filtro de nivel) y las listas de `modulos` y `usuarios` para los filtros |

## Convenciones de actualización de credenciales
En `PUT` de Connectly/Smart: un campo de credencial (`contrasena`, `apiKey`, `clave`) en `null` significa "no cambiar"; una cadena vacía `""` significa "borrar el valor"; cualquier otro valor lo re-cifra.

## Errores
Formato: `{ "status": 400, "title": "...", "errors": { "Campo": ["mensaje"] } }`. `400` validación · `401` sin sesión válida · `403` sin permiso · `404` no existe · `409` conflicto (duplicado, en uso, regla de negocio).
