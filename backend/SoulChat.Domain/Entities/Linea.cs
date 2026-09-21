using SoulChat.Domain.Common;

namespace SoulChat.Domain.Entities;

public class Linea : AuditableEntity
{
    /// <summary>Número telefónico de la línea (único). Nulo solo en registros anteriores a su introducción.</summary>
    public string? Numero { get; set; }

    public int ClienteId { get; set; }
    public Cliente? Cliente { get; set; }

    public string? DescripcionUso { get; set; }

    public int? StatusDesarrolloId { get; set; }
    public StatusDesarrollo? StatusDesarrollo { get; set; }

    public int? CoordinadorId { get; set; }
    public Empleado? Coordinador { get; set; }

    public int? ProgramadorId { get; set; }
    public Empleado? Programador { get; set; }

    public int? TenenciaSimCardId { get; set; }
    public TenenciaSimCard? TenenciaSimCard { get; set; }

    public LineaConnectlyConfig? ConnectlyConfig { get; set; }
    public LineaSmartConfig? SmartConfig { get; set; }
}
