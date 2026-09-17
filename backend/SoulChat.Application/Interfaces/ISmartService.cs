using SoulChat.Application.DTOs.Smart;

namespace SoulChat.Application.Interfaces;

public interface ISmartService
{
    Task<SmartResponseDto> GetByLineaIdAsync(int lineaId);
    Task<SmartResponseDto> CreateAsync(int lineaId, SmartCreateDto dto);
    Task<SmartResponseDto> UpdateAsync(int lineaId, SmartUpdateDto dto);
    Task DeleteAsync(int lineaId);
    Task<SmartRevealResponseDto> RevelarAsync(int lineaId);
}
