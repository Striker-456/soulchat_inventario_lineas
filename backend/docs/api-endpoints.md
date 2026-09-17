# API Endpoints — SoulChat Inventario Líneas

Base URL local: `https://localhost:{puerto}` (ver `Properties/launchSettings.json`). Documentación interactiva en `/swagger`.

Todos los endpoints requieren `Authorization: Bearer <token>` salvo `POST /auth/login`. Los endpoints de `revelar-credenciales` además requieren rol `Admin`.

## Auth
| Método | Ruta | Descripción |
|---|---|---|
| POST | /auth/login | Autentica y devuelve JWT + rol |

## Líneas
| Método | Ruta | Descripción |
|---|---|---|
| GET | /lineas | Lista con filtros `cliente`, `status`, `coordinador`, `programador`, `texto` |
| GET | /lineas/{id} | Detalle de una línea |
| POST | /lineas | Crea una línea |
| PUT | /lineas/{id} | Actualiza una línea |
| DELETE | /lineas/{id} | Elimina una línea (cascada sobre sus configs) |

## Connectly (por línea)
| Método | Ruta | Descripción |
|---|---|---|
| GET | /lineas/{lineaId}/connectly | Config Connectly (credenciales enmascaradas) |
| POST | /lineas/{lineaId}/connectly | Crea config Connectly |
| PUT | /lineas/{lineaId}/connectly | Actualiza config Connectly |
| DELETE | /lineas/{lineaId}/connectly | Elimina config Connectly |
| POST | /lineas/{lineaId}/connectly/revelar-credenciales | **Rol Admin.** Devuelve contraseña/API key en texto plano |

## Smart (por línea)
| Método | Ruta | Descripción |
|---|---|---|
| GET | /lineas/{lineaId}/smart | Config Smart (clave enmascarada) |
| POST | /lineas/{lineaId}/smart | Crea config Smart |
| PUT | /lineas/{lineaId}/smart | Actualiza config Smart |
| DELETE | /lineas/{lineaId}/smart | Elimina config Smart |
| POST | /lineas/{lineaId}/smart/revelar-credenciales | **Rol Admin.** Devuelve clave en texto plano |

## Empleados
| Método | Ruta | Descripción |
|---|---|---|
| GET | /empleados | Lista empleados (cualquier usuario autenticado) |
| GET | /empleados/{id} | Detalle de un empleado |
| POST | /empleados | Crea un empleado. **Roles Admin o Editor** |
| PUT | /empleados/{id} | Actualiza un empleado. **Roles Admin o Editor** |
| DELETE | /empleados/{id} | Elimina un empleado (las líneas que lo tenían como coordinador/programador quedan con esa referencia en null). **Roles Admin o Editor** |

Los cambios en empleados (creación, edición de nombre/rol y eliminación) quedan registrados en `/auditoria?tabla=empleados`.

## Usuarios del sistema
**Todos los endpoints requieren rol `Admin`.**

| Método | Ruta | Descripción |
|---|---|---|
| GET | /usuarios | Lista usuarios (sin exponer el hash de contraseña) |
| GET | /usuarios/{id} | Detalle de un usuario |
| POST | /usuarios | Crea un usuario (rol debe ser `Admin`, `Editor` o `Consulta`) |
| PUT | /usuarios/{id} | Actualiza rol y estado activo. Un admin no puede desactivar su propia cuenta |
| POST | /usuarios/{id}/reset-password | Fuerza una nueva contraseña para el usuario |
| DELETE | /usuarios/{id} | Elimina un usuario. Un admin no puede eliminar su propia cuenta |

## Catálogos (solo lectura)
| Método | Ruta |
|---|---|
| GET | /catalogos/clientes |
| GET | /catalogos/empleados |
| GET | /catalogos/status-desarrollo |
| GET | /catalogos/tipo-activacion |
| GET | /catalogos/bsp |
| GET | /catalogos/tenencia-sim |
| GET | /catalogos/app-channel |

## Auditoría
| Método | Ruta | Descripción |
|---|---|---|
| GET | /auditoria?tabla=&registroId= | Historial de cambios (filtros opcionales) |

## Convenciones de actualización de credenciales
En `PUT` de Connectly/Smart: un campo de credencial (`contrasena`, `apiKey`, `clave`) en `null` significa "no cambiar"; una cadena vacía `""` significa "borrar el valor"; cualquier otro valor lo re-cifra.
