// Demanda (compilado, semana 3 §8–9). A NBR 5410 manda considerar equipamentos, potências e a possibilidade
// de funcionamento não simultâneo, mas NÃO traz tabela única de percentuais. O perfil usado aqui é o de
// Creder, 16ª ed., seção 3.8, Tabela 3.20 (iluminação e pequenos aparelhos, residências): cada percentual
// vale para a PARCELA de carga da sua faixa — nunca para toda a carga na última faixa.
//
// FD = demanda máxima / carga instalada (mesma grandeza e unidade; 80% é armazenado como 0,80).
export const FAIXAS_CREDER = [
  { de: 0, ate: 1000, fator: 0.8 },
  { de: 1000, ate: 2000, fator: 0.75 },
  { de: 2000, ate: 3000, fator: 0.65 },
  { de: 3000, ate: 4000, fator: 0.6 },
  { de: 4000, ate: 5000, fator: 0.5 },
  { de: 5000, ate: 6000, fator: 0.45 },
  { de: 6000, ate: 7000, fator: 0.4 },
  { de: 7000, ate: 8000, fator: 0.35 },
  { de: 8000, ate: 9000, fator: 0.3 },
  { de: 9000, ate: 10000, fator: 0.27 },
  { de: 10000, ate: Infinity, fator: 0.24 },
]

export const PERFIS_DEMANDA = {
  creder: { label: 'Creder, tab. 3.20 — iluminação e tomadas de residência, por parcelas (estimativa bibliográfica)' },
  nenhum: { label: 'Sem redução: 100% da carga (hipótese conservadora de projeto)' },
}
export const PERFIL_DEMANDA_PADRAO = 'creder'

// D(X) = Σ fᵢ · limitar(X − Lᵢ, 0, 1000) + 0,24 · max(X − 10000, 0), X = carga agrupada de iluminação e TUG em VA.
export function demandaCreder(cargaVA) {
  const x = Math.max(0, Number(cargaVA) || 0)
  const faixas = FAIXAS_CREDER.map(({ de, ate, fator }) => {
    const parcelaVA = Math.min(Math.max(x - de, 0), ate - de)
    return { de, ate, fator, parcelaVA, demandaVA: parcelaVA * fator }
  }).filter((f) => f.parcelaVA > 0)
  const demandaVA = faixas.reduce((soma, f) => soma + f.demandaVA, 0)
  return { cargaVA: x, faixas, demandaVA, fatorEquivalente: x > 0 ? demandaVA / x : null }
}

// Demanda do projeto: iluminação + TUG pelo perfil escolhido; cargas específicas (TUE) a 100% — sem método
// validado para elas, 100% é decisão de projeto, e cargas de uso simultâneo têm fator 1,00 (nota da tabela).
// O resultado é ESTIMATIVA bibliográfica: só deixa de ser rotulada assim com distribuidora, documento, revisão
// e grupo de carga identificados (S3 §8.2) — e mesmo então não declara aprovação pela concessionária.
export function calcularDemandaProjeto({ totais, perfil = PERFIL_DEMANDA_PADRAO, identificacao = {} }) {
  const aplicaPerfil = perfil === 'creder'
  const base = aplicaPerfil ? demandaCreder(totais.iluminacaoVA + totais.tugVA) : null
  const demandaGeralVA = aplicaPerfil ? base.demandaVA : totais.iluminacaoVA + totais.tugVA
  const demandaTotalVA = demandaGeralVA + totais.tueVA
  const identificada = Boolean(identificacao.distribuidoraId && identificacao.documento && identificacao.revisao && identificacao.grupo)
  return {
    perfil,
    faixas: base?.faixas ?? [],
    cargaGeralVA: totais.iluminacaoVA + totais.tugVA,
    demandaGeralVA,
    cargaEspecificaVA: totais.tueVA,
    demandaTotalVA,
    fatorEquivalente: totais.totalVA > 0 ? demandaTotalVA / totais.totalVA : null,
    estimativaBibliografica: !identificada,
    aprovadaPelaConcessionaria: false,
    hipoteses: [
      aplicaPerfil ? 'Iluminação e tomadas pelo perfil de Creder (tab. 3.20), por parcelas de carga.' : 'Iluminação e tomadas a 100% (sem perfil de demanda).',
      'Cargas de uso específico a 100%: sem método validado, a hipótese conservadora de projeto.',
      'Base aparente simplificada (VA): a igualdade com W exige fator de potência 1. A demanda não fornece, sozinha, a corrente de cada fase do alimentador, que depende da distribuição dos circuitos e dos fatores de potência.',
      identificada
        ? 'Perfil identificado (distribuidora, documento, revisão, grupo de carga); não equivale a aprovação pela concessionária.'
        : 'Sem identificação da distribuidora, do documento, da revisão e do grupo de carga: apresentar como estimativa bibliográfica.',
    ],
  }
}
