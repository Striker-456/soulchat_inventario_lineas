using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using SoulChat.Api.Common;
using SoulChat.Api.Filters;
using SoulChat.Application.Common;
using SoulChat.Application.DTOs.Empleados;
using SoulChat.Application.Interfaces;

namespace SoulChat.Api.Controllers;

[ApiController]
[Route("empleados")]
public class EmpleadosController : ControllerBase
{
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
    [RequierePermiso(Modulo.Empleados, Accion.Ver)]
    public async Task<ActionResult<IReadOnlyList<EmpleadoResponseDto>>> Get() => Ok(await _service.GetAllAsync());

    [HttpGet("{id:int}")]
    [RequierePermiso(Modulo.Empleados, Accion.Ver)]
    public async Task<ActionResult<EmpleadoResponseDto>> GetById(int id) => Ok(await _service.GetByIdAsync(id));

    [HttpPost]
    [RequierePermiso(Modulo.Empleados, Accion.Crear)]
    public async Task<ActionResult<EmpleadoResponseDto>> Create(EmpleadoCreateDto dto)
    {
        await _createValidator.ValidateAndThrowAppAsync(dto);
        var result = await _service.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id:int}")]
    [RequierePermiso(Modulo.Empleados, Accion.Editar)]
    public async Task<ActionResult<EmpleadoResponseDto>> Update(int id, EmpleadoUpdateDto dto)
    {
        await _updateValidator.ValidateAndThrowAppAsync(dto);
        return Ok(await _service.UpdateAsync(id, dto));
    }

    [HttpDelete("{id:int}")]
    [RequierePermiso(Modulo.Empleados, Accion.Eliminar)]
    public async Task<IActionResult> Delete(int id)
    {
        await _service.DeleteAsync(id);
        return NoContent();
    }
}
