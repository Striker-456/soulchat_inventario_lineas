namespace SoulChat.Application.DTOs.Logs;

public record LogResponseDto(
    long Id,
    DateTime Fecha,
    string Nivel,
    int? UsuarioId,
    string? UsuarioEmail,
    string Modulo,
    string Accion,
    string Detalle,
    string? Ip);

/// <param name="ConteoPorNivel">Total por nivel, dentro de los filtros de módulo/usuario/texto.</param>
/// <param name="Modulos">Módulos distintos registrados (para el filtro).</param>
/// <param name="Usuarios">Usuarios distintos registrados (para el filtro).</param>
public record LogsPaginaDto(
    int Total,
    int Pagina,
    int Tamano,
    IReadOnlyList<LogResponseDto> Items,
    IReadOnlyDictionary<string, int> ConteoPorNivel,
    IReadOnlyList<string> Modulos,
    IReadOnlyList<string> Usuarios);
