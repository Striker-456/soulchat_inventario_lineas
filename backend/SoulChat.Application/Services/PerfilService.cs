using SoulChat.Application.Common;
using SoulChat.Application.DTOs.Auth;
using SoulChat.Application.Interfaces;
using SoulChat.Domain.Entities;
using SoulChat.Domain.Interfaces;

namespace SoulChat.Application.Services;

public class PerfilService : IPerfilService
{
    private const string Tabla = "usuarios_sistema";

    private readonly IUsuarioSistemaRepository _usuarios;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditoriaService _auditoria;

    public PerfilService(
        IUsuarioSistemaRepository usuarios,
        IPasswordHasher passwordHasher,
        IJwtTokenService jwtTokenService,
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUser,
        IAuditoriaService auditoria)
    {
        _usuarios = usuarios;
        _passwordHasher = passwordHasher;
        _jwtTokenService = jwtTokenService;
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
        _auditoria = auditoria;
    }

    public async Task<MeResponseDto> CambiarNombreAsync(CambiarNombreDto dto)
    {
        var usuario = await ObtenerVerificandoPasswordAsync(dto.PasswordActual);

        var anterior = usuario.Nombre;
        usuario.Nombre = dto.Nombre.Trim();

        _usuarios.Update(usuario);
        await _unitOfWork.SaveChangesAsync();

        if (!string.Equals(anterior, usuario.Nombre, StringComparison.Ordinal))
        {
            await _auditoria.RegistrarAsync(Tabla, usuario.Id, new[] { new CampoCambio("nombre", anterior, usuario.Nombre) });
        }

        return new MeResponseDto(usuario.Email, usuario.Nombre, usuario.Rol, PermisosCatalogo.Efectivos(usuario.Rol, usuario.Permisos));
    }

    public async Task<LoginResponseDto> CambiarEmailAsync(CambiarEmailDto dto)
    {
        var usuario = await ObtenerVerificandoPasswordAsync(dto.PasswordActual);

        var nuevo = dto.Email.Trim();
        // Solo el correo idéntico se rechaza; cambiar únicamente mayúsculas/minúsculas sí está permitido.
        if (string.Equals(usuario.Email, nuevo, StringComparison.Ordinal))
        {
            throw Error("email", "Ese ya es tu correo actual.");
        }

        if (await _usuarios.EmailExisteAsync(nuevo, usuario.Id))
        {
            throw new ConflictException($"Ya existe una cuenta con el correo {nuevo}.");
        }

        var anterior = usuario.Email;
        usuario.Email = nuevo;

        _usuarios.Update(usuario);
        await _unitOfWork.SaveChangesAsync();

        await _auditoria.RegistrarAsync(Tabla, usuario.Id, new[] { new CampoCambio("email", anterior, nuevo) });

        // El correo viaja dentro del token: se entrega uno nuevo para que la sesión no quede desactualizada.
        var token = _jwtTokenService.GenerateToken(usuario);
        return new LoginResponseDto(
            token.Token,
            token.ExpiresAt,
            usuario.Email,
            usuario.Nombre,
            usuario.Rol,
            PermisosCatalogo.Efectivos(usuario.Rol, usuario.Permisos));
    }

    public async Task CambiarPasswordAsync(CambiarPasswordPropiaDto dto)
    {
        var usuario = await ObtenerVerificandoPasswordAsync(dto.PasswordActual);

        usuario.PasswordHash = _passwordHasher.Hash(dto.NuevaPassword);

        _usuarios.Update(usuario);
        await _unitOfWork.SaveChangesAsync();

        // Nunca se registra la contraseña; solo el hecho de que la persona la cambió.
        await _auditoria.RegistrarAsync(Tabla, usuario.Id, new[] { new CampoCambio("password", null, "(cambiada por el propio usuario)") });
    }

    /// <summary>La cuenta que hace la petición, tras comprobar que su contraseña actual es la correcta.</summary>
    private async Task<UsuarioSistema> ObtenerVerificandoPasswordAsync(string passwordActual)
    {
        var id = _currentUser.UsuarioId ?? throw new UnauthorizedAppException("La sesión no es válida.");

        var usuario = await _usuarios.GetByIdAsync(id);
        if (usuario is null || !usuario.Activo)
        {
            throw new UnauthorizedAppException("La cuenta no existe o está desactivada.");
        }

        // Se responde 400 (no 401): un 401 haría que el cliente cierre la sesión por un simple error de tecleo.
        if (!_passwordHasher.Verify(passwordActual, usuario.PasswordHash))
        {
            throw Error("passwordActual", "La contraseña actual no es correcta.");
        }

        return usuario;
    }

    private static ValidationAppException Error(string campo, string mensaje) =>
        new(new Dictionary<string, string[]> { [campo] = new[] { mensaje } });
}
