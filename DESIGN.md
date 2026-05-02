# Vantage Design System

Sistema fully tokenizado en `src/renderer/styles/globals.css`. Todos los componentes consumen variables CSS, nunca hex hardcoded.

## Color strategy

**Committed** dentro de cada paleta: el color brand carga 30-50% de la sensación visual (icono activo, indicator, primary buttons, accents en cards). Acento secundario complementa (10-15%). Neutrales tintados hacia el brand para coherencia.

Nunca `#000` ni `#fff` puros — todos los neutrales tienen sutil chroma hacia el brand de cada paleta.

### Paletas (light mode)

| Paleta | Brand | Accent | Surface | Card | Text |
|---|---|---|---|---|---|
| Corporativo | `#7A1B2D` vino | `#C9A84C` dorado | `#F7F6F5` | `#FFFFFF` | `#2D2D2F` |
| Soft Clay | `#FF7A59` coral | `#6B5BFF` violeta | `#EDE8E1` | `#FFFFFF` | `#2A2520` |
| Botánico | `#5B7A3A` olivo | `#B85C2E` bermejo | `#EFE8D5` | `#F8F2DF` | `#2D3818` |
| Tea House | `#B91D1D` rojo | `#5C7A3C` matcha | `#F4EBDC` | `#FAF3E2` | `#1F1B16` |
| Mediterráneo | `#1B5E8C` azul | `#C9A24E` dorado | `#F4EFE6` | `#FCF8EE` | `#1B3A5C` |

Cada paleta tiene variante `-dark` con desaturación adecuada (no inversión naïve).

## Typography

- **Corporativo**: Inter (display + body + numeric). Letter-spacing -0.01em en display.
- **Clay y derivadas**: DM Serif Display (display + numeric, para que los números monetarios destaquen) + DM Sans (body). Letter-spacing -0.02em en display.

Tabular nums en columnas de cantidades (`.tabular-nums` o `font-variant-numeric: tabular-nums`).

Escala tipográfica habitual: 10 / 11 / 12 / 13 / 14 / 16 / 18 / 22 / 24 / 32 px. No flat — alta variación de peso entre niveles.

## Radii

| Token | Corporativo | Clay |
|---|---|---|
| `--radius-sm` | 6px | 12px |
| `--radius-md` | 10px | 18px |
| `--radius-lg` | 14px | 24px |
| `--radius-xl` | 18px | 32px |
| `--radius-2xl` | 24px | 40px |

Las paletas Clay son deliberadamente más redondeadas (lenguaje "bento orgánico"). Corporativo conserva los radios conservadores originales.

## Shadows

Multi-capa cálidas. En Clay las sombras tienen tinte hacia el marrón cálido del tema (`rgba(60, 40, 30, …)`); en dark son negros más profundos.

5 niveles: `--shadow-sm` (cards reposo) → `--shadow-2xl` (modals).

## Motion

- **Curva por defecto**: `cubic-bezier(0.34, 1.56, 0.64, 1)` — spring con overshoot ligero.
- **Curva soft**: `cubic-bezier(0.4, 0, 0.2, 1)` — para transiciones donde el spring es excesivo.
- **Duraciones**: 150ms (corporativo) / 180ms (Clay) base rápida; 250ms (corporativo) / 320ms (Clay) base normal; 400ms (corporativo) / 480ms (Clay) lenta.
- Botones: `scale(0.97)` al press; primarios además `translateY(-1px)` al hover.
- Inputs: focus ring de 4px del brand-light.

**Respeta `prefers-reduced-motion`** globalmente — todas las animaciones se reducen a 0.01ms.

Animaciones nombradas más usadas: `fade-up`, `scale-in`, `modal-emerge`, `skeleton-shimmer`, `toast-slide-in`, `empty-breathe`, `pill-pop`, `heatmap-pop`, `success-pop`, `tx-flash`.

## Components

Todos en `src/renderer/components/`.

- `TiltCard` — wrapper que setea CSS vars `--tilt-x/y` con cursor tracking; el consumidor las usa en su transform. `intensity` en grados (default 6).
- `Skeleton` + `skeletons/` — placeholders con shimmer. Componer skeletons específicos por pantalla.
- `EmptyState` — icon que respira + título + descripción + acción opcional.
- `Toast` — sistema de notificaciones con `useToast()`. Slide-in desde la derecha.
- `Tabs` — indicator deslizante con spring.
- `DateInput` / `Select` — popovers customs con animación emerge.
- `Modal` — overlay con backdrop-blur + panel pop-in spring. Confirm dirty state.
- `ThemeBackground` — fondo radial cálido fijo (Clay).

Charts (`components/charts/`):
- `ChartTooltip` / `ChartPieTooltip` — Tooltips Clay para Recharts con dot, sombra, blur, font display.
- `chartTokens.ts` — props compartidos: `CHART_GRID_PROPS`, `CHART_AXIS_PROPS`, `CHART_BAR_RADIUS`, `CHART_CURSOR_LINE/BAR`, `CHART_LEGEND_STYLE`.

Hooks (`hooks/`):
- `useDesignTheme` — paleta + modo, persiste en localStorage, auto-purga themes legacy.
- `useAnimatedNumber` — interpola valores monetarios con ease-out-cubic 600ms.
- `useModalOrigin` — captura punto de origen del click para escala desde ahí.
- `lib/transition.ts` — wrapper de View Transitions API con flushSync, respeta reduced-motion.

## Layout

- Sidebar: `w-14` mobile / `w-60` lg. Halo radial brand + accent en fondo.
- Main: `padding p-4 lg:p-6` dentro de la clase `.screen-content` (que también dispara stagger entry).
- Cards reposo: `rounded-xl bg-card border border-border shadow-sm p-5`.
- Cards principales (balance, hub tiles): `rounded-2xl shadow-md` y arriba.
- Espaciado vertical entre secciones: `space-y-4 lg:space-y-5` por defecto.

## Accessibility commitments

- Focus-visible ring siempre. Borde brand 1px + 4px brand-light.
- Iconos icon-only deben tener `aria-label`.
- Modal con escape route (botón cerrar + Esc).
- Tabs con `role="tablist"` + `aria-selected`.
- Todos los `prefers-reduced-motion` respetados.

## Anti-patterns prohibidos

- Side-stripe borders (border-left/right > 1px coloreado en list items).
- Gradient text (`background-clip: text`).
- Glassmorphism por defecto (solo en popovers/modals con propósito).
- Hero metric template (big number + small label + gradient accent).
- Tarjetas idénticas repetidas en grid (varía contenido y rol).
- Modal como primera opción (intentar inline primero).
- Em dashes (—) o `--` en copy.
