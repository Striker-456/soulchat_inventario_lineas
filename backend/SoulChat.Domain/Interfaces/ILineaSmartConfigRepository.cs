using SoulChat.Domain.Entities;

namespace SoulChat.Domain.Interfaces;

public interface ILineaSmartConfigRepository : IGenericRepository<LineaSmartConfig>
{
    Task<LineaSmartConfig?> GetByLineaIdAsync(int lineaId);
}
