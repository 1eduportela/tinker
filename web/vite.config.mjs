// Compilación de la web con Vite.
//   npm run dev    -> web en http://localhost:5173 con recarga al guardar (necesita Tinker abierto en el 3000)
//   npm run build  -> genera public/, que es lo que sirve el servidor de Tinker
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: here,
  plugins: [react()],
  build: {
    outDir: fileURLToPath(new URL('../public', import.meta.url)),
    emptyOutDir: true,
    // Nombres fijos: al actualizar se reemplazan los mismos archivos en vez de acumular versiones
    rollupOptions: { output: { entryFileNames: 'assets/tinker.js', chunkFileNames: 'assets/[name].js', assetFileNames: 'assets/tinker[extname]' } },
  },
  server: {
    // En desarrollo, la API y las fotos las sigue dando el servidor de Tinker
    proxy: { '/api': 'http://localhost:3000', '/uploads': 'http://localhost:3000' },
  },
});
