using System.Globalization;
using System.Text.RegularExpressions;
using SoulChat.Application.Common;
using SoulChat.Application.DTOs.Lineas;
using SoulChat.Application.Interfaces;
using SoulChat.Domain.Entities;
using SoulChat.Domain.Interfaces;

namespace SoulChat.Application.Services;

/// <summary>
/// Importación masiva de líneas. Solo el número es obligatorio; los catálogos se buscan por nombre
/// (sin distinguir mayúsculas ni acentos) y se crean si no existen, y las configuraciones Connectly/Smart
/// se crean únicamente cuando la fila trae al menos un dato del módulo.
/// </summary>
public class LineaImportService : ILineaImportService
{
    // Longitudes máximas: deben coincidir con las configuraciones de EF.
    private const int MaxNumero = 20;
    private const int MaxDescripcion = 4000;
    private const int MaxNombrePersona = 150;
    private const int MaxNombreCatalogo = 60;

    private static readonly string[] FormatosFecha = { "yyyy-MM-dd", "dd/MM/yyyy", "d/M/yyyy" };
    private static readonly HashSet<string> ValoresSi = new(StringComparer.Ordinal) { "si", "s", "true", "1", "x", "yes" };
    private static readonly HashSet<string> ValoresNo = new(StringComparer.Ordinal) { "no", "n", "false", "0" };

    private readonly ILineaRepository _lineas;
    private readonly ILineaConnectlyConfigRepository _connectly;
    private readonly ILineaSmartConfigRepository _smart;
    private readonly IClienteRepository _clientes;
    private readonly IEmpleadoRepository _empleados;
    private readonly ICatalogAdminRepository<StatusDesarrollo> _status;
    private readonly ICatalogAdminRepository<TenenciaSimCard> _tenencias;
    private readonly ICatalogAdminRepository<TipoActivacion> _tiposActivacion;
    private readonly ICatalogAdminRepository<Bsp> _bsps;
    private readonly ICatalogAdminRepository<AppChannel> _appChannels;
    private readonly ICredentialEncryptionService _encryption;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAuditoriaService _auditoria;
    private readonly ILogService _log;

    public LineaImportService(
        ILineaRepository lineas,
        ILineaConnectlyConfigRepository connectly,
        ILineaSmartConfigRepository smart,
        IClienteRepository clientes,
        IEmpleadoRepository empleados,
        ICatalogAdminRepository<StatusDesarrollo> status,
        ICatalogAdminRepository<TenenciaSimCard> tenencias,
        ICatalogAdminRepository<TipoActivacion> tiposActivacion,
        ICatalogAdminRepository<Bsp> bsps,
        ICatalogAdminRepository<AppChannel> appChannels,
        ICredentialEncryptionService encryption,
        IUnitOfWork unitOfWork,
        IAuditoriaService auditoria,
        ILogService log)
    {
        _lineas = lineas;
        _connectly = connectly;
        _smart = smart;
        _clientes = clientes;
        _empleados = empleados;
        _status = status;
        _tenencias = tenencias;
        _tiposActivacion = tiposActivacion;
        _bsps = bsps;
        _appChannels = appChannels;
        _encryption = encryption;
        _unitOfWork = unitOfWork;
        _auditoria = auditoria;
        _log = log;
    }

