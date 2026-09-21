using SoulChat.Domain.Entities;

namespace SoulChat.Domain.Interfaces;

public interface IUsuarioSistemaRepository : IGenericRepository<UsuarioSistema>
{
    Task<UsuarioSistema?> GetByEmailAsync(string email);

    /// <summary>¿Existe otra cuenta con ese correo (sin distinguir mayúsculas)?</summary>
    Task<bool> EmailExisteAsync(string email, int? exceptoId);

    /// <summary>Cantidad de administradores activos, sin contar al usuario indicado.</summary>
    Task<int> ContarAdministradoresActivosAsync(int? exceptoId);
}
