using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace SoulChat.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AgregaNumeroLineaClientesLogsYPermisos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "permisos",
                table: "usuarios_sistema",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "numero",
                table: "lineas",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "estado",
                table: "clientes",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Activo");

            migrationBuilder.AddColumn<string>(
                name: "rfc",
                table: "clientes",
                type: "character varying(13)",
                maxLength: 13,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "logs_sistema",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    fecha = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    nivel = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    usuario_id = table.Column<int>(type: "integer", nullable: true),
                    usuario_email = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    modulo = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    accion = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    detalle = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    ip = table.Column<string>(type: "character varying(45)", maxLength: 45, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_logs_sistema", x => x.id);
                });

            migrationBuilder.UpdateData(
                table: "usuarios_sistema",
                keyColumn: "id",
                keyValue: 1,
                column: "permisos",
                value: null);

            migrationBuilder.CreateIndex(
                name: "IX_lineas_numero",
                table: "lineas",
                column: "numero",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_logs_sistema_fecha",
                table: "logs_sistema",
                column: "fecha");

            migrationBuilder.CreateIndex(
                name: "IX_logs_sistema_modulo",
                table: "logs_sistema",
                column: "modulo");

            migrationBuilder.CreateIndex(
                name: "IX_logs_sistema_nivel",
                table: "logs_sistema",
                column: "nivel");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "logs_sistema");

            migrationBuilder.DropIndex(
                name: "IX_lineas_numero",
                table: "lineas");

            migrationBuilder.DropColumn(
                name: "permisos",
                table: "usuarios_sistema");

            migrationBuilder.DropColumn(
                name: "numero",
                table: "lineas");

            migrationBuilder.DropColumn(
                name: "estado",
                table: "clientes");

            migrationBuilder.DropColumn(
                name: "rfc",
                table: "clientes");
        }
    }
}
