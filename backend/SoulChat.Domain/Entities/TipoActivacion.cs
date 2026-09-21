namespace SoulChat.Domain.Entities;

public class TipoActivacion : ICatalogEntity
{
    public int Id { get; set; }
    public string Nombre { get; set; } = string.Empty;

    public ICollection<LineaSmartConfig> LineaSmartConfigs { get; set; } = new List<LineaSmartConfig>();
}
