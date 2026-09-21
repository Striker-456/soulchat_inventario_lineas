using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using SoulChat.Api.Common;
using SoulChat.Api.Filters;
using SoulChat.Application.Common;
using SoulChat.Application.DTOs.Clientes;
using SoulChat.Application.Interfaces;

namespace SoulChat.Api.Controllers;

[ApiController]
[Route("clientes")]
public class ClientesController : ControllerBase
{
    private readonly IClienteService _service;
    private readonly IValidator<ClienteCreateDto> _createValidator;
    private readonly IValidator<ClienteUpdateDto> _updateValidator;

    public ClientesController(
        IClienteService service,
        IValidator<ClienteCreateDto> createValidator,
        IValidator<ClienteUpdateDto> updateValidator)
    {
        _service = service;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
    }

    [HttpGet]
    [RequierePermiso(Modulo.Clientes, Accion.Ver)]
    public async Task<ActionResult<IReadOnlyList<ClienteResponseDto>>> Get() => Ok(await _service.GetAllAsync());

    [HttpGet("{id:int}")]
    [RequierePermiso(Modulo.Clientes, Accion.Ver)]
    public async Task<ActionResult<ClienteResponseDto>> GetById(int id) => Ok(await _service.GetByIdAsync(id));

    [HttpPost]
    [RequierePermiso(Modulo.Clientes, Accion.Crear)]
    public async Task<ActionResult<ClienteResponseDto>> Create(ClienteCreateDto dto)
    {
        await _createValidator.ValidateAndThrowAppAsync(dto);
        var result = await _service.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id:int}")]
    [RequierePermiso(Modulo.Clientes, Accion.Editar)]
    public async Task<ActionResult<ClienteResponseDto>> Update(int id, ClienteUpdateDto dto)
    {
        await _updateValidator.ValidateAndThrowAppAsync(dto);
        return Ok(await _service.UpdateAsync(id, dto));
    }

    [HttpDelete("{id:int}")]
    [RequierePermiso(Modulo.Clientes, Accion.Eliminar)]
    public async Task<IActionResult> Delete(int id)
    {
        await _service.DeleteAsync(id);
        return NoContent();
    }
}
