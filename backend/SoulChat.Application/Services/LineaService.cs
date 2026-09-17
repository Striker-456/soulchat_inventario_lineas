using SoulChat.Application.Common;
using SoulChat.Application.DTOs.Lineas;
using SoulChat.Application.Interfaces;
using SoulChat.Domain.Entities;
using SoulChat.Domain.Interfaces;

namespace SoulChat.Application.Services;

public class LineaService : ILineaService
{
    private readonly ILineaRepository _lineas;
    private readonly ICatalogRepository<Cliente> _clientes;
    private readonly ICatalogRepository<Empleado> _empleados;
    private readonly ICatalogRepository<StatusDesarrollo> _status;
    private readonly ICatalogRepository<TenenciaSimCard> _tenencias;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAuditoriaService _auditoria;

    public LineaService(
        ILineaRepository lineas,
        ICatalogRepository<Cliente> clientes,
        ICatalogRepository<Empleado> empleados,
        ICatalogRepository<StatusDesarrollo> status,
        ICatalogRepository<TenenciaSimCard> tenencias,
        IUnitOfWork unitOfWork,
        IAuditoriaService auditoria)
    {
        _lineas = lineas;
        _clientes = clientes;
        _empleados = empleados;
        _status = status;
        _tenencias = tenencias;
        _unitOfWork = unitOfWork;
        _auditoria = auditoria;
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
        await ValidarReferenciasAsync(dto.ClienteId, dto.StatusDesarrolloId, dto.CoordinadorId, dto.ProgramadorId, dto.TenenciaSimCardId);

        var linea = new Linea
        {
            ClienteId = dto.ClienteId,
            DescripcionUso = dto.DescripcionUso,
            StatusDesarrolloId = dto.StatusDesarrolloId,
            CoordinadorId = dto.CoordinadorId,
            ProgramadorId = dto.ProgramadorId,
            TenenciaSimCardId = dto.TenenciaSimCardId,
        };

        await _lineas.AddAsync(linea);
        await _unitOfWork.SaveChangesAsync();

        var cambios = ToFieldMap(linea)
            .Where(kv => kv.Value is not null)
            .Select(kv => new CampoCambio(kv.Key, null, kv.Value))
            .ToList();
        await _auditoria.RegistrarAsync("lineas", linea.Id, cambios);

        return await GetByIdAsync(linea.Id);
    }

    public async Task<LineaResponseDto> UpdateAsync(int id, LineaUpdateDto dto)
    {
        var linea = await _lineas.GetByIdAsync(id)
            ?? throw new NotFoundException($"No se encontró la línea con id {id}.");

        await ValidarReferenciasAsync(dto.ClienteId, dto.StatusDesarrolloId, dto.CoordinadorId, dto.ProgramadorId, dto.TenenciaSimCardId);

        var antes = ToFieldMap(linea);

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

    private static Dictionary<string, string?> ToFieldMap(Linea l) => new()
    {
        ["cliente_id"] = l.ClienteId.ToString(),
        ["descripcion_uso"] = l.DescripcionUso,
        ["status_desarrollo_id"] = l.StatusDesarrolloId?.ToString(),
        ["coordinador_id"] = l.CoordinadorId?.ToString(),
        ["programador_id"] = l.ProgramadorId?.ToString(),
        ["tenencia_sim_card_id"] = l.TenenciaSimCardId?.ToString(),
    };

    private static LineaResponseDto MapToDto(Linea l) => new(
        l.Id,
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
