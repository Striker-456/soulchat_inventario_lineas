using Microsoft.EntityFrameworkCore;
using SoulChat.Domain.Entities;
using SoulChat.Domain.Interfaces;
using SoulChat.Infrastructure.Persistence;

namespace SoulChat.Infrastructure.Repositories;

public class LineaConnectlyConfigRepository : GenericRepository<LineaConnectlyConfig>, ILineaConnectlyConfigRepository
{
    public LineaConnectlyConfigRepository(AppDbContext context) : base(context) { }

    public async Task<LineaConnectlyConfig?> GetByLineaIdAsync(int lineaId) =>
        await DbSet.FirstOrDefaultAsync(c => c.LineaId == lineaId);

    public async Task<bool> ExisteNumeroAsync(string numero) =>
        await DbSet.AnyAsync(c => c.NumeroConnectly == numero);
}
