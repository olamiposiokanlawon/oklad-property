import { lazy, Suspense, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
const Admin = lazy(() => import('./Admin'))
const isAdmin = location.pathname.startsWith('/admin')
createRoot(document.getElementById('root')).render(
  <StrictMode>{isAdmin ? <Suspense fallback={null}><Admin /></Suspense> : <App />}</StrictMode>
)
