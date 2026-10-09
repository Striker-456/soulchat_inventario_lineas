using Microsoft.EntityFrameworkCore;
using SoulChat.Domain.Entities;
using SoulChat.Domain.Interfaces;
using SoulChat.Infrastructure.Persistence;

namespace SoulChat.Infrastructure.Repositories;

public class LineaSmartConfigRepository : GenericRepository<LineaSmartConfig>, ILineaSmartConfigRepository
{
    public LineaSmartConfigRepository(AppDbContext context) : base(context) { }

    public async Task<LineaSmartConfig?> GetByLineaIdAsync(int lineaId) =>
        await DbSet
            .Include(c => c.Bsp)
            .FirstOrDefaultAsync(c => c.LineaId == lineaId);

    public async Task<bool> ExisteNumeroAsync(string numero) =>
        await DbSet.AnyAsync(c => c.NumeroLinea == numero);
}
