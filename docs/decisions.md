# Decisiones Técnicas

## Decisiones Tomadas

### Electron + React (en lugar de Flutter)
**Decisión:** Usar Electron para empaquetar una app React como .exe de escritorio
**Razón:** El plan futuro es tener un servidor web al que se acceda desde navegador
(PC y móvil). Con React, el mismo frontend sirve para el .exe local y para la web.
Flutter habría requerido reescribir el frontend web por separado.

### TypeScript
**Decisión:** Usar TypeScript en todo el proyecto
**Razón:** Type safety, mejor developer experience, debugging más fácil

### SQLite como BD local
**Decisión:** Usar SQLite con sql.js (WebAssembly) para persistencia local
**Razón:** Es un solo archivo portable. Se copia con la app sin configuración.
Se eligió sql.js en vez de better-sqlite3 porque no requiere compilación nativa
(Python + Visual Studio Build Tools), lo cual simplifica el setup en cualquier PC.
Cuando se implemente el servidor, se migrará a PostgreSQL en el backend.

### Vite como bundler
**Decisión:** Usar Vite para el build del frontend React
**Razón:** Build rápido, buen soporte para Electron, configuración sencilla

### Repository Pattern
**Decisión:** Abstraer el acceso a datos con Repository Pattern
**Razón:** Permite cambiar de SQLite local a API HTTP (servidor futuro) sin
modificar la UI. Es la pieza clave para la transición local → servidor.

### No usar Rust
**Decisión:** Evitar Rust en el stack (descarta Tauri)
**Razón:** Requisito del proyecto

## Tecnologías descartadas

| Tecnología | Motivo del descarte |
|------------|---------------------|
| Tauri | Usa Rust (requisito: no usar Rust) |
| Flutter | El futuro móvil será web, no app nativa. React se reutiliza mejor |
| .NET MAUI | Ecosistema diferente, no aporta ventaja para el caso de uso |
| Electron alternatives (Neutralino) | Menos maduro, menor ecosistema |

## Decisiones Pendientes

- Librería de gráficos para analíticas (candidata: Recharts)
- Framework del servidor futuro (Express vs Fastify)
- Estrategia de sincronización local ↔ servidor
- Solución OCR para facturas
