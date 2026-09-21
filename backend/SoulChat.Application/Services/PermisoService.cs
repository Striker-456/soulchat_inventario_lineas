using SoulChat.Application.Common;
using SoulChat.Application.Interfaces;
using SoulChat.Domain.Interfaces;

namespace SoulChat.Application.Services;

public class PermisoService : IPermisoService
{
    private readonly IUsuarioSistemaRepository _usuarios;

    public PermisoService(IUsuarioSistemaRepository usuarios)
    {
        _usuarios = usuarios;
    }

    public async Task<PermisosUsuario?> ObtenerAsync(int usuarioId)
    {
        var usuario = await _usuarios.GetByIdAsync(usuarioId);
        if (usuario is null)
        {
            return null;
        }

        return new PermisosUsuario(
            usuario.Id,
            usuario.Email,
            usuario.Rol,
            usuario.Activo,
            PermisosCatalogo.Efectivos(usuario.Rol, usuario.Permisos));
    }
}
