/**
 * Ilustración SVG de cesta de la compra para los empty states del módulo
 * Compras. La clase `shop-basket-empty` (definida en globals.css) le aplica
 * un balanceo sutil de ±2° cada 4s — sensación de "cesta esperando"
 * sin distraer. Respeta prefers-reduced-motion automáticamente.
 *
 * El verde proviene de --shop-primary (heredado de --color-income), así que
 * la ilustración cambia con el tema. Los productos dentro tienen tonos
 * suaves para no robar protagonismo al CTA.
 */
export function ShoppingBasketIllustration() {
  return (
    <svg
      className="shop-basket-empty"
      width="180"
      height="180"
      viewBox="0 0 180 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Halo difuso de fondo */}
      <ellipse
        cx="90"
        cy="160"
        rx="62"
        ry="6"
        fill="var(--shop-primary)"
        opacity="0.08"
      />

      {/* Productos asomando por la cesta */}
      {/* Pan / barra (atrás-izquierda) */}
      <rect
        x="44"
        y="58"
        width="32"
        height="14"
        rx="6"
        fill="var(--shop-accent)"
        opacity="0.85"
      />
      <line x1="50" y1="65" x2="56" y2="65" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <line x1="60" y1="65" x2="66" y2="65" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />

      {/* Manzana (centro-atrás) */}
      <circle
        cx="90"
        cy="62"
        r="13"
        fill="var(--color-brand)"
        opacity="0.9"
      />
      <path
        d="M88 51 Q90 47 93 49"
        stroke="var(--color-brand-hover)"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.8"
      />
      <ellipse cx="86" cy="58" rx="3" ry="2" fill="white" opacity="0.4" />

      {/* Botella (derecha) */}
      <path
        d="M108 50 L108 56 Q108 58 110 58 L114 58 Q116 58 116 56 L116 50 Z"
        fill="var(--shop-primary)"
      />
      <rect
        x="106"
        y="57"
        width="12"
        height="22"
        rx="2"
        fill="var(--shop-primary)"
      />
      <rect x="108" y="63" width="8" height="6" rx="1" fill="white" opacity="0.45" />

      {/* Cesta (cuerpo) */}
      <path
        d="M30 80 L150 80 L138 138 Q137 144 131 144 L49 144 Q43 144 42 138 Z"
        fill="var(--shop-primary)"
        opacity="0.18"
      />
      <path
        d="M30 80 L150 80 L138 138 Q137 144 131 144 L49 144 Q43 144 42 138 Z"
        stroke="var(--shop-primary)"
        strokeWidth="3"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Líneas verticales de la cesta (textura mimbre) */}
      <line x1="60" y1="80" x2="58" y2="142" stroke="var(--shop-primary)" strokeWidth="1.5" opacity="0.4" strokeLinecap="round" />
      <line x1="80" y1="80" x2="79" y2="142" stroke="var(--shop-primary)" strokeWidth="1.5" opacity="0.4" strokeLinecap="round" />
      <line x1="100" y1="80" x2="101" y2="142" stroke="var(--shop-primary)" strokeWidth="1.5" opacity="0.4" strokeLinecap="round" />
      <line x1="120" y1="80" x2="122" y2="142" stroke="var(--shop-primary)" strokeWidth="1.5" opacity="0.4" strokeLinecap="round" />

      {/* Líneas horizontales (refuerzo) */}
      <line x1="36" y1="100" x2="144" y2="100" stroke="var(--shop-primary)" strokeWidth="1.5" opacity="0.35" strokeLinecap="round" />
      <line x1="40" y1="120" x2="140" y2="120" stroke="var(--shop-primary)" strokeWidth="1.5" opacity="0.35" strokeLinecap="round" />

      {/* Asas */}
      <path
        d="M55 80 Q55 50 90 50 Q125 50 125 80"
        stroke="var(--shop-primary)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />

      {/* Etiqueta de precio colgando del asa */}
      <g>
        <line x1="125" y1="50" x2="135" y2="60" stroke="var(--color-subtext)" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
        <path
          d="M133 56 L146 56 L150 64 L146 72 L133 72 Z"
          fill="var(--shop-accent)"
          opacity="0.95"
        />
        <circle cx="138" cy="64" r="1.5" fill="white" />
        <text
          x="142"
          y="67"
          fontFamily="var(--font-display)"
          fontSize="6"
          fontWeight="700"
          fill="white"
        >
          €
        </text>
      </g>

      {/* Brillo sutil arriba */}
      <ellipse
        cx="68"
        cy="86"
        rx="14"
        ry="3"
        fill="white"
        opacity="0.3"
      />
    </svg>
  )
}
