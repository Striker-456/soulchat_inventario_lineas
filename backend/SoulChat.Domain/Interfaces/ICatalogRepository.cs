namespace SoulChat.Domain.Interfaces;

public interface ICatalogRepository<T> where T : class
{
    Task<IReadOnlyList<T>> GetAllAsync();
    Task<T?> GetByIdAsync(int id);
}
