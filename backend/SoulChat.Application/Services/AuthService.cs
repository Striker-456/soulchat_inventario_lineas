using SoulChat.Application.Common;
using SoulChat.Application.DTOs.Auth;
using SoulChat.Application.Interfaces;
using SoulChat.Domain.Interfaces;

namespace SoulChat.Application.Services;

public class AuthService : IAuthService
{
    private const string ModuloAuth = "Auth";

    private readonly IUsuarioSistemaRepository _usuarios;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly ILogService _log;

    public AuthService(
        IUsuarioSistemaRepository usuarios,
        IPasswordHasher passwordHasher,
        IJwtTokenService jwtTokenService,
        ILogService log)
    {
        _usuarios = usuarios;
        _passwordHasher = passwordHasher;
        _jwtTokenService = jwtTokenService;
        _log = log;
    }

    public async Task<LoginResponseDto> LoginAsync(LoginRequestDto dto)
    {
        var usuario = await _usuarios.GetByEmailAsync(dto.Email);

        if (usuario is null || !usuario.Activo || !_passwordHasher.Verify(dto.Password, usuario.PasswordHash))
        {
            var motivo = usuario is { Activo: false } ? "cuenta desactivada" : "credenciales inválidas";
            await _log.RegistrarAsync(NivelLog.Error, ModuloAuth, "LOGIN_FAILED", $"Intento de inicio de sesión fallido ({motivo}).", usuario?.Id, dto.Email);
            throw new UnauthorizedAppException("Credenciales inválidas.");
        }

        var token = _jwtTokenService.GenerateToken(usuario);
        await _log.RegistrarAsync(NivelLog.Success, ModuloAuth, "LOGIN", "Inicio de sesión exitoso.", usuario.Id, usuario.Email);

        return new LoginResponseDto(
            token.Token,
            token.ExpiresAt,
            usuario.Email,
            usuario.Nombre,
            usuario.Rol,
            PermisosCatalogo.Efectivos(usuario.Rol, usuario.Permisos));
    }

    public async Task<MeResponseDto> MeAsync(int usuarioId)
    {
        var usuario = await _usuarios.GetByIdAsync(usuarioId);

        if (usuario is null || !usuario.Activo)
        {
            throw new UnauthorizedAppException("La cuenta no existe o está desactivada.");
        }

        return new MeResponseDto(usuario.Email, usuario.Nombre, usuario.Rol, PermisosCatalogo.Efectivos(usuario.Rol, usuario.Permisos));
    }
}
