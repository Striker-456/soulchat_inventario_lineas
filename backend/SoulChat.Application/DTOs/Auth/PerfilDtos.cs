namespace SoulChat.Application.DTOs.Auth;

// Cambios sobre la propia cuenta. Todos exigen la contraseña actual, para cualquier rol.

public record CambiarNombreDto(string Nombre, string PasswordActual);

public record CambiarEmailDto(string Email, string PasswordActual);

public record CambiarPasswordPropiaDto(string PasswordActual, string NuevaPassword);
