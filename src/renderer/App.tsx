import { useState } from 'react'
import { AppLayout } from './components/layout/AppLayout'
import { DashboardScreen } from './screens/DashboardScreen'
import { HomeScreen } from './screens/HomeScreen'
import { StatsScreen } from './screens/StatsScreen'
import { CalendarScreen } from './screens/CalendarScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { SavingsScreen } from './screens/SavingsScreen'
import { DebtsScreen } from './screens/DebtsScreen'
import { HubScreen } from './screens/HubScreen'
import { ShoppingScreen } from './screens/shopping/ShoppingScreen'

export default function App() {
  // Arrancamos en el Hub: el usuario elige a qué módulo entrar.
  const [activeModule, setActiveModule] = useState('hub')

  return (
    <AppLayout activeModule={activeModule} onNavigate={setActiveModule}>
      {activeModule === 'hub'       && <HubScreen onEnter={setActiveModule} />}
      {activeModule === 'dashboard' && <DashboardScreen />}
      {activeModule === 'expenses'  && <HomeScreen />}
      {activeModule === 'savings'   && <SavingsScreen />}
      {activeModule === 'debts'     && <DebtsScreen />}
      {activeModule === 'analytics' && <StatsScreen />}
      {activeModule === 'calendar'  && <CalendarScreen />}
      {activeModule === 'shopping'  && <ShoppingScreen />}
      {activeModule === 'settings'  && <SettingsScreen />}
    </AppLayout>
  )
}
