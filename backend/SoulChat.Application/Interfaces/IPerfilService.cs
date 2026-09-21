using SoulChat.Application.DTOs.Auth;

namespace SoulChat.Application.Interfaces;

/// <summary>
/// Cambios que cada persona hace sobre su propia cuenta (disponible para todos los roles).
/// Todos exigen la contraseña actual.
/// </summary>
public interface IPerfilService
{
    Task<MeResponseDto> CambiarNombreAsync(CambiarNombreDto dto);

    /// <summary>Devuelve una sesión nueva: el token lleva el correo, así que el anterior queda desactualizado.</summary>
    Task<LoginResponseDto> CambiarEmailAsync(CambiarEmailDto dto);

    Task CambiarPasswordAsync(CambiarPasswordPropiaDto dto);
}
