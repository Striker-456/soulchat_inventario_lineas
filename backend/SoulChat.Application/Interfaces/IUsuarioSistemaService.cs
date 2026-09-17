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
}
