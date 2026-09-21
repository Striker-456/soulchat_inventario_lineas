using Microsoft.AspNetCore.Mvc;
using SoulChat.Api.Filters;
using SoulChat.Application.Common;
using SoulChat.Application.DTOs.Logs;
using SoulChat.Application.Interfaces;
using SoulChat.Domain.Interfaces;

namespace SoulChat.Api.Controllers;

[ApiController]
[Route("logs")]
public class LogsController : ControllerBase
{
    private readonly ILogService _service;

    public LogsController(ILogService service)
    {
        _service = service;
    }

    /// <summary>Registro de actividad paginado, del más reciente al más antiguo.</summary>
    [HttpGet]
    [RequierePermiso(Modulo.Logs, Accion.Ver)]
    public async Task<ActionResult<LogsPaginaDto>> Get(
        [FromQuery] string? nivel,
        [FromQuery] string? modulo,
        [FromQuery] string? usuario,
        [FromQuery] string? texto,
        [FromQuery] int pagina = 1,
        [FromQuery] int tamano = 25)
    {
        var filtro = new LogFiltro { Nivel = nivel, Modulo = modulo, Usuario = usuario, Texto = texto };
        return Ok(await _service.QueryAsync(filtro, pagina, tamano));
    }
}
