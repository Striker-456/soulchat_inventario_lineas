using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SoulChat.Api.Common;
using SoulChat.Application.Common;
using SoulChat.Application.DTOs.Connectly;
using SoulChat.Application.Interfaces;

namespace SoulChat.Api.Controllers;

[ApiController]
[Route("lineas/{lineaId:int}/connectly")]
public class LineaConnectlyController : ControllerBase
{
    private readonly IConnectlyService _service;
    private readonly IValidator<ConnectlyCreateDto> _createValidator;
    private readonly IValidator<ConnectlyUpdateDto> _updateValidator;

    public LineaConnectlyController(
        IConnectlyService service,
        IValidator<ConnectlyCreateDto> createValidator,
        IValidator<ConnectlyUpdateDto> updateValidator)
    {
        _service = service;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
    }

    [HttpGet]
    public async Task<ActionResult<ConnectlyResponseDto>> Get(int lineaId) => Ok(await _service.GetByLineaIdAsync(lineaId));

    [HttpPost]
    public async Task<ActionResult<ConnectlyResponseDto>> Create(int lineaId, ConnectlyCreateDto dto)
    {
        await _createValidator.ValidateAndThrowAppAsync(dto);
        var result = await _service.CreateAsync(lineaId, dto);
        return CreatedAtAction(nameof(Get), new { lineaId }, result);
    }

    [HttpPut]
    public async Task<ActionResult<ConnectlyResponseDto>> Update(int lineaId, ConnectlyUpdateDto dto)
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
    public async Task<ActionResult<ConnectlyRevealResponseDto>> RevelarCredenciales(int lineaId) =>
        Ok(await _service.RevelarAsync(lineaId));
}
