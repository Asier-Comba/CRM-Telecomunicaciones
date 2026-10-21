import { createRoot } from 'react-dom/client'
import { useState } from 'react'
import { Toaster } from 'sonner'
import OnboardingPage from '../../../src/app/onboarding/page'
import { fixture } from './onboarding-verification-adapter'
const root = createRoot(document.getElementById('app')!)
fixture.unmount = () => root.unmount()
function App() {
  const [visible, setVisible] = useState(true)
  fixture.leave = () => setVisible(false)
  return <>{visible ? <OnboardingPage /> : <p role="status">Otra pantalla sintética</p>}<Toaster /></>
}
root.render(<App />)
