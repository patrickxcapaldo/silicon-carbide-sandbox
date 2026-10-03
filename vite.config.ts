import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const packageJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

function gitValue(args: string[]): string {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return ''
  }
}

const sourceCommit = gitValue(['rev-parse', 'HEAD']) || 'unknown'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
    __SOURCE_COMMIT__: JSON.stringify(sourceCommit),
    __SOURCE_DIRTY__: JSON.stringify(command !== 'build' || gitValue(['status', '--porcelain']) !== ''),
  },
}))
