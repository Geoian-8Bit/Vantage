# Auditoría UI/UX — Vantage v0.4.0

**Fecha:** 2026-05-03
**Versión auditada:** 0.4.0 (commit `1cd371f`, branch `igiron_DeudasAhorros`)
**Rúbrica:** `DESIGN.md` + `PRODUCT.md` (la doc del proyecto, no heurísticas externas genéricas)
**Alcance:** 10 pantallas activas + Sidebar/AppLayout/PageHeader + componentes compartidos + tokens globales
**Método:** lectura estática del código fuente del renderer (no se ejecutó la app)
**Foco:** coherencia visual y design system · jerarquía y arquitectura de info · UX de flujos y microinteracciones

---

## 1. Resumen ejecutivo

### Estado general

**Vantage 0.4.0 está, en términos generales, en muy buen estado visual y de UI/UX.** El sistema de diseño "Soft Clay" está completamente tokenizado, las anti-patrones declarados se respetan casi al 100% (cero side-stripes, cero gradient-text, cero glassmorphism gratuito fuera de modal/popover), y la arquitectura de tokens cubre 5 paletas × 2 modos sin fragmentación. Los dos módulos nuevos (Ahorros y Deudas) entran sin romper la coherencia con el resto.

Lo que mejor funciona:
- **Tokenización**: cero hex hardcoded en componentes de dominio (transacciones, ahorros, deudas, calendario). Todo via CSS vars.
- **Tipografía monetaria**: `tabular-nums` aplicado consistentemente en cantidades — cumple "honestidad visual" de PRODUCT.md.
- **Motion global**: `globals.css:119-125` reduce todas las animaciones a 0.01ms cuando `prefers-reduced-motion: reduce`. La mayoría de componentes hereda esta protección.
- **Modal con dirty state**: confirmación de cierre solo si hay cambios pendientes. Robusto.
- **Animación de números** (`useAnimatedNumber`): interpola valores monetarios con ease-out-cubic 600ms. Sutil y profesional.
- **Empty states cuidados** en la mayoría de pantallas (componente `EmptyState` reutilizado).

Lo que más urge atender (top 8):

| # | Hallazgo | Sev | Dónde |
|---|---|---|---|
| 1 | Versión "v0.3.0" hardcodeada en pie de Sidebar (la app es 0.4.0) | ALTO | `Sidebar.tsx:366` |
| 2 | Anti-patrón "Hero metric template" en tarjeta de Patrimonio | ALTO | `DashboardScreen.tsx:43-76` |
| 3 | Botones del header de Movimientos sin press feedback (`active:scale`) | ALTO | `HomeScreen.tsx:388-457` |
| 4 | Em dashes (`—`) en copy visible — anti-patrón explícito en DESIGN.md:109 | ALTO | múltiples archivos |
| 5 | Hex hardcoded (`#1F1B1A`, `#FF7A59`...) en preview de modo claro/oscuro | MEDIO | `SettingsScreen.tsx:224-226` |
| 6 | Stroke-width inconsistente entre iconos outline y filled del Sidebar | MEDIO | `Sidebar.tsx:23-350` |
| 7 | `prefers-reduced-motion` no respetado en `TiltCard` (cursor tilt) y `clay-mesh-drift` | MEDIO | `TiltCard.tsx`, `globals.css:499` |
| 8 | `focus-visible` ausente en varios `<input type="number">` del simulador y modal de pago extra | MEDIO | `DebtsScreen.tsx:420-430`, `DebtSimulator.tsx:210,332` |

### Tabla resumen por severidad

| Severidad | Cantidad | Definición |
|---|---:|---|
| `[CRÍT]` | 0 | Rompe el sistema de diseño o un flujo principal |
| `[ALTO]` | 9 | Inconsistencia visible o fricción notable en UX |
| `[MEDIO]` | 14 | Pulido que un usuario atento notaría |
| `[BAJO]` | 18 | Detalle fino, "nice to have" |
| `[MEJORA]` | 6 | Oportunidad para elevar el listón |

**No hay hallazgos críticos.** El sistema está sano. Los 9 [ALTO] son refinamientos que, agrupados, tendrían un impacto perceptible.

---

## 2. Hallazgos transversales del design system

### 2.1 Versión desactualizada en pie de Sidebar

```
[ALTO] Sidebar muestra "Vantage v0.3.0" mientras la app es 0.4.0
- Dónde: src/renderer/components/layout/Sidebar.tsx:366
- Qué: <p className="text-[11px] text-sidebar-muted/70">Vantage v0.3.0</p>
- Por qué: Información incorrecta visible al usuario en cada pantalla.
  Rompe "honestidad visual" (PRODUCT.md:26) y la confianza del primer vistazo.
- Sugerencia: Leer la versión desde package.json en build-time (define en
  electron.vite.config.ts) o exponerla via app.getVersion() del main process.
  Quick fix: cambiar string a "Vantage v0.4.0".
```

### 2.2 Em dashes (`—`) en copy visible — anti-patrón explícito

