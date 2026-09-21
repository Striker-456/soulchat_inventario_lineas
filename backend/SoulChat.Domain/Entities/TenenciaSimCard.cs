namespace SoulChat.Domain.Entities;

public class TenenciaSimCard : ICatalogEntity
{
    public int Id { get; set; }
    public string Nombre { get; set; } = string.Empty;

    public ICollection<Linea> Lineas { get; set; } = new List<Linea>();
}
