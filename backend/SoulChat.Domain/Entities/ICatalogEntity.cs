namespace SoulChat.Domain.Entities;

/// <summary>Entidad de catálogo simple (id + nombre único). Permite administrarlos con lógica genérica.</summary>
public interface ICatalogEntity
{
    int Id { get; set; }
    string Nombre { get; set; }
}