DESIGN.md:109 prohíbe explícitamente em dashes y `--` en copy. Hay 11 instancias en código que el usuario ve.

```
[ALTO] Em dash en título de modal de pago extra de deudas
- Dónde: src/renderer/screens/DebtsScreen.tsx:400
- Qué: title={`Pago extra — ${extraTarget?.name ?? ''}`}
- Por qué: Anti-patrón DESIGN.md:109; aparece como título destacado de modal.
- Sugerencia: title={`Pago extra a ${extraTarget?.name}`} o usar ":" en su
  lugar.
```

```
[ALTO] Em dash usado como separador visual entre inputs de fecha
- Dónde: src/renderer/screens/HomeScreen.tsx:515; src/renderer/screens/StatsScreen.tsx:472,845
- Qué: <span className="text-subtext text-sm" aria-hidden="true">—</span>
- Por qué: Anti-patrón DESIGN.md:109; el flexbox gap ya separa visualmente.
- Sugerencia: Eliminar el span; aumentar `gap-2` → `gap-3` si hace falta más
  aire. Alternativa: usar la palabra "a" ("Desde X a Y") por coherencia con el
  tono español directo de PRODUCT.md.
```

```
[MEDIO] Em dashes en period labels y títulos de gráficos
- Dónde:
  - src/renderer/screens/HomeScreen.tsx:157  (`${customFrom} — ${customTo}`)
  - src/renderer/screens/StatsScreen.tsx:103,367,368
- Qué: Cadenas de texto que se renderizan en headers de filtros/gráficos.
- Por qué: Anti-patrón DESIGN.md:109.
- Sugerencia: Usar guion normal "-" o preposición ("a", "vs"). Ejemplo:
  `${customFrom} a ${customTo}`, `Comparativa: ${n} meses`,
  `Ingresos vs Gastos · ${periodLabel}`.
```

```
[MEDIO] Em dash usado como placeholder "sin valor" en tablas
- Dónde:
  - src/renderer/components/DebtForm.tsx:416
  - src/renderer/screens/RecurringScreen.tsx:26
  - src/renderer/screens/StatsScreen.tsx:671,834,873
- Qué: {value > 0 ? formatCurrency(value) : '—'} — el em dash hace de "n/a".
- Por qué: Anti-patrón DESIGN.md:109. Aunque el uso "em dash = vacío" es
  convención común en datasheets, la guía del proyecto no lo distingue.
- Sugerencia: Decidir explícitamente. Opciones:
  (a) Sustituir por "·" (mid-dot) o "-" (guion).
  (b) Relajar la regla en DESIGN.md añadiendo: "excepto como placeholder de
      celda vacía en tablas".
  Recomendado: (a) para no fragmentar la regla.
```

### 2.3 Hex hardcoded en componentes (excepto SVG geometry)

DESIGN.md:3 dice "nunca hex hardcoded". Hay 4 ubicaciones reales (excluyendo SVG path data).

```
[MEDIO] Hex hardcoded en preview de modo claro/oscuro de Settings
- Dónde: src/renderer/screens/SettingsScreen.tsx:224-226
- Qué:
    background: mode === 'dark' ? '#1F1B1A' : '#FFFFFF',
    color:      mode === 'dark' ? '#FFD580' : '#FF7A59',
- Por qué: Rompe la regla "nunca hex hardcoded en TSX" (DESIGN.md:3). Los
  previews quedarán igual aunque el usuario active otra paleta — pierde
  honestidad visual respecto a lo que realmente verá.
- Sugerencia: Definir 4 tokens dedicados (--preview-light-bg,
  --preview-light-icon, --preview-dark-bg, --preview-dark-icon) por paleta
  en globals.css; o leer del objeto `themes` del hook useDesignTheme.
```

```
[BAJO] Fallback hex en HubParticles.tsx
- Dónde: src/renderer/components/HubParticles.tsx:76
- Qué: rootStyle.getPropertyValue('--color-accent').trim() || '#C9A84C'
- Por qué: Es defensivo (si el var no existe), pero acopla un valor del tema
  Corporativo dentro de un componente neutro. HubScreen es legacy ya.
- Sugerencia: Eliminar el fallback (las CSS vars siempre están definidas en
  bootstrap del tema) o sustituir por `'currentColor'`.
```

```
[BAJO] rgba puro en sombras de Sidebar
- Dónde: src/renderer/components/layout/Sidebar.tsx:216,272
- Qué: 0 2px 6px rgba(0,0,0,0.18); drop-shadow(0 1px 2px rgba(0,0,0,0.25))
- Por qué: Las sombras del resto del sistema usan tokens (--shadow-sm,
  --shadow-md...). Estas son inline.
- Sugerencia: Extraer a tokens nuevos --sidebar-indicator-shadow y
  --sidebar-icon-glow, o reusar --shadow-sm.
```

### 2.4 Stroke-width inconsistente en iconos custom del Sidebar