    public async Task<LineaImportResultDto> ImportarAsync(LineaImportRequestDto request)
    {
        var catalogos = await CargarCatalogosAsync();
        var numerosEnArchivo = new HashSet<string>(StringComparer.Ordinal);
        var errores = new List<LineaImportErrorDto>();
        var creados = new List<LineaImportCreadoDto>();
        var creadas = 0;

        for (var i = 0; i < request.Filas.Count; i++)
        {
            var fila = request.Filas[i];
            var numero = fila.Numero?.Trim();
            var connectly = TieneDatos(fila.Connectly) ? fila.Connectly : null;
            var smart = TieneDatos(fila.Smart) ? fila.Smart : null;

            // Se valida la fila completa antes de crear nada, para no dejar catálogos huérfanos de filas rechazadas.
            var mensajes = await ValidarAsync(fila, numero, connectly, smart, numerosEnArchivo);
            if (mensajes.Count > 0)
            {
                errores.Add(new LineaImportErrorDto(i + 1, fila.Numero, mensajes));
                continue;
            }

            var linea = new Linea
            {
                Numero = numero,
                ClienteId = await BuscarOCrearAsync(catalogos.Clientes, fila.Cliente, creados),
                DescripcionUso = Limpio(fila.DescripcionUso),
                StatusDesarrolloId = await BuscarOCrearAsync(catalogos.Status, fila.Status, creados),
                CoordinadorId = await BuscarOCrearAsync(catalogos.Coordinadores, fila.Coordinador, creados),
                ProgramadorId = await BuscarOCrearAsync(catalogos.Programadores, fila.Programador, creados),
                TenenciaSimCardId = await BuscarOCrearAsync(catalogos.Tenencias, fila.Tenencia, creados),
            };

            if (connectly is not null)
            {
                linea.ConnectlyConfig = CrearConnectly(numero!, connectly);
            }

            if (smart is not null)
            {
                linea.SmartConfig = await CrearSmartAsync(numero!, smart, catalogos, creados);
            }

            await _lineas.AddAsync(linea);
            await _unitOfWork.SaveChangesAsync();
            await RegistrarAltaAsync(linea);
            creadas++;
        }

        await _log.RegistrarAsync(
            errores.Count == 0 ? NivelLog.Success : NivelLog.Warning,
            "Líneas",
            "IMPORT",
            DetalleLog(request.Filas.Count, creadas, errores.Count, creados));

        return new LineaImportResultDto(request.Filas.Count, creadas, errores, creados);
    }

    // ─── Validación ──────────────────────────────────────────────────────────

    private async Task<List<string>> ValidarAsync(
        LineaImportFilaDto fila,
        string? numero,
        LineaImportConnectlyDto? connectly,
        LineaImportSmartDto? smart,
        HashSet<string> numerosEnArchivo)
    {
        var m = new List<string>();

        if (string.IsNullOrEmpty(numero))
        {
            m.Add("El número es requerido.");
        }
        else if (numero.Length > MaxNumero)
        {
            m.Add($"El número no puede superar {MaxNumero} caracteres.");
        }
        else if (!numerosEnArchivo.Add(numero))
        {
            m.Add("El número está repetido en el archivo.");
        }
        else if (await _lineas.ExisteNumeroAsync(numero, null))
        {
            m.Add("Ya existe una línea con ese número.");
        }
        else
        {
            // El número de la línea se usa como número del módulo, que también es único.
            if (connectly is not null && await _connectly.ExisteNumeroAsync(numero))
            {
                m.Add("El número ya está registrado en otra configuración de Connectly.");
            }
            if (smart is not null && await _smart.ExisteNumeroAsync(numero))
            {
                m.Add("El número ya está registrado en otra configuración de Smart.");
            }
        }

        ValidarLongitud(fila.Cliente, MaxNombrePersona, "El cliente", m);
        ValidarLongitud(fila.Coordinador, MaxNombrePersona, "El coordinador", m);
        ValidarLongitud(fila.Programador, MaxNombrePersona, "El programador", m);
        ValidarLongitud(fila.Status, MaxNombreCatalogo, "El status", m);
        ValidarLongitud(fila.Tenencia, MaxNombreCatalogo, "La tenencia", m);
        ValidarLongitud(fila.DescripcionUso, MaxDescripcion, "La descripción", m);

        if (connectly is not null)
        {
            ValidarLongitud(connectly.Usuario, 100, "El usuario de Connectly", m);
            ValidarLongitud(connectly.BusinessId, 100, "El business ID de Connectly", m);
            ValidarLongitud(connectly.Webhook, 255, "El webhook de Connectly", m);
            ValidarLongitud(connectly.Dns, 150, "El DNS de Connectly", m);
        }

        if (smart is not null)
        {
            ValidarLongitud(smart.TipoActivacion, MaxNombreCatalogo, "El tipo de activación", m);
            ValidarLongitud(smart.Bsp, MaxNombreCatalogo, "El BSP", m);
            ValidarLongitud(smart.AppChannel, MaxNombreCatalogo, "El app channel", m);
            ValidarLongitud(smart.CompanyCampanasBotai, 150, "El company de campañas Botai", m);
            ValidarLongitud(smart.WebhookCos, 255, "El webhook COS", m);
            ValidarLongitud(smart.WebhookSda, 255, "El webhook SDA", m);
            ValidarLongitud(smart.UsuarioCompanyId, 100, "El usuario / company ID", m);
            ValidarLongitud(smart.CompanyBot, 150, "El company bot", m);
            ValidarLongitud(smart.BotId, 100, "El bot ID", m);
            ValidarLongitud(smart.BotVersion, 30, "La versión del bot", m);
            ValidarLongitud(smart.CompanyIdCampanas, 100, "El company ID de campañas", m);

            if (!TryParseSiNo(smart.EnvioPush, out _))
            {
                m.Add("Envío push debe ser Sí o No.");
            }
            if (!TryParseSiNo(smart.Facturado, out _))
            {
                m.Add("Facturado debe ser Sí o No.");
            }
            if (!TryParseFecha(smart.FechaVerificacion, out _))
            {
                m.Add("La fecha de verificación debe tener formato AAAA-MM-DD o DD/MM/AAAA.");
            }
        }

        return m;
    }

