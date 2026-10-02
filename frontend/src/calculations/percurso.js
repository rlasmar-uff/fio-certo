// N17 — percurso do eletroduto, trecho a trecho (entre caixas ou extremidades).
// §6.2.11.1.6 b): trecho contínuo ≤ 15 m em linha interna ou ≤ 30 m em área externa, menos 3 m
// por curva de 90°. §6.2.11.1.7: no máximo 3 curvas de 90° (270°) por trecho.
// NOTA de b): onde não der para pôr caixa intermediária, o trecho pode passar do limite usando um
// eletroduto um tamanho nominal acima para cada 6 m, ou fração, de excesso.
export const LIMITE_TRECHO_INTERNO_M = 15
export const LIMITE_TRECHO_EXTERNO_M = 30
export const REDUCAO_POR_CURVA_M = 3
export const CURVAS_MAXIMAS = 3
export const PASSO_AUMENTO_DIAMETRO_M = 6
// Chave do alimentador em `projeto.percursos` (as demais são ids de circuito).
export const ID_PERCURSO_ALIMENTADOR = 'alimentador'

export function verificarTrecho({ comprimentoM, curvas = 0, externo = false }) {
  const comprimento = Number(comprimentoM)
  const numeroCurvas = Number(curvas) || 0
  if (!(comprimento > 0)) return null
  const limiteM = (externo ? LIMITE_TRECHO_EXTERNO_M : LIMITE_TRECHO_INTERNO_M) - REDUCAO_POR_CURVA_M * numeroCurvas
  const curvasConforme = numeroCurvas <= CURVAS_MAXIMAS
  const excessoM = Math.max(0, comprimento - limiteM)
  return {
    comprimentoM: comprimento,
    curvas: numeroCurvas,
    externo: Boolean(externo),
    limiteM,
    curvasConforme,
    excessoM,
    // Degraus de diâmetro que a NOTA admitiria no lugar da caixa intermediária.
    degrausAlternativa: excessoM > 0 ? Math.ceil(excessoM / PASSO_AUMENTO_DIAMETRO_M) : 0,
    conforme: curvasConforme && excessoM === 0,
  }
}

// `trilhaEletroduto` = trilha do dimensionamento do eletroduto do circuito (menor para maior);
// a alternativa da NOTA sobe `degraus` posições a partir do recomendado.
export function verificarPercurso(trechos, eletroduto) {
  const avaliados = (trechos ?? []).map((trecho) => ({ id: trecho.id, ...verificarTrecho(trecho) })).filter((t) => t.limiteM !== undefined)
  if (avaliados.length === 0) return null
  const trilha = eletroduto?.trilha ?? []
  const indiceRecomendado = trilha.findIndex((item) => item.referencia === eletroduto?.eletrodutoRecomendado?.referencia)
  for (const trecho of avaliados) {
    const alvo = indiceRecomendado >= 0 && trecho.degrausAlternativa > 0 ? trilha[indiceRecomendado + trecho.degrausAlternativa] : null
    trecho.eletrodutoAlternativa = alvo ? `${alvo.nominalMm} mm (${alvo.referencia})` : null
  }
  return { trechos: avaliados, conforme: avaliados.every((trecho) => trecho.conforme) }
}
