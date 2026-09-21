using SoulChat.Application.Common;
using SoulChat.Application.DTOs.Catalogos;
using SoulChat.Application.Interfaces;
using SoulChat.Domain.Entities;
using SoulChat.Domain.Interfaces;

namespace SoulChat.Application.Services;

public class CatalogoAdminService : ICatalogoAdminService
{
    private readonly ICatalogAdminRepository<StatusDesarrollo> _status;
    private readonly ICatalogAdminRepository<TipoActivacion> _tiposActivacion;
    private readonly ICatalogAdminRepository<Bsp> _bsps;
    private readonly ICatalogAdminRepository<TenenciaSimCard> _tenencias;
    private readonly ICatalogAdminRepository<AppChannel> _appChannels;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAuditoriaService _auditoria;

    public CatalogoAdminService(
        ICatalogAdminRepository<StatusDesarrollo> status,
        ICatalogAdminRepository<TipoActivacion> tiposActivacion,
        ICatalogAdminRepository<Bsp> bsps,
        ICatalogAdminRepository<TenenciaSimCard> tenencias,
        ICatalogAdminRepository<AppChannel> appChannels,
        IUnitOfWork unitOfWork,
        IAuditoriaService auditoria)
    {
        _status = status;
        _tiposActivacion = tiposActivacion;
        _bsps = bsps;
        _tenencias = tenencias;
        _appChannels = appChannels;
        _unitOfWork = unitOfWork;
        _auditoria = auditoria;
    }

    public Task<CatalogoItemDto> CreateAsync(string catalogo, CatalogoInputDto dto) => catalogo switch
    {
        "status-desarrollo" => CrearAsync(_status, "status_desarrollo", dto),
        "tipo-activacion" => CrearAsync(_tiposActivacion, "tipo_activacion", dto),
        "bsp" => CrearAsync(_bsps, "bsp", dto),
        "tenencia-sim" => CrearAsync(_tenencias, "tenencia_sim_card", dto),
        "app-channel" => CrearAsync(_appChannels, "app_channel", dto),
        _ => throw NoEncontrado(catalogo),
    };

    public Task<CatalogoItemDto> UpdateAsync(string catalogo, int id, CatalogoInputDto dto) => catalogo switch
    {
        "status-desarrollo" => ActualizarAsync(_status, "status_desarrollo", id, dto),
        "tipo-activacion" => ActualizarAsync(_tiposActivacion, "tipo_activacion", id, dto),
        "bsp" => ActualizarAsync(_bsps, "bsp", id, dto),
        "tenencia-sim" => ActualizarAsync(_tenencias, "tenencia_sim_card", id, dto),
        "app-channel" => ActualizarAsync(_appChannels, "app_channel", id, dto),
        _ => throw NoEncontrado(catalogo),
    };

    public Task DeleteAsync(string catalogo, int id) => catalogo switch
    {
        "status-desarrollo" => EliminarAsync(_status, "status_desarrollo", "status", id),
        "tipo-activacion" => EliminarAsync(_tiposActivacion, "tipo_activacion", "tipo de activación", id),
        "bsp" => EliminarAsync(_bsps, "bsp", "BSP", id),
        "tenencia-sim" => EliminarAsync(_tenencias, "tenencia_sim_card", "tenencia de SIM", id),
        "app-channel" => EliminarAsync(_appChannels, "app_channel", "app channel", id),
        _ => throw NoEncontrado(catalogo),
    };

    private async Task<CatalogoItemDto> CrearAsync<T>(ICatalogAdminRepository<T> repo, string tabla, CatalogoInputDto dto)
        where T : class, ICatalogEntity, new()
    {
        var nombre = dto.Nombre.Trim();
        await ValidarNombreUnicoAsync(repo, nombre, null);

        var entidad = new T { Nombre = nombre };
        await repo.AddAsync(entidad);
        await _unitOfWork.SaveChangesAsync();

        await _auditoria.RegistrarAsync(tabla, entidad.Id, new[] { new CampoCambio("nombre", null, nombre) });

        return new CatalogoItemDto(entidad.Id, entidad.Nombre);
    }

    private async Task<CatalogoItemDto> ActualizarAsync<T>(ICatalogAdminRepository<T> repo, string tabla, int id, CatalogoInputDto dto)
        where T : class, ICatalogEntity, new()
    {
        var entidad = await repo.GetByIdAsync(id)
            ?? throw new NotFoundException($"No se encontró el valor con id {id} en el catálogo.");

        var nombre = dto.Nombre.Trim();
        await ValidarNombreUnicoAsync(repo, nombre, id);

        var anterior = entidad.Nombre;
        entidad.Nombre = nombre;

        repo.Update(entidad);
        await _unitOfWork.SaveChangesAsync();

        if (!string.Equals(anterior, nombre, StringComparison.Ordinal))
        {
            await _auditoria.RegistrarAsync(tabla, id, new[] { new CampoCambio("nombre", anterior, nombre) });
        }

        return new CatalogoItemDto(entidad.Id, entidad.Nombre);
    }

    private async Task EliminarAsync<T>(ICatalogAdminRepository<T> repo, string tabla, string etiqueta, int id)
        where T : class, ICatalogEntity, new()
    {
        var entidad = await repo.GetByIdAsync(id)
            ?? throw new NotFoundException($"No se encontró el valor con id {id} en el catálogo.");

        // La base de datos dejaría en null las referencias; preferimos impedir el borrado de valores en uso.
        var usos = await repo.ContarUsosAsync(id);
        if (usos > 0)
        {
            throw new ConflictException(
                $"No se puede eliminar el {etiqueta} '{entidad.Nombre}' porque está en uso en {usos} registro(s). Cámbialo en esos registros primero.");
        }

        repo.Remove(entidad);
        await _unitOfWork.SaveChangesAsync();

        await _auditoria.RegistrarAsync(tabla, id, new[] { new CampoCambio("eliminado", null, entidad.Nombre) });
    }

    private static async Task ValidarNombreUnicoAsync<T>(ICatalogAdminRepository<T> repo, string nombre, int? exceptoId)
        where T : class, ICatalogEntity
    {
        if (await repo.NombreExisteAsync(nombre, exceptoId))
        {
            throw new ConflictException($"Ya existe el valor '{nombre}' en este catálogo.");
        }
    }

    private static NotFoundException NoEncontrado(string catalogo) =>
        new($"El catálogo '{catalogo}' no existe o no se puede editar por esta ruta.");
}
