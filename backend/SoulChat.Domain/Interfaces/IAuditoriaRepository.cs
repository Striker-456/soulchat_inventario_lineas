using SoulChat.Domain.Entities;

namespace SoulChat.Domain.Interfaces;

public interface IAuditoriaRepository
{
    Task AddRangeAsync(IEnumerable<AuditoriaCambio> cambios);
    Task<IReadOnlyList<AuditoriaCambio>> QueryAsync(string? tabla, int? registroId);
}
