import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App from './App'
import { initAnalytics } from './lib/analytics'
import './index.css'

// UX-015: analytics de produto (opt-in). Sem VITE_POSTHOG_KEY vira no-op —
// nenhum script é carregado e nenhum evento sai do dispositivo. Guard de
// double-init dentro do próprio módulo.
initAnalytics()

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '100874517602-9kjnm8s42j2780albl1eime7dcpqmlpv.apps.googleusercontent.com'

const router = createBrowserRouter([
  { path: '*', element: <App /> },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <RouterProvider router={router} />
    </GoogleOAuthProvider>
  </StrictMode>,
)
