using SoulChat.Domain.Common;

namespace SoulChat.Domain.Entities;

public class Cliente : AuditableEntity
{
    public string Nombre { get; set; } = string.Empty;

    /// <summary>RFC del cliente (12 o 13 caracteres). Opcional.</summary>
    public string? Rfc { get; set; }

    /// <summary>Activo | Pausado.</summary>
    public string Estado { get; set; } = "Activo";

    public ICollection<Linea> Lineas { get; set; } = new List<Linea>();
}
