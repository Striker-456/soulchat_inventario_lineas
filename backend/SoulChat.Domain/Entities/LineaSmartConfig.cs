using SoulChat.Domain.Common;

namespace SoulChat.Domain.Entities;

public class LineaSmartConfig : AuditableEntity
{
    public int LineaId { get; set; }
    public Linea? Linea { get; set; }

    public string NumeroLinea { get; set; } = string.Empty;

    public int? TipoActivacionId { get; set; }
    public TipoActivacion? TipoActivacion { get; set; }

    public string? CompanyCampanasBotai { get; set; }

    public int? BspId { get; set; }
    public Bsp? Bsp { get; set; }

    public string? WebhookCos { get; set; }
    public string? WebhookSda { get; set; }
    public string? UsuarioCompanyId { get; set; }
    public byte[]? ClaveCifrada { get; set; }
    public string? CompanyBot { get; set; }
    public string? BotId { get; set; }
    public string? BotVersion { get; set; }

    public int? AppChannelId { get; set; }
    public AppChannel? AppChannel { get; set; }

    public string? CompanyIdCampanas { get; set; }
    public bool EnvioPush { get; set; }
    public string? Uso { get; set; }
    public string? Observaciones { get; set; }
    public DateOnly? FechaVerificacion { get; set; }
    public bool Facturado { get; set; }
}
