using SoulChat.Application.Common;
using SoulChat.Application.DTOs.Clientes;
using SoulChat.Application.Interfaces;
using SoulChat.Domain.Entities;
using SoulChat.Domain.Interfaces;

namespace SoulChat.Application.Services;

public class ClienteService : IClienteService
{
    private const string Tabla = "clientes";

    private readonly IClienteRepository _repository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAuditoriaService _auditoria;

    public ClienteService(IClienteRepository repository, IUnitOfWork unitOfWork, IAuditoriaService auditoria)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
        _auditoria = auditoria;
    }

    public async Task<IReadOnlyList<ClienteResponseDto>> GetAllAsync()
    {
        var clientes = await _repository.GetAllConConteoAsync();
        return clientes
            .OrderBy(c => c.Cliente.Nombre, StringComparer.CurrentCultureIgnoreCase)
            .Select(c => MapToDto(c.Cliente, c.TotalLineas))
            .ToList();
    }

    public async Task<ClienteResponseDto> GetByIdAsync(int id)
    {
        var cliente = await ObtenerAsync(id);
        return MapToDto(cliente, await _repository.ContarLineasAsync(id));
    }

    public async Task<ClienteResponseDto> CreateAsync(ClienteCreateDto dto)
    {
        var nombre = dto.Nombre.Trim();
        await ValidarNombreUnicoAsync(nombre, null);

        var cliente = new Cliente
        {
            Nombre = nombre,
            Rfc = NormalizarRfc(dto.Rfc),
            Estado = EstadoCliente.Canonico(dto.Estado) ?? EstadoCliente.Activo,
        };

        await _repository.AddAsync(cliente);
        await _unitOfWork.SaveChangesAsync();

        var cambios = ToFieldMap(cliente)
            .Where(kv => kv.Value is not null)
            .Select(kv => new CampoCambio(kv.Key, null, kv.Value))
            .ToList();
        await _auditoria.RegistrarAsync(Tabla, cliente.Id, cambios);

        return MapToDto(cliente, 0);
    }

    public async Task<ClienteResponseDto> UpdateAsync(int id, ClienteUpdateDto dto)
    {
        var cliente = await ObtenerAsync(id);

        var nombre = dto.Nombre.Trim();
        await ValidarNombreUnicoAsync(nombre, id);

        var antes = ToFieldMap(cliente);

        cliente.Nombre = nombre;
        cliente.Rfc = NormalizarRfc(dto.Rfc);
        cliente.Estado = EstadoCliente.Canonico(dto.Estado) ?? cliente.Estado;
        cliente.UpdatedAt = DateTime.UtcNow;

        _repository.Update(cliente);
        await _unitOfWork.SaveChangesAsync();

        var cambios = AuditDiff.Compare(antes, ToFieldMap(cliente));
        if (cambios.Count > 0)
        {
            await _auditoria.RegistrarAsync(Tabla, cliente.Id, cambios);
        }

        return MapToDto(cliente, await _repository.ContarLineasAsync(id));
    }

    public async Task DeleteAsync(int id)
    {
        var cliente = await ObtenerAsync(id);

        var lineas = await _repository.ContarLineasAsync(id);
        if (lineas > 0)
        {
            throw new ConflictException(
                $"No se puede eliminar a '{cliente.Nombre}' porque tiene {lineas} línea(s) asociada(s). Reasigna o elimina esas líneas primero, o márcalo como Pausado.");
        }

        _repository.Remove(cliente);
        await _unitOfWork.SaveChangesAsync();

        await _auditoria.RegistrarAsync(Tabla, id, new[] { new CampoCambio("eliminado", null, cliente.Nombre) });
    }

    private async Task<Cliente> ObtenerAsync(int id) =>
        await _repository.GetByIdAsync(id)
            ?? throw new NotFoundException($"No se encontró el cliente con id {id}.");

    private async Task ValidarNombreUnicoAsync(string nombre, int? exceptoId)
    {
        if (await _repository.NombreExisteAsync(nombre, exceptoId))
        {
            throw new ConflictException($"Ya existe un cliente llamado '{nombre}'.");
        }
    }

    private static string? NormalizarRfc(string? rfc) =>
        string.IsNullOrWhiteSpace(rfc) ? null : rfc.Trim().ToUpperInvariant();

    private static Dictionary<string, string?> ToFieldMap(Cliente c) => new()
    {
        ["nombre"] = c.Nombre,
        ["rfc"] = c.Rfc,
        ["estado"] = c.Estado,
    };

    private static ClienteResponseDto MapToDto(Cliente c, int totalLineas) =>
        new(c.Id, c.Nombre, c.Rfc, c.Estado, totalLineas, c.CreatedAt, c.UpdatedAt);
}
