using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SoulChat.Domain.Entities;

namespace SoulChat.Infrastructure.Persistence.Configurations;

public class LogSistemaConfiguration : IEntityTypeConfiguration<LogSistema>
{
    public void Configure(EntityTypeBuilder<LogSistema> builder)
    {
        builder.ToTable("logs_sistema");
        builder.HasKey(l => l.Id);
        builder.Property(l => l.Id).HasColumnName("id").UseIdentityByDefaultColumn();
        builder.Property(l => l.Fecha).HasColumnName("fecha").HasDefaultValueSql("now()");
        builder.Property(l => l.Nivel).HasColumnName("nivel").HasMaxLength(10).IsRequired();
        builder.Property(l => l.UsuarioId).HasColumnName("usuario_id");
        builder.Property(l => l.UsuarioEmail).HasColumnName("usuario_email").HasMaxLength(150);
        builder.Property(l => l.Modulo).HasColumnName("modulo").HasMaxLength(60).IsRequired();
        builder.Property(l => l.Accion).HasColumnName("accion").HasMaxLength(40).IsRequired();
        builder.Property(l => l.Detalle).HasColumnName("detalle").HasMaxLength(1000).IsRequired();
        builder.Property(l => l.Ip).HasColumnName("ip").HasMaxLength(45);

        builder.HasIndex(l => l.Fecha);
        builder.HasIndex(l => l.Nivel);
        builder.HasIndex(l => l.Modulo);

        // Sin FK a usuarios_sistema: el log debe sobrevivir a la eliminación de la cuenta y admitir
        // intentos de acceso con correos que no existen.
    }
}
