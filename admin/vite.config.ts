import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// use Vite's native tsconfig paths support via `resolve.tsconfigPaths`

export default defineConfig({
  plugins: [
    tanstackStart(),
    viteReact(),  
    tailwindcss(),
  ],
  resolve: {
    tsconfigPaths: true,
  },
})