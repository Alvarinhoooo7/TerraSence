import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss()
  ],
  build: {
    rollupOptions: {
      output: {
        // Separamos las dependencias que no cambian entre despliegues del
        // código propio: el bundle único superaba el umbral de 500 kB de Vite
        // y obligaba al navegador a volver a descargar React y supabase-js
        // completos por cada cambio de una pantalla. Con estos tres grupos, un
        // despliegue normal sólo invalida el chunk de la aplicación.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          ui: ['framer-motion', 'lucide-react'],
        },
      },
    },
  },
})
