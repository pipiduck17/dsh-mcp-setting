import * as esbuild from 'esbuild'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(resolve(here, 'package.json'), 'utf8'))
const watch = process.argv.includes('--watch')

/** Keep package imports external, except Schemastery and the packages it pulls in. */
const bundleSchemastery = {
  name: 'bundle-schemastery',
  setup(build) {
    build.onResolve({ filter: /^[^./]/ }, (args) => {
      if (args.path === '@deepseek-ai/schemastery' || args.path.startsWith('@deepseek-ai/schemastery/')) return null
      if (args.importer.includes('/schemastery/') || args.importer.includes('/cosmokit/')) return null
      return { path: args.path, external: true }
    })
  },
}

const client = {
  absWorkingDir: here,
  entryPoints: { client: 'src/client.tsx' },
  bundle: true,
  outdir: 'dist',
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  jsx: 'automatic',
  packages: 'external',
  banner: {
    js: `window.__ModuleLoader__.load({\n\tid: ${JSON.stringify(pkg.name)},\n\tfactory: (require) => {\n\t\tvar module = { exports: {} };\n\t\tvar exports = module.exports;\n\t\tObject.defineProperty(exports, Symbol.toStringTag, { value: "Module" });`,
  },
  footer: {
    js: '\n\t\treturn module.exports;\n\t}\n});',
  },
}

if (!watch) {
  await esbuild.build({
    absWorkingDir: here,
    entryPoints: { index: 'src/index.ts' },
    bundle: true,
    outdir: 'dist',
    format: 'esm',
    platform: 'node',
    target: 'node22',
    plugins: [bundleSchemastery],
  })
}

if (watch) {
  const ctx = await esbuild.context(client)
  await ctx.watch()
} else {
  await esbuild.build(client)
}
