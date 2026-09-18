using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SoulChat.Api.Common;
using SoulChat.Application.Common;
using SoulChat.Application.DTOs.Smart;
using SoulChat.Application.Interfaces;

namespace SoulChat.Api.Controllers;

[ApiController]
[Route("lineas/{lineaId:int}/smart")]
public class LineaSmartController : ControllerBase
{
    private readonly ISmartService _service;
    private readonly IValidator<SmartCreateDto> _createValidator;
    private readonly IValidator<SmartUpdateDto> _updateValidator;

    public LineaSmartController(
        ISmartService service,
        IValidator<SmartCreateDto> createValidator,
        IValidator<SmartUpdateDto> updateValidator)
    {
        _service = service;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
    }

    [HttpGet]
    public async Task<ActionResult<SmartResponseDto>> Get(int lineaId) => Ok(await _service.GetByLineaIdAsync(lineaId));

    [HttpPost]
    public async Task<ActionResult<SmartResponseDto>> Create(int lineaId, SmartCreateDto dto)
    {
        await _createValidator.ValidateAndThrowAppAsync(dto);
        var result = await _service.CreateAsync(lineaId, dto);
        return CreatedAtAction(nameof(Get), new { lineaId }, result);
    }

    [HttpPut]
    public async Task<ActionResult<SmartResponseDto>> Update(int lineaId, SmartUpdateDto dto)
    {
        await _updateValidator.ValidateAndThrowAppAsync(dto);
        return Ok(await _service.UpdateAsync(lineaId, dto));
    }

    [HttpDelete]
    public async Task<IActionResult> Delete(int lineaId)
    {
        await _service.DeleteAsync(lineaId);
        return NoContent();
    }

    [HttpPost("revelar-credenciales")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<SmartRevealResponseDto>> RevelarCredenciales(int lineaId) =>
        Ok(await _service.RevelarAsync(lineaId));
}
