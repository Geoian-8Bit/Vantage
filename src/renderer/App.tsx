import { useState } from 'react'
import { AppLayout } from './components/layout/AppLayout'
import { HomeScreen } from './screens/HomeScreen'
import { StatsScreen } from './screens/StatsScreen'
import { SettingsScreen } from './screens/SettingsScreen'

export default function App() {
  const [activeModule, setActiveModule] = useState('expenses')

  return (
    <AppLayout activeModule={activeModule} onNavigate={setActiveModule}>
      {activeModule === 'expenses'  && <HomeScreen />}
      {activeModule === 'analytics' && <StatsScreen />}
      {activeModule === 'settings'  && <SettingsScreen />}
    </AppLayout>
  )
}
