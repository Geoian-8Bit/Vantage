import { useState } from 'react'
import { AppLayout } from './components/layout/AppLayout'
import { DashboardScreen } from './screens/DashboardScreen'
import { HomeScreen } from './screens/HomeScreen'
import { StatsScreen } from './screens/StatsScreen'
import { CalendarScreen } from './screens/CalendarScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { HubScreen } from './screens/HubScreen'

export default function App() {
  const [activeModule, setActiveModule] = useState('hub')

  if (activeModule === 'hub') {
    return (
      <AppLayout activeModule={activeModule} onNavigate={setActiveModule}>
        <HubScreen onEnter={setActiveModule} />
      </AppLayout>
    )
  }

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
