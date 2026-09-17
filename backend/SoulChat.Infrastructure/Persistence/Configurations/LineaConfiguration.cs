using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SoulChat.Domain.Entities;

namespace SoulChat.Infrastructure.Persistence.Configurations;

public class LineaConfiguration : IEntityTypeConfiguration<Linea>
{
    public void Configure(EntityTypeBuilder<Linea> builder)
    {
        builder.ToTable("lineas");
        builder.HasKey(l => l.Id);
        builder.Property(l => l.Id).HasColumnName("id");
        builder.Property(l => l.ClienteId).HasColumnName("cliente_id").IsRequired();
        builder.Property(l => l.DescripcionUso).HasColumnName("descripcion_uso");
        builder.Property(l => l.StatusDesarrolloId).HasColumnName("status_desarrollo_id");
        builder.Property(l => l.CoordinadorId).HasColumnName("coordinador_id");
        builder.Property(l => l.ProgramadorId).HasColumnName("programador_id");
        builder.Property(l => l.TenenciaSimCardId).HasColumnName("tenencia_sim_card_id");
        builder.Property(l => l.CreatedAt).HasColumnName("created_at");
        builder.Property(l => l.UpdatedAt).HasColumnName("updated_at");

        builder.HasIndex(l => l.ClienteId);
        builder.HasIndex(l => l.StatusDesarrolloId);

        builder.HasOne(l => l.Cliente)
            .WithMany(c => c.Lineas)
            .HasForeignKey(l => l.ClienteId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(l => l.StatusDesarrollo)
            .WithMany(s => s.Lineas)
            .HasForeignKey(l => l.StatusDesarrolloId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(l => l.TenenciaSimCard)
            .WithMany(t => t.Lineas)
            .HasForeignKey(l => l.TenenciaSimCardId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(l => l.ConnectlyConfig)
            .WithOne(c => c.Linea)
            .HasForeignKey<LineaConnectlyConfig>(c => c.LineaId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(l => l.SmartConfig)
            .WithOne(s => s.Linea)
            .HasForeignKey<LineaSmartConfig>(s => s.LineaId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
