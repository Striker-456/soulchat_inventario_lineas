using SoulChat.Application.DTOs.Logs;
using SoulChat.Domain.Interfaces;

namespace SoulChat.Application.Interfaces;

public interface ILogService
{
    /// <summary>
    /// Registra un evento. Por omisión toma el usuario y la IP de la petición en curso; los parámetros
    /// opcionales permiten atribuirlo a otra cuenta (p. ej. un intento de login fallido).
    /// </summary>
    Task RegistrarAsync(string nivel, string modulo, string accion, string detalle, int? usuarioId = null, string? usuarioEmail = null);

    Task<LogsPaginaDto> QueryAsync(LogFiltro filtro, int pagina, int tamano);
}
