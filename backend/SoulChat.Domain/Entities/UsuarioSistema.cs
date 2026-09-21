namespace SoulChat.Domain.Entities;

public class UsuarioSistema
{
    public int Id { get; set; }

    /// <summary>Nombre de la persona. Nulo solo en cuentas anteriores a su introducción.</summary>
    public string? Nombre { get; set; }

    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Rol { get; set; } = string.Empty;
    public bool Activo { get; set; } = true;

    /// <summary>
    /// Permisos personalizados por módulo (módulo → acciones permitidas). Si es null, el usuario
    /// hereda la plantilla de su rol. Los administradores siempre tienen acceso total.
    /// </summary>
    public Dictionary<string, string[]>? Permisos { get; set; }
}
