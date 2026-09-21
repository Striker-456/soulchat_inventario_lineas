using SoulChat.Application.Common;
using SoulChat.Application.DTOs.Lineas;
using SoulChat.Application.Interfaces;
using SoulChat.Domain.Entities;
using SoulChat.Domain.Interfaces;

namespace SoulChat.Application.Services;

public class LineaService : ILineaService
{
    private const int MaxNumero = 20;
    private const int MaxDescripcion = 4000;

    private readonly ILineaRepository _lineas;
    private readonly ICatalogRepository<Cliente> _clientes;
    private readonly ICatalogRepository<Empleado> _empleados;
    private readonly ICatalogRepository<StatusDesarrollo> _status;
    private readonly ICatalogRepository<TenenciaSimCard> _tenencias;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAuditoriaService _auditoria;
    private readonly ILogService _log;

    public LineaService(
        ILineaRepository lineas,
        ICatalogRepository<Cliente> clientes,
        ICatalogRepository<Empleado> empleados,
        ICatalogRepository<StatusDesarrollo> status,
        ICatalogRepository<TenenciaSimCard> tenencias,
        IUnitOfWork unitOfWork,
        IAuditoriaService auditoria,
        ILogService log)
    {
        _lineas = lineas;
        _clientes = clientes;
        _empleados = empleados;
        _status = status;
        _tenencias = tenencias;
        _unitOfWork = unitOfWork;
        _auditoria = auditoria;
        _log = log;
    }

    public async Task<IReadOnlyList<LineaResponseDto>> BuscarAsync(LineaFiltro filtro)
    {
        var lineas = await _lineas.BuscarAsync(filtro);
        return lineas.Select(MapToDto).ToList();
    }

    public async Task<LineaResponseDto> GetByIdAsync(int id)
    {
        var linea = await _lineas.GetByIdWithConfigsAsync(id)
            ?? throw new NotFoundException($"No se encontró la línea con id {id}.");

        return MapToDto(linea);
    }

    public async Task<LineaResponseDto> CreateAsync(LineaCreateDto dto)
    {
        var numero = dto.Numero.Trim();
        await ValidarNumeroUnicoAsync(numero, null);
        await ValidarReferenciasAsync(dto.ClienteId, dto.StatusDesarrolloId, dto.CoordinadorId, dto.ProgramadorId, dto.TenenciaSimCardId);

        var linea = new Linea
        {
            Numero = numero,
            ClienteId = dto.ClienteId,
            DescripcionUso = dto.DescripcionUso,
            StatusDesarrolloId = dto.StatusDesarrolloId,
            CoordinadorId = dto.CoordinadorId,
            ProgramadorId = dto.ProgramadorId,
            TenenciaSimCardId = dto.TenenciaSimCardId,
        };

        await _lineas.AddAsync(linea);
        await _unitOfWork.SaveChangesAsync();

        await RegistrarAltaAsync(linea);

        return await GetByIdAsync(linea.Id);
    }

    public async Task<LineaResponseDto> UpdateAsync(int id, LineaUpdateDto dto)
    {
        var linea = await _lineas.GetByIdAsync(id)
            ?? throw new NotFoundException($"No se encontró la línea con id {id}.");

        var numero = dto.Numero.Trim();
        await ValidarNumeroUnicoAsync(numero, id);
        await ValidarReferenciasAsync(dto.ClienteId, dto.StatusDesarrolloId, dto.CoordinadorId, dto.ProgramadorId, dto.TenenciaSimCardId);

        var antes = ToFieldMap(linea);

        linea.Numero = numero;
        linea.ClienteId = dto.ClienteId;
        linea.DescripcionUso = dto.DescripcionUso;
        linea.StatusDesarrolloId = dto.StatusDesarrolloId;
        linea.CoordinadorId = dto.CoordinadorId;
        linea.ProgramadorId = dto.ProgramadorId;
        linea.TenenciaSimCardId = dto.TenenciaSimCardId;
        linea.UpdatedAt = DateTime.UtcNow;

        _lineas.Update(linea);
        await _unitOfWork.SaveChangesAsync();

        var despues = ToFieldMap(linea);
        var cambios = AuditDiff.Compare(antes, despues);
        if (cambios.Count > 0)
        {
            await _auditoria.RegistrarAsync("lineas", linea.Id, cambios);
        }

        return await GetByIdAsync(linea.Id);
    }

