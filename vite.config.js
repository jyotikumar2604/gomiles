import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// During development, requests to /api can be proxied to Express once it exists:
// server: { proxy: { '/api': 'http://localhost:5000' } }
export default defineConfig({ plugins: [react()] });