```
[MEDIO] Iconos outline/filled del Sidebar usan strokeWidth dispar
- Dónde: src/renderer/components/layout/Sidebar.tsx:23-350 (47 iconos inline)
- Qué: Outline = 2 (consistente). Filled varía: 1.5 (Inicio, Ahorros, Deudas),
  2.6 (Movimientos), 2.8 (otros). Líneas internas dentro del filled mezclan
  2 y 2.5.
- Por qué: Ruptura visual leve entre iconos — el de "Movimientos" se ve más
  pesado que el de "Inicio" cuando ambos están activos.
- Sugerencia: Estándar único: outline = 2 / filled = 1.5 (con detalles internos
  contrastados a 2). Documentarlo en DESIGN.md sección "Iconografía".
```

### 2.5 `prefers-reduced-motion` no respetado en componentes específicos

El CSS global cubre las animaciones declaradas en stylesheet, pero hay animaciones impulsadas por JS o `requestAnimationFrame` que no se enteran.

```
[MEDIO] TiltCard sigue trackeando el cursor con reduced-motion activo
- Dónde: src/renderer/components/TiltCard.tsx (cursor tracking + RAF loop)
- Qué: El componente actualiza --tilt-x/--tilt-y con cada movimiento del
  ratón. La transform asociada en CSS sí se neutraliza por la regla global,
  pero el listener y los re-renders de las CSS vars siguen ocurriendo.
- Por qué: DESIGN.md:58 — debe respetarse globalmente; el coste no es solo
  visual, también es CPU.
- Sugerencia: En TiltCard, leer matchMedia('(prefers-reduced-motion: reduce)')
  y, si true, no instalar el listener (return early).
```

```
[MEDIO] Animación clay-mesh-drift puede no neutralizarse por la regla global
- Dónde: src/renderer/styles/globals.css:499 (90s loop) + 119-125 (regla global)
- Qué: La regla global `* { animation-duration: 0.01ms !important; }` debería
  cubrir esto, pero por safety conviene envolver explícitamente.
- Por qué: Es la animación de fondo más costosa de la app (3 blobs radiales
  animados con @property).
- Sugerencia: Envolver el `animation:` en `@media (prefers-reduced-motion:
  no-preference)` o dar a la animación duración estática (sin loop) cuando se
  detecte reduced-motion via JS.
```

### 2.6 Anti-patrones declarados — verificación sistemática

| Anti-patrón (DESIGN.md:101-110) | Resultado |
|---|---|
| Side-stripe `border-l-4` / `border-r-4` coloreado | ✅ No detectado |
| Gradient text (`bg-clip-text`) | ✅ No detectado |
| Glassmorphism por defecto fuera de Modal/Popover | ⚠️ Ver hallazgo 2.7 |
| Hero metric template (número gigante + label + accent) | ⚠️ Ver hallazgo en `DashboardScreen` |
| Tarjetas idénticas en grid sin variación | ⚠️ Ver hallazgo en `DashboardScreen` |
| Modal como primera opción | ✅ Mayoritariamente inline (calendar quick-create es modal pero secundario) |
| Em dashes en copy | ❌ 11 instancias (ver §2.2) |

```
[MEDIO] Glassmorphism aplicado a previews de paleta en Settings
- Dónde: src/renderer/screens/SettingsScreen.tsx:304 (palette preview cards)
- Qué: Las cards de selección de paleta usan backdrop-filter blur sin propósito
  funcional (no hay overlay debajo).
- Por qué: DESIGN.md:105 — solo en popovers/modals con propósito.
- Sugerencia: Quitar el backdrop-filter; mantener la sombra y radio para
  diferenciar.
```

### 2.7 Tokens y CSS global

```
[MEJORA] Tokens duplicados entre paletas (radii, durations, easings)
- Dónde: src/renderer/styles/globals.css:39, 146, 177, 215, ...
- Qué: --radius-sm, --duration-base, --ease-spring se redefinen en cada paleta
  aunque los valores son idénticos en muchas combinaciones.
- Por qué: Mantenibilidad. Un cambio global obliga a editar 5 sitios.
- Sugerencia: Mantener en :root (block @theme) los tokens que NO varían entre
  paletas; en cada [data-theme] solo override de los que sí cambian (radii
  Corporativo vs Clay, duraciones Corporativo vs Clay, fonts).
```

```
[BAJO] Selection con caret-color no protegido contra paletas con bajo contraste
- Dónde: src/renderer/styles/globals.css:88-95
- Qué: ::selection usa --color-brand-light + --color-text. En algunos temas
  oscuros este combo puede tener contraste pobre.
- Sugerencia: Validar visualmente en los 10 temas (5 paletas × 2 modos).
  Documentar en DESIGN.md cuál es el contraste mínimo aceptable para selection.
```

### 2.8 Sidebar y AppLayout — observaciones puntuales

```
[BAJO] focus-visible del sidebar usa outline-offset negativo
- Dónde: src/renderer/styles/globals.css:611-614
- Qué: .sidebar-nav-item:focus-visible { outline-offset: -2px; }
- Por qué: Mete el ring dentro del elemento, lo que con border-radius redondo
  oculta parcialmente el ring.
- Sugerencia: Cambiar a outline-offset: 2px y usar box-shadow inset -2px
  brand-light para evitar overflow visual.
```

