using SoulChat.Application.DTOs.Connectly;

namespace SoulChat.Application.Interfaces;

public interface IConnectlyService
{
    Task<ConnectlyResponseDto> GetByLineaIdAsync(int lineaId);
    Task<ConnectlyResponseDto> CreateAsync(int lineaId, ConnectlyCreateDto dto);
    Task<ConnectlyResponseDto> UpdateAsync(int lineaId, ConnectlyUpdateDto dto);
    Task DeleteAsync(int lineaId);
    Task<ConnectlyRevealResponseDto> RevelarAsync(int lineaId);
}
