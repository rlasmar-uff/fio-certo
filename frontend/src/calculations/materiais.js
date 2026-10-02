import { calcularPrevisaoDeCarga } from './previsaoDeCarga.js'
import { montarQuadro } from './quadro.js'

// Lista de materiais derivada do resultado — nada aqui é número novo: seções, disjuntores, DRs e
// eletrodutos são os já dimensionados; comprimentos são os informados. A folga (perdas, subidas,
// ligações no quadro) é uma entrada do usuário, nunca um valor assumido.

// §6.1.5.3 — identificação por cor. Fase: qualquer cor, exceto as reservadas e o amarelo puro
// (NOTA de §6.1.5.3.4).
export const FUNCOES_CONDUTOR = {
  fase: { label: 'Fase', cor: 'qualquer cor, exceto azul-claro, verde, verde-amarelo e amarelo' },
  neutro: { label: 'Neutro', cor: 'azul-claro' },
  pen: { label: 'PEN', cor: 'azul-claro com anilhas verde-amarelo' },
  pe: { label: 'Proteção (PE)', cor: 'verde-amarelo ou verde' },
}
const ORDEM_FUNCAO = Object.keys(FUNCOES_CONDUTOR)

// F11 — especificação de compra, sem marca e sem preço. §6.2.3.2/§6.2.3.4: normas de produto
// que a NBR 5410 manda atender.
export const ESPECIFICACAO_CABO = {
  pvc: 'condutor isolado de cobre, PVC 70 °C, 450/750 V, não-propagante de chama (NBR NM 247-3; §6.2.3.4)',
  epr: 'cabo unipolar de cobre, EPR (NBR 7286) ou XLPE (NBR 7287), 90 °C, 0,6/1 kV com cobertura (é o diâmetro usado no eletroduto)',
}

// Capacidades de interrupção padronizadas de disjuntor residencial (NBR NM 60898 / IEC 60898-1 —
// norma de produto, fonte externa à NBR 5410). A mínima calculada vira a próxima padronizada.
export const ICN_PADRONIZADAS_KA = [1.5, 3, 4.5, 6, 10, 15, 20, 25]

const decimal = (valor) => String(valor).replace('.', ',')

function informado(valor) {
  return valor !== undefined && valor !== null && valor !== '' && Number(valor) > 0
}

function agrupar(itens, chave) {
  const mapa = new Map()
  for (const item of itens) {
    const k = chave(item)
    const atual = mapa.get(k)
    if (atual) atual.quantidade += item.quantidade
    else mapa.set(k, { ...item })
  }
  return [...mapa.values()]
}

