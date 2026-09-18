using Microsoft.AspNetCore.Mvc;
using SoulChat.Application.Interfaces;

namespace SoulChat.Api.Controllers;

[ApiController]
[Route("catalogos")]
public class CatalogosController : ControllerBase
{
    private readonly ICatalogoService _service;

    public CatalogosController(ICatalogoService service)
    {
        _service = service;
    }

    [HttpGet("clientes")]
    public async Task<IActionResult> GetClientes() => Ok(await _service.GetClientesAsync());

    [HttpGet("empleados")]
    public async Task<IActionResult> GetEmpleados() => Ok(await _service.GetEmpleadosAsync());

    [HttpGet("status-desarrollo")]
    public async Task<IActionResult> GetStatusDesarrollo() => Ok(await _service.GetStatusDesarrolloAsync());

    [HttpGet("tipo-activacion")]
    public async Task<IActionResult> GetTipoActivacion() => Ok(await _service.GetTipoActivacionAsync());

    [HttpGet("bsp")]
    public async Task<IActionResult> GetBsp() => Ok(await _service.GetBspAsync());

    [HttpGet("tenencia-sim")]
    public async Task<IActionResult> GetTenenciaSim() => Ok(await _service.GetTenenciaSimAsync());

    [HttpGet("app-channel")]
    public async Task<IActionResult> GetAppChannel() => Ok(await _service.GetAppChannelAsync());
}
