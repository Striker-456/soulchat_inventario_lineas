using System.Text;

namespace SoulChat.Application.Common;

/// <summary>Claves de los módulos sobre los que el administrador puede conceder o limitar acciones.</summary>
/// <remarks>La gestión de usuarios y de sus permisos no es un módulo asignable: es exclusiva del rol Admin.</remarks>
public static class Modulo
{
    public const string Dashboard = "dashboard";
    public const string Lineas = "lineas";
    public const string Clientes = "clientes";
    public const string Empleados = "empleados";
    public const string Catalogos = "catalogos";
    public const string Auditoria = "auditoria";
    public const string Logs = "logs";
    public const string Importar = "importar";
    public const string Credenciales = "credenciales";
}

public static class Accion
{
    public const string Ver = "ver";
    public const string Crear = "crear";
    public const string Editar = "editar";
    public const string Eliminar = "eliminar";
}

public record ModuloPermiso(string Clave, string Etiqueta, IReadOnlyList<string> Acciones);

/// <summary>
/// Define qué módulos y acciones existen, las plantillas de permisos de cada rol y cómo se calculan
/// los permisos efectivos de un usuario (plantilla del rol o matriz personalizada por el administrador).
/// </summary>
public static class PermisosCatalogo
{
    private static readonly string[] Crud = { Accion.Ver, Accion.Crear, Accion.Editar, Accion.Eliminar };
    private static readonly string[] SoloVer = { Accion.Ver };
    private static readonly string[] SoloCrear = { Accion.Crear };

    public static readonly IReadOnlyList<ModuloPermiso> Modulos = new[]
    {
        new ModuloPermiso(Modulo.Dashboard, "Dashboard", SoloVer),
        new ModuloPermiso(Modulo.Lineas, "Líneas", Crud),
        new ModuloPermiso(Modulo.Clientes, "Clientes", Crud),
        new ModuloPermiso(Modulo.Empleados, "Empleados", Crud),
        new ModuloPermiso(Modulo.Catalogos, "Catálogos", Crud),
        new ModuloPermiso(Modulo.Auditoria, "Auditoría", SoloVer),
        new ModuloPermiso(Modulo.Logs, "Logs del sistema", SoloVer),
        new ModuloPermiso(Modulo.Importar, "Importación masiva", SoloCrear),
        new ModuloPermiso(Modulo.Credenciales, "Ver credenciales", SoloVer),
    };

    private static readonly IReadOnlyDictionary<string, string[]> PlantillaAdmin =
        Modulos.ToDictionary(m => m.Clave, m => m.Acciones.ToArray());

    private static readonly IReadOnlyDictionary<string, string[]> PlantillaEditor = Armar(new()
    {
        [Modulo.Dashboard] = SoloVer,
        [Modulo.Lineas] = Crud,
        [Modulo.Clientes] = new[] { Accion.Ver, Accion.Crear, Accion.Editar },
        [Modulo.Empleados] = Crud,
        [Modulo.Catalogos] = new[] { Accion.Ver, Accion.Crear, Accion.Editar },
        [Modulo.Auditoria] = SoloVer,
        [Modulo.Importar] = SoloCrear,
    });

    private static readonly IReadOnlyDictionary<string, string[]> PlantillaConsulta = Armar(new()
    {
        [Modulo.Dashboard] = SoloVer,
        [Modulo.Lineas] = SoloVer,
        [Modulo.Clientes] = SoloVer,
        [Modulo.Catalogos] = SoloVer,
    });

    /// <summary>Plantilla de permisos de un rol, con todos los módulos presentes (vacíos si no tiene acceso).</summary>
    public static IReadOnlyDictionary<string, string[]> Plantilla(string rol) => rol switch
    {
        Roles.Admin => PlantillaAdmin,
        Roles.Editor => PlantillaEditor,
        _ => PlantillaConsulta,
    };

    /// <summary>
    /// Permisos efectivos: los administradores siempre tienen acceso total; el resto usa la matriz
    /// personalizada si existe, o la plantilla de su rol.
    /// </summary>
    public static Dictionary<string, string[]> Efectivos(string rol, IDictionary<string, string[]>? personalizados)
    {
        if (rol == Roles.Admin || personalizados is null)
        {
            return Copiar(Plantilla(rol));
        }

        return Modulos.ToDictionary(
            m => m.Clave,
            m => personalizados.TryGetValue(m.Clave, out var acciones)
                ? m.Acciones.Where(a => acciones.Contains(a)).ToArray()
                : Array.Empty<string>());
    }

    public static bool Permite(IDictionary<string, string[]> permisos, string modulo, string accion) =>
        permisos.TryGetValue(modulo, out var acciones) && acciones.Contains(accion);

    /// <summary>
    /// Valida y normaliza una matriz enviada por el administrador. Rechaza módulos o acciones desconocidos
    /// y garantiza que quien puede crear/editar/eliminar un módulo también pueda verlo.
    /// </summary>
    public static Dictionary<string, string[]> Normalizar(IDictionary<string, string[]> entrada)
    {
        var errores = new Dictionary<string, string[]>();
        var resultado = Modulos.ToDictionary(m => m.Clave, _ => Array.Empty<string>());

        foreach (var (clave, acciones) in entrada)
        {
            var modulo = Modulos.FirstOrDefault(m => string.Equals(m.Clave, clave, StringComparison.OrdinalIgnoreCase));
            if (modulo is null)
            {
                errores[clave] = new[] { $"El módulo '{clave}' no existe." };
                continue;
            }

            var solicitadas = (acciones ?? Array.Empty<string>())
                .Select(a => a.Trim().ToLowerInvariant())
                .Distinct()
                .ToList();

            var invalidas = solicitadas.Where(a => !modulo.Acciones.Contains(a)).ToList();
            if (invalidas.Count > 0)
            {
                errores[modulo.Clave] = new[]
                {
                    $"Acciones no válidas para '{modulo.Clave}': {string.Join(", ", invalidas)}. Permitidas: {string.Join(", ", modulo.Acciones)}.",
                };
                continue;
            }

            var conVer = solicitadas.Count > 0 && modulo.Acciones.Contains(Accion.Ver) && !solicitadas.Contains(Accion.Ver)
                ? solicitadas.Append(Accion.Ver)
                : solicitadas;

            resultado[modulo.Clave] = modulo.Acciones.Where(a => conVer.Contains(a)).ToArray();
        }

        if (errores.Count > 0)
        {
            throw new ValidationAppException(errores);
        }

        return resultado;
    }

    /// <summary>Texto compacto para auditoría, p. ej. "lineas: ver, editar; clientes: ver".</summary>
    public static string Resumen(IDictionary<string, string[]> permisos)
    {
        var sb = new StringBuilder();
        foreach (var m in Modulos)
        {
            if (permisos.TryGetValue(m.Clave, out var acciones) && acciones.Length > 0)
            {
                if (sb.Length > 0) sb.Append("; ");
                sb.Append(m.Clave).Append(": ").Append(string.Join(", ", acciones));
            }
        }

        return sb.Length == 0 ? "(sin acceso)" : sb.ToString();
    }

    private static Dictionary<string, string[]> Copiar(IReadOnlyDictionary<string, string[]> origen) =>
        origen.ToDictionary(kv => kv.Key, kv => kv.Value.ToArray());

    private static IReadOnlyDictionary<string, string[]> Armar(Dictionary<string, string[]> definidos) =>
        Modulos.ToDictionary(m => m.Clave, m => definidos.TryGetValue(m.Clave, out var a) ? a : Array.Empty<string>());
}
