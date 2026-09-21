using SoulChat.Application.DTOs.Clientes;

namespace SoulChat.Application.Interfaces;

public interface IClienteService
{
    Task<IReadOnlyList<ClienteResponseDto>> GetAllAsync();
    Task<ClienteResponseDto> GetByIdAsync(int id);
    Task<ClienteResponseDto> CreateAsync(ClienteCreateDto dto);
    Task<ClienteResponseDto> UpdateAsync(int id, ClienteUpdateDto dto);
    Task DeleteAsync(int id);
}