    public async Task DeleteAsync(int id)
    {
        var linea = await _lineas.GetByIdAsync(id)
            ?? throw new NotFoundException($"No se encontró la línea con id {id}.");

        _lineas.Remove(linea);
        await _unitOfWork.SaveChangesAsync();
    }

    public async Task<LineaImportResultDto> ImportarAsync(LineaImportRequestDto request)
    {
        var clientes = IndexarPorNombre(await _clientes.GetAllAsync(), c => c.Id, c => c.Nombre);
        var empleados = IndexarPorNombre(await _empleados.GetAllAsync(), e => e.Id, e => e.Nombre);
        var status = IndexarPorNombre(await _status.GetAllAsync(), s => s.Id, s => s.Nombre);
        var tenencias = IndexarPorNombre(await _tenencias.GetAllAsync(), t => t.Id, t => t.Nombre);

        var numerosEnArchivo = new HashSet<string>(StringComparer.Ordinal);
        var errores = new List<LineaImportErrorDto>();
        var creadas = 0;

        for (var i = 0; i < request.Filas.Count; i++)
        {
            var fila = request.Filas[i];
            var mensajes = new List<string>();
            var numero = fila.Numero?.Trim();

            if (string.IsNullOrEmpty(numero))
            {
                mensajes.Add("El número es requerido.");
            }
            else if (numero.Length > MaxNumero)
            {
                mensajes.Add($"El número no puede superar {MaxNumero} caracteres.");
            }
            else if (!numerosEnArchivo.Add(numero))
            {
                mensajes.Add("El número está repetido en el archivo.");
            }
            else if (await _lineas.ExisteNumeroAsync(numero, null))
            {
                mensajes.Add("Ya existe una línea con ese número.");
            }

            var clienteId = ResolverRequerido(fila.Cliente, "cliente", clientes, mensajes);
            var statusId = ResolverOpcional(fila.Status, "status", status, mensajes);
            var coordinadorId = ResolverOpcional(fila.Coordinador, "coordinador", empleados, mensajes);
            var programadorId = ResolverOpcional(fila.Programador, "programador", empleados, mensajes);
            var tenenciaId = ResolverOpcional(fila.Tenencia, "tenencia", tenencias, mensajes);

            if (fila.DescripcionUso is { Length: > MaxDescripcion })
            {
                mensajes.Add($"La descripción no puede superar {MaxDescripcion} caracteres.");
            }

            if (mensajes.Count > 0)
            {
                errores.Add(new LineaImportErrorDto(i + 1, fila.Numero, mensajes));
                continue;
            }

            var linea = new Linea
            {
                Numero = numero,
                ClienteId = clienteId!.Value,
                DescripcionUso = string.IsNullOrWhiteSpace(fila.DescripcionUso) ? null : fila.DescripcionUso.Trim(),
                StatusDesarrolloId = statusId,
                CoordinadorId = coordinadorId,
                ProgramadorId = programadorId,
                TenenciaSimCardId = tenenciaId,
            };

            await _lineas.AddAsync(linea);
            await _unitOfWork.SaveChangesAsync();
            await RegistrarAltaAsync(linea);
            creadas++;
        }

        var nivel = errores.Count == 0 ? NivelLog.Success : NivelLog.Warning;
        await _log.RegistrarAsync(
            nivel,
            "Líneas",
            "IMPORT",
            $"Importación masiva: {creadas} línea(s) agregada(s), {errores.Count} con errores de {request.Filas.Count}.");

        return new LineaImportResultDto(request.Filas.Count, creadas, errores);
    }

    private async Task RegistrarAltaAsync(Linea linea)
    {
        var cambios = ToFieldMap(linea)
            .Where(kv => kv.Value is not null)
            .Select(kv => new CampoCambio(kv.Key, null, kv.Value))
            .ToList();
        await _auditoria.RegistrarAsync("lineas", linea.Id, cambios);
    }

