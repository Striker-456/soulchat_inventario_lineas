using SoulChat.Application.Common;
using SoulChat.Application.DTOs.Auditoria;
using SoulChat.Application.Interfaces;
using SoulChat.Domain.Entities;
using SoulChat.Domain.Interfaces;

namespace SoulChat.Application.Services;

public class AuditoriaService : IAuditoriaService
{
    private readonly IAuditoriaRepository _repository;
    private readonly ICurrentUserService _currentUser;

    public AuditoriaService(IAuditoriaRepository repository, ICurrentUserService currentUser)
    {
        _repository = repository;
        _currentUser = currentUser;
    }

    public async Task<IReadOnlyList<AuditoriaResponseDto>> QueryAsync(string? tabla, int? registroId)
    {
        var registros = await _repository.QueryAsync(tabla, registroId);

        return registros
            .Select(r => new AuditoriaResponseDto(
                r.Id,
                r.TablaAfectada,
                r.RegistroId,
                r.Campo,
                r.ValorAnterior,
                r.ValorNuevo,
                r.UsuarioId,
                r.Usuario?.Email,
                r.Fecha))
            .ToList();
    }

    public async Task RegistrarAsync(string tabla, int registroId, IEnumerable<CampoCambio> cambios)
    {
        var lista = cambios.ToList();
        if (lista.Count == 0)
        {
            return;
        }

        var entidades = lista.Select(c => new AuditoriaCambio
        {
            TablaAfectada = tabla,
            RegistroId = registroId,
            Campo = c.Campo,
            ValorAnterior = c.ValorAnterior,
            ValorNuevo = c.ValorNuevo,
            UsuarioId = _currentUser.UsuarioId,
            Fecha = DateTime.UtcNow,
        });

        await _repository.AddRangeAsync(entidades);
    }
}
