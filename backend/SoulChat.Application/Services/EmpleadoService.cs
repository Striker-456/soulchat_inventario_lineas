using SoulChat.Application.Common;
using SoulChat.Application.DTOs.Empleados;
using SoulChat.Application.Interfaces;
using SoulChat.Domain.Entities;
using SoulChat.Domain.Interfaces;

namespace SoulChat.Application.Services;

public class EmpleadoService : IEmpleadoService
{
    private readonly IEmpleadoRepository _repository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAuditoriaService _auditoria;

    public EmpleadoService(IEmpleadoRepository repository, IUnitOfWork unitOfWork, IAuditoriaService auditoria)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
        _auditoria = auditoria;
    }

    public async Task<IReadOnlyList<EmpleadoResponseDto>> GetAllAsync()
    {
        var empleados = await _repository.GetAllAsync();
        return empleados.Select(MapToDto).ToList();
    }

    public async Task<EmpleadoResponseDto> GetByIdAsync(int id)
    {
        var empleado = await _repository.GetByIdAsync(id)
            ?? throw new NotFoundException($"No se encontró el empleado con id {id}.");

        return MapToDto(empleado);
    }

    public async Task<EmpleadoResponseDto> CreateAsync(EmpleadoCreateDto dto)
    {
        var empleado = new Empleado
        {
            Nombre = dto.Nombre,
            Rol = dto.Rol,
        };

        await _repository.AddAsync(empleado);
        await _unitOfWork.SaveChangesAsync();

        var cambios = ToFieldMap(empleado)
            .Where(kv => kv.Value is not null)
            .Select(kv => new CampoCambio(kv.Key, null, kv.Value))
            .ToList();
        await _auditoria.RegistrarAsync("empleados", empleado.Id, cambios);

        return MapToDto(empleado);
    }

    public async Task<EmpleadoResponseDto> UpdateAsync(int id, EmpleadoUpdateDto dto)
    {
        var empleado = await _repository.GetByIdAsync(id)
            ?? throw new NotFoundException($"No se encontró el empleado con id {id}.");

        var antes = ToFieldMap(empleado);

        empleado.Nombre = dto.Nombre;
        empleado.Rol = dto.Rol;
        empleado.UpdatedAt = DateTime.UtcNow;

        _repository.Update(empleado);
        await _unitOfWork.SaveChangesAsync();

        var despues = ToFieldMap(empleado);
        var cambios = AuditDiff.Compare(antes, despues);
        if (cambios.Count > 0)
        {
            await _auditoria.RegistrarAsync("empleados", empleado.Id, cambios);
        }

        return MapToDto(empleado);
    }

    public async Task DeleteAsync(int id)
    {
        var empleado = await _repository.GetByIdAsync(id)
            ?? throw new NotFoundException($"No se encontró el empleado con id {id}.");

        _repository.Remove(empleado);
        await _unitOfWork.SaveChangesAsync();

        await _auditoria.RegistrarAsync(
            "empleados",
            id,
            new[] { new CampoCambio("eliminado", null, $"{empleado.Nombre}") });
    }

    private static Dictionary<string, string?> ToFieldMap(Empleado e) => new()
    {
        ["nombre"] = e.Nombre,
        ["rol"] = e.Rol,
    };

    private static EmpleadoResponseDto MapToDto(Empleado e) =>
        new(e.Id, e.Nombre, e.Rol, e.CreatedAt, e.UpdatedAt);
}
