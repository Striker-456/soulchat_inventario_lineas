using SoulChat.Domain.Entities;

namespace SoulChat.Domain.Interfaces;

public record ClienteConConteo(Cliente Cliente, int TotalLineas);

public interface IClienteRepository : IGenericRepository<Cliente>
{
    Task<IReadOnlyList<ClienteConConteo>> GetAllConConteoAsync();
    Task<int> ContarLineasAsync(int clienteId);

    /// <summary>¿Existe otro cliente con el mismo nombre (sin distinguir mayúsculas)?</summary>
    Task<bool> NombreExisteAsync(string nombre, int? exceptoId);
}
