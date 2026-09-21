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
    private readonly IValidator<PermisosUpdateDto> _permisosValidator;

    public UsuariosSistemaController(
        IUsuarioSistemaService service,
        IValidator<UsuarioCreateDto> createValidator,
        IValidator<UsuarioUpdateDto> updateValidator,
        IValidator<CambiarPasswordDto> passwordValidator,
        IValidator<PermisosUpdateDto> permisosValidator)
    {
        _service = service;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
        _passwordValidator = passwordValidator;
        _permisosValidator = permisosValidator;
    }

    /// <summary>Módulos y acciones disponibles, y la plantilla de permisos de cada rol.</summary>
    [HttpGet("permisos/catalogo")]
    public ActionResult<PermisosCatalogoDto> GetCatalogoPermisos() => Ok(_service.GetCatalogoPermisos());

    /// <summary>Reemplaza la matriz de permisos del usuario. No aplica a administradores (siempre tienen acceso total).</summary>
    [HttpPut("{id:int}/permisos")]
    public async Task<ActionResult<UsuarioResponseDto>> SetPermisos(int id, PermisosUpdateDto dto)
    {
        await _permisosValidator.ValidateAndThrowAppAsync(dto);
        return Ok(await _service.SetPermisosAsync(id, dto));
    }

    /// <summary>Descarta los permisos personalizados: el usuario vuelve a la plantilla de su rol.</summary>
    [HttpDelete("{id:int}/permisos")]
    public async Task<ActionResult<UsuarioResponseDto>> ResetPermisos(int id) => Ok(await _service.ResetPermisosAsync(id));

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
