# Diagrama ER — SoulChat Inventario Líneas

```mermaid
erDiagram
    CLIENTE ||--o{ LINEA : "tiene"
    EMPLEADO ||--o{ LINEA : "coordina"
    EMPLEADO ||--o{ LINEA : "programa"
    STATUS_DESARROLLO ||--o{ LINEA : "clasifica"
    TENENCIA_SIM_CARD ||--o{ LINEA : "clasifica"
    LINEA ||--o| LINEA_CONNECTLY_CONFIG : "0..1"
    LINEA ||--o| LINEA_SMART_CONFIG : "0..1"
    TIPO_ACTIVACION ||--o{ LINEA_SMART_CONFIG : "clasifica"
    BSP ||--o{ LINEA_SMART_CONFIG : "clasifica"
    APP_CHANNEL ||--o{ LINEA_SMART_CONFIG : "clasifica"
    USUARIO_SISTEMA ||--o{ AUDITORIA_CAMBIO : "registra"

    CLIENTE {
        int id PK
        string nombre
    }
    EMPLEADO {
        int id PK
        string nombre
        string rol
    }
    LINEA {
        int id PK
        int cliente_id FK
        string descripcion_uso
        int status_desarrollo_id FK
        int coordinador_id FK
        int programador_id FK
        int tenencia_sim_card_id FK
    }
    LINEA_CONNECTLY_CONFIG {
        int id PK
        int linea_id FK
        string numero_connectly
        string usuario
        bytea contrasena_cifrada
        bytea api_key_cifrada
    }
    LINEA_SMART_CONFIG {
        int id PK
        int linea_id FK
        string numero_linea
        int tipo_activacion_id FK
        int bsp_id FK
        int app_channel_id FK
        bytea clave_cifrada
        bool envio_push
        bool facturado
    }
    USUARIO_SISTEMA {
        int id PK
        string email
        string password_hash
        string rol
    }
    AUDITORIA_CAMBIO {
        int id PK
        string tabla_afectada
        int registro_id
        string campo
        string valor_anterior
        string valor_nuevo
        int usuario_id FK
    }
```

El SQL de referencia (3FN) vive en la memoria del proyecto y se refleja 1:1 en la migración
`SoulChat.Infrastructure/Persistence/Migrations/20260917224304_InitialCreate.cs`.
