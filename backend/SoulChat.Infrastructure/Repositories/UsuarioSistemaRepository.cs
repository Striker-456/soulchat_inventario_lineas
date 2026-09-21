using Microsoft.EntityFrameworkCore;
using SoulChat.Application.Common;
using SoulChat.Domain.Entities;
using SoulChat.Domain.Interfaces;
using SoulChat.Infrastructure.Persistence;

namespace SoulChat.Infrastructure.Repositories;

public class UsuarioSistemaRepository : GenericRepository<UsuarioSistema>, IUsuarioSistemaRepository
{
    public UsuarioSistemaRepository(AppDbContext context) : base(context) { }

    public async Task<UsuarioSistema?> GetByEmailAsync(string email) =>
        await DbSet.FirstOrDefaultAsync(u => u.Email == email);

    public async Task<bool> EmailExisteAsync(string email, int? exceptoId)
    {
        var lower = email.ToLower();
        return await DbSet.AnyAsync(u => u.Email.ToLower() == lower && (exceptoId == null || u.Id != exceptoId));
    }

    public async Task<int> ContarAdministradoresActivosAsync(int? exceptoId) =>
        await DbSet.CountAsync(u => u.Rol == Roles.Admin && u.Activo && (exceptoId == null || u.Id != exceptoId));
}