    private static void ValidarLongitud(string? valor, int max, string campo, List<string> mensajes)
    {
        if (Limpio(valor) is { } v && v.Length > max)
        {
            mensajes.Add($"{campo} no puede superar {max} caracteres.");
        }
    }

    private static bool TieneDatos(LineaImportConnectlyDto? c) =>
        c is not null && AlgunoConDatos(c.Usuario, c.Contrasena, c.BusinessId, c.ApiKey, c.Webhook, c.Dns);

    private static bool TieneDatos(LineaImportSmartDto? s) =>
        s is not null && AlgunoConDatos(
            s.TipoActivacion, s.CompanyCampanasBotai, s.Bsp, s.WebhookCos, s.WebhookSda, s.UsuarioCompanyId,
            s.Clave, s.CompanyBot, s.BotId, s.BotVersion, s.AppChannel, s.CompanyIdCampanas, s.EnvioPush,
            s.Uso, s.Observaciones, s.FechaVerificacion, s.Facturado);

    private static bool AlgunoConDatos(params string?[] valores) => valores.Any(v => !string.IsNullOrWhiteSpace(v));

    // ─── Módulos ─────────────────────────────────────────────────────────────

    private LineaConnectlyConfig CrearConnectly(string numero, LineaImportConnectlyDto c) => new()
    {
        NumeroConnectly = numero,
        Usuario = Limpio(c.Usuario),
        ContrasenaCifrada = Cifrar(c.Contrasena),
        BusinessId = Limpio(c.BusinessId),
        ApiKeyCifrada = Cifrar(c.ApiKey),
        Webhook = Limpio(c.Webhook),
        Dns = Limpio(c.Dns),
    };

    private async Task<LineaSmartConfig> CrearSmartAsync(
        string numero, LineaImportSmartDto s, Catalogos catalogos, List<LineaImportCreadoDto> creados)
    {
        TryParseSiNo(s.EnvioPush, out var envioPush);
        TryParseSiNo(s.Facturado, out var facturado);
        TryParseFecha(s.FechaVerificacion, out var fecha);

        return new LineaSmartConfig
        {
            NumeroLinea = numero,
            TipoActivacionId = await BuscarOCrearAsync(catalogos.TiposActivacion, s.TipoActivacion, creados),
            CompanyCampanasBotai = Limpio(s.CompanyCampanasBotai),
            BspId = await BuscarOCrearAsync(catalogos.Bsps, s.Bsp, creados),
            WebhookCos = Limpio(s.WebhookCos),
            WebhookSda = Limpio(s.WebhookSda),
            UsuarioCompanyId = Limpio(s.UsuarioCompanyId),
            ClaveCifrada = Cifrar(s.Clave),
            CompanyBot = Limpio(s.CompanyBot),
            BotId = Limpio(s.BotId),
            BotVersion = Limpio(s.BotVersion),
            AppChannelId = await BuscarOCrearAsync(catalogos.AppChannels, s.AppChannel, creados),
            CompanyIdCampanas = Limpio(s.CompanyIdCampanas),
            EnvioPush = envioPush,
            Uso = Limpio(s.Uso),
            Observaciones = Limpio(s.Observaciones),
            FechaVerificacion = fecha,
            Facturado = facturado,
        };
    }

