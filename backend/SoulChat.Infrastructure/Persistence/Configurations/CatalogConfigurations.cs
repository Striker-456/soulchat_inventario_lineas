using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SoulChat.Domain.Entities;

namespace SoulChat.Infrastructure.Persistence.Configurations;

public class StatusDesarrolloConfiguration : IEntityTypeConfiguration<StatusDesarrollo>
{
    public void Configure(EntityTypeBuilder<StatusDesarrollo> builder)
    {
        builder.ToTable("status_desarrollo");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.Nombre).HasColumnName("nombre").HasMaxLength(60).IsRequired();
        builder.HasIndex(x => x.Nombre).IsUnique();

        builder.HasData(
            new StatusDesarrollo { Id = 1, Nombre = "En desarrollo" },
            new StatusDesarrollo { Id = 2, Nombre = "Producción" },
            new StatusDesarrollo { Id = 3, Nombre = "Pausado" },
            new StatusDesarrollo { Id = 4, Nombre = "Cancelado" });
    }
}

public class TenenciaSimCardConfiguration : IEntityTypeConfiguration<TenenciaSimCard>
{
    public void Configure(EntityTypeBuilder<TenenciaSimCard> builder)
    {
        builder.ToTable("tenencia_sim_card");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.Nombre).HasColumnName("nombre").HasMaxLength(60).IsRequired();
        builder.HasIndex(x => x.Nombre).IsUnique();

        builder.HasData(
            new TenenciaSimCard { Id = 1, Nombre = "SIM física propia" },
            new TenenciaSimCard { Id = 2, Nombre = "Número IVR" },
            new TenenciaSimCard { Id = 3, Nombre = "Número digital Connectly" },
            new TenenciaSimCard { Id = 4, Nombre = "Número digital Smart" });
    }
}

public class TipoActivacionConfiguration : IEntityTypeConfiguration<TipoActivacion>
{
    public void Configure(EntityTypeBuilder<TipoActivacion> builder)
    {
        builder.ToTable("tipo_activacion");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.Nombre).HasColumnName("nombre").HasMaxLength(60).IsRequired();
        builder.HasIndex(x => x.Nombre).IsUnique();
    }
}

public class BspConfiguration : IEntityTypeConfiguration<Bsp>
{
    public void Configure(EntityTypeBuilder<Bsp> builder)
    {
        builder.ToTable("bsp");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.Nombre).HasColumnName("nombre").HasMaxLength(60).IsRequired();
        builder.HasIndex(x => x.Nombre).IsUnique();
    }
}

public class AppChannelConfiguration : IEntityTypeConfiguration<AppChannel>
{
    public void Configure(EntityTypeBuilder<AppChannel> builder)
    {
        builder.ToTable("app_channel");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.Nombre).HasColumnName("nombre").HasMaxLength(60).IsRequired();
        builder.HasIndex(x => x.Nombre).IsUnique();
    }
}
