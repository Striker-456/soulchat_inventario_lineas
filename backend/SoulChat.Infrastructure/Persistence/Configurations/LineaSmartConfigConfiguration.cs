using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SoulChat.Domain.Entities;

namespace SoulChat.Infrastructure.Persistence.Configurations;

public class LineaSmartConfigConfiguration : IEntityTypeConfiguration<LineaSmartConfig>
{
    public void Configure(EntityTypeBuilder<LineaSmartConfig> builder)
    {
        builder.ToTable("linea_smart_config");
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).HasColumnName("id");
        builder.Property(c => c.LineaId).HasColumnName("linea_id").IsRequired();
        builder.Property(c => c.NumeroLinea).HasColumnName("numero_linea").HasMaxLength(20).IsRequired();
        builder.Property(c => c.TipoActivacionId).HasColumnName("tipo_activacion_id");
        builder.Property(c => c.CompanyCampanasBotai).HasColumnName("company_campanas_botai").HasMaxLength(150);
        builder.Property(c => c.BspId).HasColumnName("bsp_id");
        builder.Property(c => c.WebhookCos).HasColumnName("webhook_cos").HasMaxLength(255);
        builder.Property(c => c.WebhookSda).HasColumnName("webhook_sda").HasMaxLength(255);
        builder.Property(c => c.UsuarioCompanyId).HasColumnName("usuario_companyid").HasMaxLength(100);
        builder.Property(c => c.ClaveCifrada).HasColumnName("clave_cifrada");
        builder.Property(c => c.CompanyBot).HasColumnName("company_bot").HasMaxLength(150);
        builder.Property(c => c.BotId).HasColumnName("bot_id").HasMaxLength(100);
        builder.Property(c => c.BotVersion).HasColumnName("bot_version").HasMaxLength(30);
        builder.Property(c => c.AppChannelId).HasColumnName("app_channel_id");
        builder.Property(c => c.CompanyIdCampanas).HasColumnName("company_id_campanas").HasMaxLength(100);
        builder.Property(c => c.EnvioPush).HasColumnName("envio_push").HasDefaultValue(false);
        builder.Property(c => c.Uso).HasColumnName("uso");
        builder.Property(c => c.Observaciones).HasColumnName("observaciones");
        builder.Property(c => c.FechaVerificacion).HasColumnName("fecha_verificacion");
        builder.Property(c => c.Facturado).HasColumnName("facturado").HasDefaultValue(false);
        builder.Property(c => c.CreatedAt).HasColumnName("created_at");
        builder.Property(c => c.UpdatedAt).HasColumnName("updated_at");

        builder.HasIndex(c => c.LineaId).IsUnique();
        builder.HasIndex(c => c.NumeroLinea).IsUnique();

        builder.HasOne(c => c.TipoActivacion)
            .WithMany(t => t.LineaSmartConfigs)
            .HasForeignKey(c => c.TipoActivacionId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(c => c.Bsp)
            .WithMany(b => b.LineaSmartConfigs)
            .HasForeignKey(c => c.BspId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(c => c.AppChannel)
            .WithMany(a => a.LineaSmartConfigs)
            .HasForeignKey(c => c.AppChannelId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
