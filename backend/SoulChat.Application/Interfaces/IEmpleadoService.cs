using SoulChat.Application.DTOs.Empleados;

namespace SoulChat.Application.Interfaces;

public interface IEmpleadoService
{
    Task<IReadOnlyList<EmpleadoResponseDto>> GetAllAsync();
    Task<EmpleadoResponseDto> GetByIdAsync(int id);
    Task<EmpleadoResponseDto> CreateAsync(EmpleadoCreateDto dto);
    Task<EmpleadoResponseDto> UpdateAsync(int id, EmpleadoUpdateDto dto);
    Task DeleteAsync(int id);
}
