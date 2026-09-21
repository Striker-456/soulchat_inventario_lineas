using Microsoft.EntityFrameworkCore;
using SoulChat.Domain.Entities;
using SoulChat.Domain.Interfaces;
using SoulChat.Infrastructure.Persistence;

namespace SoulChat.Infrastructure.Repositories;

public class ClienteRepository : GenericRepository<Cliente>, IClienteRepository
{
    public ClienteRepository(AppDbContext context) : base(context) { }

    public async Task<IReadOnlyList<ClienteConConteo>> GetAllConConteoAsync() =>
        await DbSet
            .AsNoTracking()
            .Select(c => new ClienteConConteo(c, c.Lineas.Count))
            .ToListAsync();

    public async Task<int> ContarLineasAsync(int clienteId) =>
        await Context.Lineas.CountAsync(l => l.ClienteId == clienteId);

    public async Task<bool> NombreExisteAsync(string nombre, int? exceptoId)
    {
        var lower = nombre.ToLower();
        return await DbSet.AnyAsync(c => c.Nombre.ToLower() == lower && (exceptoId == null || c.Id != exceptoId));
    }
}
