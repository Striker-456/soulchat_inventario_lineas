namespace SoulChat.Application.DTOs.Empleados;

public record EmpleadoCreateDto(string Nombre, string? Rol);

public record EmpleadoUpdateDto(string Nombre, string? Rol);

public record EmpleadoResponseDto(int Id, string Nombre, string? Rol, DateTime CreatedAt, DateTime UpdatedAt);
