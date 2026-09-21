namespace SoulChat.Application.DTOs.Auth;

public record LoginRequestDto(string Email, string Password);

/// <param name="Nombre">Nombre de la persona; nulo en cuentas antiguas que aún no lo tienen.</param>
/// <param name="Permisos">Permisos efectivos del usuario: módulo → acciones permitidas.</param>
public record LoginResponseDto(
    string Token,
    DateTime ExpiresAt,
    string Email,
    string? Nombre,
    string Rol,
    IReadOnlyDictionary<string, string[]> Permisos);

/// <summary>Datos vigentes del usuario autenticado (los permisos pueden haber cambiado desde el login).</summary>
public record MeResponseDto(string Email, string? Nombre, string Rol, IReadOnlyDictionary<string, string[]> Permisos);
