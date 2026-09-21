using System.Globalization;
using System.Text;

namespace SoulChat.Application.Common;

public static class EstadoCliente
{
    public const string Activo = "Activo";
    public const string Pausado = "Pausado";

    public static readonly string[] Validos = { Activo, Pausado };

    /// <summary>Devuelve el valor canónico ("activo" → "Activo") o null si no es válido.</summary>
    public static string? Canonico(string? estado) =>
        Validos.FirstOrDefault(v => string.Equals(v, estado?.Trim(), StringComparison.OrdinalIgnoreCase));
}

public static class NivelLog
{
    public const string Info = "info";
    public const string Success = "success";
    public const string Warning = "warning";
    public const string Error = "error";

    public static readonly string[] Validos = { Info, Success, Warning, Error };
}

public static class Texto
{
    /// <summary>Minúsculas y sin acentos, para comparar nombres ("Producción" == "produccion").</summary>
    public static string Normalizar(string? texto)
    {
        if (string.IsNullOrWhiteSpace(texto))
        {
            return string.Empty;
        }

        var descompuesto = texto.Trim().Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(descompuesto.Length);
        foreach (var c in descompuesto)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
            {
                sb.Append(c);
            }
        }

        return sb.ToString().Normalize(NormalizationForm.FormC).ToLowerInvariant();
    }

    public static string? Recortar(string? texto, int max) =>
        texto is null ? null : texto.Length <= max ? texto : texto[..max];
}
