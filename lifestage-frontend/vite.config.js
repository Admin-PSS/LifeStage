import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const API_TARGET = 'https://lifestage-cbfgh8b6ercddmd6.canadacentral-01.azurewebsites.net'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': { target: API_TARGET, changeOrigin: true, secure: false },
      '/hubs': { target: API_TARGET, changeOrigin: true, secure: false, ws: true },
    },
  },
})
