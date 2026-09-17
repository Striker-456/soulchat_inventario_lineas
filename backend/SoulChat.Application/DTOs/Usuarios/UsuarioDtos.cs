namespace SoulChat.Application.DTOs.Usuarios;

public record UsuarioCreateDto(string Email, string Password, string Rol);

public record UsuarioUpdateDto(string Rol, bool Activo);

public record CambiarPasswordDto(string NuevaPassword);

public record UsuarioResponseDto(int Id, string Email, string Rol, bool Activo);
