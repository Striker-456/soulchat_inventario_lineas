using Microsoft.EntityFrameworkCore;
using SoulChat.Domain.Entities;
using SoulChat.Domain.Interfaces;
using SoulChat.Infrastructure.Persistence;

namespace SoulChat.Infrastructure.Repositories;

public class CatalogAdminRepository<T> : ICatalogAdminRepository<T> where T : class, ICatalogEntity
{
    private readonly AppDbContext _context;

    public CatalogAdminRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<T?> GetByIdAsync(int id) => await _context.Set<T>().FindAsync(id);

    public async Task AddAsync(T entity) => await _context.Set<T>().AddAsync(entity);

    public void Update(T entity) => _context.Set<T>().Update(entity);

    public void Remove(T entity) => _context.Set<T>().Remove(entity);

    public async Task<bool> NombreExisteAsync(string nombre, int? exceptoId)
    {
        var lower = nombre.ToLower();
        return await _context.Set<T>().AnyAsync(e =>
            EF.Property<string>(e, "Nombre").ToLower() == lower &&
            (exceptoId == null || EF.Property<int>(e, "Id") != exceptoId));
    }

    public Task<int> ContarUsosAsync(int id)
    {
        if (typeof(T) == typeof(StatusDesarrollo))
            return _context.Lineas.CountAsync(l => l.StatusDesarrolloId == id);
        if (typeof(T) == typeof(TenenciaSimCard))
            return _context.Lineas.CountAsync(l => l.TenenciaSimCardId == id);
        if (typeof(T) == typeof(TipoActivacion))
            return _context.LineaSmartConfig.CountAsync(s => s.TipoActivacionId == id);
        if (typeof(T) == typeof(Bsp))
            return _context.LineaSmartConfig.CountAsync(s => s.BspId == id);
        if (typeof(T) == typeof(AppChannel))
            return _context.LineaSmartConfig.CountAsync(s => s.AppChannelId == id);

        throw new NotSupportedException($"No se sabe contar usos del catálogo {typeof(T).Name}.");
    }
}
