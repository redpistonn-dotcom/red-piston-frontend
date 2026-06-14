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
          // Keep all node_modules together to avoid React internals circular warnings.
          // Recharts and Firebase are the only two worth splitting (large, rarely change).
          if (id.includes('node_modules/recharts'))  return 'vendor-recharts';
          if (id.includes('node_modules/firebase'))  return 'vendor-firebase';
          // jsPDF is only used by the invoice modal — keep it in its own chunk so it
          // lazy-loads on "Download PDF" instead of bloating the main vendor bundle.
          if (id.includes('node_modules/jspdf'))     return 'vendor-pdf';
          if (id.includes('node_modules'))           return 'vendor';

          // ERP pages — only loaded by SHOP_OWNER
          if (id.includes('/pages/'))                return 'erp-pages';

          // Marketplace pages — only loaded by CUSTOMER
          if (id.includes('/marketplace/pages/'))    return 'mp-pages';
        },
      },
    },
  },
})
