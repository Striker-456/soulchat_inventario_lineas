using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace SoulChat.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class SmartCamposHojaControl : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Tipo de activación y app channel dejan de ser catálogos: en la hoja de control son valores
            // por línea (un nombre de middleware y un ID numérico). Primero se copian los nombres actuales
            // a las nuevas columnas de texto y después se eliminan las llaves foráneas y los catálogos.
            migrationBuilder.AddColumn<string>(
                name: "app_channel",
                table: "linea_smart_config",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "estado",
                table: "linea_smart_config",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "tipo_activacion",
                table: "linea_smart_config",
                type: "character varying(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "webhook_campanas",
                table: "linea_smart_config",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.Sql(
                "UPDATE linea_smart_config s SET tipo_activacion = t.nombre " +
                "FROM tipo_activacion t WHERE s.tipo_activacion_id = t.id;");
            migrationBuilder.Sql(
                "UPDATE linea_smart_config s SET app_channel = a.nombre " +
                "FROM app_channel a WHERE s.app_channel_id = a.id;");

            migrationBuilder.DropForeignKey(
                name: "FK_linea_smart_config_app_channel_app_channel_id",
                table: "linea_smart_config");

            migrationBuilder.DropForeignKey(
                name: "FK_linea_smart_config_tipo_activacion_tipo_activacion_id",
                table: "linea_smart_config");

            migrationBuilder.DropIndex(
                name: "IX_linea_smart_config_app_channel_id",
                table: "linea_smart_config");

            migrationBuilder.DropIndex(
                name: "IX_linea_smart_config_tipo_activacion_id",
                table: "linea_smart_config");

            migrationBuilder.DropColumn(
                name: "app_channel_id",
                table: "linea_smart_config");

            migrationBuilder.DropColumn(
                name: "tipo_activacion_id",
                table: "linea_smart_config");

            migrationBuilder.DropTable(
                name: "app_channel");

            migrationBuilder.DropTable(
                name: "tipo_activacion");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "app_channel_id",
                table: "linea_smart_config",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "tipo_activacion_id",
                table: "linea_smart_config",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "app_channel",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    nombre = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_app_channel", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "tipo_activacion",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    nombre = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tipo_activacion", x => x.id);
                });

            // Reconstruye los catálogos con los valores de texto (recortados al largo que admitía el catálogo).
            migrationBuilder.Sql(
                "INSERT INTO tipo_activacion (nombre) SELECT DISTINCT LEFT(tipo_activacion, 60) " +
                "FROM linea_smart_config WHERE tipo_activacion IS NOT NULL;");
            migrationBuilder.Sql(
                "UPDATE linea_smart_config s SET tipo_activacion_id = t.id " +
                "FROM tipo_activacion t WHERE LEFT(s.tipo_activacion, 60) = t.nombre;");
            migrationBuilder.Sql(
                "INSERT INTO app_channel (nombre) SELECT DISTINCT LEFT(app_channel, 60) " +
                "FROM linea_smart_config WHERE app_channel IS NOT NULL;");
            migrationBuilder.Sql(
                "UPDATE linea_smart_config s SET app_channel_id = a.id " +
                "FROM app_channel a WHERE LEFT(s.app_channel, 60) = a.nombre;");

            migrationBuilder.DropColumn(
                name: "app_channel",
                table: "linea_smart_config");

            migrationBuilder.DropColumn(
                name: "estado",
                table: "linea_smart_config");

            migrationBuilder.DropColumn(
                name: "tipo_activacion",
                table: "linea_smart_config");

            migrationBuilder.DropColumn(
                name: "webhook_campanas",
                table: "linea_smart_config");

            migrationBuilder.CreateIndex(
                name: "IX_linea_smart_config_app_channel_id",
                table: "linea_smart_config",
                column: "app_channel_id");

            migrationBuilder.CreateIndex(
                name: "IX_linea_smart_config_tipo_activacion_id",
                table: "linea_smart_config",
                column: "tipo_activacion_id");

            migrationBuilder.CreateIndex(
                name: "IX_app_channel_nombre",
                table: "app_channel",
                column: "nombre",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tipo_activacion_nombre",
                table: "tipo_activacion",
                column: "nombre",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_linea_smart_config_app_channel_app_channel_id",
                table: "linea_smart_config",
                column: "app_channel_id",
                principalTable: "app_channel",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_linea_smart_config_tipo_activacion_tipo_activacion_id",
                table: "linea_smart_config",
                column: "tipo_activacion_id",
                principalTable: "tipo_activacion",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
