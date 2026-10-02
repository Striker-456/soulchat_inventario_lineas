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
    int? ClienteId,
    string? ClienteNombre,
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
/// <summary>
/// Una fila del archivo. Solo <c>Numero</c> es obligatorio. Los catálogos (cliente, status, empleados,
/// tenencia, tipo de activación, BSP, app channel) se indican por nombre y se crean si no existen.
/// </summary>
public record LineaImportFilaDto(
    string? Numero,
    string? Cliente,
    string? Status,
    string? Coordinador,
    string? Programador,
    string? Tenencia,
    string? DescripcionUso,
    LineaImportConnectlyDto? Connectly = null,
    LineaImportSmartDto? Smart = null);

/// <summary>Columnas connectly_*. Si todas vienen vacías no se crea la configuración.</summary>
public record LineaImportConnectlyDto(
    string? Usuario,
    string? Contrasena,
    string? BusinessId,
    string? ApiKey,
    string? Webhook,
    string? Dns);

/// <summary>Columnas smart_*. Si todas vienen vacías no se crea la configuración.</summary>
/// <param name="EnvioPush">Sí/No (también true/false, 1/0).</param>
/// <param name="FechaVerificacion">AAAA-MM-DD o DD/MM/AAAA.</param>
/// <param name="Facturado">Sí/No (también true/false, 1/0).</param>
public record LineaImportSmartDto(
    string? TipoActivacion,
    string? CompanyCampanasBotai,
    string? Bsp,
    string? WebhookCos,
    string? WebhookSda,
    string? UsuarioCompanyId,
    string? Clave,
    string? CompanyBot,
    string? BotId,
    string? BotVersion,
    string? AppChannel,
    string? CompanyIdCampanas,
    string? EnvioPush,
    string? Uso,
    string? Observaciones,
    string? FechaVerificacion,
    string? Facturado);

public record LineaImportRequestDto(IReadOnlyList<LineaImportFilaDto> Filas);

/// <param name="Fila">Posición de la fila en la solicitud, empezando en 1.</param>
public record LineaImportErrorDto(int Fila, string? Numero, IReadOnlyList<string> Mensajes);

/// <summary>Registro de catálogo creado automáticamente durante la importación.</summary>
/// <param name="Catalogo">"Cliente", "Empleado", "Status", etc.</param>
public record LineaImportCreadoDto(string Catalogo, string Nombre);

public record LineaImportResultDto(
    int Total,
    int Creadas,
    IReadOnlyList<LineaImportErrorDto> Errores,
    IReadOnlyList<LineaImportCreadoDto> CatalogosCreados);
