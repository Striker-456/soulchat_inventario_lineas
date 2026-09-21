namespace SoulChat.Domain.Entities;

/// <summary>
/// Registro de actividad del sistema (inicios de sesión, altas/cambios/bajas, accesos denegados, etc.).
/// A diferencia de <see cref="AuditoriaCambio"/>, no describe el cambio campo por campo sino el evento.
/// </summary>
public class LogSistema
{
    public long Id { get; set; }
    public DateTime Fecha { get; set; } = DateTime.UtcNow;

    /// <summary>info | success | warning | error</summary>
    public string Nivel { get; set; } = "info";

    /// <summary>Se conserva aunque el usuario se elimine (y para intentos de login con un correo inexistente).</summary>
    public int? UsuarioId { get; set; }
    public string? UsuarioEmail { get; set; }

    public string Modulo { get; set; } = string.Empty;
    public string Accion { get; set; } = string.Empty;
    public string Detalle { get; set; } = string.Empty;
    public string? Ip { get; set; }
}
