using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using SoulChat.Api.Common;
using SoulChat.Api.Filters;
using SoulChat.Application.Common;
using SoulChat.Application.DTOs.Catalogos;
using SoulChat.Application.Interfaces;

namespace SoulChat.Api.Controllers;

/// <remarks>
/// Las lecturas (GET) están disponibles para cualquier usuario autenticado porque alimentan los
/// desplegables de los formularios. Las escrituras requieren permiso sobre el módulo Catálogos.
/// </remarks>
[ApiController]
[Route("catalogos")]
public class CatalogosController : ControllerBase
{
    private readonly ICatalogoService _service;
    private readonly ICatalogoAdminService _admin;
    private readonly IValidator<CatalogoInputDto> _validator;

    public CatalogosController(ICatalogoService service, ICatalogoAdminService admin, IValidator<CatalogoInputDto> validator)
    {
        _service = service;
        _admin = admin;
        _validator = validator;
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

    // ─── Administración de valores ────────────────────────────────────────────
    // {catalogo}: status-desarrollo | tipo-activacion | bsp | tenencia-sim | app-channel

    [HttpPost("{catalogo}")]
    [RequierePermiso(Modulo.Catalogos, Accion.Crear)]
    public async Task<ActionResult<CatalogoItemDto>> Create(string catalogo, CatalogoInputDto dto)
    {
        await _validator.ValidateAndThrowAppAsync(dto);
        var result = await _admin.CreateAsync(catalogo, dto);
        return Created($"catalogos/{catalogo}/{result.Id}", result);
    }

    [HttpPut("{catalogo}/{id:int}")]
    [RequierePermiso(Modulo.Catalogos, Accion.Editar)]
    public async Task<ActionResult<CatalogoItemDto>> Update(string catalogo, int id, CatalogoInputDto dto)
    {
        await _validator.ValidateAndThrowAppAsync(dto);
        return Ok(await _admin.UpdateAsync(catalogo, id, dto));
    }

    [HttpDelete("{catalogo}/{id:int}")]
    [RequierePermiso(Modulo.Catalogos, Accion.Eliminar)]
    public async Task<IActionResult> Delete(string catalogo, int id)
    {
        await _admin.DeleteAsync(catalogo, id);
        return NoContent();
    }
}
