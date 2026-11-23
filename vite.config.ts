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
    build: {
      rolldownOptions: {
        output: {
          codeSplitting: {
            includeDependenciesRecursively: false,
            groups: [
              {
                name: 'three-core',
                priority: 1,
                test: /[\\/]node_modules[\\/]three[\\/]build[\\/]three\.core\.js$/,
              },
              { name: 'three', test: /[\\/]node_modules[\\/](?:three|three-stdlib)[\\/]/ },
              {
                name: 'react-three',
                test: /[\\/]node_modules[\\/](?:@react-three|postprocessing)[\\/]/,
              },
              {
                name: 'react-ui',
                test: /[\\/]node_modules[\\/](?:react|react-dom|scheduler|@radix-ui)[\\/]/,
              },
            ],
          },
        },
      },
    },
    plugins: [react(), tailwindcssPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, 'src'),
      },
    },
  };
});
