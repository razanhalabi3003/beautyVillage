import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.rtl.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import './styles/theme.css'
import App from './Componnents/App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
