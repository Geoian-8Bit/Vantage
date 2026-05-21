import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ToastProvider } from './components/Toast'
import './styles/globals.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>
)

// Hacer fade out del splash screen una vez React ha montado el primer frame
requestAnimationFrame(() => {
  // Damos un mínimo de 700ms al splash para que se aprecien las animaciones
  setTimeout(() => {
    const splash = document.getElementById('vantage-splash')
    if (splash) {
      splash.classList.add('fade-out')
      // Quitarlo del DOM cuando termine la transition (420ms)
      setTimeout(() => splash.remove(), 500)
    }
  }, 700)
})
