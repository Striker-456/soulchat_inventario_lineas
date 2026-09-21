using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using SoulChat.Application.Interfaces;

namespace SoulChat.Infrastructure.Security;

public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    private ClaimsPrincipal? User => _httpContextAccessor.HttpContext?.User;

    public int? UsuarioId =>
        int.TryParse(User?.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var id) ? id : null;

    public string? Email => User?.FindFirst(ClaimTypes.Email)?.Value;

    public string? Rol => User?.FindFirst(ClaimTypes.Role)?.Value;

    public string? Ip
    {
        get
        {
            var ip = _httpContextAccessor.HttpContext?.Connection.RemoteIpAddress;
            if (ip is null)
            {
                return null;
            }

            return (ip.IsIPv4MappedToIPv6 ? ip.MapToIPv4() : ip).ToString();
        }
    }
}
