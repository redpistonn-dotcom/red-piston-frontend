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
    // 900 kB limit: the core vendor chunk is ~813 kB of unavoidable framework
    // runtime (react-dom + react-router v7). Feature libs (xlsx, zxing, pdf…)
    // are already split into their own lazy-loaded chunks.
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Group chunks by feature area so the browser can cache them independently.
        // ERP chunks never re-download when only the marketplace changes, and vice versa.
        manualChunks(id) {
          // ── Heavy feature-specific libraries ──────────────────────────────────
          // xlsx (~500 kB) — only used for Excel exports; never needed on first load
          if (id.includes('node_modules/xlsx'))                               return 'vendor-xlsx';
          // Barcode scanner (~300 kB) — only used inside POSBillingPage
          if (id.includes('node_modules/@zxing'))                             return 'vendor-zxing';
          // Charts — lazy-loaded with dashboard/reports pages
          if (id.includes('node_modules/recharts'))                           return 'vendor-recharts';
          // Firebase Auth — only needed on login/landing flow
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase'))
                                                                               return 'vendor-firebase';
          // jsPDF — only used by invoice download modal
          if (id.includes('node_modules/jspdf'))                              return 'vendor-pdf';
          // Framer Motion — transitive dep; split so it's cached separately
          if (id.includes('framer-motion'))                                    return 'vendor-motion';
          // TanStack Query — data-fetching layer used by ERP pages
          if (id.includes('@tanstack'))                                        return 'vendor-tanstack';

          // Everything else in node_modules goes into the general vendor chunk
          // Note: do NOT split react/react-dom — they have circular peer-dep imports
          // with other packages in vendor and Rollup warns + degrades perf.
          if (id.includes('node_modules'))                                    return 'vendor';

          // Page components are React.lazy()-loaded (see src/App.tsx). Do NOT group
          // them into one chunk — let Rollup auto-split each lazy import into its own
          // per-route chunk so the first paint only downloads the entry route, not all
          // 16 pages.
        },
      },
    },
  },
})
