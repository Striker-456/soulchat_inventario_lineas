using Microsoft.EntityFrameworkCore;
using SoulChat.Domain.Entities;
using SoulChat.Domain.Interfaces;
using SoulChat.Infrastructure.Persistence;

namespace SoulChat.Infrastructure.Repositories;

public class UsuarioSistemaRepository : GenericRepository<UsuarioSistema>, IUsuarioSistemaRepository
{
    public UsuarioSistemaRepository(AppDbContext context) : base(context) { }

    public async Task<UsuarioSistema?> GetByEmailAsync(string email) =>
        await DbSet.FirstOrDefaultAsync(u => u.Email == email);
}
