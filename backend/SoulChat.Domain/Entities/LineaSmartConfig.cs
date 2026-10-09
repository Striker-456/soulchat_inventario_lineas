using SoulChat.Domain.Common;

namespace SoulChat.Domain.Entities;

public class LineaSmartConfig : AuditableEntity
{
    public int LineaId { get; set; }
    public Linea? Linea { get; set; }

    public string NumeroLinea { get; set; } = string.Empty;

    /// <summary>Estado operativo de la línea en Smart (ACTIVO, INACTIVO, SIN RESPUESTA, Bloqueo Meta…). Texto libre.</summary>
    public string? Estado { get; set; }

    /// <summary>Texto libre: en la hoja de control es un nombre por línea ("MIDDLEWARE - COSMarsh1"), no un catálogo.</summary>
    public string? TipoActivacion { get; set; }

    public string? CompanyCampanasBotai { get; set; }

    public int? BspId { get; set; }
    public Bsp? Bsp { get; set; }

    public string? WebhookCampanas { get; set; }
    public string? WebhookCos { get; set; }
    public string? WebhookSda { get; set; }
    public string? UsuarioCompanyId { get; set; }
    public byte[]? ClaveCifrada { get; set; }
    public string? CompanyBot { get; set; }
    public string? BotId { get; set; }
    public string? BotVersion { get; set; }

    /// <summary>Texto libre: en la hoja de control es el ID numérico del canal (237, 294…).</summary>
    public string? AppChannel { get; set; }

    public string? CompanyIdCampanas { get; set; }
    public bool EnvioPush { get; set; }
    public string? Uso { get; set; }
    public string? Observaciones { get; set; }
    public DateOnly? FechaVerificacion { get; set; }
    public bool Facturado { get; set; }
}
