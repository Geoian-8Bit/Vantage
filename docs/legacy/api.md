# API Documentation

**Nota:** La API REST se implementará en la Fase 4, cuando se añada el servidor.
Por ahora la app funciona 100% local con SQLite.

## Endpoints (Fase 4 - futuro)

(Se definirán cuando se implemente el servidor)

## Modelo de datos actual (SQLite local)

### Tabla: transactions
| Campo       | Tipo    | Descripción                          |
|-------------|---------|--------------------------------------|
| id          | TEXT    | UUID, clave primaria                 |
| amount      | REAL    | Monto (positivo siempre)             |
| type        | TEXT    | "income" o "expense"                 |
| description | TEXT    | Descripción del gasto/ingreso        |
| date        | TEXT    | Fecha ISO 8601 (YYYY-MM-DD)         |
| created_at  | TEXT    | Timestamp de creación                |

### Tabla: categories (Fase 2 - futuro)
| Campo       | Tipo    | Descripción                          |
|-------------|---------|--------------------------------------|
| id          | TEXT    | UUID, clave primaria                 |
| name        | TEXT    | Nombre de la categoría               |
| color       | TEXT    | Color hex para UI                    |
| icon        | TEXT    | Nombre del icono (opcional)          |
