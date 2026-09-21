import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'

const manifest = {
  manifest_version: 3,
  name: 'Job Agent',
  version: '0.1.0',
  description: 'AI-powered personal job application assistant.',
  background: {
    service_worker: 'src/background.ts'
  },
  content_scripts: [
    {
      matches: ['http://*/*', 'https://*/*'],
      js: ['src/content/content.ts'],
      run_at: 'document_idle'
    }
  ],
  action: {
    default_title: 'Job Agent'
  },
  side_panel: {
    default_path: 'index.html'
  },
  permissions: ['tabs', 'sidePanel', 'storage'],
  host_permissions: ['http://*/*', 'https://*/*']
}

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest })
  ]
})