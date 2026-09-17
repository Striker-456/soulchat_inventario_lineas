using SoulChat.Domain.Common;

namespace SoulChat.Domain.Entities;

public class Cliente : AuditableEntity
{
    public string Nombre { get; set; } = string.Empty;

    public ICollection<Linea> Lineas { get; set; } = new List<Linea>();
}
