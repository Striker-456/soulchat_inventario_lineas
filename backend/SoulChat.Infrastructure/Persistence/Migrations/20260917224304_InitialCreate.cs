using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace SoulChat.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
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
                name: "bsp",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    nombre = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_bsp", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "clientes",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    nombre = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_clientes", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "empleados",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    nombre = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    rol = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_empleados", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "status_desarrollo",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    nombre = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_status_desarrollo", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "tenencia_sim_card",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    nombre = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tenencia_sim_card", x => x.id);
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

            migrationBuilder.CreateTable(
                name: "usuarios_sistema",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    email = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    password_hash = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    rol = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    activo = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_usuarios_sistema", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "lineas",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    cliente_id = table.Column<int>(type: "integer", nullable: false),
                    descripcion_uso = table.Column<string>(type: "text", nullable: true),
                    status_desarrollo_id = table.Column<int>(type: "integer", nullable: true),
                    coordinador_id = table.Column<int>(type: "integer", nullable: true),
                    programador_id = table.Column<int>(type: "integer", nullable: true),
                    tenencia_sim_card_id = table.Column<int>(type: "integer", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lineas", x => x.id);
                    table.ForeignKey(
                        name: "FK_lineas_clientes_cliente_id",
                        column: x => x.cliente_id,
                        principalTable: "clientes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lineas_empleados_coordinador_id",
                        column: x => x.coordinador_id,
                        principalTable: "empleados",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_lineas_empleados_programador_id",
                        column: x => x.programador_id,
                        principalTable: "empleados",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_lineas_status_desarrollo_status_desarrollo_id",
                        column: x => x.status_desarrollo_id,
                        principalTable: "status_desarrollo",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_lineas_tenencia_sim_card_tenencia_sim_card_id",
                        column: x => x.tenencia_sim_card_id,
                        principalTable: "tenencia_sim_card",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "auditoria_cambios",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tabla_afectada = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    registro_id = table.Column<int>(type: "integer", nullable: false),
                    campo = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    valor_anterior = table.Column<string>(type: "text", nullable: true),
                    valor_nuevo = table.Column<string>(type: "text", nullable: true),
                    usuario_id = table.Column<int>(type: "integer", nullable: true),
                    fecha = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_auditoria_cambios", x => x.id);
                    table.ForeignKey(
                        name: "FK_auditoria_cambios_usuarios_sistema_usuario_id",
                        column: x => x.usuario_id,
                        principalTable: "usuarios_sistema",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "linea_connectly_config",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    linea_id = table.Column<int>(type: "integer", nullable: false),
                    numero_connectly = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    usuario = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    contrasena_cifrada = table.Column<byte[]>(type: "bytea", nullable: false),
                    business_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    api_key_cifrada = table.Column<byte[]>(type: "bytea", nullable: true),
                    webhook = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    dns = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_linea_connectly_config", x => x.id);
                    table.ForeignKey(
                        name: "FK_linea_connectly_config_lineas_linea_id",
                        column: x => x.linea_id,
                        principalTable: "lineas",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "linea_smart_config",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    linea_id = table.Column<int>(type: "integer", nullable: false),
                    numero_linea = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    tipo_activacion_id = table.Column<int>(type: "integer", nullable: true),
                    company_campanas_botai = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    bsp_id = table.Column<int>(type: "integer", nullable: true),
                    webhook_cos = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    webhook_sda = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    usuario_companyid = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    clave_cifrada = table.Column<byte[]>(type: "bytea", nullable: true),
                    company_bot = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    bot_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    bot_version = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    app_channel_id = table.Column<int>(type: "integer", nullable: true),
                    company_id_campanas = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    envio_push = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    uso = table.Column<string>(type: "text", nullable: true),
                    observaciones = table.Column<string>(type: "text", nullable: true),
                    fecha_verificacion = table.Column<DateOnly>(type: "date", nullable: true),
                    facturado = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_linea_smart_config", x => x.id);
                    table.ForeignKey(
                        name: "FK_linea_smart_config_app_channel_app_channel_id",
                        column: x => x.app_channel_id,
                        principalTable: "app_channel",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_linea_smart_config_bsp_bsp_id",
                        column: x => x.bsp_id,
                        principalTable: "bsp",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_linea_smart_config_lineas_linea_id",
                        column: x => x.linea_id,
                        principalTable: "lineas",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_linea_smart_config_tipo_activacion_tipo_activacion_id",
                        column: x => x.tipo_activacion_id,
                        principalTable: "tipo_activacion",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.InsertData(
                table: "status_desarrollo",
                columns: new[] { "id", "nombre" },
                values: new object[,]
                {
                    { 1, "En desarrollo" },
                    { 2, "Producción" },
                    { 3, "Pausado" },
                    { 4, "Cancelado" }
                });

            migrationBuilder.InsertData(
                table: "tenencia_sim_card",
                columns: new[] { "id", "nombre" },
                values: new object[,]
                {
                    { 1, "SIM física propia" },
                    { 2, "Número IVR" },
                    { 3, "Número digital Connectly" },
                    { 4, "Número digital Smart" }
                });

            migrationBuilder.InsertData(
                table: "usuarios_sistema",
                columns: new[] { "id", "activo", "email", "password_hash", "rol" },
                values: new object[] { 1, true, "admin@soulchat.local", "$2a$11$zceyATz3nshERAyWCQdsheStsMEiMtGxh/RGhiacwUSjPGiMTeouG", "Admin" });

            migrationBuilder.CreateIndex(
                name: "IX_app_channel_nombre",
                table: "app_channel",
                column: "nombre",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_auditoria_cambios_tabla_afectada_registro_id",
                table: "auditoria_cambios",
                columns: new[] { "tabla_afectada", "registro_id" });

            migrationBuilder.CreateIndex(
                name: "IX_auditoria_cambios_usuario_id",
                table: "auditoria_cambios",
                column: "usuario_id");

            migrationBuilder.CreateIndex(
                name: "IX_bsp_nombre",
                table: "bsp",
                column: "nombre",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_linea_connectly_config_linea_id",
                table: "linea_connectly_config",
                column: "linea_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_linea_connectly_config_numero_connectly",
                table: "linea_connectly_config",
                column: "numero_connectly",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_linea_smart_config_app_channel_id",
                table: "linea_smart_config",
                column: "app_channel_id");

            migrationBuilder.CreateIndex(
                name: "IX_linea_smart_config_bsp_id",
                table: "linea_smart_config",
                column: "bsp_id");

            migrationBuilder.CreateIndex(
                name: "IX_linea_smart_config_linea_id",
                table: "linea_smart_config",
                column: "linea_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_linea_smart_config_numero_linea",
                table: "linea_smart_config",
                column: "numero_linea",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_linea_smart_config_tipo_activacion_id",
                table: "linea_smart_config",
                column: "tipo_activacion_id");

            migrationBuilder.CreateIndex(
                name: "IX_lineas_cliente_id",
                table: "lineas",
                column: "cliente_id");

            migrationBuilder.CreateIndex(
                name: "IX_lineas_coordinador_id",
                table: "lineas",
                column: "coordinador_id");

            migrationBuilder.CreateIndex(
                name: "IX_lineas_programador_id",
                table: "lineas",
                column: "programador_id");

            migrationBuilder.CreateIndex(
                name: "IX_lineas_status_desarrollo_id",
                table: "lineas",
                column: "status_desarrollo_id");

            migrationBuilder.CreateIndex(
                name: "IX_lineas_tenencia_sim_card_id",
                table: "lineas",
                column: "tenencia_sim_card_id");

            migrationBuilder.CreateIndex(
                name: "IX_status_desarrollo_nombre",
                table: "status_desarrollo",
                column: "nombre",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tenencia_sim_card_nombre",
                table: "tenencia_sim_card",
                column: "nombre",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tipo_activacion_nombre",
                table: "tipo_activacion",
                column: "nombre",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_usuarios_sistema_email",
                table: "usuarios_sistema",
                column: "email",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "auditoria_cambios");

            migrationBuilder.DropTable(
                name: "linea_connectly_config");

            migrationBuilder.DropTable(
                name: "linea_smart_config");

            migrationBuilder.DropTable(
                name: "usuarios_sistema");

            migrationBuilder.DropTable(
                name: "app_channel");

            migrationBuilder.DropTable(
                name: "bsp");

            migrationBuilder.DropTable(
                name: "lineas");

            migrationBuilder.DropTable(
                name: "tipo_activacion");

            migrationBuilder.DropTable(
                name: "clientes");

            migrationBuilder.DropTable(
                name: "empleados");

            migrationBuilder.DropTable(
                name: "status_desarrollo");

            migrationBuilder.DropTable(
                name: "tenencia_sim_card");
        }
    }
}
