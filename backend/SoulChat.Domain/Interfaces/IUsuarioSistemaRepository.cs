using SoulChat.Domain.Entities;

namespace SoulChat.Domain.Interfaces;

public interface IUsuarioSistemaRepository : IGenericRepository<UsuarioSistema>
{
    Task<UsuarioSistema?> GetByEmailAsync(string email);
}
