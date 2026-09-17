using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SoulChat.Domain.Entities;

namespace SoulChat.Infrastructure.Persistence.Configurations;

public class UsuarioSistemaConfiguration : IEntityTypeConfiguration<UsuarioSistema>
{
    public void Configure(EntityTypeBuilder<UsuarioSistema> builder)
    {
        builder.ToTable("usuarios_sistema");
        builder.HasKey(u => u.Id);
        builder.Property(u => u.Id).HasColumnName("id");
        builder.Property(u => u.Email).HasColumnName("email").HasMaxLength(150).IsRequired();
        builder.Property(u => u.PasswordHash).HasColumnName("password_hash").HasMaxLength(255).IsRequired();
        builder.Property(u => u.Rol).HasColumnName("rol").HasMaxLength(50).IsRequired();
        builder.Property(u => u.Activo).HasColumnName("activo").HasDefaultValue(true);

        builder.HasIndex(u => u.Email).IsUnique();

        builder.HasData(new UsuarioSistema
        {
            Id = 1,
            Email = "admin@soulchat.local",
            PasswordHash = "$2a$11$zceyATz3nshERAyWCQdsheStsMEiMtGxh/RGhiacwUSjPGiMTeouG",
            Rol = "Admin",
            Activo = true,
        });
    }
}
