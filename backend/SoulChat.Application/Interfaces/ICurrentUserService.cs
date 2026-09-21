namespace SoulChat.Application.Interfaces;

public interface ICurrentUserService
{
    int? UsuarioId { get; }
    string? Email { get; }
    string? Rol { get; }

    /// <summary>Dirección IP del cliente que hace la petición.</summary>
    string? Ip { get; }
}
