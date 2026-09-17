namespace SoulChat.Infrastructure.Security;

public class EncryptionSettings
{
    public const string SectionName = "Encryption";

    /// <summary>Clave AES-256 codificada en base64 (32 bytes decodificados).</summary>
    public string Key { get; set; } = string.Empty;
}
