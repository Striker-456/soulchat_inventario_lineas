using SoulChat.Application.DTOs.Usuarios;

namespace SoulChat.Application.Interfaces;

public interface IUsuarioSistemaService
{
    Task<IReadOnlyList<UsuarioResponseDto>> GetAllAsync();
    Task<UsuarioResponseDto> GetByIdAsync(int id);
    Task<UsuarioResponseDto> CreateAsync(UsuarioCreateDto dto);
    Task<UsuarioResponseDto> UpdateAsync(int id, UsuarioUpdateDto dto);
    Task ResetPasswordAsync(int id, CambiarPasswordDto dto);
    Task DeleteAsync(int id);

    PermisosCatalogoDto GetCatalogoPermisos();

    /// <summary>Reemplaza la matriz de permisos del usuario (no aplica a administradores).</summary>
    Task<UsuarioResponseDto> SetPermisosAsync(int id, PermisosUpdateDto dto);

    /// <summary>Descarta los permisos personalizados: el usuario vuelve a la plantilla de su rol.</summary>
    Task<UsuarioResponseDto> ResetPermisosAsync(int id);
}
