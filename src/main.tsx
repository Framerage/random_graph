import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Порядок важен: стили React Flow до глобальных и модульных, чтобы наши переопределения шли позже
import '@xyflow/react/dist/style.css'
import './app/styles/global.scss'
import App from './app/App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
