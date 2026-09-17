using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using SoulChat.Application.Interfaces;

namespace SoulChat.Infrastructure.Security;

public class AesCredentialEncryptionService : ICredentialEncryptionService
{
    private const int NonceSize = 12;
    private const int TagSize = 16;

    private readonly byte[] _key;

    public AesCredentialEncryptionService(IOptions<EncryptionSettings> options)
    {
        var keyBase64 = options.Value.Key;
        if (string.IsNullOrWhiteSpace(keyBase64))
        {
            throw new InvalidOperationException("La clave de cifrado (Encryption:Key) no está configurada.");
        }

        _key = Convert.FromBase64String(keyBase64);
        if (_key.Length != 32)
        {
            throw new InvalidOperationException("La clave de cifrado debe representar 32 bytes (AES-256) en base64.");
        }
    }

    public byte[] Encrypt(string plainText)
    {
        var plainBytes = Encoding.UTF8.GetBytes(plainText);
        var nonce = RandomNumberGenerator.GetBytes(NonceSize);
        var cipherBytes = new byte[plainBytes.Length];
        var tag = new byte[TagSize];

        using var aesGcm = new AesGcm(_key, TagSize);
        aesGcm.Encrypt(nonce, plainBytes, cipherBytes, tag);

        var result = new byte[NonceSize + cipherBytes.Length + TagSize];
        Buffer.BlockCopy(nonce, 0, result, 0, NonceSize);
        Buffer.BlockCopy(cipherBytes, 0, result, NonceSize, cipherBytes.Length);
        Buffer.BlockCopy(tag, 0, result, NonceSize + cipherBytes.Length, TagSize);

        return result;
    }

    public string Decrypt(byte[] cipherBytes)
    {
        var nonce = cipherBytes[..NonceSize];
        var tag = cipherBytes[^TagSize..];
        var cipher = cipherBytes[NonceSize..^TagSize];
        var plainBytes = new byte[cipher.Length];

        using var aesGcm = new AesGcm(_key, TagSize);
        aesGcm.Decrypt(nonce, cipher, tag, plainBytes);

        return Encoding.UTF8.GetString(plainBytes);
    }
}
