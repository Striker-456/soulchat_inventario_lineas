using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SoulChat.Domain.Entities;

namespace SoulChat.Infrastructure.Persistence.Configurations;

public class AuditoriaCambioConfiguration : IEntityTypeConfiguration<AuditoriaCambio>
{
    public void Configure(EntityTypeBuilder<AuditoriaCambio> builder)
    {
        builder.ToTable("auditoria_cambios");
        builder.HasKey(a => a.Id);
        builder.Property(a => a.Id).HasColumnName("id");
        builder.Property(a => a.TablaAfectada).HasColumnName("tabla_afectada").HasMaxLength(60).IsRequired();
        builder.Property(a => a.RegistroId).HasColumnName("registro_id").IsRequired();
        builder.Property(a => a.Campo).HasColumnName("campo").HasMaxLength(100).IsRequired();
        builder.Property(a => a.ValorAnterior).HasColumnName("valor_anterior");
        builder.Property(a => a.ValorNuevo).HasColumnName("valor_nuevo");
        builder.Property(a => a.UsuarioId).HasColumnName("usuario_id");
        builder.Property(a => a.Fecha).HasColumnName("fecha").HasDefaultValueSql("now()");

        builder.HasIndex(a => new { a.TablaAfectada, a.RegistroId });

        builder.HasOne(a => a.Usuario)
            .WithMany()
            .HasForeignKey(a => a.UsuarioId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