```
[BAJO] AppLayout pierde scroll position al cambiar de módulo
- Dónde: src/renderer/components/layout/AppLayout.tsx:35
- Qué: <div key={activeModule}> fuerza remount, lo que resetea estado pero no
  scroll. Si el usuario vuelve a una pantalla, scroll está arriba pero las
  stagger animations ya han ocurrido (porque el key es nuevo).
- Por qué: Pulido — el remount es intencional para disparar animations, pero el
  efecto del scroll-reset es implícito.
- Sugerencia: Aceptable. Documentar el comportamiento. Si molesta, persistir
  scroll position por módulo en un Map<string, number>.
```

### 2.9 Componentes compartidos — observaciones

```
[BAJO] Toast no muestra progreso visual hacia su auto-dismiss
- Dónde: src/renderer/components/Toast.tsx (auto-dismiss 4s)
- Qué: El usuario no sabe cuánto le queda al toast antes de desaparecer.
- Por qué: Microinteracción — feedback de tiempo en acciones secundarias.
- Sugerencia: Añadir una barra inferior que se contrae linealmente durante los
  4s. Usar var(--color-brand) y respetar reduced-motion.
```

```
[MEJORA] EmptyState usa style inline para color brand
- Dónde: src/renderer/components/EmptyState.tsx:26,33,37
- Qué: style={{ background: 'var(--color-brand-light)', color:
  'var(--color-brand)' }} — funciona, pero la mayoría de la app usa clases.
- Por qué: Coherencia interna del estilo.
- Sugerencia: bg-brand-light text-brand (clases Tailwind). Cero efecto visual,
  pero menos "modos de hacer lo mismo".
```

---

## 3. Hallazgos por pantalla

### 3.1 DashboardScreen (Inicio)

**Propósito**: Panel agregado — patrimonio, balance líquido, ahorros, gastos del mes, top categoría, próximos recurrentes, gráfico mensual.

```
[ALTO] La tarjeta de Patrimonio cumple el patrón "Hero metric template"
- Dónde: src/renderer/screens/DashboardScreen.tsx:43-76
- Qué: Número grande (clamp 1.5–2rem) + label pequeño en uppercase + dos sub-
  métricas iguales abajo. Es exactamente el patrón vetado en DESIGN.md:106.
- Por qué: Anti-patrón explícito. Además: la jerarquía visual aplasta la
  importancia relativa entre Patrimonio, Balance líquido y Ahorrado — los tres
  son "vistas del mismo dinero" según el comentario, pero el primero domina
  visualmente.
- Sugerencia: Rediseñar a un patrón de 3 columnas iguales (Patrimonio · Balance ·
  Ahorrado) con tipografía equivalente, separadores sutiles y subraya solo el
  primero con un acento de color (no de tamaño). Alternativamente, alternar el
  rol "principal" según el contexto (mes, semana, etc.).
```

```
[MEDIO] Stat cards row repite el patrón "tarjetas iguales en grid"
- Dónde: src/renderer/screens/DashboardScreen.tsx:78-... (lg:grid-cols-2)
- Qué: Dos cards "Gastos del mes" y "Top categoría" con misma estructura,
  mismas medidas, mismo peso visual.
- Por qué: DESIGN.md:107 — "Tarjetas idénticas repetidas en grid (varía
  contenido y rol)".
- Sugerencia: Diferenciar el rol: la card de Gastos del mes podría ser "wide"
  con un sparkline embebido; la de Top categoría podría ser un chip + barra
  horizontal. La asimetría comunica que son cosas distintas.
```

```
[BAJO] Recurrentes en Dashboard no usa EmptyState canónico
- Dónde: src/renderer/screens/DashboardScreen.tsx:187-189
- Qué: Cuando no hay recurrentes, renderiza un texto en italic. El componente
  EmptyState está disponible y se usa en otras pantallas.
- Por qué: Consistencia interna entre pantallas similares.
- Sugerencia: Sustituir por <EmptyState icon=... title="Sin recurrentes
  próximos" description="Crea uno desde Movimientos." size="sm" />.
```

### 3.2 HomeScreen (Movimientos)

**Propósito**: La pantalla más usada — captura, filtrado y exportación de transacciones. PRODUCT.md:24 hace énfasis en que esto debe sentirse fluido.

```
[ALTO] Botones del header de acciones sin press feedback
- Dónde: src/renderer/screens/HomeScreen.tsx:388-457
- Qué: Los 5 botones (Rollover, Eliminar filtrados, Exportar, Gasto, Ingreso)
  llevan hover, pero no `active:scale(0.97)`. Los primarios (Gasto/Ingreso)
  además no tienen `hover:translate-y-[-1px]`.
- Por qué: DESIGN.md:55 lo establece como compromiso del sistema. Esta es la
  pantalla de captura — la que más necesita feedback inmediato (PRODUCT.md:24).
- Sugerencia: Añadir clase utility `.btn-feedback { transition:
  transform var(--duration-fast) var(--ease-soft); }` con `:active { transform:
  scale(0.97); }` y aplicar a todos. Para primarios, también
  `:hover { transform: translateY(-1px); }`.
```

