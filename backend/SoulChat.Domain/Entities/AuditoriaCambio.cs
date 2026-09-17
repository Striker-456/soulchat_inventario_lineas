namespace SoulChat.Domain.Entities;

public class AuditoriaCambio
{
    public int Id { get; set; }
    public string TablaAfectada { get; set; } = string.Empty;
    public int RegistroId { get; set; }
    public string Campo { get; set; } = string.Empty;
    public string? ValorAnterior { get; set; }
    public string? ValorNuevo { get; set; }
    public int? UsuarioId { get; set; }
    public UsuarioSistema? Usuario { get; set; }
    public DateTime Fecha { get; set; } = DateTime.UtcNow;
}
