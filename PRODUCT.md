# Vantage

## What it is

Aplicación de escritorio (Electron) para el **control de gastos personales** de un único usuario. Funciona 100% local con SQLite — sin nube, sin cuentas, sin sincronización. El usuario es dueño de sus datos.

## Register

**product** — Vantage es una herramienta de uso diario. La interfaz sirve al producto, no es el producto.

## Users

Una persona única que gestiona sus finanzas personales en su ordenador personal. No hay roles, equipos, ni multi-usuario.

Características del perfil:
- Quiere visión clara de ingresos vs gastos sin ruido.
- Valora la inmediatez: añadir un gasto debe ser cuestión de segundos.
- Probablemente migra de hojas de cálculo o de un Access antiguo (la app importa de Excel y Access).
- Le importa la estética: prefiere algo agradable a la vista que un dashboard SaaS frío.

## Strategic principles

1. **Local-first inviolable.** Nada sale del disco del usuario. Sin telemetría, sin login, sin red.
2. **Velocidad de captura.** Registrar un movimiento es la acción más frecuente; debe sentirse fluida.
3. **Inmersivo, suave, vivo.** El usuario lo dijo así: la app debe sentirse agradable al uso, no clínica.
4. **Honestidad visual.** Los números importan; la decoración no debe ocultar datos. Tipografía y peso visual al servicio del contenido financiero.
5. **Sin cliché de fintech.** Ni navy + gold, ni dashboards oscuros tipo terminal. La estética base "Soft Clay" (bento orgánico cálido) es deliberada.

## Tone

Español de España. Humano, directo, sin formalidad innecesaria. Mensajes cortos. Verbos activos. Tuteo natural.

Ejemplos buenos: "Sin movimientos este día", "Cambia el periodo o registra movimientos para ver la evolución", "Doble click en una celda del calendario para añadir un gasto rápido".

Evitar: jerga técnica ("Error: undefined"), pasivos burocráticos ("Los datos han sido procesados"), exclamaciones publicitarias ("¡Bienvenido!").

## Anti-references

Lo que Vantage **no** quiere parecer:

- **Mint / Quickbooks / SAP**: dashboards corporativos densos, jerarquía de chrome ahogando el dato.
- **Linear / Notion clones**: gris-azulado neutro, vacío, sin personalidad.
- **Crypto neón sobre negro**: tipografía mono futurista, gradientes glow, glassmorphism por defecto.
- **Banco tradicional**: navy + gold, serif clásica, sensación de "trámite".
- **App SaaS de plantilla**: hero metric template, tarjetas idénticas en grid, gradient text decorativo.

## Aesthetic direction

Sistema de diseño **Soft Clay** (bento orgánico cálido) ya establecido. 5 paletas seleccionables:

1. **Corporativo** (Vino + Dorado) — la paleta original, conservadora, con tipografía Inter y radios pequeños. Es el aspecto inicial al primer arranque.
2. **Soft Clay** — coral cálido + violeta, DM Serif Display, radios extremos.
3. **Botánico** — verde olivo + bermejo + sepia.
4. **Tea House** — papel de arroz + sumi + matcha.
5. **Mediterráneo** — azul marino + dorado + crema arena.

Cada paleta tiene modo claro y oscuro. El usuario elige en Ajustes → Apariencia.

## Tech stack

- Electron 41 + React 19 + TypeScript
- Tailwind CSS v4 (sin @apply masivo, prefiere clases directas)
- Recharts 3 para gráficos
- SQLite (sql.js) — repository pattern, listo para futura migración a HTTP API
- electron-vite + electron-builder para build

Sin framer-motion, sin shadcn/ui, sin lucide-icons (SVG inline). Todas las animaciones vía CSS keyframes + tokens.
