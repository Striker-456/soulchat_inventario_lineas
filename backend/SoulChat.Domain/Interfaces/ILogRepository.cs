using SoulChat.Domain.Entities;

namespace SoulChat.Domain.Interfaces;

public class LogFiltro
{
    public string? Nivel { get; set; }
    public string? Modulo { get; set; }
    public string? Usuario { get; set; }

    /// <summary>Busca en acción y detalle.</summary>
    public string? Texto { get; set; }
}

public class LogPagina
{
    public int Total { get; set; }
    public IReadOnlyList<LogSistema> Items { get; set; } = Array.Empty<LogSistema>();

    /// <summary>Total por nivel dentro de los filtros de módulo/usuario/texto (ignora el filtro de nivel).</summary>
    public IReadOnlyDictionary<string, int> ConteoPorNivel { get; set; } = new Dictionary<string, int>();

    public IReadOnlyList<string> Modulos { get; set; } = Array.Empty<string>();
    public IReadOnlyList<string> Usuarios { get; set; } = Array.Empty<string>();
}

public interface ILogRepository
{
    Task AddAsync(LogSistema log);
    Task<LogPagina> QueryAsync(LogFiltro filtro, int pagina, int tamano);
}
