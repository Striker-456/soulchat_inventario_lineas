using SoulChat.Application.DTOs.Auth;

namespace SoulChat.Application.Interfaces;

public interface IAuthService
{
    Task<LoginResponseDto> LoginAsync(LoginRequestDto dto);

    /// <summary>Datos y permisos vigentes del usuario autenticado. Falla si la cuenta ya no existe o está desactivada.</summary>
    Task<MeResponseDto> MeAsync(int usuarioId);
}
