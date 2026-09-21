namespace SoulChat.Application.DTOs.Lineas;

public record LineaCreateDto(
    string Numero,
    int ClienteId,
    string? DescripcionUso,
    int? StatusDesarrolloId,
    int? CoordinadorId,
    int? ProgramadorId,
    int? TenenciaSimCardId);

public record LineaUpdateDto(
    string Numero,
    int ClienteId,
    string? DescripcionUso,
    int? StatusDesarrolloId,
    int? CoordinadorId,
    int? ProgramadorId,
    int? TenenciaSimCardId);

public record LineaResponseDto(
    int Id,
    string? Numero,
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

// ─── Importación masiva ───────────────────────────────────────────────────────
/// <summary>Una fila del archivo. Cliente, status, coordinador, programador y tenencia se indican por nombre.</summary>
public record LineaImportFilaDto(
    string? Numero,
    string? Cliente,
    string? Status,
    string? Coordinador,
    string? Programador,
    string? Tenencia,
    string? DescripcionUso);

public record LineaImportRequestDto(IReadOnlyList<LineaImportFilaDto> Filas);

/// <param name="Fila">Posición de la fila en la solicitud, empezando en 1.</param>
public record LineaImportErrorDto(int Fila, string? Numero, IReadOnlyList<string> Mensajes);

public record LineaImportResultDto(int Total, int Creadas, IReadOnlyList<LineaImportErrorDto> Errores);