    private async Task ValidarNumeroUnicoAsync(string numero, int? exceptoId)
    {
        if (await _lineas.ExisteNumeroAsync(numero, exceptoId))
        {
            throw new ConflictException($"Ya existe una línea con el número {numero}.");
        }
    }

    private async Task ValidarReferenciasAsync(int clienteId, int? statusId, int? coordinadorId, int? programadorId, int? tenenciaId)
    {
        if (await _clientes.GetByIdAsync(clienteId) is null)
        {
            throw new NotFoundException($"No se encontró el cliente con id {clienteId}.");
        }

        if (statusId is not null && await _status.GetByIdAsync(statusId.Value) is null)
        {
            throw new NotFoundException($"No se encontró el status de desarrollo con id {statusId}.");
        }

        if (coordinadorId is not null && await _empleados.GetByIdAsync(coordinadorId.Value) is null)
        {
            throw new NotFoundException($"No se encontró el empleado (coordinador) con id {coordinadorId}.");
        }

        if (programadorId is not null && await _empleados.GetByIdAsync(programadorId.Value) is null)
        {
            throw new NotFoundException($"No se encontró el empleado (programador) con id {programadorId}.");
        }

        if (tenenciaId is not null && await _tenencias.GetByIdAsync(tenenciaId.Value) is null)
        {
            throw new NotFoundException($"No se encontró la tenencia de SIM card con id {tenenciaId}.");
        }
    }

    /// <summary>Nombre normalizado (sin acentos, minúsculas) → id. Si hay nombres repetidos gana el primero.</summary>
    private static Dictionary<string, int> IndexarPorNombre<T>(IEnumerable<T> items, Func<T, int> id, Func<T, string> nombre)
    {
        var index = new Dictionary<string, int>(StringComparer.Ordinal);
        foreach (var item in items)
        {
            index.TryAdd(Texto.Normalizar(nombre(item)), id(item));
        }

        return index;
    }

    private static int? ResolverRequerido(string? nombre, string etiqueta, Dictionary<string, int> index, List<string> errores)
    {
        if (string.IsNullOrWhiteSpace(nombre))
        {
            errores.Add($"El {etiqueta} es requerido.");
            return null;
        }

        return ResolverOpcional(nombre, etiqueta, index, errores);
    }

    private static int? ResolverOpcional(string? nombre, string etiqueta, Dictionary<string, int> index, List<string> errores)
    {
        if (string.IsNullOrWhiteSpace(nombre))
        {
            return null;
        }

        if (index.TryGetValue(Texto.Normalizar(nombre), out var id))
        {
            return id;
        }

        errores.Add($"No existe el {etiqueta} '{nombre.Trim()}'.");
        return null;
    }

    private static Dictionary<string, string?> ToFieldMap(Linea l) => new()
    {
        ["numero"] = l.Numero,
        ["cliente_id"] = l.ClienteId.ToString(),
        ["descripcion_uso"] = l.DescripcionUso,
        ["status_desarrollo_id"] = l.StatusDesarrolloId?.ToString(),
        ["coordinador_id"] = l.CoordinadorId?.ToString(),
        ["programador_id"] = l.ProgramadorId?.ToString(),
        ["tenencia_sim_card_id"] = l.TenenciaSimCardId?.ToString(),
    };

    private static LineaResponseDto MapToDto(Linea l) => new(
        l.Id,
        l.Numero,
        l.ClienteId,
        l.Cliente?.Nombre ?? string.Empty,
        l.DescripcionUso,
        l.StatusDesarrolloId,
        l.StatusDesarrollo?.Nombre,
        l.CoordinadorId,
        l.Coordinador?.Nombre,
        l.ProgramadorId,
        l.Programador?.Nombre,
        l.TenenciaSimCardId,
        l.TenenciaSimCard?.Nombre,
        l.ConnectlyConfig is not null,
        l.SmartConfig is not null,
        l.CreatedAt,
        l.UpdatedAt);
}
