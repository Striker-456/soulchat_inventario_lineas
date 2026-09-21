using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
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
        builder.Property(u => u.Nombre).HasColumnName("nombre").HasMaxLength(150);
        builder.Property(u => u.Email).HasColumnName("email").HasMaxLength(150).IsRequired();
        builder.Property(u => u.PasswordHash).HasColumnName("password_hash").HasMaxLength(255).IsRequired();
        builder.Property(u => u.Rol).HasColumnName("rol").HasMaxLength(50).IsRequired();
        builder.Property(u => u.Activo).HasColumnName("activo").HasDefaultValue(true);

        // Matriz de permisos personalizada como JSON en texto; null = usa la plantilla del rol.
        builder.Property(u => u.Permisos)
            .HasColumnName("permisos")
            .HasColumnType("text")
            .HasConversion(
                v => v == null ? null : JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                v => v == null ? null : JsonSerializer.Deserialize<Dictionary<string, string[]>>(v, (JsonSerializerOptions?)null),
                new ValueComparer<Dictionary<string, string[]>?>(
                    (a, b) => JsonSerializer.Serialize(a, (JsonSerializerOptions?)null) == JsonSerializer.Serialize(b, (JsonSerializerOptions?)null),
                    v => v == null ? 0 : JsonSerializer.Serialize(v, (JsonSerializerOptions?)null).GetHashCode(),
                    v => v == null ? null : JsonSerializer.Deserialize<Dictionary<string, string[]>>(JsonSerializer.Serialize(v, (JsonSerializerOptions?)null), (JsonSerializerOptions?)null)));

        builder.HasIndex(u => u.Email).IsUnique();

        builder.HasData(new UsuarioSistema
        {
            Id = 1,
            Nombre = "Administrador",
            Email = "admin@soulchat.local",
            PasswordHash = "$2a$11$zceyATz3nshERAyWCQdsheStsMEiMtGxh/RGhiacwUSjPGiMTeouG",
            Rol = "Admin",
            Activo = true,
        });
    }
}
