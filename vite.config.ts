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
      matches: ['<all_urls>'],
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
  permissions: [
    'sidePanel',
    'storage',
    'activeTab',
    'scripting'
  ],
  host_permissions: [
    '<all_urls>'
  ]
}

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest })
  ]
})