import { useState } from 'react'
import { AppLayout } from './components/layout/AppLayout'
import { HomeScreen } from './screens/HomeScreen'

export default function App() {
  const [activeModule, setActiveModule] = useState('expenses')

  return (
    <AppLayout activeModule={activeModule} onNavigate={setActiveModule}>
      {activeModule === 'expenses' && <HomeScreen />}
    </AppLayout>
  )
}
