using SoulChat.Domain.Common;

namespace SoulChat.Domain.Entities;

public class LineaConnectlyConfig : AuditableEntity
{
    public int LineaId { get; set; }
    public Linea? Linea { get; set; }

    public string NumeroConnectly { get; set; } = string.Empty;
    /// <summary>Usuario y contraseña pueden faltar en configuraciones creadas por importación masiva.</summary>
    public string? Usuario { get; set; }
    public byte[]? ContrasenaCifrada { get; set; }
    public string? BusinessId { get; set; }
    public byte[]? ApiKeyCifrada { get; set; }
    public string? Webhook { get; set; }
    public string? Dns { get; set; }
}
