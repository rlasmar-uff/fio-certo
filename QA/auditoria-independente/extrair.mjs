// Uso: node extrair.mjs <pdfjs legacy pdf.mjs> <entrada.pdf> <saida.txt>
// Extrai o texto em modo "layout": agrupa itens por linha (y) e posiciona por x.
import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const [pdfjsPath, entrada, saida] = process.argv.slice(2)
const pdfjs = await import(pathToFileURL(pdfjsPath).href)
const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(entrada)), isEvalSupported: false }).promise
const linhas = []
for (let p = 1; p <= doc.numPages; p++) {
  const page = await doc.getPage(p)
  const { items } = await page.getTextContent()
  const porY = new Map()
  for (const it of items) {
    if (!it.str.trim()) continue
    const y = Math.round(it.transform[5] / 2) * 2
    if (!porY.has(y)) porY.set(y, [])
    porY.get(y).push({ x: it.transform[4], s: it.str })
  }
  linhas.push(`===== página ${p} =====`)
  for (const y of [...porY.keys()].sort((a, b) => b - a)) {
    let linha = ''
    for (const { x, s } of porY.get(y).sort((a, b) => a.x - b.x)) {
      const col = Math.round(x / 4.5)
      if (linha.length < col) linha = linha.padEnd(col)
      else if (linha.length) linha += ' '
      linha += s
    }
    linhas.push(linha.trimEnd())
  }
}
writeFileSync(saida, linhas.map((l, i) => `${String(i + 1).padStart(5)}| ${l}`).join('\n'))
console.log(`${doc.numPages} páginas, ${linhas.length} linhas`)
