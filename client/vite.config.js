import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      'morphdom',
      'prismjs',
      'prismjs/components/prism-python',
      'prismjs/components/prism-javascript',
      'prismjs/components/prism-typescript',
      'prismjs/components/prism-jsx',
      'prismjs/components/prism-tsx',
      'prismjs/components/prism-bash',
      'prismjs/components/prism-json',
      'prismjs/components/prism-sql',
      'prismjs/components/prism-java',
      'prismjs/components/prism-go',
      'prismjs/components/prism-rust',
      'prismjs/components/prism-css',
      'prismjs/components/prism-markup',
    ],
  },
  server: {
    host: '0.0.0.0',
    allowedHosts: ['all'],
    proxy: {
      '/api': {
        target: 'http://0.0.0.0:3001',
        changeOrigin: true,
      },
      '/generated': {
        target: 'http://0.0.0.0:3001',
        changeOrigin: true,
      },
      '/static': {
        target: 'http://0.0.0.0:3001',
        changeOrigin: true,
      },
    },
  },
});
