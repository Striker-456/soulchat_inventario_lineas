using SoulChat.Domain.Entities;

namespace SoulChat.Domain.Interfaces;

public class LineaFiltro
{
    public int? ClienteId { get; set; }
    public int? StatusDesarrolloId { get; set; }
    public int? CoordinadorId { get; set; }
    public int? ProgramadorId { get; set; }
    public string? Texto { get; set; }
}

public interface ILineaRepository : IGenericRepository<Linea>
{
    Task<Linea?> GetByIdWithConfigsAsync(int id);
    Task<IReadOnlyList<Linea>> BuscarAsync(LineaFiltro filtro);

    /// <summary>¿Existe otra línea con ese número?</summary>
    Task<bool> ExisteNumeroAsync(string numero, int? exceptoId);
}