export function listarMateriais(projeto, calculo, { folgaPercentual } = {}) {
  const { protecaoGeral: pg, dimensionados, configInstalacao } = calculo
  const numeroFases = configInstalacao.numeroFases
  const folga = informado(folgaPercentual) ? Number(folgaPercentual) : 0
  const comFolga = (metros) => Math.ceil(metros * (1 + folga / 100))
  const tnCS = projeto.esquemaAterramento === 'TN-C-S'

  const trechos = [] // { funcao, secaoMm2, isolacao, metros }
  const eletrodutos = []
  const semComprimento = []

  // Alimentador: fases + neutro (PEN no TN-C-S, que não tem PE separado até o quadro) + PE.
  const secaoFaseAlimentador = pg.condutorFase?.secaoMm2
  if (!informado(projeto.comprimentoRamalEntrada)) semComprimento.push('Alimentador (ramal)')
  else if (secaoFaseAlimentador) {
    const metros = Number(projeto.comprimentoRamalEntrada)
    const isolacao = pg.condutorFase.isolacao
    for (let i = 0; i < numeroFases; i++) trechos.push({ funcao: 'fase', secaoMm2: secaoFaseAlimentador, isolacao, metros })
    trechos.push({ funcao: tnCS ? 'pen' : 'neutro', secaoMm2: pg.secaoNeutroMm2, isolacao, metros })
    if (!tnCS) trechos.push({ funcao: 'pe', secaoMm2: pg.secaoTerraMm2, isolacao, metros })
    const eletroduto = pg.eletroduto?.eletrodutoRecomendado
    if (eletroduto) eletrodutos.push({ referencia: eletroduto.referencia, nominalMm: eletroduto.nominalMm, metros })
  }

  const semSecao = []
  for (const circuito of dimensionados) {
    if (circuito.erro || !circuito.secaoMm2) {
      semSecao.push(circuito.nome)
      continue
    }
    if (!circuito.comprimentoInformado || !(circuito.comprimentoM > 0)) {
      semComprimento.push(circuito.nome)
      continue
    }
    const metros = circuito.comprimentoM
    const { isolacao } = circuito
    trechos.push({ funcao: 'fase', secaoMm2: circuito.secaoMm2, isolacao, metros: circuito.ehFaseFase ? 2 * metros : metros })
    if (!circuito.ehFaseFase) trechos.push({ funcao: 'neutro', secaoMm2: circuito.secaoMm2, isolacao, metros })
    trechos.push({ funcao: 'pe', secaoMm2: circuito.secaoTerraMm2, isolacao, metros })
    const eletroduto = circuito.eletroduto?.eletrodutoRecomendado
    if (eletroduto) eletrodutos.push({ referencia: eletroduto.referencia, nominalMm: eletroduto.nominalMm, metros })
  }

  const cabos = [...agrupar(trechos.map((t) => ({ ...t, quantidade: t.metros })), (t) => `${t.funcao}|${t.secaoMm2}|${t.isolacao}`)]
    .map(({ funcao, secaoMm2, isolacao, quantidade }) => ({
      funcao,
      ...FUNCOES_CONDUTOR[funcao],
      secaoMm2,
      isolacao,
      especificacao: ESPECIFICACAO_CABO[isolacao] ?? ESPECIFICACAO_CABO.pvc,
      metros: comFolga(quantidade),
    }))
    .sort((a, b) => ORDEM_FUNCAO.indexOf(a.funcao) - ORDEM_FUNCAO.indexOf(b.funcao) || a.secaoMm2 - b.secaoMm2)

  const eletrodutosAgrupados = agrupar(
    eletrodutos.map((e) => ({ ...e, quantidade: e.metros })),
    (e) => e.referencia,
  )
    .map(({ referencia, nominalMm, quantidade }) => ({ referencia, nominalMm, metros: comFolga(quantidade) }))
    .sort((a, b) => a.nominalMm - b.nominalMm)

  // Dispositivos: saem da composição do quadro, para bater com a vista do QD e o unifilar.
  const { posicoes, modulos, reserva } = montarQuadro(calculo)
  const curva = projeto.curvaDisjuntorGeral
  const icn = calculo.complementares.capacidadeInterrupcao
  const acimaDecimo = (ka) => (ka ? Math.ceil(ka * 10) / 10 : null)
  // N18 — piso de Icn que a distribuidora escolhida exige do disjuntor geral do padrão de entrada,
  // independente da Icc real do ponto (ver distribuidoras.js). Só eleva o mínimo calculado; nunca
  // reduz, e é ignorado sem distribuidora com esse dado publicado.
  const icnPisoDistribuidora = calculo.demandaConcessionaria?.distribuidora.icnMinimoGeralKA?.(pg.disjuntorGeralA)
  const disjuntores = agrupar(
    posicoes
      .filter((p) => (p.tipo === 'disjuntor' || p.tipo === 'geral') && p.rotulo !== '—')
      .map((p) => {
        const icnMinimoBaseKA = acimaDecimo(p.tipo === 'geral' ? icn?.geralKA : icn?.terminaisKA)
        const icnMinimoKA =
          p.tipo === 'geral' && icnPisoDistribuidora
            ? Math.max(icnMinimoBaseKA ?? 0, icnPisoDistribuidora)
            : icnMinimoBaseKA
        return {
          descricao: `Disjuntor ${p.polos === 1 ? 'unipolar' : `${p.polos} polos`} curva ${curva} ${p.rotulo}`,
          icnMinimoKA,
          icnPadronizadaKA: icnMinimoKA ? (ICN_PADRONIZADAS_KA.find((valor) => valor >= icnMinimoKA) ?? null) : null,
          quantidade: 1,
        }
      }),
    (d) => `${d.descricao}|${d.icnMinimoKA}`,
  )
  const drs = agrupar(
    posicoes.filter((p) => p.tipo === 'dr' && p.rotulo !== '—').map((p) => ({ descricao: `DR ${p.polos} polos ${p.rotulo}`, quantidade: 1 })),
    (d) => d.descricao,
  )
  const dps = calculo.complementares.dps
  const dispositivosDPS = [
    { descricao: `DPS fase–PE: Uc ≥ ${Math.ceil(dps.ucMinimoFaseV)} V, In ≥ ${dps.inMinimoKA} kA, Up ≤ ${decimal(dps.upMaximoKV)} kV`, quantidade: numeroFases },
    { descricao: `DPS neutro–PE: Uc ≥ ${dps.ucMinimoNeutroPeV} V, In ≥ ${dps.inMinimoNeutroPeKA} kA, Up ≤ ${decimal(dps.upMaximoKV)} kV`, quantidade: 1 },
  ]

  // Pontos: tomadas pela previsão de carga; ≥ 1 ponto de luz por cômodo (§9.5.2.1.1).
  const { porComodo } = calcularPrevisaoDeCarga(projeto.comodos, projeto.aplicarAlternativa600VA)
  const pontos = {
    tomadasUsoGeral: porComodo.reduce((soma, comodo) => soma + (comodo.tugQuantidade || 0), 0),
    pontosUsoEspecifico: projeto.comodos.reduce(
      (soma, comodo) => soma + (comodo.tue ?? []).reduce((s, equipamento) => s + (Number(equipamento.quantidade) || 1), 0),
      0,
    ),
    pontosLuz: projeto.comodos.reduce((soma, comodo) => soma + Math.max(1, Number(comodo.iluminacaoQuantidade) || 0), 0),
  }

  return {
    folgaPercentual: folga,
    cabos,
    eletrodutos: eletrodutosAgrupados,
    disjuntores,
    drs,
    dps: dispositivosDPS,
    dpsExigido: Boolean(pg.dps?.exigidaPelaNorma),
    pontos,
    quadro: { modulos, reserva },
    semComprimento,
    semSecao,
  }
}
