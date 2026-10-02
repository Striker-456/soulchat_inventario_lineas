using SoulChat.Application.DTOs.Lineas;

namespace SoulChat.Application.Interfaces;

public interface ILineaImportService
{
    /// <summary>
    /// Crea las líneas válidas (solo el número es obligatorio) y reporta, fila por fila, las que no se pudieron importar.
    /// Los catálogos que no existen se crean; las configuraciones Connectly/Smart solo si su fila trae datos del módulo.
    /// </summary>
    Task<LineaImportResultDto> ImportarAsync(LineaImportRequestDto request);
}
