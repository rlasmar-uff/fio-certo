import { normalizarProjeto } from './estado.js'

// Formato do arquivo exportado. `versao` sobe só quando um campo mudar de significado; arquivo
// de versão mais nova é recusado em vez de aberto pela metade.
export const FORMATO_ARQUIVO = 'fio-certo/projeto'
export const VERSAO_ARQUIVO = 1
const TAMANHO_MAXIMO_LINK = 100_000

function nomeValido(nome, padrao) {
  return typeof nome === 'string' && nome.trim() ? nome.trim().slice(0, 80) : padrao
}

export function gerarArquivo(nome, dados) {
  const conteudo = {
    formato: FORMATO_ARQUIVO,
    versao: VERSAO_ARQUIVO,
    nome,
    exportadoEm: new Date().toISOString(),
    projeto: dados,
  }
  return JSON.stringify(conteudo, null, 2)
}

export function lerArquivo(texto) {
  let conteudo
  try {
    conteudo = JSON.parse(texto)
  } catch {
    throw new Error('O arquivo não é um JSON válido.')
  }
  if (conteudo?.formato !== FORMATO_ARQUIVO) throw new Error('Este arquivo não é um projeto do Fio Certo.')
  if (!(conteudo.versao <= VERSAO_ARQUIVO)) throw new Error('Arquivo de uma versão mais nova do Fio Certo.')
  return { nome: nomeValido(conteudo.nome, 'Projeto importado'), dados: normalizarProjeto(conteudo.projeto) }
}

export function nomeArquivo(nome) {
  const base = nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
  return `${base || 'projeto'}.fio-certo.json`
}

// --- Link: o projeto vai inteiro no hash da URL, comprimido. Sem servidor. ---
// Prefixo 'z' = deflate-raw; 'j' = JSON puro (navegador sem CompressionStream).

function paraBase64Url(bytes) {
  let binario = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function deBase64Url(texto) {
  const binario = atob(texto.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(binario, (caractere) => caractere.charCodeAt(0))
}

async function transformar(bytes, fluxo) {
  const saida = new Blob([bytes]).stream().pipeThrough(fluxo)
  return new Uint8Array(await new Response(saida).arrayBuffer())
}

export async function codificarLink(nome, dados) {
  const bytes = new TextEncoder().encode(JSON.stringify({ n: nome, p: dados }))
  if (typeof CompressionStream === 'undefined') return `j${paraBase64Url(bytes)}`
  return `z${paraBase64Url(await transformar(bytes, new CompressionStream('deflate-raw')))}`
}

export async function decodificarLink(codigo) {
  let conteudo
  try {
    if (!codigo || codigo.length > TAMANHO_MAXIMO_LINK) throw new Error()
    const bytes = deBase64Url(codigo.slice(1))
    const json =
      codigo[0] === 'z'
        ? await transformar(bytes, new DecompressionStream('deflate-raw'))
        : codigo[0] === 'j'
          ? bytes
          : null
    if (!json) throw new Error()
    conteudo = JSON.parse(new TextDecoder().decode(json))
  } catch {
    throw new Error('Link inválido ou incompleto — confira se foi copiado inteiro.')
  }
  return { nome: nomeValido(conteudo?.n, 'Projeto compartilhado'), dados: normalizarProjeto(conteudo?.p) }
}
