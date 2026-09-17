using SoulChat.Domain.Entities;

namespace SoulChat.Domain.Interfaces;

public interface ILineaConnectlyConfigRepository : IGenericRepository<LineaConnectlyConfig>
{
    Task<LineaConnectlyConfig?> GetByLineaIdAsync(int lineaId);
}
