using SoulChat.Domain.Common;

namespace SoulChat.Domain.Entities;

public class LineaConnectlyConfig : AuditableEntity
{
    public int LineaId { get; set; }
    public Linea? Linea { get; set; }

    public string NumeroConnectly { get; set; } = string.Empty;
    public string Usuario { get; set; } = string.Empty;
    public byte[] ContrasenaCifrada { get; set; } = Array.Empty<byte>();
    public string? BusinessId { get; set; }
    public byte[]? ApiKeyCifrada { get; set; }
    public string? Webhook { get; set; }
    public string? Dns { get; set; }
}
