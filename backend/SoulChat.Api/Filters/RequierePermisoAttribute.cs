using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using SoulChat.Api.Middleware;
using SoulChat.Application.Common;
using SoulChat.Application.Interfaces;

namespace SoulChat.Api.Filters;

/// <summary>
/// Exige que el usuario tenga la <paramref name="accion"/> indicada sobre el <paramref name="modulo"/>.
/// Los permisos se leen de la base de datos en cada petición, así que los cambios del administrador
/// (o la desactivación de una cuenta) surten efecto de inmediato, sin esperar a que venza el token.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false)]
public class RequierePermisoAttribute : TypeFilterAttribute
{
    public RequierePermisoAttribute(string modulo, string accion) : base(typeof(RequierePermisoFilter))
    {
        Arguments = new object[] { modulo, accion };
    }
}

public class RequierePermisoFilter : IAsyncAuthorizationFilter
{
    private readonly string _modulo;
    private readonly string _accion;
    private readonly IPermisoService _permisos;
    private readonly ICurrentUserService _currentUser;

    public RequierePermisoFilter(string modulo, string accion, IPermisoService permisos, ICurrentUserService currentUser)
    {
        _modulo = modulo;
        _accion = accion;
        _permisos = permisos;
        _currentUser = currentUser;
    }

    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        var usuarioId = _currentUser.UsuarioId
            ?? throw new UnauthorizedAppException("La sesión no es válida.");

        var usuario = await _permisos.ObtenerAsync(usuarioId);
        if (usuario is null || !usuario.Activo)
        {
            throw new UnauthorizedAppException("La cuenta no existe o está desactivada.");
        }

        if (!PermisosCatalogo.Permite(usuario.Permisos.ToDictionary(kv => kv.Key, kv => kv.Value), _modulo, _accion))
        {
            var etiqueta = PermisosCatalogo.Modulos.FirstOrDefault(m => m.Clave == _modulo)?.Etiqueta ?? _modulo;
            // Marca el rechazo como "acceso denegado" (y no como una regla de negocio) para el registro de actividad.
            context.HttpContext.Items[ActividadMiddleware.AccesoDenegadoKey] = true;
            throw new ForbiddenAppException($"No tienes permiso para {_accion} en {etiqueta}.");
        }
    }
}
