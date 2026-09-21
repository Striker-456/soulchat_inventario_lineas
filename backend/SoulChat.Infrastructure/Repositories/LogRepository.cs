using Microsoft.EntityFrameworkCore;
using SoulChat.Application.Common;
using SoulChat.Domain.Entities;
using SoulChat.Domain.Interfaces;
using SoulChat.Infrastructure.Persistence;

namespace SoulChat.Infrastructure.Repositories;

public class LogRepository : ILogRepository
{
    private readonly AppDbContext _context;

    public LogRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task AddAsync(LogSistema log)
    {
        await _context.LogsSistema.AddAsync(log);
        await _context.SaveChangesAsync();
    }

    public async Task<LogPagina> QueryAsync(LogFiltro filtro, int pagina, int tamano)
    {
        var baseQuery = _context.LogsSistema.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(filtro.Modulo))
        {
            baseQuery = baseQuery.Where(l => l.Modulo == filtro.Modulo);
        }

        if (!string.IsNullOrWhiteSpace(filtro.Usuario))
        {
            baseQuery = baseQuery.Where(l => l.UsuarioEmail == filtro.Usuario);
        }

        if (!string.IsNullOrWhiteSpace(filtro.Texto))
        {
            var patron = $"%{EscaparLike(filtro.Texto.Trim())}%";
            baseQuery = baseQuery.Where(l => EF.Functions.ILike(l.Detalle, patron) || EF.Functions.ILike(l.Accion, patron));
        }

        // Los contadores por nivel ignoran el filtro de nivel para poder mostrarlos como "pastillas" de filtro.
        var conteos = NivelLog.Validos.ToDictionary(n => n, _ => 0);
        var porNivel = await baseQuery.GroupBy(l => l.Nivel).Select(g => new { Nivel = g.Key, Total = g.Count() }).ToListAsync();
        foreach (var fila in porNivel)
        {
            conteos[fila.Nivel] = fila.Total;
        }

        var filtrada = string.IsNullOrWhiteSpace(filtro.Nivel) ? baseQuery : baseQuery.Where(l => l.Nivel == filtro.Nivel);

        var total = await filtrada.CountAsync();
        var items = await filtrada
            .OrderByDescending(l => l.Fecha)
            .ThenByDescending(l => l.Id)
            .Skip((pagina - 1) * tamano)
            .Take(tamano)
            .ToListAsync();

        var modulos = await _context.LogsSistema.AsNoTracking().Select(l => l.Modulo).Distinct().OrderBy(m => m).ToListAsync();
        var usuarios = await _context.LogsSistema.AsNoTracking()
            .Where(l => l.UsuarioEmail != null)
            .Select(l => l.UsuarioEmail!)
            .Distinct()
            .OrderBy(u => u)
            .ToListAsync();

        return new LogPagina
        {
            Total = total,
            Items = items,
            ConteoPorNivel = conteos,
            Modulos = modulos,
            Usuarios = usuarios,
        };
    }

    /// <summary>Escapa los comodines de LIKE para que el texto se busque literalmente.</summary>
    private static string EscaparLike(string texto) =>
        texto.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_");
}
