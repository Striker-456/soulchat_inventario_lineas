using SoulChat.Application.DTOs.Catalogos;
using SoulChat.Application.Interfaces;
using SoulChat.Domain.Entities;
using SoulChat.Domain.Interfaces;

namespace SoulChat.Application.Services;

public class CatalogoService : ICatalogoService
{
    private readonly ICatalogRepository<Cliente> _clientes;
    private readonly IEmpleadoRepository _empleados;
    private readonly ICatalogRepository<StatusDesarrollo> _status;
    private readonly ICatalogRepository<TipoActivacion> _tiposActivacion;
    private readonly ICatalogRepository<Bsp> _bsps;
    private readonly ICatalogRepository<TenenciaSimCard> _tenencias;
    private readonly ICatalogRepository<AppChannel> _appChannels;

    public CatalogoService(
        ICatalogRepository<Cliente> clientes,
        IEmpleadoRepository empleados,
        ICatalogRepository<StatusDesarrollo> status,
        ICatalogRepository<TipoActivacion> tiposActivacion,
        ICatalogRepository<Bsp> bsps,
        ICatalogRepository<TenenciaSimCard> tenencias,
        ICatalogRepository<AppChannel> appChannels)
    {
        _clientes = clientes;
        _empleados = empleados;
        _status = status;
        _tiposActivacion = tiposActivacion;
        _bsps = bsps;
        _tenencias = tenencias;
        _appChannels = appChannels;
    }

    public async Task<IReadOnlyList<CatalogoItemDto>> GetClientesAsync()
    {
        var items = await _clientes.GetAllAsync();
        return items.Select(c => new CatalogoItemDto(c.Id, c.Nombre)).ToList();
    }

    public async Task<IReadOnlyList<EmpleadoDto>> GetEmpleadosAsync()
    {
        var items = await _empleados.GetAllAsync();
        return items.Select(e => new EmpleadoDto(e.Id, e.Nombre, e.Rol)).ToList();
    }

    public async Task<IReadOnlyList<CatalogoItemDto>> GetStatusDesarrolloAsync()
    {
        var items = await _status.GetAllAsync();
        return items.Select(s => new CatalogoItemDto(s.Id, s.Nombre)).ToList();
    }

    public async Task<IReadOnlyList<CatalogoItemDto>> GetTipoActivacionAsync()
    {
        var items = await _tiposActivacion.GetAllAsync();
        return items.Select(t => new CatalogoItemDto(t.Id, t.Nombre)).ToList();
    }

    public async Task<IReadOnlyList<CatalogoItemDto>> GetBspAsync()
    {
        var items = await _bsps.GetAllAsync();
        return items.Select(b => new CatalogoItemDto(b.Id, b.Nombre)).ToList();
    }

    public async Task<IReadOnlyList<CatalogoItemDto>> GetTenenciaSimAsync()
    {
        var items = await _tenencias.GetAllAsync();
        return items.Select(t => new CatalogoItemDto(t.Id, t.Nombre)).ToList();
    }

    public async Task<IReadOnlyList<CatalogoItemDto>> GetAppChannelAsync()
    {
        var items = await _appChannels.GetAllAsync();
        return items.Select(a => new CatalogoItemDto(a.Id, a.Nombre)).ToList();
    }
}
