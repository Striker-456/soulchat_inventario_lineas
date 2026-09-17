namespace SoulChat.Application.DTOs.Auth;

public record LoginRequestDto(string Email, string Password);

public record LoginResponseDto(string Token, DateTime ExpiresAt, string Email, string Rol);
