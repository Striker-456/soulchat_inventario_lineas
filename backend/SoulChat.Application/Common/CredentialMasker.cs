namespace SoulChat.Application.Common;

public static class CredentialMasker
{
    public static string? Mask(string? plain)
    {
        if (string.IsNullOrEmpty(plain))
        {
            return null;
        }

        return plain.Length <= 4
            ? new string('•', plain.Length)
            : new string('•', 4) + plain[^4..];
    }
}
