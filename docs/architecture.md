# Arquitectura de Vantage

## Descripción General

Vantage es una aplicación de control de gastos personales. Arranca como un .exe portable
para escritorio y en el futuro se expande a web + móvil a través de un servidor propio.

## Visión general del sistema

```
FASE ACTUAL (local):
  React UI (renderer) → Repository → SQLite (archivo local)
  Todo empaquetado en un .exe portable con Electron.

FASE FUTURA (servidor):
  .exe de escritorio ──→ Repository → API HTTP ──→ Servidor (Express/Fastify) → PostgreSQL
  Navegador (PC/móvil) → Repository → API HTTP ──→ Servidor (Express/Fastify) → PostgreSQL
```

**Clave**: el frontend React es el mismo código tanto para el .exe como para la versión web.
Solo cambia el "data source" gracias al Repository Pattern.

## Stack tecnológico

| Capa         | Tecnología           | Notas                                     |
|--------------|----------------------|--------------------------------------------|
| UI           | React + TypeScript   | Mismo código para .exe y web futura        |
| Bundler      | Vite                 | Build rápido para React                    |
| Desktop      | Electron             | Empaqueta como .exe portable               |
| BD local     | SQLite (sql.js/WASM)    | Un archivo, se copia con la app. Sin compilación nativa |
| BD servidor  | PostgreSQL (futuro)  | Cuando se implemente el servidor           |
| Backend      | Express o Fastify (futuro) | API REST para sync PC/móvil          |

## Estructura del proyecto

```
Vantage/
├── docs/                    # Documentación del proyecto
├── src/
│   ├── main/                # Proceso principal de Electron
│   │   ├── main.ts          # Entry point Electron
│   │   └── database/        # SQLite: setup, migraciones, esquema
│   ├── renderer/            # Aplicación React (la UI)
│   │   ├── App.tsx
│   │   ├── components/      # Componentes reutilizables (botones, inputs, cards)
│   │   ├── screens/         # Pantallas completas (Home, AddTransaction)
│   │   ├── repositories/    # Abstracción de acceso a datos
│   │   ├── models/          # Interfaces y tipos del dominio
│   │   └── hooks/           # Custom hooks de React
│   └── shared/              # Tipos y utilidades compartidas entre main y renderer
│       └── types.ts
├── package.json
├── electron-builder.yml     # Configuración para generar .exe portable
├── vite.config.ts
└── tsconfig.json
```

## Patrones clave

### Repository Pattern
Capa de abstracción entre la UI y la fuente de datos. Permite cambiar de SQLite local
a API HTTP sin tocar los componentes React.

```typescript
// Interfaz que define las operaciones
interface TransactionRepository {
  getAll(): Promise<Transaction[]>;
  create(data: CreateTransaction): Promise<Transaction>;
  delete(id: string): Promise<void>;
}

// Implementación local (fase actual)
class LocalTransactionRepository implements TransactionRepository { /* usa SQLite */ }

// Implementación remota (fase futura)
class RemoteTransactionRepository implements TransactionRepository { /* usa fetch/API */ }
```

## Portabilidad

La app es portable: se genera una carpeta con el .exe y todos sus archivos.
Al copiar esa carpeta a otro PC, funciona sin instalar nada.
La base de datos SQLite es un archivo dentro de esa carpeta.
