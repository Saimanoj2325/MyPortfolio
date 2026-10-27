import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const srcPhoto = 'C:/Users/Sai/.gemini/antigravity-ide/brain/aebe69bc-59dd-43ee-9277-a0583eb79161/.user_uploaded/media_1793076117989.jpg'
const destPhoto = path.resolve(__dirname, 'public/profile.jpg')
const srcMountain = 'C:/Users/Sai/.gemini/antigravity-ide/brain/aebe69bc-59dd-43ee-9277-a0583eb79161/realistic_alpine_mountains_1793078603766.jpg'
const destMountain = path.resolve(__dirname, 'public/mountains.jpg')
const destMountainLegacy = path.resolve(__dirname, 'public/telescope_mountains.jpg')
try {
  if (fs.existsSync(srcPhoto)) {
    fs.copyFileSync(srcPhoto, destPhoto)
  }
  if (fs.existsSync(srcMountain)) {
    fs.copyFileSync(srcMountain, destMountain)
    fs.copyFileSync(srcMountain, destMountainLegacy)
  }
} catch (e) {
  console.error('Failed to copy assets:', e)
}

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three/')) return 'three'
          if (id.includes('@react-three') || id.includes('postprocessing')) return 'r3f'
        },
      },
    },
  },
})
