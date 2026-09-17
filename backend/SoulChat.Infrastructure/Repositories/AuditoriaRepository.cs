using Microsoft.EntityFrameworkCore;
using SoulChat.Domain.Entities;
using SoulChat.Domain.Interfaces;
using SoulChat.Infrastructure.Persistence;

namespace SoulChat.Infrastructure.Repositories;

public class AuditoriaRepository : IAuditoriaRepository
{
    private readonly AppDbContext _context;

    public AuditoriaRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task AddRangeAsync(IEnumerable<AuditoriaCambio> cambios)
    {
        await _context.AuditoriaCambios.AddRangeAsync(cambios);
        await _context.SaveChangesAsync();
    }

    public async Task<IReadOnlyList<AuditoriaCambio>> QueryAsync(string? tabla, int? registroId)
    {
        var query = _context.AuditoriaCambios.Include(a => a.Usuario).AsQueryable();

        if (!string.IsNullOrWhiteSpace(tabla))
        {
            query = query.Where(a => a.TablaAfectada == tabla);
        }

        if (registroId is not null)
        {
            query = query.Where(a => a.RegistroId == registroId);
        }

        return await query.OrderByDescending(a => a.Fecha).ToListAsync();
    }
}
