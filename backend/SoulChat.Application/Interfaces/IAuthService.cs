using SoulChat.Application.DTOs.Auth;

namespace SoulChat.Application.Interfaces;

public interface IAuthService
{
    Task<LoginResponseDto> LoginAsync(LoginRequestDto dto);
}
