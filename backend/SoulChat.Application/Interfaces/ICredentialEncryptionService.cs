namespace SoulChat.Application.Interfaces;

public interface ICredentialEncryptionService
{
    byte[] Encrypt(string plainText);
    string Decrypt(byte[] cipherBytes);
}
