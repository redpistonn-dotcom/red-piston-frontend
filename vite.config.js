import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  test: {
    // Run tests in a pure Node environment — billing utils have no DOM dependency
    environment: 'node',
    include: ['src/tests/**/*.test.js'],
  },
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Group chunks by feature area so the browser can cache them independently.
        // ERP chunks never re-download when only the marketplace changes, and vice versa.
        manualChunks(id) {
          // Keep core node_modules together to avoid React internals circular warnings.
          if (id.includes('node_modules/recharts'))  return 'vendor-recharts';
          // Firebase Auth (large) — only needed on the login/landing flow. Match the
          // internal @firebase/* packages too, else it leaks into the main vendor chunk.
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase'))
            return 'vendor-firebase';
          // jsPDF is only used by the invoice modal — keep it in its own chunk so it
          // lazy-loads on "Download PDF" instead of bloating the main vendor bundle.
          if (id.includes('node_modules/jspdf'))     return 'vendor-pdf';
          if (id.includes('node_modules'))           return 'vendor';

          // Page components are React.lazy()-loaded (see src/App.tsx). Do NOT group
          // them into one chunk — let Rollup auto-split each lazy import into its own
          // per-route chunk so the first paint only downloads the entry route, not all
          // 16 pages. (They were previously collapsed into one ~931KB 'erp-pages' chunk
          // that index.html then modulepreloaded on every load, fully defeating the
          // lazy boundaries and forcing ~2.9MB of JS before anything rendered.)
        },
      },
    },
  },
})
