// Formatação de números para o usuário, no padrão brasileiro: vírgula decimal e ponto de milhar
// (2,5 mm² · 13.136 VA · 1,65 %). Todo número que aparece em tela, texto de veredito ou memorial
// passa por aqui; o cálculo continua com Number puro.

const SOBRESCRITO = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' }

// Número com `casas` decimais fixas. Ausente ou inválido vira "—", nunca "NaN".
export function num(valor, casas = 2) {
  if (valor === null || valor === undefined || valor === '') return '—'
  const n = Number(valor)
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
}

// Valor como está, só com vírgula decimal (seções nominais, Up, cosφ informados: 2,5 · 1,5 · 0,85).
export function decimal(valor) {
  if (valor === null || valor === undefined || valor === '') return '—'
  const n = Number(valor)
  if (!Number.isFinite(n)) return String(valor)
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 6 })
}

// 81400 → "8,14 × 10⁴"
export function cientifico(valor, casas = 2) {
  const n = Number(valor)
  if (!n || !Number.isFinite(n)) return '—'
  const expoente = Math.floor(Math.log10(Math.abs(n)))
  return `${num(n / 10 ** expoente, casas)} × 10${String(expoente)
    .split('')
    .map((d) => SOBRESCRITO[d])
    .join('')}`
}
