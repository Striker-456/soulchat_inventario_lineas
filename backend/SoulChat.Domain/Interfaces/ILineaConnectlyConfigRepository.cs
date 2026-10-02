using SoulChat.Domain.Entities;

namespace SoulChat.Domain.Interfaces;

public interface ILineaConnectlyConfigRepository : IGenericRepository<LineaConnectlyConfig>
{
    Task<LineaConnectlyConfig?> GetByLineaIdAsync(int lineaId);

    /// <summary>¿Alguna configuración usa ya ese número de Connectly?</summary>
    Task<bool> ExisteNumeroAsync(string numero);
}
