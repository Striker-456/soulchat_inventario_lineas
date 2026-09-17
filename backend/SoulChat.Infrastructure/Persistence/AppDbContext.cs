using Microsoft.EntityFrameworkCore;
using SoulChat.Domain.Entities;

namespace SoulChat.Infrastructure.Persistence;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Cliente> Clientes => Set<Cliente>();
    public DbSet<Empleado> Empleados => Set<Empleado>();
    public DbSet<StatusDesarrollo> StatusDesarrollo => Set<StatusDesarrollo>();
    public DbSet<TenenciaSimCard> TenenciaSimCard => Set<TenenciaSimCard>();
    public DbSet<TipoActivacion> TipoActivacion => Set<TipoActivacion>();
    public DbSet<Bsp> Bsp => Set<Bsp>();
    public DbSet<AppChannel> AppChannel => Set<AppChannel>();
    public DbSet<Linea> Lineas => Set<Linea>();
    public DbSet<LineaConnectlyConfig> LineaConnectlyConfig => Set<LineaConnectlyConfig>();
    public DbSet<LineaSmartConfig> LineaSmartConfig => Set<LineaSmartConfig>();
    public DbSet<UsuarioSistema> UsuariosSistema => Set<UsuarioSistema>();
    public DbSet<AuditoriaCambio> AuditoriaCambios => Set<AuditoriaCambio>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
