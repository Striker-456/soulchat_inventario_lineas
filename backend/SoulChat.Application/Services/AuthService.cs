using SoulChat.Application.Common;
using SoulChat.Application.DTOs.Auth;
using SoulChat.Application.Interfaces;
using SoulChat.Domain.Interfaces;

namespace SoulChat.Application.Services;

public class AuthService : IAuthService
{
    private readonly IUsuarioSistemaRepository _usuarios;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenService _jwtTokenService;

    public AuthService(
        IUsuarioSistemaRepository usuarios,
        IPasswordHasher passwordHasher,
        IJwtTokenService jwtTokenService)
    {
        _usuarios = usuarios;
        _passwordHasher = passwordHasher;
        _jwtTokenService = jwtTokenService;
    }

    public async Task<LoginResponseDto> LoginAsync(LoginRequestDto dto)
    {
        var usuario = await _usuarios.GetByEmailAsync(dto.Email);

        if (usuario is null || !usuario.Activo || !_passwordHasher.Verify(dto.Password, usuario.PasswordHash))
        {
            throw new UnauthorizedAppException("Credenciales inválidas.");
        }

        var token = _jwtTokenService.GenerateToken(usuario);

        return new LoginResponseDto(token.Token, token.ExpiresAt, usuario.Email, usuario.Rol);
    }
}
