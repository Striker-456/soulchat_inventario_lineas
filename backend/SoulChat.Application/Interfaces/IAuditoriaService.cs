using SoulChat.Application.DTOs.Auditoria;

namespace SoulChat.Application.Interfaces;

public interface IAuditoriaService
{
    Task<IReadOnlyList<AuditoriaResponseDto>> QueryAsync(string? tabla, int? registroId);
    Task RegistrarAsync(string tabla, int registroId, IEnumerable<Common.CampoCambio> cambios);
}
