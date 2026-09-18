using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SoulChat.Api.Common;
using SoulChat.Application.Common;
using SoulChat.Application.DTOs.Usuarios;
using SoulChat.Application.Interfaces;

namespace SoulChat.Api.Controllers;

[ApiController]
[Route("usuarios")]
[Authorize(Roles = Roles.Admin)]
public class UsuariosSistemaController : ControllerBase
{
    private readonly IUsuarioSistemaService _service;
    private readonly IValidator<UsuarioCreateDto> _createValidator;
    private readonly IValidator<UsuarioUpdateDto> _updateValidator;
    private readonly IValidator<CambiarPasswordDto> _passwordValidator;

    public UsuariosSistemaController(
        IUsuarioSistemaService service,
        IValidator<UsuarioCreateDto> createValidator,
        IValidator<UsuarioUpdateDto> updateValidator,
        IValidator<CambiarPasswordDto> passwordValidator)
    {
        _service = service;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
        _passwordValidator = passwordValidator;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<UsuarioResponseDto>>> Get() => Ok(await _service.GetAllAsync());

    [HttpGet("{id:int}")]
    public async Task<ActionResult<UsuarioResponseDto>> GetById(int id) => Ok(await _service.GetByIdAsync(id));

    [HttpPost]
    public async Task<ActionResult<UsuarioResponseDto>> Create(UsuarioCreateDto dto)
    {
        await _createValidator.ValidateAndThrowAppAsync(dto);
        var result = await _service.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<UsuarioResponseDto>> Update(int id, UsuarioUpdateDto dto)
    {
        await _updateValidator.ValidateAndThrowAppAsync(dto);
        return Ok(await _service.UpdateAsync(id, dto));
    }

    [HttpPost("{id:int}/reset-password")]
    public async Task<IActionResult> ResetPassword(int id, CambiarPasswordDto dto)
    {
        await _passwordValidator.ValidateAndThrowAppAsync(dto);
        await _service.ResetPasswordAsync(id, dto);
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        await _service.DeleteAsync(id);
        return NoContent();
    }
}