    private byte[]? Cifrar(string? valor) => Limpio(valor) is { } v ? _encryption.Encrypt(v) : null;

    // ─── Catálogos (buscar o crear) ──────────────────────────────────────────

    /// <summary>Catálogo indexado por nombre normalizado, con lo necesario para crear los nombres que falten.</summary>
    private sealed record Catalogo<T>(
        string Etiqueta,
        string Tabla,
        Dictionary<string, int> Ids,
        Func<string, T> Crear,
        Func<T, Task> Agregar,
        Func<T, int> Id,
        Func<T, IEnumerable<CampoCambio>> Alta);

    private sealed record Catalogos(
        Catalogo<Cliente> Clientes,
        Catalogo<Empleado> Coordinadores,
        Catalogo<Empleado> Programadores,
        Catalogo<StatusDesarrollo> Status,
        Catalogo<TenenciaSimCard> Tenencias,
        Catalogo<TipoActivacion> TiposActivacion,
        Catalogo<Bsp> Bsps,
        Catalogo<AppChannel> AppChannels);

    private async Task<Catalogos> CargarCatalogosAsync()
    {
        var clientes = new Catalogo<Cliente>(
            "Cliente",
            "clientes",
            Indexar(await _clientes.GetAllAsync(), c => c.Id, c => c.Nombre),
            nombre => new Cliente { Nombre = nombre, Estado = EstadoCliente.Activo },
            c => _clientes.AddAsync(c),
            c => c.Id,
            c => new[] { new CampoCambio("nombre", null, c.Nombre), new CampoCambio("estado", null, c.Estado) });

        // Coordinadores y programadores comparten la tabla (y el índice); solo cambia el rol con que se crean.
        var empleadosIds = Indexar(await _empleados.GetAllAsync(), e => e.Id, e => e.Nombre);
        Catalogo<Empleado> Empleados(string rol) => new(
            "Empleado",
            "empleados",
            empleadosIds,
            nombre => new Empleado { Nombre = nombre, Rol = rol },
            e => _empleados.AddAsync(e),
            e => e.Id,
            e => new[] { new CampoCambio("nombre", null, e.Nombre), new CampoCambio("rol", null, e.Rol) });

        return new Catalogos(
            clientes,
            Empleados("Coordinador"),
            Empleados("Programador"),
            await CatalogoSimpleAsync(_status, "Status", "status_desarrollo"),
            await CatalogoSimpleAsync(_tenencias, "Tenencia", "tenencia_sim_card"),
            await CatalogoSimpleAsync(_tiposActivacion, "Tipo de activación", "tipo_activacion"),
            await CatalogoSimpleAsync(_bsps, "BSP", "bsp"),
            await CatalogoSimpleAsync(_appChannels, "App channel", "app_channel"));
    }

    private static async Task<Catalogo<T>> CatalogoSimpleAsync<T>(ICatalogAdminRepository<T> repo, string etiqueta, string tabla)
        where T : class, ICatalogEntity, new() => new(
            etiqueta,
            tabla,
            Indexar(await repo.GetAllAsync(), x => x.Id, x => x.Nombre),
            nombre => new T { Nombre = nombre },
            repo.AddAsync,
            x => x.Id,
            x => new[] { new CampoCambio("nombre", null, x.Nombre) });

    /// <summary>
    /// Devuelve el id del registro con ese nombre; si no existe lo crea (y lo audita). Vacío → null.
    /// Los creados quedan en el índice, así un nombre nuevo repetido en varias filas se crea una sola vez.
    /// </summary>
    private async Task<int?> BuscarOCrearAsync<T>(Catalogo<T> catalogo, string? nombre, List<LineaImportCreadoDto> creados)
    {
        var limpio = NombreLimpio(nombre);
        if (limpio is null)
        {
            return null;
        }

        var clave = Texto.Normalizar(limpio);
        if (catalogo.Ids.TryGetValue(clave, out var existente))
        {
            return existente;
        }

        var entidad = catalogo.Crear(limpio);
        await catalogo.Agregar(entidad);
        await _unitOfWork.SaveChangesAsync();

        var id = catalogo.Id(entidad);
        await _auditoria.RegistrarAsync(catalogo.Tabla, id, catalogo.Alta(entidad));

        catalogo.Ids[clave] = id;
        creados.Add(new LineaImportCreadoDto(catalogo.Etiqueta, limpio));
        return id;
    }

