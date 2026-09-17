using SoulChat.Application.DTOs.Lineas;
using SoulChat.Domain.Interfaces;

namespace SoulChat.Application.Interfaces;

public interface ILineaService
{
    Task<IReadOnlyList<LineaResponseDto>> BuscarAsync(LineaFiltro filtro);
    Task<LineaResponseDto> GetByIdAsync(int id);
    Task<LineaResponseDto> CreateAsync(LineaCreateDto dto);
    Task<LineaResponseDto> UpdateAsync(int id, LineaUpdateDto dto);
    Task DeleteAsync(int id);
}
