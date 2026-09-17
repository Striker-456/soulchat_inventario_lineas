namespace SoulChat.Application.DTOs.Connectly;

public record ConnectlyCreateDto(
    string NumeroConnectly,
    string Usuario,
    string Contrasena,
    string? BusinessId,
    string? ApiKey,
    string? Webhook,
    string? Dns);

public record ConnectlyUpdateDto(
    string NumeroConnectly,
    string Usuario,
    string? Contrasena,
    string? BusinessId,
    string? ApiKey,
    string? Webhook,
    string? Dns);

public record ConnectlyResponseDto(
    int Id,
    int LineaId,
    string NumeroConnectly,
    string Usuario,
    string? ContrasenaMasked,
    string? BusinessId,
    string? ApiKeyMasked,
    string? Webhook,
    string? Dns,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record ConnectlyRevealResponseDto(string Contrasena, string? ApiKey);
