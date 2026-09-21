using SoulChat.Application.Common;
using SoulChat.Application.DTOs.Logs;
using SoulChat.Application.Interfaces;
using SoulChat.Domain.Entities;
using SoulChat.Domain.Interfaces;

namespace SoulChat.Application.Services;

public class LogService : ILogService
{
    private const int TamanoMaximo = 200;

    private readonly ILogRepository _repository;
    private readonly ICurrentUserService _currentUser;

    public LogService(ILogRepository repository, ICurrentUserService currentUser)
    {
        _repository = repository;
        _currentUser = currentUser;
    }

    public async Task RegistrarAsync(string nivel, string modulo, string accion, string detalle, int? usuarioId = null, string? usuarioEmail = null)
    {
        await _repository.AddAsync(new LogSistema
        {
            Fecha = DateTime.UtcNow,
            Nivel = NivelLog.Validos.Contains(nivel) ? nivel : NivelLog.Info,
            UsuarioId = usuarioId ?? _currentUser.UsuarioId,
            UsuarioEmail = Texto.Recortar(usuarioEmail ?? _currentUser.Email, 150),
            Modulo = Texto.Recortar(modulo, 60)!,
            Accion = Texto.Recortar(accion, 40)!,
            Detalle = Texto.Recortar(detalle, 1000)!,
            Ip = Texto.Recortar(_currentUser.Ip, 45),
        });
    }

    public async Task<LogsPaginaDto> QueryAsync(LogFiltro filtro, int pagina, int tamano)
    {
        pagina = Math.Max(1, pagina);
        tamano = Math.Clamp(tamano, 1, TamanoMaximo);

        if (!string.IsNullOrWhiteSpace(filtro.Nivel) && !NivelLog.Validos.Contains(filtro.Nivel))
        {
            throw new ValidationAppException(new Dictionary<string, string[]>
            {
                ["nivel"] = new[] { $"El nivel debe ser uno de: {string.Join(", ", NivelLog.Validos)}." },
            });
        }

        var resultado = await _repository.QueryAsync(filtro, pagina, tamano);

        var items = resultado.Items
            .Select(l => new LogResponseDto(l.Id, l.Fecha, l.Nivel, l.UsuarioId, l.UsuarioEmail, l.Modulo, l.Accion, l.Detalle, l.Ip))
            .ToList();

        return new LogsPaginaDto(resultado.Total, pagina, tamano, items, resultado.ConteoPorNivel, resultado.Modulos, resultado.Usuarios);
    }
}
