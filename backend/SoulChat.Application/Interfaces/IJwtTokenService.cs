using SoulChat.Domain.Entities;

namespace SoulChat.Application.Interfaces;

public record TokenResult(string Token, DateTime ExpiresAt);

public interface IJwtTokenService
{
    TokenResult GenerateToken(UsuarioSistema usuario);
}
