using SoulChat.Domain.Entities;

namespace SoulChat.Domain.Interfaces;

/// <summary>Operaciones de escritura sobre los catálogos simples (status, BSP, tenencia, etc.).</summary>
public interface ICatalogAdminRepository<T> where T : class, ICatalogEntity
{
    Task<T?> GetByIdAsync(int id);
    Task AddAsync(T entity);
    void Update(T entity);
    void Remove(T entity);

    /// <summary>¿Existe otro valor con el mismo nombre (sin distinguir mayúsculas)?</summary>
    Task<bool> NombreExisteAsync(string nombre, int? exceptoId);

    /// <summary>Cantidad de registros (líneas o configuraciones Smart) que usan este valor.</summary>
    Task<int> ContarUsosAsync(int id);
}
