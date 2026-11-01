#!/usr/bin/env node
/**
 * Inventário dos critérios do harness (QA/scripts/verificar.mjs).
 *
 * Lê o código-fonte do harness (não executa nada), separa cada chamada `checar(...)` em seus
 * argumentos e classifica a CONDIÇÃO de cada critério pelo tipo de referência que ela usa:
 *
 *   referência fixa   — compara com um número/expressão escrita no teste (valor de norma ou conta manual)
 *   só consistência   — compara saídas do motor entre si, ou testa só forma (null, > 0, .length)
 *
 * "Só consistência" não é defeito por si — mas é onde um erro do motor e do teste podem coincidir.
 * Uso: node QA/scripts/inventario.mjs > docs/INVENTARIO_DE_TESTES.md
 */
import { readFileSync } from 'node:fs'

const fonte = readFileSync(new URL('./verificar.mjs', import.meta.url), 'utf8')

// Divide os argumentos de nível superior de uma chamada, respeitando strings, templates e parênteses.
function dividirArgumentos(texto, inicio) {
  const args = []
  let profundidade = 0
  let atual = ''
  let i = inicio
  while (i < texto.length) {
    const c = texto[i]
    if (c === "'" || c === '"') {
      const aspa = c
      atual += c
      i += 1
      while (i < texto.length && texto[i] !== aspa) {
        if (texto[i] === '\\') { atual += texto[i]; i += 1 }
        atual += texto[i]
        i += 1
      }
      atual += aspa
      i += 1
      continue
    }
    if (c === '`') {
      atual += c
      i += 1
      let chaves = 0
      while (i < texto.length && !(texto[i] === '`' && chaves === 0)) {
        if (texto[i] === '\\') { atual += texto[i]; i += 1 }
        else if (texto[i] === '$' && texto[i + 1] === '{') { chaves += 1; atual += '${'; i += 2; continue }
        else if (texto[i] === '}' && chaves > 0) chaves -= 1
        atual += texto[i]
        i += 1
      }
      atual += '`'
      i += 1
      continue
    }
    if (c === '/' && texto[i + 1] === '/') {
      while (i < texto.length && texto[i] !== '\n') i += 1
      continue
    }
    if ('([{'.includes(c)) profundidade += 1
    if (')]}'.includes(c)) {
      if (profundidade === 0) { args.push(atual.trim()); return args }
      profundidade -= 1
    }
    if (c === ',' && profundidade === 0) { args.push(atual.trim()); atual = ''; i += 1; continue }
    atual += c
    i += 1
  }
  return args
}

const linhas = []
let grupoAtual = ''
const reGrupo = /^grupo\('(G\d+)', '([^']*)'\)/gm
const grupos = [...fonte.matchAll(reGrupo)].map((m) => ({ pos: m.index, id: m[1], titulo: m[2] }))
const reChecar = /\bchecar\(\s*'(G\d+\.\d+)'/g
for (const m of fonte.matchAll(reChecar)) {
  const abre = fonte.indexOf('(', m.index)
  const args = dividirArgumentos(fonte, abre + 1)
  const [id, clausula, descricao, condicao, , severidade] = args
  grupoAtual = [...grupos].reverse().find((g) => g.pos < m.index) ?? { id: '?', titulo: '' }
  const limpa = (condicao ?? '').replace(/\/\/[^\n]*/g, '')
  const semStrings = limpa.replace(/'[^']*'|`[^`]*`/g, '')
  const temReferenciaFixa = /(?<![\w.])(?:\d+\.\d+|[2-9]\d*|1\d+)(?![\w])/.test(semStrings) || /\b\d{1,3}(?:_\d{3})+\b/.test(semStrings)
  const soForma = !temReferenciaFixa
  linhas.push({
    id: id.replace(/'/g, ''),
    grupo: grupoAtual.id,
    clausula: (clausula ?? '').replace(/^'|'$/g, ''),
    descricao: (descricao ?? '').replace(/^'|'$|^`|`$/g, '').replace(/\n/g, ' '),
    severidade: (severidade ?? "'medio'").replace(/'/g, ''),
    tipo: soForma ? 'só consistência' : 'referência fixa',
  })
}

const porGrupo = {}
for (const l of linhas) (porGrupo[l.grupo] ??= []).push(l)
const total = linhas.length
const fracas = linhas.filter((l) => l.tipo === 'só consistência')

console.log('# Inventário dos testes do harness de conformidade\n')
console.log('Gerado por `node QA/scripts/inventario.mjs` a partir de `QA/scripts/verificar.mjs` (leitura do código-fonte).\n')
console.log(`- **Critérios:** ${total} em ${Object.keys(porGrupo).length} grupos.`)
console.log(`- **Com valor de referência fixo no teste** (norma ou conta manual): ${total - fracas.length}.`)
console.log(`- **Só consistência/forma** (comparam saídas do motor entre si, ou testam presença/\`null\`/\`> 0\`): ${fracas.length}. São os que mais precisam de olho humano — um erro do motor e do teste podem coincidir.\n`)
console.log('A classificação é por heurística textual (existência de número literal diferente de 0/1 na condição). Ela aponta onde olhar; não substitui a leitura do critério.\n')
console.log('## Critérios que só verificam consistência ou forma\n')
console.log('| Critério | Cláusula | O que verifica | Severidade |')
console.log('|---|---|---|---|')
for (const l of fracas) console.log(`| ${l.id} | ${l.clausula} | ${l.descricao.replace(/\|/g, '/')} | ${l.severidade} |`)
console.log('\n## Todos os critérios, por grupo\n')
for (const [grupo, itens] of Object.entries(porGrupo)) {
  console.log(`### ${grupo}\n`)
  console.log('| Critério | Cláusula | O que verifica | Referência | Severidade |')
  console.log('|---|---|---|---|---|')
  for (const l of itens) console.log(`| ${l.id} | ${l.clausula} | ${l.descricao.replace(/\|/g, '/')} | ${l.tipo} | ${l.severidade} |`)
  console.log('')
}
