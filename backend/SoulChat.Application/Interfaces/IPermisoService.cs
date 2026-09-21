namespace SoulChat.Application.Interfaces;

/// <summary>Estado vigente (leído de la base de datos) de la cuenta que hace la petición.</summary>
public record PermisosUsuario(int UsuarioId, string Email, string Rol, bool Activo, IReadOnlyDictionary<string, string[]> Permisos);

public interface IPermisoService
{
    /// <summary>Devuelve null si la cuenta ya no existe.</summary>
    Task<PermisosUsuario?> ObtenerAsync(int usuarioId);
}
