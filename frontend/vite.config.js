import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        // This proxy tells Vite: "If a request starts with /api, forward it to the backend"
        proxy: {
            '/api': {
                target: 'http://100.76.246.47:3001', // Your backend IP
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, '')
            }
        }
    }
})