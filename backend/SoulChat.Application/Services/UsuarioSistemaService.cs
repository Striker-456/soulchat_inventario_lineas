using SoulChat.Application.Common;
using SoulChat.Application.DTOs.Usuarios;
using SoulChat.Application.Interfaces;
using SoulChat.Domain.Entities;
using SoulChat.Domain.Interfaces;

namespace SoulChat.Application.Services;

public class UsuarioSistemaService : IUsuarioSistemaService
{
    private const string Tabla = "usuarios_sistema";

    private readonly IUsuarioSistemaRepository _repository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditoriaService _auditoria;

    public UsuarioSistemaService(
        IUsuarioSistemaRepository repository,
        IPasswordHasher passwordHasher,
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUser,
        IAuditoriaService auditoria)
    {
        _repository = repository;
        _passwordHasher = passwordHasher;
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
        _auditoria = auditoria;
    }

    public async Task<IReadOnlyList<UsuarioResponseDto>> GetAllAsync()
    {
        var usuarios = await _repository.GetAllAsync();
        return usuarios.OrderBy(u => u.Email).Select(MapToDto).ToList();
    }

    public async Task<UsuarioResponseDto> GetByIdAsync(int id) => MapToDto(await ObtenerAsync(id));

    public async Task<UsuarioResponseDto> CreateAsync(UsuarioCreateDto dto)
    {
        if (await _repository.EmailExisteAsync(dto.Email, null))
        {
            throw new ConflictException($"Ya existe un usuario con el email {dto.Email}.");
        }

        var usuario = new UsuarioSistema
        {
            Nombre = dto.Nombre.Trim(),
            Email = dto.Email,
            PasswordHash = _passwordHasher.Hash(dto.Password),
            Rol = dto.Rol,
            Activo = true,
        };

        await _repository.AddAsync(usuario);
        await _unitOfWork.SaveChangesAsync();

        var cambios = ToFieldMap(usuario)
            .Select(kv => new CampoCambio(kv.Key, null, kv.Value))
            .ToList();
        await _auditoria.RegistrarAsync(Tabla, usuario.Id, cambios);

        return MapToDto(usuario);
    }

    public async Task<UsuarioResponseDto> UpdateAsync(int id, UsuarioUpdateDto dto)
    {
        var usuario = await ObtenerAsync(id);

        if (usuario.Id == _currentUser.UsuarioId && !dto.Activo)
        {
            throw new ForbiddenAppException("No puedes desactivar tu propia cuenta.");
        }

        var dejaDeSerAdminActivo = usuario.Rol == Roles.Admin && usuario.Activo && (dto.Rol != Roles.Admin || !dto.Activo);
        if (dejaDeSerAdminActivo)
        {
            await AsegurarOtroAdministradorAsync(usuario.Id);
        }

        var antes = ToFieldMap(usuario);

        // Cambiar de rol descarta los permisos personalizados: se vuelve a la plantilla del nuevo rol.
        if (!string.Equals(usuario.Rol, dto.Rol, StringComparison.Ordinal))
        {
            usuario.Permisos = null;
        }

        usuario.Rol = dto.Rol;
        usuario.Activo = dto.Activo;
        if (dto.Nombre is not null)
        {
            usuario.Nombre = dto.Nombre.Trim();
        }

        _repository.Update(usuario);
        await _unitOfWork.SaveChangesAsync();

        await RegistrarCambiosAsync(usuario, antes);

        return MapToDto(usuario);
    }

    public async Task ResetPasswordAsync(int id, CambiarPasswordDto dto)
    {
        var usuario = await ObtenerAsync(id);

        usuario.PasswordHash = _passwordHasher.Hash(dto.NuevaPassword);

        _repository.Update(usuario);
        await _unitOfWork.SaveChangesAsync();

        // Nunca se registra la contraseña; solo el hecho de que fue restablecida.
        await _auditoria.RegistrarAsync(Tabla, usuario.Id, new[] { new CampoCambio("password", null, "(restablecida)") });
    }

