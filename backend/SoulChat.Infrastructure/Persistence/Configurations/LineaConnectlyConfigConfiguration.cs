using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SoulChat.Domain.Entities;

namespace SoulChat.Infrastructure.Persistence.Configurations;

public class LineaConnectlyConfigConfiguration : IEntityTypeConfiguration<LineaConnectlyConfig>
{
    public void Configure(EntityTypeBuilder<LineaConnectlyConfig> builder)
    {
        builder.ToTable("linea_connectly_config");
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).HasColumnName("id");
        builder.Property(c => c.LineaId).HasColumnName("linea_id").IsRequired();
        builder.Property(c => c.NumeroConnectly).HasColumnName("numero_connectly").HasMaxLength(20).IsRequired();
        builder.Property(c => c.Usuario).HasColumnName("usuario").HasMaxLength(100).IsRequired();
        builder.Property(c => c.ContrasenaCifrada).HasColumnName("contrasena_cifrada").IsRequired();
        builder.Property(c => c.BusinessId).HasColumnName("business_id").HasMaxLength(100);
        builder.Property(c => c.ApiKeyCifrada).HasColumnName("api_key_cifrada");
        builder.Property(c => c.Webhook).HasColumnName("webhook").HasMaxLength(255);
        builder.Property(c => c.Dns).HasColumnName("dns").HasMaxLength(150);
        builder.Property(c => c.CreatedAt).HasColumnName("created_at");
        builder.Property(c => c.UpdatedAt).HasColumnName("updated_at");

        builder.HasIndex(c => c.LineaId).IsUnique();
        builder.HasIndex(c => c.NumeroConnectly).IsUnique();
    }
}
