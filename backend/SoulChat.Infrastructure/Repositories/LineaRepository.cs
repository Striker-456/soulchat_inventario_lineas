using Microsoft.EntityFrameworkCore;
using SoulChat.Domain.Entities;
using SoulChat.Domain.Interfaces;
using SoulChat.Infrastructure.Persistence;

namespace SoulChat.Infrastructure.Repositories;

public class LineaRepository : GenericRepository<Linea>, ILineaRepository
{
    public LineaRepository(AppDbContext context) : base(context) { }

    public async Task<Linea?> GetByIdWithConfigsAsync(int id)
    {
        return await DbSet
            .Include(l => l.Cliente)
            .Include(l => l.StatusDesarrollo)
            .Include(l => l.Coordinador)
            .Include(l => l.Programador)
            .Include(l => l.TenenciaSimCard)
            .Include(l => l.ConnectlyConfig)
            .Include(l => l.SmartConfig)
            .FirstOrDefaultAsync(l => l.Id == id);
    }

    public async Task<IReadOnlyList<Linea>> BuscarAsync(LineaFiltro filtro)
    {
        var query = DbSet
            .Include(l => l.Cliente)
            .Include(l => l.StatusDesarrollo)
            .Include(l => l.Coordinador)
            .Include(l => l.Programador)
            .Include(l => l.TenenciaSimCard)
            .Include(l => l.ConnectlyConfig)
            .Include(l => l.SmartConfig)
            .AsQueryable();

        if (filtro.ClienteId is not null)
        {
            query = query.Where(l => l.ClienteId == filtro.ClienteId);
        }

        if (filtro.StatusDesarrolloId is not null)
        {
            query = query.Where(l => l.StatusDesarrolloId == filtro.StatusDesarrolloId);
        }

        if (filtro.CoordinadorId is not null)
        {
            query = query.Where(l => l.CoordinadorId == filtro.CoordinadorId);
        }

        if (filtro.ProgramadorId is not null)
        {
            query = query.Where(l => l.ProgramadorId == filtro.ProgramadorId);
        }

        if (!string.IsNullOrWhiteSpace(filtro.Texto))
        {
            var texto = $"%{filtro.Texto.Trim()}%";
            query = query.Where(l =>
                EF.Functions.ILike(l.DescripcionUso ?? string.Empty, texto) ||
                EF.Functions.ILike(l.Cliente!.Nombre, texto));
        }

        return await query.OrderByDescending(l => l.UpdatedAt).ToListAsync();
    }
}
