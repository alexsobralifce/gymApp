import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import '@fontsource-variable/dm-sans/index.css'
import '@fontsource/barlow-condensed/latin-400.css'
import '@fontsource/barlow-condensed/latin-600.css'
import '@fontsource/barlow-condensed/latin-700.css'
import '@fontsource/barlow-condensed/latin-800.css'
import '@fontsource/barlow-condensed/latin-900.css'
import App from './App'
import ErroApp from './components/ErroApp'
import { initAnalytics } from './lib/analytics'
import { instalarRecargaAposDeploy } from './lib/recarregarAposDeploy'
import './index.css'

// UX-015: analytics de produto (opt-in). Sem VITE_POSTHOG_KEY vira no-op —
// nenhum script é carregado e nenhum evento sai do dispositivo. Guard de
// double-init dentro do próprio módulo.
initAnalytics()
instalarRecargaAposDeploy()

const router = createBrowserRouter([
  { path: '*', element: <App />, errorElement: <ErroApp /> },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
