# SoulChat · Inventario Líneas — Frontend

React 19 + Vite + TypeScript + Tailwind CSS v4. Diseño tomado del proyecto de Figma "SoulChat Inventario líneas".

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:5173
```

1. Levanta la API: `dotnet run --project backend/SoulChat.Api` (perfil `http`, `http://localhost:5095`).
2. El front llama a `/api/*` y Vite lo reenvía a la API, así que en desarrollo no depende de CORS.
   - Si la API corre en otra URL (p. ej. el perfil `https`, `https://localhost:7036`), copia `.env.example` a `.env.local` y define `VITE_DEV_API_TARGET`.

## Producción

```bash
npm run build      # genera dist/
```

Define `VITE_API_URL` con la URL pública de la API al compilar, y agrega el origen del front a `Cors:AllowedOrigins` del backend.

## Estructura

```
src/
  api/          cliente HTTP, tipos (espejo de los DTOs del backend) y endpoints
  auth/         sesión JWT (sessionStorage), roles Admin / Editor / Consulta
  context/      catálogos compartidos y notificaciones (toasts)
  components/   UI del diseño (ui.tsx), Sidebar, tablas reutilizables
  pages/        una pantalla por módulo
  lib/          formato de fechas, helpers y hooks
```

## Permisos en la interfaz

Los roles (Admin, Editor, Consulta) son **plantillas**; el administrador puede ajustar por usuario qué puede hacer en cada módulo
(ver, crear, editar, eliminar) desde **Usuarios → Permisos**. La interfaz oculta lo que el usuario no puede hacer (menú, botones,
campos), pero la autoridad es siempre la API: cada endpoint valida el permiso en el servidor.

- Los permisos llegan en el login y se vuelven a leer del servidor al abrir la app y ante cualquier `403`, así que un cambio del
  administrador se refleja sin cerrar sesión.
- El Admin siempre tiene acceso total y es el único que gestiona usuarios.
- **Configuración** (para todos los roles) permite cambiar el propio nombre, correo y contraseña; cada cambio exige la contraseña actual.

Ver la tabla completa en `backend/docs/api-endpoints.md`.
