namespace SoulChat.Application.DTOs.Auditoria;

public record AuditoriaResponseDto(
    int Id,
    string TablaAfectada,
    int RegistroId,
    string Campo,
    string? ValorAnterior,
    string? ValorNuevo,
    int? UsuarioId,
    string? UsuarioEmail,
    DateTime Fecha);
