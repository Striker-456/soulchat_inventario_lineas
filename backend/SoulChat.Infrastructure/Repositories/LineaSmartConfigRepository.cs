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
            .Include(c => c.TipoActivacion)
            .Include(c => c.Bsp)
            .Include(c => c.AppChannel)
            .FirstOrDefaultAsync(c => c.LineaId == lineaId);
}
