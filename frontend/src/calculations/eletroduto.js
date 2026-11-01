import { AREA_EXTERNA_CONDUTOR_MM2, CATALOGOS_ELETRODUTO, CATALOGO_ELETRODUTO_PADRAO, SECOES_NOMINAIS_MM2, obterTaxaOcupacaoMaxima } from './constantes.js'

function areaCirculoMm2(diametroMm) {
  return (Math.PI / 4) * diametroMm * diametroMm
}

// Área externa de cada seção: a do catálogo do produto informada pelo usuário (`areasCabo`), senão a da
// tabela 3.22 do Creder (PVC) / do cabo HEPR (EPR/XLPE). Seção sem área → undefined (não se supõe valor).
export function areaExternaCondutorMm2(secaoMm2, { isolacao = 'pvc', areasCabo } = {}) {
  const informada = Number(areasCabo?.[secaoMm2])
  return informada > 0 ? informada : AREA_EXTERNA_CONDUTOR_MM2[isolacao]?.[secaoMm2]
}

// NBR 5410 §6.2.11.1.6 a) — dimensiona o eletroduto de UM trecho a partir dos condutores físicos
// que passam por ele. `secoesCondutoresMm2` é a lista de seções (mm²) de cada condutor individual
// do trecho — por exemplo, um circuito fase-neutro com terra é `[secaoFase, secaoFase, secaoPE]`
// (2 condutores de fase/neutro + 1 PE); um alimentador trifásico é 3 fases + neutro + PE; um eletroduto
// compartilhado por vários circuitos soma TODOS os condutores deles, inclusive os PE (S8 §6.6).
//
// O diâmetro vem do catálogo escolhido (`catalogo`): compara-se a ÁREA somada dos condutores com a área
// útil do eletroduto multiplicada pela taxa (53/31/40%), e não diâmetros arredondados (S8 §2.1).
export function dimensionarEletroduto(secoesCondutoresMm2, opcoes = {}) {
  const { isolacao = 'pvc', catalogo = CATALOGO_ELETRODUTO_PADRAO, areasCabo } = opcoes
  const numeroCondutores = secoesCondutoresMm2.length
  const taxaMaximaPercentual = obterTaxaOcupacaoMaxima(numeroCondutores) * 100
  const itens = (CATALOGOS_ELETRODUTO[catalogo] ?? CATALOGOS_ELETRODUTO[CATALOGO_ELETRODUTO_PADRAO]).itens
  const areas = secoesCondutoresMm2.map((secao) => areaExternaCondutorMm2(secao, { isolacao, areasCabo }))

  // Seção sem área externa catalogada — recusar em vez de supor.
  if (areas.some((area) => area === undefined)) {
    return {
      numeroCondutores,
      areaCondutoresMm2: null,
      taxaMaximaPercentual,
      trilha: [],
      eletrodutoRecomendado: null,
      erro:
        'Área externa do cabo não disponível nesta ferramenta para a seção escolhida (a tabela 3.22 vai até 185 mm²) — ' +
        'informe a área do catálogo do cabo usado ou dimensione o eletroduto à parte.',
    }
  }

  const areaCondutoresMm2 = areas.reduce((soma, area) => soma + area, 0)

  const trilha = itens.map((item) => {
    const areaInternaMm2 = areaCirculoMm2(item.di)
    const ocupacaoPercentual = (areaCondutoresMm2 / areaInternaMm2) * 100
    return {
      referencia: item.rosca,
      nominalMm: item.dn,
      diametroInternoMm: item.di,
      areaInternaMm2,
      ocupacaoPercentual,
      atende: ocupacaoPercentual <= taxaMaximaPercentual,
    }
  })

  const eletrodutoRecomendado = trilha.find((linha) => linha.atende) ?? null

  return {
    numeroCondutores,
    areaCondutoresMm2,
    taxaMaximaPercentual,
    trilha,
    eletrodutoRecomendado,
    erro: eletrodutoRecomendado
      ? null
      : 'Nenhum eletroduto do catálogo escolhido comporta essa quantidade/seção de condutores.',
  }
}

// S8 §3.4 — quantidade máxima de condutores IGUAIS que cabem num eletroduto: o maior n tal que n·A ≤ f(n)·A_ele,
// com f = 0,53 (1), 0,31 (2) e 0,40 (3 ou mais).
export function quantidadeMaximaCondutores(secaoMm2, item, opcoes = {}) {
  const area = areaExternaCondutorMm2(secaoMm2, opcoes)
  if (!area || !item) return null
  const areaInterna = areaCirculoMm2(item.di)
  let maximo = 0
  for (let n = 1; n <= 200; n += 1) if (n * area <= obterTaxaOcupacaoMaxima(n) * areaInterna) maximo = n
  return maximo
}

export const secoesComAreaCatalogada = (isolacao = 'pvc') => SECOES_NOMINAIS_MM2.filter((s) => AREA_EXTERNA_CONDUTOR_MM2[isolacao]?.[s])
