using SoulChat.Domain.Common;

namespace SoulChat.Domain.Entities;

public class Empleado : AuditableEntity
{
    public string Nombre { get; set; } = string.Empty;
    public string? Rol { get; set; }

    public ICollection<Linea> LineasComoCoordinador { get; set; } = new List<Linea>();
    public ICollection<Linea> LineasComoProgramador { get; set; } = new List<Linea>();
}