```
[MEDIO] TransactionForm — sin feedback visual de validación inline en cantidad
- Dónde: src/renderer/screens/HomeScreen.tsx:704-720; TransactionForm.tsx
- Qué: Al introducir una cantidad inválida, el botón se desactiva sin que el
  input cambie de color o muestre mensaje. La razón ("blockReason") existe
  pero no se renderiza junto al campo.
- Por qué: Velocidad de captura (PRODUCT.md:24). Si el usuario no entiende por
  qué el botón está deshabilitado, pierde tiempo.
- Sugerencia: Cuando amount.length > 0 && !valid, sustituir el ring de focus
  brand por error-light, y mostrar `blockReason` debajo del input en
  text-error text-xs.
```

```
[MEDIO] Bulk delete: botón "Eliminar X" en proceso solo cambia spinner, no aspecto
- Dónde: src/renderer/screens/HomeScreen.tsx:835
- Qué: Mientras `bulkDeleting` es true, el botón mantiene color/contraste; solo
  añade spinner. Es ambiguo: ¿se puede volver a clickear?
- Sugerencia: opacity: 0.6 + cursor: wait + pointer-events: none mientras
  bulkDeleting. Mejor aún: deshabilitar también con `disabled` y dejar que el
  CSS global lo aplane.
```

```
[BAJO] Badge de método de pago siempre con color "income" en transacciones de gasto
- Dónde: src/renderer/components/TransactionList.tsx:185-186
- Qué: bg-income-light text-income aplicado al badge incluso cuando la
  transacción es expense. Sugiere "ingreso" donde es gasto.
- Sugerencia: Neutro: bg-surface text-subtext border border-border, o
  condicional al tipo. No usar el color income para metadatos de gastos.
```

```
[BAJO] BalanceSummary: carryover negativo no destaca con fondo
- Dónde: src/renderer/components/BalanceSummary.tsx:95
- Qué: El número se vuelve text-expense pero el contenedor sigue bg-surface.
  Otras tarjetas income/expense sí tienen fondo tintado.
- Sugerencia: Cuando carryover < 0, fondo bg-expense-light/40 con borde
  border-expense/20. Coherencia interna.
```

```
[BAJO] Toggle "ver todo / ver paginado" sin label visible
- Dónde: src/renderer/screens/HomeScreen.tsx:628-642
- Qué: Solo icono. Tiene title; falta aria-label para accesibilidad robusta.
- Sugerencia: Añadir aria-label dinámico según estado.
```

### 3.3 SavingsScreen (Apartados de ahorro)

**Propósito**: Apartados con metas, progreso visual.

```
[BAJO] Toggle "Establecer meta" sin transición del thumb
- Dónde: src/renderer/components/SavingsAccountForm.tsx:184-195
- Qué: El thumb del toggle cambia posición sin transition-transform.
- Por qué: Microinteracción esperada por el sistema (DESIGN.md:55).
- Sugerencia: Añadir `transition: transform var(--duration-fast) var(--ease-spring)`
  al thumb.
```

```
[MEJORA] Sin hallazgos materiales — la pantalla está sólida
- Las cards de apartado varían su contenido (con/sin meta), evitando el
  patrón de "tarjetas idénticas en grid". Coherente con DESIGN.md:107.
- Slots de color (--savings-1..8) usados correctamente.
- Tipografía con tabular-nums. Estados loading/empty cubiertos.
```

### 3.4 DebtsScreen (Deudas amortizables y simulador)

**Propósito**: Deudas con cuota recurrente, pagos extra, simulador integrado.

```
[ALTO] Em dash en título de modal (cubierto en §2.2)
- Dónde: src/renderer/screens/DebtsScreen.tsx:400
```

```
[MEDIO] Inputs <input type="number"> sin focus-visible ring en modal de pago extra
- Dónde: src/renderer/screens/DebtsScreen.tsx:420-430
- Qué: focus:outline-none sin reemplazar por focus:ring-2 focus:ring-brand.
- Por qué: DESIGN.md:95 — focus-visible siempre. Bloquea navegación por teclado.
- Sugerencia: focus:outline-none focus:ring-2 focus:ring-brand
  focus:border-transparent. Aplicar al input de Importe y al textarea Nota.
```

```
[MEDIO] DebtSimulator: mismos inputs sin focus ring
- Dónde: src/renderer/components/DebtSimulator.tsx:210,332
- Qué: Inputs de capital y de "importe libre" igual.
- Sugerencia: Misma utility class compartida.
```

```
[MEDIO] DebtSimulator: animaciones inline sin protección reduced-motion
- Dónde: src/renderer/components/DebtSimulator.tsx:284,370-396,444
- Qué: style={{ animation: 'fade-up ...' }} y transitions inline.
- Por qué: Aunque la regla global de globals.css:119-125 pisa la
  animation-duration, las transitions inline pueden ser más resistentes.
- Sugerencia: Convertir las animaciones inline a clases CSS (.simulator-fade-up,
  .simulator-row-transition) para que la regla global las aplane sin ambigüedad.
```