    /// <summary>Nombre normalizado (sin acentos, minúsculas, espacios colapsados) → id. Si hay repetidos gana el primero.</summary>
    private static Dictionary<string, int> Indexar<T>(IEnumerable<T> items, Func<T, int> id, Func<T, string> nombre)
    {
        var index = new Dictionary<string, int>(StringComparer.Ordinal);
        foreach (var item in items)
        {
            if (NombreLimpio(nombre(item)) is { } limpio)
            {
                index.TryAdd(Texto.Normalizar(limpio), id(item));
            }
        }

        return index;
    }

    // ─── Auditoría y log ─────────────────────────────────────────────────────

    private async Task RegistrarAltaAsync(Linea linea)
    {
        await _auditoria.RegistrarAsync("lineas", linea.Id, SoloConValor(LineaService.ToFieldMap(linea)));

        if (linea.ConnectlyConfig is { } c)
        {
            var cambios = SoloConValor(new Dictionary<string, string?>
            {
                ["numero_connectly"] = c.NumeroConnectly,
                ["usuario"] = c.Usuario,
                ["business_id"] = c.BusinessId,
                ["webhook"] = c.Webhook,
                ["dns"] = c.Dns,
                ["contrasena"] = c.ContrasenaCifrada is null ? null : "(cifrado)",
                ["api_key"] = c.ApiKeyCifrada is null ? null : "(cifrado)",
            });
            await _auditoria.RegistrarAsync("linea_connectly_config", c.Id, cambios);
        }

        if (linea.SmartConfig is { } s)
        {
            var cambios = SoloConValor(SmartService.ToFieldMap(s));
            if (s.ClaveCifrada is not null)
            {
                cambios.Add(new CampoCambio("clave", null, "(cifrado)"));
            }
            await _auditoria.RegistrarAsync("linea_smart_config", s.Id, cambios);
        }
    }

    private static List<CampoCambio> SoloConValor(Dictionary<string, string?> campos) =>
        campos.Where(kv => kv.Value is not null).Select(kv => new CampoCambio(kv.Key, null, kv.Value)).ToList();

    private static string DetalleLog(int total, int creadas, int conErrores, List<LineaImportCreadoDto> creados)
    {
        var detalle = $"Importación masiva: {creadas} línea(s) agregada(s), {conErrores} con errores de {total}.";
        if (creados.Count == 0)
        {
            return detalle;
        }

        var porCatalogo = creados.GroupBy(c => c.Catalogo).Select(g => $"{g.Key} ({g.Count()})");
        return $"{detalle} Creados automáticamente: {string.Join(", ", porCatalogo)}.";
    }

    // ─── Utilidades ──────────────────────────────────────────────────────────

    private static string? Limpio(string? valor) => string.IsNullOrWhiteSpace(valor) ? null : valor.Trim();

    /// <summary>Recorta y colapsa espacios internos ("Juan  Pérez " → "Juan Pérez").</summary>
    private static string? NombreLimpio(string? valor) =>
        Limpio(valor) is { } v ? Regex.Replace(v, @"\s+", " ") : null;

    /// <summary>Vacío → false. Acepta sí/no, s/n, true/false, 1/0, x.</summary>
    private static bool TryParseSiNo(string? valor, out bool resultado)
    {
        resultado = false;
        var v = Texto.Normalizar(valor);
        if (v.Length == 0 || ValoresNo.Contains(v))
        {
            return true;
        }

        resultado = ValoresSi.Contains(v);
        return resultado;
    }

    /// <summary>Vacío → null. Acepta AAAA-MM-DD o DD/MM/AAAA.</summary>
    private static bool TryParseFecha(string? valor, out DateOnly? resultado)
    {
        resultado = null;
        if (Limpio(valor) is not { } v)
        {
            return true;
        }

        if (DateOnly.TryParseExact(v, FormatosFecha, CultureInfo.InvariantCulture, DateTimeStyles.None, out var fecha))
        {
            resultado = fecha;
            return true;
        }

        return false;
    }
}
