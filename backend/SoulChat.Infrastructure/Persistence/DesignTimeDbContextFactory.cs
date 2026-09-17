using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace SoulChat.Infrastructure.Persistence;

/// <summary>
/// Permite a `dotnet ef migrations` construir el DbContext sin levantar todo el host de la Api.
/// La cadena de conexión real (con credenciales) se toma de la variable de entorno
/// ConnectionStrings__DefaultConnection cuando existe; si no, usa un valor local de solo diseño.
/// </summary>
public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
            ?? "Host=localhost;Port=5432;Database=soulchat_inventario_lineas;Username=postgres;Password=postgres";

        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
        optionsBuilder.UseNpgsql(connectionString);

        return new AppDbContext(optionsBuilder.Options);
    }
}
