using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using SoulChat.Application.Interfaces;
using SoulChat.Application.Services;
using SoulChat.Application.Validators;

namespace SoulChat.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<ILineaService, LineaService>();
        services.AddScoped<IConnectlyService, ConnectlyService>();
        services.AddScoped<ISmartService, SmartService>();
        services.AddScoped<ICatalogoService, CatalogoService>();
        services.AddScoped<IAuditoriaService, AuditoriaService>();
        services.AddScoped<IEmpleadoService, EmpleadoService>();
        services.AddScoped<IUsuarioSistemaService, UsuarioSistemaService>();

        services.AddValidatorsFromAssemblyContaining<LoginRequestDtoValidator>();

        return services;
    }
}
