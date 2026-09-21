using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using SoulChat.Api.Common;
using SoulChat.Api.Filters;
using SoulChat.Application.Common;
using SoulChat.Application.DTOs.Lineas;
using SoulChat.Application.Interfaces;
using SoulChat.Domain.Interfaces;

namespace SoulChat.Api.Controllers;

[ApiController]
[Route("lineas")]
public class LineasController : ControllerBase
{
    private readonly ILineaService _service;
    private readonly IValidator<LineaCreateDto> _createValidator;
    private readonly IValidator<LineaUpdateDto> _updateValidator;
    private readonly IValidator<LineaImportRequestDto> _importValidator;

    public LineasController(
        ILineaService service,
        IValidator<LineaCreateDto> createValidator,
        IValidator<LineaUpdateDto> updateValidator,
        IValidator<LineaImportRequestDto> importValidator)
    {
        _service = service;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
        _importValidator = importValidator;
    }

    [HttpGet]
    [RequierePermiso(Modulo.Lineas, Accion.Ver)]
    public async Task<ActionResult<IReadOnlyList<LineaResponseDto>>> Get(
        [FromQuery] int? cliente,
        [FromQuery] int? status,
        [FromQuery] int? coordinador,
        [FromQuery] int? programador,
        [FromQuery] string? texto)
    {
        var filtro = new LineaFiltro
        {
            ClienteId = cliente,
            StatusDesarrolloId = status,
            CoordinadorId = coordinador,
            ProgramadorId = programador,
            Texto = texto,
        };

        return Ok(await _service.BuscarAsync(filtro));
    }

    [HttpGet("{id:int}")]
    [RequierePermiso(Modulo.Lineas, Accion.Ver)]
    public async Task<ActionResult<LineaResponseDto>> GetById(int id) => Ok(await _service.GetByIdAsync(id));

    [HttpPost]
    [RequierePermiso(Modulo.Lineas, Accion.Crear)]
    public async Task<ActionResult<LineaResponseDto>> Create(LineaCreateDto dto)
    {
        await _createValidator.ValidateAndThrowAppAsync(dto);
        var result = await _service.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id:int}")]
    [RequierePermiso(Modulo.Lineas, Accion.Editar)]
    public async Task<ActionResult<LineaResponseDto>> Update(int id, LineaUpdateDto dto)
    {
        await _updateValidator.ValidateAndThrowAppAsync(dto);
        return Ok(await _service.UpdateAsync(id, dto));
    }

    [HttpDelete("{id:int}")]
    [RequierePermiso(Modulo.Lineas, Accion.Eliminar)]
    public async Task<IActionResult> Delete(int id)
    {
        await _service.DeleteAsync(id);
        return NoContent();
    }

    /// <summary>Alta masiva. Las filas válidas se crean; las inválidas se devuelven con su motivo.</summary>
    [HttpPost("importar")]
    [RequierePermiso(Modulo.Importar, Accion.Crear)]
    public async Task<ActionResult<LineaImportResultDto>> Importar(LineaImportRequestDto request)
    {
        await _importValidator.ValidateAndThrowAppAsync(request);
        return Ok(await _service.ImportarAsync(request));
    }
}
