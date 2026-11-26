// Entry for the Fable 5.2 mockups (fable.html). The mockup itself lives in src/prototype/main-screen-fable/.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import FableMockups from './prototype/main-screen-fable'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FableMockups />
  </StrictMode>,
)
