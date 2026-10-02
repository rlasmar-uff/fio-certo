import { DIAMETRO_EXTERNO_CONDUTOR_MM, ELETRODUTOS_PVC_RIGIDO, obterTaxaOcupacaoMaxima } from './constantes.js'

function areaCirculoMm2(diametroMm) {
  return (Math.PI / 4) * diametroMm * diametroMm
}

// NBR 5410 §6.2.11.1.6 a) — dimensiona o eletroduto de UM trecho a partir dos condutores físicos
// que passam por ele. `secoesCondutoresMm2` é a lista de seções (mm²) de cada condutor individual
// do trecho — por exemplo, um circuito fase-neutro com terra é `[secaoFase, secaoFase, secaoPE]`
// (2 condutores de fase/neutro + 1 PE); um alimentador trifásico é 3 fases + neutro + PE.
//
// Este cálculo é independente do fator de agrupamento térmico (FCA, Tabela 42) usado na
// ampacidade: a taxa de ocupação é sobre os condutores DENTRO do mesmo eletroduto (o trecho
// individual de cada circuito, como esta ferramenta modela); o FCA é sobre quantos CIRCUITOS
// distintos ficam próximos o bastante para se aquecerem entre si, o que pode incluir vários
// eletrodutos lado a lado — as duas contas respondem perguntas diferentes.
export function dimensionarEletroduto(secoesCondutoresMm2, opcoes = {}) {
  const { isolacao = 'pvc' } = opcoes
  const numeroCondutores = secoesCondutoresMm2.length
  const taxaMaximaPercentual = obterTaxaOcupacaoMaxima(numeroCondutores) * 100
  const tabelaDiametro = DIAMETRO_EXTERNO_CONDUTOR_MM[isolacao]

  // Isolação sem diâmetro externo catalogado (ver constantes.js) — recusar em vez de supor.
  if (!tabelaDiametro || secoesCondutoresMm2.some((secao) => tabelaDiametro[secao] === undefined)) {
    return {
      numeroCondutores,
      areaCondutoresMm2: null,
      taxaMaximaPercentual,
      trilha: [],
      eletrodutoRecomendado: null,
      erro:
        'Diâmetro externo do cabo não disponível nesta ferramenta para a seção escolhida (o catálogo ' +
        'usado vai até 120 mm²) — dimensione o eletroduto à parte, com o catálogo do fabricante escolhido.',
    }
  }

  const areaCondutoresMm2 = secoesCondutoresMm2.reduce((soma, secao) => soma + areaCirculoMm2(tabelaDiametro[secao]), 0)

  const trilha = ELETRODUTOS_PVC_RIGIDO.map((eletroduto) => {
    const areaInternaMm2 = areaCirculoMm2(eletroduto.diametroInternoMm)
    const ocupacaoPercentual = (areaCondutoresMm2 / areaInternaMm2) * 100
    return {
      ...eletroduto,
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
      : 'Nenhum eletroduto padrão considerado nesta versão comporta essa quantidade/seção de condutores.',
  }
}
