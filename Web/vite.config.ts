import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/TerraSence/',
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
        //
        // `framer-motion` salió del grupo `ui` al salir del proyecto: el
        // rediseño resolvió las transiciones con CSS, que respeta
        // `prefers-reduced-motion` sin código y no obliga a descargar 130 kB
        // para animar la entrada de una tabla.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          ui: ['lucide-react'],
        },
      },
    },
  },
})
