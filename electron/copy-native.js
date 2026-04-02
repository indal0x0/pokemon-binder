/**
 * Copies Electron-rebuilt native modules into the Next.js standalone directory.
 * Must run AFTER `npm run build` AND `npx electron-rebuild`.
 *
 * Background: Next.js standalone output bundles its own copies of node_modules
 * (compiled for the system Node.js). When Electron loads the standalone server
 * in-process, it needs the modules compiled for Electron's Node.js ABI.
 */

const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const standaloneModules = path.join(root, '.next', 'standalone', 'node_modules')

const nativeModules = [
  'better-sqlite3',
]

let copied = 0
let skipped = 0

for (const mod of nativeModules) {
  const src = path.join(root, 'node_modules', mod)
  const dest = path.join(standaloneModules, mod)

  if (!fs.existsSync(src)) {
    console.warn(`⚠  ${mod} not found in node_modules, skipping`)
    skipped++
    continue
  }

  if (!fs.existsSync(dest)) {
    console.warn(`⚠  ${mod} not found in standalone/node_modules, skipping`)
    skipped++
    continue
  }

  // Replace the entire module directory with the Electron-rebuilt version
  fs.cpSync(src, dest, { recursive: true, force: true })
  console.log(`✓  Copied Electron-rebuilt ${mod} → standalone/node_modules/${mod}`)
  copied++
}

console.log(`\nDone: ${copied} copied, ${skipped} skipped.`)
