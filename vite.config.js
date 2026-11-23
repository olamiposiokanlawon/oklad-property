import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// In dev, run `npm run server` in a second terminal; Vite proxies API + uploads to it.
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:3000', '/uploads': 'http://localhost:3000' } }
})
