using SoulChat.Domain.Entities;

namespace SoulChat.Domain.Interfaces;

public interface ILineaSmartConfigRepository : IGenericRepository<LineaSmartConfig>
{
    Task<LineaSmartConfig?> GetByLineaIdAsync(int lineaId);

    /// <summary>¿Alguna configuración usa ya ese número de línea?</summary>
    Task<bool> ExisteNumeroAsync(string numero);
}
