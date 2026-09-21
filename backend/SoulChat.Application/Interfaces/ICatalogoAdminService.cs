using SoulChat.Application.DTOs.Catalogos;

namespace SoulChat.Application.Interfaces;

/// <summary>
/// Alta, cambio y baja de los valores de los catálogos: status-desarrollo, tipo-activacion, bsp,
/// tenencia-sim y app-channel. Clientes y empleados tienen sus propios servicios.
/// </summary>
public interface ICatalogoAdminService
{
    Task<CatalogoItemDto> CreateAsync(string catalogo, CatalogoInputDto dto);
    Task<CatalogoItemDto> UpdateAsync(string catalogo, int id, CatalogoInputDto dto);
    Task DeleteAsync(string catalogo, int id);
}
