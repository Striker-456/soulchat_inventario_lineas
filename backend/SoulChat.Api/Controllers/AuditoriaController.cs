using Microsoft.AspNetCore.Mvc;
using SoulChat.Api.Filters;
using SoulChat.Application.Common;
using SoulChat.Application.Interfaces;

namespace SoulChat.Api.Controllers;

[ApiController]
[Route("auditoria")]
public class AuditoriaController : ControllerBase
{
    private readonly IAuditoriaService _service;

    public AuditoriaController(IAuditoriaService service)
    {
        _service = service;
    }

    [HttpGet]
    [RequierePermiso(Modulo.Auditoria, Accion.Ver)]
    public async Task<IActionResult> Get([FromQuery] string? tabla, [FromQuery] int? registroId) =>
        Ok(await _service.QueryAsync(tabla, registroId));
}
