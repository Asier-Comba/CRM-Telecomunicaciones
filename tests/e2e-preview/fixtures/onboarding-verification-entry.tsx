import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import OnboardingPage from '../../../src/app/onboarding/page'
import { fixture } from './onboarding-verification-adapter'
const root = createRoot(document.getElementById('app')!)
fixture.unmount = () => root.unmount()
root.render(<><OnboardingPage /><Toaster /></>)
