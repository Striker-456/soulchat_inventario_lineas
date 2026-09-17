using SoulChat.Application.DTOs.Catalogos;

namespace SoulChat.Application.Interfaces;

public interface ICatalogoService
{
    Task<IReadOnlyList<CatalogoItemDto>> GetClientesAsync();
    Task<IReadOnlyList<EmpleadoDto>> GetEmpleadosAsync();
    Task<IReadOnlyList<CatalogoItemDto>> GetStatusDesarrolloAsync();
    Task<IReadOnlyList<CatalogoItemDto>> GetTipoActivacionAsync();
    Task<IReadOnlyList<CatalogoItemDto>> GetBspAsync();
    Task<IReadOnlyList<CatalogoItemDto>> GetTenenciaSimAsync();
    Task<IReadOnlyList<CatalogoItemDto>> GetAppChannelAsync();
}
