namespace SoulChat.Application.DTOs.Clientes;

/// <param name="Estado">Activo | Pausado. Si es null se crea como Activo.</param>
public record ClienteCreateDto(string Nombre, string? Rfc, string? Estado);

public record ClienteUpdateDto(string Nombre, string? Rfc, string Estado);

public record ClienteResponseDto(
    int Id,
    string Nombre,
    string? Rfc,
    string Estado,
    int TotalLineas,
    DateTime CreatedAt,
    DateTime UpdatedAt);
