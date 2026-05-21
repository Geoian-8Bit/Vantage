/**
 * Script inline que aplica el tema desde localStorage ANTES de que React monte.
 * Evita el "flash of unstyled / wrong theme" típico cuando el usuario tiene
 * un tema dark guardado pero la página se renderiza con el default light.
 *
 * Va en <head> dentro del RootLayout. Se ejecuta una vez por carga.
 */
export function ThemeBootstrap() {
  const script = `(function(){try{var t=localStorage.getItem('vantage-theme');if(t&&/^(corporativo|clay(?:-(?:botanical|tea|mediterranean))?)-(light|dark)$/.test(t)){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`
  return <script dangerouslySetInnerHTML={{ __html: script }} />
}
