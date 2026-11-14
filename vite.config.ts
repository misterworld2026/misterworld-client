import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// 개발 중에는 /api 요청을 BE 서버로 프록시한다(CORS 회피).
// 실제 BE 주소는 .env(커밋 제외)의 VITE_PROXY_TARGET에 넣는다. .env.example 참고.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_PROXY_TARGET || 'http://localhost:8080';
  return {
    plugins: [react()],
    resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
    server: {
      proxy: {
        '/api': { target, changeOrigin: true },
      },
    },
  };
});
