using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SoulChat.Application.Interfaces;
using SoulChat.Domain.Interfaces;
using SoulChat.Infrastructure.Persistence;
using SoulChat.Infrastructure.Repositories;
using SoulChat.Infrastructure.Security;

namespace SoulChat.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(configuration.GetConnectionString("DefaultConnection")));

        services.Configure<JwtSettings>(configuration.GetSection(JwtSettings.SectionName));
        services.Configure<EncryptionSettings>(configuration.GetSection(EncryptionSettings.SectionName));

        services.AddHttpContextAccessor();

        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<ILineaRepository, LineaRepository>();
        services.AddScoped<ILineaConnectlyConfigRepository, LineaConnectlyConfigRepository>();
        services.AddScoped<ILineaSmartConfigRepository, LineaSmartConfigRepository>();
        services.AddScoped<IUsuarioSistemaRepository, UsuarioSistemaRepository>();
        services.AddScoped<IEmpleadoRepository, EmpleadoRepository>();
        services.AddScoped<IAuditoriaRepository, AuditoriaRepository>();
        services.AddScoped(typeof(ICatalogRepository<>), typeof(CatalogRepository<>));

        services.AddScoped<IPasswordHasher, BcryptPasswordHasher>();
        services.AddScoped<IJwtTokenService, JwtTokenService>();
        services.AddScoped<ICredentialEncryptionService, AesCredentialEncryptionService>();
        services.AddScoped<ICurrentUserService, CurrentUserService>();

        return services;
    }
}
