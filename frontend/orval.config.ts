import { defineConfig } from 'orval';

export default defineConfig({
  'cavn-api': {
    input: {
      target: process.env.VITE_API_URL
        ? `${process.env.VITE_API_URL.replace('/api/v1', '')}/api/v1/schema/`
        : 'http://localhost:8000/api/v1/schema/',
    },
    output: {
      mode: 'tags-split',
      target: 'src/shared/api/generated',
      client: 'react-query',
      httpClient: 'axios',
      override: {
        mutator: {
          path: 'src/shared/lib/api.ts',
          name: 'default',
        },
      },
    },
    hooks: {
      afterAllFilesWrite: 'prettier --write',
    },
  },
});
