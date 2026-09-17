namespace SoulChat.Application.Common;

public record CampoCambio(string Campo, string? ValorAnterior, string? ValorNuevo);

public static class AuditDiff
{
    public static List<CampoCambio> Compare(IDictionary<string, string?> antes, IDictionary<string, string?> despues)
    {
        var cambios = new List<CampoCambio>();

        foreach (var (campo, nuevo) in despues)
        {
            antes.TryGetValue(campo, out var anterior);
            if (!string.Equals(anterior, nuevo, StringComparison.Ordinal))
            {
                cambios.Add(new CampoCambio(campo, anterior, nuevo));
            }
        }

        return cambios;
    }
}
