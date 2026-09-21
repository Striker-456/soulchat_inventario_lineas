using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SoulChat.Api.Common;
using SoulChat.Application.Common;
using SoulChat.Application.DTOs.Auth;
using SoulChat.Application.Interfaces;

namespace SoulChat.Api.Controllers;

[ApiController]
[Route("auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IPerfilService _perfilService;
    private readonly ICurrentUserService _currentUser;
    private readonly IValidator<LoginRequestDto> _loginValidator;
    private readonly IValidator<CambiarNombreDto> _nombreValidator;
    private readonly IValidator<CambiarEmailDto> _emailValidator;
    private readonly IValidator<CambiarPasswordPropiaDto> _passwordValidator;

    public AuthController(
        IAuthService authService,
        IPerfilService perfilService,
        ICurrentUserService currentUser,
        IValidator<LoginRequestDto> loginValidator,
        IValidator<CambiarNombreDto> nombreValidator,
        IValidator<CambiarEmailDto> emailValidator,
        IValidator<CambiarPasswordPropiaDto> passwordValidator)
    {
        _authService = authService;
        _perfilService = perfilService;
        _currentUser = currentUser;
        _loginValidator = loginValidator;
        _nombreValidator = nombreValidator;
        _emailValidator = emailValidator;
        _passwordValidator = passwordValidator;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponseDto>> Login(LoginRequestDto dto)
    {
        await _loginValidator.ValidateAndThrowAppAsync(dto);
        var result = await _authService.LoginAsync(dto);
        return Ok(result);
    }

    /// <summary>Nombre, rol y permisos vigentes del usuario del token (pueden haber cambiado desde el login).</summary>
    [HttpGet("me")]
    public async Task<ActionResult<MeResponseDto>> Me()
    {
        var usuarioId = _currentUser.UsuarioId ?? throw new UnauthorizedAppException("La sesión no es válida.");
        return Ok(await _authService.MeAsync(usuarioId));
    }

    // ─── Cambios sobre la propia cuenta (cualquier rol; exigen la contraseña actual) ───

    [HttpPut("me/nombre")]
    public async Task<ActionResult<MeResponseDto>> CambiarNombre(CambiarNombreDto dto)
    {
        await _nombreValidator.ValidateAndThrowAppAsync(dto);
        return Ok(await _perfilService.CambiarNombreAsync(dto));
    }

    /// <summary>Devuelve una sesión nueva (token con el correo actualizado).</summary>
    [HttpPut("me/email")]
    public async Task<ActionResult<LoginResponseDto>> CambiarEmail(CambiarEmailDto dto)
    {
        await _emailValidator.ValidateAndThrowAppAsync(dto);
        return Ok(await _perfilService.CambiarEmailAsync(dto));
    }

    [HttpPut("me/password")]
    public async Task<IActionResult> CambiarPassword(CambiarPasswordPropiaDto dto)
    {
        await _passwordValidator.ValidateAndThrowAppAsync(dto);
        await _perfilService.CambiarPasswordAsync(dto);
        return NoContent();
    }
}