```
[BAJO] DebtCard: color income para deudas saldadas
- Dónde: src/renderer/components/DebtCard.tsx:34-38
- Qué: Sombra + barra superior se vuelven --color-income al saldar.
- Por qué: Income está semánticamente vinculado a "ingreso", no a "completado".
  Los ahorros completados (meta alcanzada) deberían usar el mismo color para
  ser coherentes.
- Sugerencia: Verificar que ahorros con meta cumplida también usan
  --color-income. Si no, documentar en DESIGN.md que income == "estado
  positivo final" más allá de su semántica financiera.
```

### 3.5 CalendarScreen

**Propósito**: Vista mensual de movimientos.

```
[BAJO] Animación de slide al cambiar mes no protegida por reduced-motion
- Dónde: src/renderer/screens/CalendarScreen.tsx:152-156
- Qué: Aplica clase cal-slide-left/right via JS sin chequear matchMedia.
- Sugerencia: Si la clase es CSS, la regla global la cubre. Verificar que el
  keyframe está nombrado y por tanto se aplana. Si no, leer matchMedia y
  saltar la clase cuando reduced-motion.
```

```
[BAJO] Selected day detail aparece sin transición de entrada
- Dónde: src/renderer/screens/CalendarScreen.tsx:207-252
- Qué: El panel inferior cambia de contenido al click sin animar.
- Por qué: Inconsistente con el principio "inmersivo, suave" (PRODUCT.md:25).
- Sugerencia: animation: fade-up var(--duration-base) var(--ease-spring) both;
  con key={selectedDate} para que se redispare.
```

```
[MEJORA] Indicador de "hoy" solo color de fondo
- Dónde: src/renderer/screens/CalendarScreen.tsx:172-175
- Qué: Círculo bg-brand text-white. Funcional. Podría sumar un pulso muy
  sutil (0.5s una sola vez al abrir el calendario).
- Sugerencia: Pulso opcional, animation: today-pulse 600ms ease-out 1; con
  protección reduced-motion. No imprescindible.
```

### 3.6 RecurringScreen

**Propósito**: Gestión de plantillas recurrentes.

```
[ALTO] Eliminar recurrente sin diálogo de confirmación
- Dónde: src/renderer/screens/RecurringScreen.tsx:48-57
- Qué: Botón delete (visible en hover) llama directo a handleDelete que invoca
  window.api.recurring.delete(id) sin confirmar.
- Por qué: Acción destructiva sin ruta de recuperación. Heurística estándar.
- Sugerencia: Envolver en Modal de confirmación (Modal ya existe y es robusto).
  Mensaje: "¿Eliminar la plantilla «{nombre}»? Las transacciones ya generadas
  se mantienen."
```

```
[MEDIO] Empty state con copy poco directo
- Dónde: src/renderer/screens/RecurringScreen.tsx:119-125
- Qué: "Activa «Repetir automáticamente» al crear un nuevo movimiento" — pasivo
  y deja al usuario adivinar dónde.
- Por qué: PRODUCT.md:30-35 — tono español directo, verbos activos, sin
  ambigüedad.
- Sugerencia: "Crea una plantilla recurrente desde Movimientos marcando
  «Repetir automáticamente» al añadir un gasto o ingreso."
```

```
[BAJO] Toggle activo/inactivo sin estado de carga ni manejo visual de error
- Dónde: src/renderer/screens/RecurringScreen.tsx:44-46
- Qué: El switch cambia inmediatamente; si la llamada API falla, no hay
  feedback ni rollback visual.
- Sugerencia: Estado togglingIds: Set<string> en padre, mostrar opacidad
  reducida + spinner mientras se persiste. Toast.error en catch.
```

```
[BAJO] No hay RecurringSkeleton; solo "Cargando…"
- Dónde: src/renderer/screens/RecurringScreen.tsx:113-114
- Qué: Otras pantallas tienen skeletons cuidadosos; aquí texto plano.
- Sugerencia: Crear RecurringSkeleton.tsx (2 columnas, 3 placeholder rows
  cada una). Sigue el patrón de DashboardSkeleton/HomeSkeleton.
```

### 3.7 StatsScreen (Analítica)

**Propósito**: Tendencias, distribución por categoría.

```
[ALTO] Em dashes múltiples en títulos de gráficos y rangos (cubierto en §2.2)
- Dónde: src/renderer/screens/StatsScreen.tsx:103,367,368,472,845
```

```
[MEDIO] Em dashes "—" como placeholder vacío en filas de tabla
- Dónde: src/renderer/screens/StatsScreen.tsx:671,834,873
- Qué: Patrón "valor o em-dash si vacío". Cubierto en §2.2.
```

```
[MEJORA] Considerar tooltips de gráfico con explicación contextual
- Dónde: src/renderer/components/charts/ChartTheme.tsx
- Qué: Los tooltips muestran valor, no contexto (% del total, comparación con
  mes anterior, etc.).
- Sugerencia: Para barras de "Ingresos vs Gastos", añadir % vs mes previo bajo
  el valor. Honestidad visual elevada.
```

