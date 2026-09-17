namespace SoulChat.Application.DTOs.Lineas;

public record LineaCreateDto(
    int ClienteId,
    string? DescripcionUso,
    int? StatusDesarrolloId,
    int? CoordinadorId,
    int? ProgramadorId,
    int? TenenciaSimCardId);

public record LineaUpdateDto(
    int ClienteId,
    string? DescripcionUso,
    int? StatusDesarrolloId,
    int? CoordinadorId,
    int? ProgramadorId,
    int? TenenciaSimCardId);

public record LineaResponseDto(
    int Id,
    int ClienteId,
    string ClienteNombre,
    string? DescripcionUso,
    int? StatusDesarrolloId,
    string? StatusDesarrolloNombre,
    int? CoordinadorId,
    string? CoordinadorNombre,
    int? ProgramadorId,
    string? ProgramadorNombre,
    int? TenenciaSimCardId,
    string? TenenciaSimCardNombre,
    bool TieneConnectly,
    bool TieneSmart,
    DateTime CreatedAt,
    DateTime UpdatedAt);