    public async Task DeleteAsync(int id)
    {
        var usuario = await ObtenerAsync(id);

        if (usuario.Id == _currentUser.UsuarioId)
        {
            throw new ForbiddenAppException("No puedes eliminar tu propia cuenta.");
        }

        if (usuario.Rol == Roles.Admin && usuario.Activo)
        {
            await AsegurarOtroAdministradorAsync(usuario.Id);
        }

        _repository.Remove(usuario);
        await _unitOfWork.SaveChangesAsync();

        await _auditoria.RegistrarAsync(Tabla, id, new[] { new CampoCambio("eliminado", null, usuario.Email) });
    }

    public PermisosCatalogoDto GetCatalogoPermisos() => new(
        PermisosCatalogo.Modulos,
        new Dictionary<string, IReadOnlyDictionary<string, string[]>>
        {
            [Roles.Admin] = PermisosCatalogo.Plantilla(Roles.Admin),
            [Roles.Editor] = PermisosCatalogo.Plantilla(Roles.Editor),
            [Roles.Consulta] = PermisosCatalogo.Plantilla(Roles.Consulta),
        });

    public async Task<UsuarioResponseDto> SetPermisosAsync(int id, PermisosUpdateDto dto)
    {
        var usuario = await ObtenerAsync(id);

        if (usuario.Rol == Roles.Admin)
        {
            throw new ConflictException("Los permisos de un administrador no se pueden limitar. Cambia primero su rol.");
        }

        var antes = ToFieldMap(usuario);
        usuario.Permisos = PermisosCatalogo.Normalizar(dto.Permisos ?? new Dictionary<string, string[]>());

        _repository.Update(usuario);
        await _unitOfWork.SaveChangesAsync();
        await RegistrarCambiosAsync(usuario, antes);

        return MapToDto(usuario);
    }

    public async Task<UsuarioResponseDto> ResetPermisosAsync(int id)
    {
        var usuario = await ObtenerAsync(id);

        var antes = ToFieldMap(usuario);
        usuario.Permisos = null;

        _repository.Update(usuario);
        await _unitOfWork.SaveChangesAsync();
        await RegistrarCambiosAsync(usuario, antes);

        return MapToDto(usuario);
    }

    private async Task<UsuarioSistema> ObtenerAsync(int id) =>
        await _repository.GetByIdAsync(id)
            ?? throw new NotFoundException($"No se encontró el usuario con id {id}.");

    /// <summary>Evita dejar el sistema sin ningún administrador activo (nadie podría gestionar accesos).</summary>
    private async Task AsegurarOtroAdministradorAsync(int usuarioId)
    {
        if (await _repository.ContarAdministradoresActivosAsync(usuarioId) == 0)
        {
            throw new ConflictException("Debe existir al menos un administrador activo. Asigna ese rol a otro usuario primero.");
        }
    }

    private async Task RegistrarCambiosAsync(UsuarioSistema usuario, Dictionary<string, string?> antes)
    {
        var cambios = AuditDiff.Compare(antes, ToFieldMap(usuario));
        if (cambios.Count > 0)
        {
            await _auditoria.RegistrarAsync(Tabla, usuario.Id, cambios);
        }
    }

    // El correo se audita; el hash de la contraseña, jamás.
    private static Dictionary<string, string?> ToFieldMap(UsuarioSistema u) => new()
    {
        ["nombre"] = u.Nombre,
        ["email"] = u.Email,
        ["rol"] = u.Rol,
        ["activo"] = u.Activo.ToString(),
        ["permisos"] = PermisosCatalogo.Resumen(PermisosCatalogo.Efectivos(u.Rol, u.Permisos)),
    };

    private static UsuarioResponseDto MapToDto(UsuarioSistema u) => new(
        u.Id,
        u.Nombre,
        u.Email,
        u.Rol,
        u.Activo,
        PermisosCatalogo.Efectivos(u.Rol, u.Permisos),
        u.Permisos is not null && u.Rol != Roles.Admin);
}
