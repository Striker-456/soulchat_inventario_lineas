using SoulChat.Application.Common;

namespace SoulChat.Application.DTOs.Usuarios;

public record UsuarioCreateDto(string Nombre, string Email, string Password, string Rol);

/// <param name="Nombre">Opcional: si es null no se cambia (permite corregir el nombre de cuentas antiguas).</param>
/// <remarks>Cambiar el rol descarta los permisos personalizados: el usuario vuelve a la plantilla del nuevo rol.</remarks>
public record UsuarioUpdateDto(string Rol, bool Activo, string? Nombre = null);

public record CambiarPasswordDto(string NuevaPassword);

/// <param name="Permisos">Permisos efectivos (módulo → acciones).</param>
/// <param name="PermisosPersonalizados">true si el administrador ajustó la plantilla del rol para este usuario.</param>
public record UsuarioResponseDto(
    int Id,
    string? Nombre,
    string Email,
    string Rol,
    bool Activo,
    IReadOnlyDictionary<string, string[]> Permisos,
    bool PermisosPersonalizados);

/// <summary>Matriz completa módulo → acciones permitidas para el usuario.</summary>
public record PermisosUpdateDto(Dictionary<string, string[]> Permisos);

/// <summary>Módulos/acciones disponibles y la plantilla de cada rol, para pintar la matriz de permisos.</summary>
public record PermisosCatalogoDto(
    IReadOnlyList<ModuloPermiso> Modulos,
    IReadOnlyDictionary<string, IReadOnlyDictionary<string, string[]>> Plantillas);
