using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SoulChat.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AgregaNombreUsuarios : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "nombre",
                table: "usuarios_sistema",
                type: "character varying(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.UpdateData(
                table: "usuarios_sistema",
                keyColumn: "id",
                keyValue: 1,
                column: "nombre",
                value: "Administrador");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "nombre",
                table: "usuarios_sistema");
        }
    }
}
