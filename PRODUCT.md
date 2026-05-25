# Vantage

## What it is

Aplicación **web** para el **control de gastos personales**: movimientos, ahorros, deudas, recurrentes y análisis. Desplegada en Vercel sobre Supabase (Postgres + Auth), accesible desde cualquier navegador e instalable como PWA en el móvil. Cada cuenta es dueña de sus datos y puede exportarlos cuando quiera.

> Nació como app de escritorio (Electron + SQLite local). En mayo de 2026 se migró a web con paridad funcional para eliminar el reparto de instaladores `.exe`, permitir acceso desde móvil y automatizar el despliegue. El histórico de aquella etapa vive en [`docs/legacy/`](docs/legacy).

## Register

**product** — Vantage es una herramienta de uso diario. La interfaz sirve al producto, no es el producto.

## Users

Una persona (o un hogar) que gestiona sus finanzas personales y entra desde el dispositivo que tenga a mano: móvil de camino a casa, portátil por la noche. Escala pensada: círculo cercano (~10 cuentas), no SaaS masivo. La UI es de un solo espacio por cuenta; el backend ya contempla espacios compartidos, pero esa funcionalidad está fuera de scope de interfaz por ahora.

Existe además un **demo público compartido** (acceso anónimo, de solo lectura para acciones sensibles) para que cualquiera pruebe la app sin registrarse.

Características del perfil:
- Quiere visión clara de ingresos vs gastos sin ruido.
- Valora la inmediatez: añadir un gasto debe ser cuestión de segundos, también desde el móvil.
- Probablemente migra de hojas de cálculo o de un Access antiguo (la app importa de Excel y Access).
- Le importa la estética: prefiere algo agradable a la vista que un dashboard SaaS frío.

## Strategic principles

1. **Dueño de tus datos.** Cada cuenta ve solo lo suyo (aislamiento por RLS en Postgres) y puede exportar todo a fichero cuando quiera. Sin venta de datos, sin telemetría intrusiva.
2. **Accesible desde cualquier sitio.** Web e instalable como PWA: el mismo estado en móvil y escritorio, sin instaladores.
3. **Velocidad de captura.** Registrar un movimiento es la acción más frecuente; debe sentirse fluida, también con el pulgar en el móvil (FAB global + barra inferior).
4. **Inmersivo, suave, vivo.** El usuario lo dijo así: la app debe sentirse agradable al uso, no clínica.
5. **Honestidad visual.** Los números importan; la decoración no debe ocultar datos. Tipografía y peso visual al servicio del contenido financiero.
6. **Sin cliché de fintech.** Ni navy + gold, ni dashboards oscuros tipo terminal. La estética base "Soft Clay" (bento orgánico cálido) es deliberada.

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

- Next.js 15 (App Router) + React 19 + TypeScript estricto
- Tailwind CSS v4 (sin @apply masivo, prefiere clases directas)
- Recharts 3 para gráficos
- Postgres en Supabase + Drizzle ORM (repository pattern por capas)
- Supabase Auth (contraseña + TOTP MFA opcional + acceso anónimo para el demo)
- TanStack Query (estado de servidor en cliente) + Zod (validación de bordes)
- PWA (manifest + service worker) para instalación en móvil
- OCR de tickets con PaddleOCR (ONNX), import de Excel/Access, export a PDF
- Vitest + Playwright; CI/CD con GitHub Actions; despliegue en Vercel

Sin framer-motion, sin shadcn/ui, sin lucide-icons (SVG inline). Todas las animaciones vía CSS keyframes + tokens.

Detalle técnico en [`docs/architecture.md`](docs/architecture.md) y decisiones en [`docs/adr/`](docs/adr).
