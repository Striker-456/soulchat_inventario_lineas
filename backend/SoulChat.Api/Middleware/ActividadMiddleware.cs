using SoulChat.Application.Common;
using SoulChat.Application.Interfaces;

namespace SoulChat.Api.Middleware;

/// <summary>
/// Registra en los logs del sistema las operaciones que modifican datos (alta, cambio, baja, restablecimiento
/// de contraseñas, revelado de credenciales...) y los accesos denegados. No registra lecturas (serían ruido).
/// Debe ir antes que <see cref="ExceptionMiddleware"/> para ver el código de respuesta definitivo.
/// </summary>
public class ActividadMiddleware
{
    /// <summary>HttpContext.Items: motivo del error (lo pone ExceptionMiddleware).</summary>
    public const string MotivoKey = "actividad:motivo";

    /// <summary>HttpContext.Items: true si el rechazo fue por falta de permiso (lo pone el filtro de permisos).</summary>
    public const string AccesoDenegadoKey = "actividad:acceso-denegado";

    // Estas rutas registran su propio evento con más detalle (login, importación masiva).
    private static readonly string[] RutasConLogPropio = { "/auth/login", "/lineas/importar" };

    private static readonly Dictionary<string, string> Modulos = new(StringComparer.OrdinalIgnoreCase)
    {
        ["lineas"] = "Líneas",
        ["clientes"] = "Clientes",
        ["empleados"] = "Empleados",
        ["usuarios"] = "Usuarios",
        ["catalogos"] = "Catálogos",
        ["auditoria"] = "Auditoría",
        ["logs"] = "Logs",
        ["auth"] = "Auth",
    };

    private readonly RequestDelegate _next;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ActividadMiddleware> _logger;

    public ActividadMiddleware(RequestDelegate next, IServiceScopeFactory scopeFactory, ILogger<ActividadMiddleware> logger)
    {
        _next = next;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        await _next(context);

        try
        {
            await RegistrarAsync(context);
        }
        catch (Exception ex)
        {
            // Un fallo al escribir el log nunca debe afectar la respuesta que ya se dio al cliente.
            _logger.LogWarning(ex, "No se pudo registrar la actividad de {Path}", context.Request.Path);
        }
    }

    private async Task RegistrarAsync(HttpContext context)
    {
        var path = context.Request.Path.Value ?? string.Empty;
        var status = context.Response.StatusCode;
        var method = context.Request.Method;

        if (RutasConLogPropio.Any(r => path.Equals(r, StringComparison.OrdinalIgnoreCase)))
        {
            return;
        }

        var motivo = context.Items[MotivoKey] as string;

        // 403 por permisos (filtro) o por rol (JwtBearer, sin excepción) = acceso denegado.
        // Un 403 con motivo pero sin marca es una regla de negocio ("no puedes eliminar tu propia cuenta").
        var denegado = status == StatusCodes.Status403Forbidden
            && (context.Items[AccesoDenegadoKey] is true || motivo is null);
        var modifica = HttpMethods.IsPost(method) || HttpMethods.IsPut(method) || HttpMethods.IsDelete(method);
        if (!denegado && !modifica)
        {
            return;
        }

        var modulo = ModuloDe(path);
        string nivel, accion, detalle;

        if (denegado)
        {
            (nivel, accion, detalle) = (NivelLog.Error, "ACCESS_DENIED", $"{motivo ?? "Acceso denegado."} ({method} {path})");
        }
        else
        {
            nivel = status switch
            {
                >= 500 => NivelLog.Error,
                >= 400 => NivelLog.Warning,
                _ => NivelLog.Success,
            };
            accion = AccionDe(method, path);
            detalle = status < 400
                ? $"{Verbo(accion)} {path}"
                : $"{Verbo(accion)} {path} — falló ({status}){(motivo is null ? string.Empty : ": " + motivo)}";
        }

        using var scope = _scopeFactory.CreateScope();
        var log = scope.ServiceProvider.GetRequiredService<ILogService>();
        await log.RegistrarAsync(nivel, modulo, accion, detalle);
    }

    private static string ModuloDe(string path)
    {
        var primero = path.Split('/', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault();
        return primero is not null && Modulos.TryGetValue(primero, out var modulo) ? modulo : "Sistema";
    }

    private static string AccionDe(string method, string path)
    {
        if (path.EndsWith("/revelar-credenciales", StringComparison.OrdinalIgnoreCase)) return "REVEAL_CREDENTIALS";
        if (path.EndsWith("/reset-password", StringComparison.OrdinalIgnoreCase)) return "RESET_PASSWORD";
        if (path.EndsWith("/permisos", StringComparison.OrdinalIgnoreCase))
        {
            return HttpMethods.IsDelete(method) ? "RESET_PERMISSIONS" : "UPDATE_PERMISSIONS";
        }

        if (HttpMethods.IsPost(method)) return "CREATE";
        if (HttpMethods.IsPut(method)) return "UPDATE";
        return "DELETE";
    }

    private static string Verbo(string accion) => accion switch
    {
        "CREATE" => "Creó",
        "UPDATE" => "Actualizó",
        "DELETE" => "Eliminó",
        "REVEAL_CREDENTIALS" => "Reveló credenciales en",
        "RESET_PASSWORD" => "Restableció la contraseña en",
        "UPDATE_PERMISSIONS" => "Modificó permisos en",
        "RESET_PERMISSIONS" => "Restableció permisos en",
        _ => "Ejecutó",
    };
}
