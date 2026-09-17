using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SoulChat.Domain.Entities;

namespace SoulChat.Infrastructure.Persistence.Configurations;

public class EmpleadoConfiguration : IEntityTypeConfiguration<Empleado>
{
    public void Configure(EntityTypeBuilder<Empleado> builder)
    {
        builder.ToTable("empleados");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).HasColumnName("id");
        builder.Property(e => e.Nombre).HasColumnName("nombre").HasMaxLength(150).IsRequired();
        builder.Property(e => e.Rol).HasColumnName("rol").HasMaxLength(50);
        builder.Property(e => e.CreatedAt).HasColumnName("created_at");
        builder.Property(e => e.UpdatedAt).HasColumnName("updated_at");

        builder.HasMany(e => e.LineasComoCoordinador)
            .WithOne(l => l.Coordinador)
            .HasForeignKey(l => l.CoordinadorId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasMany(e => e.LineasComoProgramador)
            .WithOne(l => l.Programador)
            .HasForeignKey(l => l.ProgramadorId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
