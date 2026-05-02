import { useState } from 'react'
import { AppLayout } from './components/layout/AppLayout'
import { DashboardScreen } from './screens/DashboardScreen'
import { HomeScreen } from './screens/HomeScreen'
import { StatsScreen } from './screens/StatsScreen'
import { CalendarScreen } from './screens/CalendarScreen'
import { SettingsScreen } from './screens/SettingsScreen'

// HubScreen y HubParticles quedan como código legacy: no se enrutan desde
// aquí pero los archivos se mantienen por si en el futuro se reabre el
// concepto de "selector de módulos" en la entrada.

export default function App() {
  // Antes la entrada por defecto era 'hub'. Ahora arrancamos directamente
  // en el panel de Inicio del módulo Gastos.
  const [activeModule, setActiveModule] = useState('dashboard')

  return (
    <AppLayout activeModule={activeModule} onNavigate={setActiveModule}>
      {activeModule === 'dashboard' && <DashboardScreen />}
      {activeModule === 'expenses'  && <HomeScreen />}
      {activeModule === 'analytics' && <StatsScreen />}
      {activeModule === 'calendar'  && <CalendarScreen />}
      {activeModule === 'settings'  && <SettingsScreen />}
    </AppLayout>
  )
}
