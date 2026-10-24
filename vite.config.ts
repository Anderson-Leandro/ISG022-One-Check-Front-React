import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Bibliotecas grandes em chunks próprios: mudam pouco (cache longo) e só o mapa/gráficos baixam Leaflet/Chart.js.
const CHUNKS_DE_BIBLIOTECAS: Record<string, string[]> = {
  react: ['react', 'react-dom', 'react-router', 'react-router-dom', 'scheduler'],
  consultas: ['@tanstack/react-query', 'openapi-fetch'],
  bootstrap: ['react-bootstrap', '@restart', '@popperjs', 'bootstrap'],
  mapa: ['leaflet', 'react-leaflet', '@react-leaflet'],
  graficos: ['chart.js', 'react-chartjs-2', '@kurkle'],
}

function chunkDaBiblioteca(id: string) {
  const caminho = id.split('node_modules/').pop()
  if (!caminho || caminho === id) return undefined
  const pacote = caminho.startsWith('@') ? caminho.split('/').slice(0, 2).join('/') : caminho.split('/')[0]
  const escopo = pacote.split('/')[0]
  return Object.entries(CHUNKS_DE_BIBLIOTECAS).find(([, pacotes]) => pacotes.includes(pacote) || pacotes.includes(escopo))?.[0]
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: { manualChunks: chunkDaBiblioteca },
    },
  },
})
