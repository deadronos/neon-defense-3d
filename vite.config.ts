import path from 'node:path';

import tailwindcssPlugin from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const base = env.VITE_BASE || (mode === 'production' ? '/neon-defense-3d/' : '/');
  return {
    base,
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react(), tailwindcssPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
  };
});
