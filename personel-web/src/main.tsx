import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './design-system.css'
import './index.css'
import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="app-font">
      <App />
    </div>
  </StrictMode>,
)
