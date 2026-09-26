import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { open: true },
  build: {
    rollupOptions: {
      output: {
        // Keep the 3D stack in its own long-cached chunk.
        manualChunks: { three: ['three', '@react-three/fiber'] },
      },
    },
  },
})