### 3.8 SettingsScreen (Configuración)

**Propósito**: Tema, divisa, BBDD, sobre.

```
[MEDIO] Hex hardcoded en preview de modo claro/oscuro (cubierto en §2.3)
- Dónde: src/renderer/screens/SettingsScreen.tsx:224,226
```

```
[MEDIO] Glassmorphism gratuito en preview de paletas (cubierto en §2.6)
- Dónde: src/renderer/screens/SettingsScreen.tsx:304
```

```
[BAJO] Sin confirmación tras cambiar tema/modo
- Dónde: src/renderer/screens/SettingsScreen.tsx:166-334
- Qué: El cambio es inmediato (correcto) pero no hay confirmación
  micro-textual ni toast. El "ripple" comunica click pero no persistencia.
- Por qué: PRODUCT.md:22 — local-first inviolable; el usuario debe sentir que
  se guarda.
- Sugerencia: Toast.success("Tema guardado") muy breve, o un checkmark efímero
  en la card seleccionada (success-pop animation ya existe en globals).
```

### 3.9 ImportScreen (Wizard Excel/Access)

**Propósito**: Importar desde Excel y mdb antiguos.

```
[ALTO] Errores de importación genéricos sin guiar al usuario
- Dónde: src/renderer/screens/ImportScreen.tsx:519,535,552-554
- Qué: "No se pudo leer el archivo. Comprueba que no esté dañado ni abierto en
  otro programa." — correcto pero no diferencia entre causas (sin tablas,
  sin encabezados, formato no soportado, etc.).
- Por qué: PRODUCT.md:18 — el usuario migra de hojas o Access; los errores son
  el momento más frágil de la onboarding. Tono español directo (PRODUCT.md:30).
- Sugerencia: Capturar tipo de error en cada catch y elegir mensaje:
  - Access sin tablas: "El archivo no contiene tablas. Asegúrate de exportar
    el .mdb completo."
  - Excel sin headers: "La primera fila no tiene encabezados. Edita el Excel y
    pon nombres a las columnas."
  - Genérico: el actual.
```

```
[MEDIO] Mapping de columnas: campos requeridos vs opcionales no diferenciados
- Dónde: src/renderer/screens/ImportScreen.tsx:235-241
- Qué: Asterisco (*) en label, pero contraste débil. Descripción opcional luce
  igual.
- Sugerencia: text-error en el asterisco; subrayado punteado en label de
  campos requeridos.
```

```
[BAJO] StepIndicator se aprieta en pantallas estrechas
- Dónde: src/renderer/screens/ImportScreen.tsx:67-104
- Qué: gap-3 y w-6 conectores en mobile pueden quedar estrechos.
- Sugerencia: gap-1.5 en mobile, flex-wrap como fallback.
```

### 3.10 BackupScreen

**Propósito**: Copias de seguridad — exportar/importar.

```
[ALTO] Falta comunicar dónde se guarda la copia ANTES de la operación
- Dónde: src/renderer/screens/BackupScreen.tsx:16-30
- Qué: El usuario aprieta "Exportar" sin saber dónde irá el archivo. Tras la
  operación el toast muestra path, pero el momento de la confianza es ANTES.
- Por qué: PRODUCT.md:22 — local-first inviolable. La sensación de control
  sobre los datos es el principio rector del producto.
- Sugerencia: Línea bajo el botón: "Se abrirá un diálogo para que elijas dónde
  guardar el .db" (si se usa save-dialog) o "Se guardará en
  ~/Documentos/Vantage/backups/" (si la ruta es fija). Tras la operación, el
  toast incluye la ruta y un botón "Abrir carpeta" si Electron expone
  shell.showItemInFolder.
```

```
[MEDIO] Botón Restaurar usa color expense (gastos)
- Dónde: src/renderer/screens/BackupScreen.tsx:142
- Qué: bg-expense para una acción intencional. Reusa semántica de "gasto" para
  "destructivo".
- Por qué: Confunde la lectura del color en otras partes de la app.
- Sugerencia: Definir token --color-destructive (puede coincidir o no con
  expense, pero conceptualmente separado). Ej: bg-error hover:bg-error-hover
  reutilizando los tokens existentes de error.
```

---

## 4. Quick wins (≤30 min cada uno)

Ordenados por impacto/esfuerzo. Empieza por arriba.

