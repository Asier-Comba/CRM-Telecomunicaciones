import { readdir, readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return extname(entry.name) === '.ts' ? [path] : []
  }))
  return nested.flat()
}

const files = [...await sourceFiles('src'), ...await sourceFiles('test')]
const failures = []

for (const file of files) {
  const lines = (await readFile(file, 'utf8')).split('\n')
  lines.forEach((line, index) => {
    if (/\s+$/.test(line)) failures.push(`${file}:${index + 1}: trailing whitespace`)
    if (/\bconsole\.log\s*\(/.test(line)) failures.push(`${file}:${index + 1}: console.log is not allowed`)
    if (/\bas any\b|:\s*any\b/.test(line)) failures.push(`${file}:${index + 1}: explicit any is not allowed`)
  })
}

if (failures.length) {
  process.stderr.write(`${failures.join('\n')}\n`)
  process.exit(1)
}

process.stdout.write(`Linted ${files.length} TypeScript files\n`)
