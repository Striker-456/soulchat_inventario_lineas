using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SoulChat.Api.Common;
using SoulChat.Application.Common;
using SoulChat.Application.DTOs.Empleados;
using SoulChat.Application.Interfaces;

namespace SoulChat.Api.Controllers;

[ApiController]
[Route("empleados")]
public class EmpleadosController : ControllerBase
{
    private const string RolesEscritura = Roles.Admin + "," + Roles.Editor;

    private readonly IEmpleadoService _service;
    private readonly IValidator<EmpleadoCreateDto> _createValidator;
    private readonly IValidator<EmpleadoUpdateDto> _updateValidator;

    public EmpleadosController(
        IEmpleadoService service,
        IValidator<EmpleadoCreateDto> createValidator,
        IValidator<EmpleadoUpdateDto> updateValidator)
    {
        _service = service;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<EmpleadoResponseDto>>> Get() => Ok(await _service.GetAllAsync());

    [HttpGet("{id:int}")]
    public async Task<ActionResult<EmpleadoResponseDto>> GetById(int id) => Ok(await _service.GetByIdAsync(id));

    [HttpPost]
    [Authorize(Roles = RolesEscritura)]
    public async Task<ActionResult<EmpleadoResponseDto>> Create(EmpleadoCreateDto dto)
    {
        await _createValidator.ValidateAndThrowAppAsync(dto);
        var result = await _service.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = RolesEscritura)]
    public async Task<ActionResult<EmpleadoResponseDto>> Update(int id, EmpleadoUpdateDto dto)
    {
        await _updateValidator.ValidateAndThrowAppAsync(dto);
        return Ok(await _service.UpdateAsync(id, dto));
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = RolesEscritura)]
    public async Task<IActionResult> Delete(int id)
    {
        await _service.DeleteAsync(id);
        return NoContent();
    }
}