| Acción | Archivo:línea | Beneficio |
|---|---|---|
| Cambiar `Vantage v0.3.0` → `Vantage v0.4.0` (o leer de package.json) | `Sidebar.tsx:366` | Honestidad visual inmediata |
| Reemplazar el em dash del título del modal de pago extra | `DebtsScreen.tsx:400` | Cumple anti-patrón en pantalla destacada |
| Quitar los `<span>—</span>` decorativos entre fechas | `HomeScreen.tsx:515`, `StatsScreen.tsx:472,845` | Cumple anti-patrón sin perder claridad |
| Sustituir em dashes en period labels por `a` o `·` | `HomeScreen.tsx:157`, `StatsScreen.tsx:103,367,368` | Anti-patrón |
| Añadir `active:scale-[0.97]` a los 5 botones del header de Movimientos | `HomeScreen.tsx:388-457` | Press feedback en la pantalla más usada |
| Añadir `focus:ring-2 focus:ring-brand` a inputs `number` del simulador y modal de pago extra | `DebtsScreen.tsx:420-430`, `DebtSimulator.tsx:210,332` | Accesibilidad teclado |
| Quitar `backdrop-filter: blur` de las preview cards de paleta | `SettingsScreen.tsx:304` | Cumple anti-patrón glassmorphism |
| Sustituir texto italic vacío en Dashboard por `<EmptyState size="sm">` | `DashboardScreen.tsx:187-189` | Coherencia interna |
| Confirmación en delete recurrente (envolver en Modal) | `RecurringScreen.tsx:48-57` | Evita pérdida accidental |
| Reemplazar texto "Cargando…" por `RecurringSkeleton` | `RecurringScreen.tsx:113-114` | Coherencia con resto de pantallas |

---

## 5. Lo que está MUY bien

Refuerzo positivo — patrones a preservar y replicar:

1. **Tokenización al 99%** — solo 4 hex hardcoded en toda la app, todos en contexto razonable (preview de modo, fallback defensivo, sombras monocromáticas).
2. **`useAnimatedNumber`** — interpolación de valores monetarios con ease-out-cubic 600ms. Sutil y emocional sin caer en cliché.
3. **`Modal` con `dirty` state** — confirmación de cierre solo si hay cambios. Profesional.
4. **`TiltCard` con CSS vars** — separa "tracking de cursor" (JS) de "transformación" (CSS) usando custom properties. Patrón limpio que evita re-renders.
5. **Tipografía DM Serif Display en cantidades monetarias** — eleva el tono sin ser pretencioso. Coherente con "honestidad visual" + "no cliché de fintech".
6. **Anti-patrón "side-stripe" totalmente ausente** — la temptación de marcar list items con borde lateral coloreado es alta y la app la resiste.
7. **`prefers-reduced-motion` implementado a nivel global** — `globals.css:119-125` neutraliza casi todo. Solo faltan algunos componentes JS-driven (TiltCard, mesh-drift).
8. **`HubParticles` respeta reduced-motion explícitamente** — buen ejemplo a copiar para componentes Canvas/JS.
9. **Tono español directo y humano** — copy mayoritariamente cumple PRODUCT.md:30-35. "Sin movimientos este día", "Cambia el periodo o registra movimientos para ver la evolución" — modélicos.
10. **Tabs con indicador deslizante** — microinteracción profesional con spring; el detalle de no animar el primer render evita el "salto" inicial.

---

## 6. Apéndice — Rúbrica usada

Para que puedas reproducir o discutir la calibración:

**Severidades**
- `[CRÍT]` — Rompe el sistema de diseño (regla muy explícita violada masivamente) o un flujo principal (no se puede registrar gasto, sidebar inutilizable, etc.). En esta auditoría: 0.
- `[ALTO]` — Inconsistencia visible en la primera mirada del usuario, o fricción notable en un flujo común. Anti-patrón explícito de DESIGN.md violado en pantalla principal.
- `[MEDIO]` — Pulido que un usuario atento notaría. Anti-patrón en pantalla secundaria. Microinteracción ausente donde el sistema la promete.
- `[BAJO]` — Detalle fino. Inconsistencia que solo se ve al comparar dos pantallas adyacentes.
- `[MEJORA]` — No es fallo. Oportunidad para elevar el listón.

**Fuentes de verdad**
- `DESIGN.md` (110 líneas) — sistema completo de tokens, motion, anti-patrones.
- `PRODUCT.md` (68 líneas) — principios estratégicos, tono, anti-referencias.
- Heurísticas estándar aplicadas selectivamente: jerarquía, estados completos, feedback inmediato, consistencia interna.

**Lo que NO se auditó (acordado)**
- Accesibilidad detallada (WCAG, contraste por par, lectores de pantalla). Solo se reportaron casos obvios.
- Copy en profundidad (revisión palabra por palabra). Solo se reportaron casos que rompen tono o anti-patrones explícitos.
- Performance / bundle size / arquitectura de componentes.
- Dark mode test cruzado en las 5 paletas (sí se verificó la tokenización; no se simuló cada combinación).

---

## 7. Próximo paso sugerido

1. **Lees el informe de arriba a abajo** (15-20 minutos).
2. **Marcas los hallazgos con los que no estés de acuerdo** — los retiramos sin discusión.
3. **Decides el orden de ataque**: lo más rentable es la sección §4 (quick wins) — 10 fixes en una tarde dejan la app notablemente más pulida.
4. **En una conversación posterior** se ejecutan los fixes en bloques (por ejemplo: "ataquemos los 4 hallazgos de em dashes y la versión del sidebar"; o "todos los press feedback faltantes").

— Auditoría producida por Claude Code en modo plan + ejecución, lectura estática del código en `igiron_DeudasAhorros @ 1cd371f`.
