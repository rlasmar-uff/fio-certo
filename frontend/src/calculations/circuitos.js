import { calcularCargaComodo, calcularLimite600VA } from './previsaoDeCarga.js'
import {
  POTENCIA_MAXIMA_CIRCUITO_ILUMINACAO_VA,
  POTENCIA_MAXIMA_CIRCUITO_TUG_VA,
} from './constantes.js'

// Agrupa itens (cômodos) em circuitos, respeitando uma potência máxima por circuito — um cômodo
// nunca é dividido entre dois circuitos. First-Fit Decreasing (empacota por ordem de VA
// decrescente, não pela ordem de cadastro): heurística clássica de bin-packing, nunca usa mais
// que ~11/9 do ótimo + 1 caixa, O(n log n), sem risco de explosão combinatória de uma busca
// exata de partição (desnecessária aqui — a norma não exige um número mínimo de circuitos, só o
// teto de VA por circuito, respeitado abaixo independente da ordem de empacotamento).
function agruparEmCircuitos(itens, potenciaMaximaVA, tipo, slugBase, nomeBase, tensaoFaseNeutro) {
  const itensValidos = itens
    .map((item, indiceOriginal) => ({ ...item, indiceOriginal }))
    .filter((item) => item.va > 0)
  if (itensValidos.length === 0) return []

  const ordenadosPorVA = [...itensValidos].sort((a, b) => b.va - a.va)

  // FIRST-fit, não next-fit: procura em TODOS os grupos já abertos (não só o último), e só abre
  // um novo quando nenhum tem espaço. É essa varredura que sustenta a cota de ~11/9 do ótimo —
  // um algoritmo que só olhasse pro grupo mais recente (next-fit) teria uma cota bem pior (2×).
  const grupos = []
  ordenadosPorVA.forEach((item) => {
    const grupoComEspaco = grupos.find((grupo) => grupo.va + item.va <= potenciaMaximaVA)
    if (grupoComEspaco) {
      grupoComEspaco.itens.push(item)
      grupoComEspaco.va += item.va
    } else {
      grupos.push({ itens: [item], va: item.va })
    }
  })

  // Reordena os grupos de SAÍDA pela posição de cadastro mais antiga entre seus membros — só
  // pra exibição ficar previsível ("Iluminação 1" tende a ter os primeiros cômodos cadastrados);
  // não afeta o empacotamento em si, decidido acima por tamanho (FFD).
  grupos.sort(
    (a, b) =>
      Math.min(...a.itens.map((item) => item.indiceOriginal)) - Math.min(...b.itens.map((item) => item.indiceOriginal)),
  )

  return grupos.map((grupo, indice) => ({
    // ID derivado do CONJUNTO de cômodos do grupo (ordenado, então independe da ordem interna),
    // não da posição de saída — reordenar/remover um cômodo em OUTRO grupo não muda o ID de um
    // grupo cuja composição não mudou, então um comprimento/método já digitado continua válido.
    // Se a composição do próprio grupo mudar, o ID muda — o valor antigo fica órfão (não é
    // reaplicado a um circuito diferente por engano). Ver FUTURO.md.
    id: `${slugBase}-${grupo.itens.map((item) => item.comodoId).sort().join('_')}`,
    nome: grupos.length > 1 ? `${nomeBase} ${indice + 1}` : nomeBase,
    tipo,
    potenciaVA: grupo.va,
    tensao: tensaoFaseNeutro,
    ehFaseFase: false,
    // Iluminação e TUG são tratadas como carga resistiva (cosφ = 1) nesta versão.
    cosPhi: 1,
    tipoCarga: 'resistiva',
    comodos: grupo.itens.map((item) => item.nome),
  }))
}

// configInstalacao vem de resolverConfigInstalacao(tipoInstalacao, tensaoFaseNeutro) —
// define a tensão fase-neutro (sempre existe) e fase-fase (só em bi/trifásico) do projeto.
// `aplicarAlternativa600VA` (default `false`) é a mesma declaração opt-in do usuário usada em
// `calcularPrevisaoDeCarga` — ver comentário de `calcularLimite600VA`.
export function gerarCircuitos(comodos, configInstalacao, aplicarAlternativa600VA = false) {
  const { tensaoFaseNeutro, tensaoFaseFase, permiteFaseFase } = configInstalacao
  const limite600VA = calcularLimite600VA(comodos, aplicarAlternativa600VA)
  const cargas = comodos.map((comodo) => ({ comodo, carga: calcularCargaComodo(comodo, limite600VA) }))

  const circuitosIluminacao = agruparEmCircuitos(
    cargas.map(({ comodo, carga }) => ({ comodoId: comodo.id, nome: comodo.nome, va: carga.iluminacaoVA })),
    POTENCIA_MAXIMA_CIRCUITO_ILUMINACAO_VA,
    'iluminacao',
    'iluminacao',
    'Iluminação',
    tensaoFaseNeutro,
  )

  const cargasServico = cargas.filter(({ comodo }) => comodo.tipo === 'servico')
  const cargasGeral = cargas.filter(({ comodo }) => comodo.tipo !== 'servico')

  const circuitosTugServico = agruparEmCircuitos(
    cargasServico.map(({ comodo, carga }) => ({ comodoId: comodo.id, nome: comodo.nome, va: carga.tugVA })),
    POTENCIA_MAXIMA_CIRCUITO_TUG_VA,
    'tug',
    'tug-servico',
    'TUG — Cozinha/Área de serviço',
    tensaoFaseNeutro,
  )

  const circuitosTugGeral = agruparEmCircuitos(
    cargasGeral.map(({ comodo, carga }) => ({ comodoId: comodo.id, nome: comodo.nome, va: carga.tugVA })),
    POTENCIA_MAXIMA_CIRCUITO_TUG_VA,
    'tug',
    'tug-geral',
    'TUG — Salas/Dormitórios/Banheiros',
    tensaoFaseNeutro,
  )

  // NBR 5410 §9.5.3.1 exige circuito dedicado apenas para equipamento com corrente nominal
  // acima de 10 A — esta ferramenta dedica um circuito a TODO equipamento cadastrado como TUE,
  // independente da corrente, como simplificação conservadora (mais seguro, nunca menos). Por
  // isso "quantidade" gera um circuito por unidade (2 chuveiros = 2 circuitos), não um só somado.
  const circuitosTue = comodos.flatMap((comodo) =>
    (comodo.tue ?? []).flatMap((equipamento) => {
      const quantidade = Number(equipamento.quantidade) || 1
      const cosPhi = Number(equipamento.cosPhi) || 1
      const potenciaAtivaW = Number(equipamento.potenciaW) || 0
      // Potência aparente (VA) = potência ativa (W) / cosφ — para carga resistiva pura
      // (cosφ = 1) os dois valores coincidem; para motores/compressores, a corrente real
      // é maior que P/V sozinho sugeriria.
      const potenciaVA = cosPhi > 0 ? potenciaAtivaW / cosPhi : potenciaAtivaW
      // "fase-fase" só é válido se a instalação realmente tiver mais de uma fase disponível
      // (numa monofásica não existe fase-fase — cai de volta pra fase-neutro por segurança).
      const ehFaseFase = equipamento.ligacao === 'fase-fase' && permiteFaseFase
      const tensao = ehFaseFase ? tensaoFaseFase : tensaoFaseNeutro

      return Array.from({ length: quantidade }, (_, indice) => ({
        id: `tue-${comodo.id}-${equipamento.id}-${indice + 1}`,
        nome: quantidade > 1 ? `${equipamento.nome} ${indice + 1} (${comodo.nome})` : `${equipamento.nome} (${comodo.nome})`,
        tipo: 'tue',
        potenciaVA,
        tensao,
        ehFaseFase,
        cosPhi,
        tipoCarga: equipamento.tipoCarga ?? 'resistiva',
        comodos: [comodo.nome],
        // referência de volta ao equipamento de origem (cômodo + equipamento cadastrados).
        comodoId: comodo.id,
        equipamentoId: equipamento.id,
      }))
    }),
  )

  return [...circuitosIluminacao, ...circuitosTugServico, ...circuitosTugGeral, ...circuitosTue].filter(
    (circuito) => circuito.potenciaVA > 0,
  )
}

// Circuitos fase-fase ocupam 2 fases simultaneamente E a MESMA corrente passa pelas duas
// (I = S / V_fase-fase) — não metade dela. Referida à tensão fase-neutro (V_ff = V_fn·√3), essa
// corrente equivale a uma carga de S/√3 em CADA fase, não S/2 (dividir por 2 subestimaria a
// corrente real em ~15,5%).
const CONTRIBUICAO_FASE_FASE = Math.sqrt(3)

// Se o espaço de estados da busca crescer demais (entradas muito heterogêneas, sem VAs repetidos
// — o pior caso de uma busca exata por soma), desiste da busca exata e cai no guloso. Checado A
// CADA circuito processado (não só uma vez no início) — é esse teto, sozinho, que protege contra
// explosão combinatória; não existe mais um teto separado por NÚMERO de circuitos (havia um teto
// de 24, removido: com estado representado por parent-pointer — ver abaixo — o custo por
// iteração é O(estados≤4000 × ramificações≤3), independente de quantos circuitos existem, então
// um teto adicional por contagem não protegia nada que este já não protegesse).
const LIMITE_ESTADOS_BUSCA_EXATA = 4000

// Busca exata (programação dinâmica) da atribuição circuito→fase(s) que MINIMIZA o desequilíbrio
// (maior fase − menor fase), em vez do guloso "sempre a fase mais vazia até agora" (que é bom na
// prática mas não é ótimo). Estado = cargas acumuladas nas fases A e B; a carga da fase C (só
// existe com 3 fases) é sempre `totalAcumulado − a − b`, então não precisa ser rastreada à parte
// — isso mantém o estado em 2 dimensões em vez de 3. Cada circuito fase-neutro escolhe 1 fase;
// cada fase-fase escolhe um PAR de fases (as duas que ocupa ao mesmo tempo). Retorna `null` se o
// espaço de busca estourar o limite — quem chama cai no guloso nesse caso.
//
// Cada estado guarda só a CHAVE do estado anterior (`chavePai`) e a escolha que levou até ele
// (`ultimaEscolha`) — não o histórico inteiro de escolhas (isso copiaria um array cada vez maior
// a cada novo estado, custando O(k) na k-ésima iteração e O(N²·estados) no total). A atribuição
// vencedora é reconstruída com um único backtrack O(N) no final, andando de trás pra frente pelos
// níveis guardados em `niveis`.
function resolverAtribuicaoExata(ordenados, numeroFases) {
  const niveis = []
  let estados = new Map([['0,0', { a: 0, b: 0, chavePai: null, ultimaEscolha: null }]])
  let totalAcumulado = 0

  for (const circuito of ordenados) {
    const contribuicao = circuito.ehFaseFase ? circuito.potenciaVA / CONTRIBUICAO_FASE_FASE : circuito.potenciaVA
    totalAcumulado += circuito.ehFaseFase ? contribuicao * 2 : contribuicao

    const opcoesFases = circuito.ehFaseFase
      ? numeroFases === 3
        ? [[0, 1], [0, 2], [1, 2]]
        : [[0, 1]]
      : numeroFases === 3
        ? [[0], [1], [2]]
        : [[0], [1]]

    const proximosEstados = new Map()
    for (const [chaveAtual, estado] of estados) {
      for (const fases of opcoesFases) {
        const a = estado.a + (fases.includes(0) ? contribuicao : 0)
        const b = estado.b + (fases.includes(1) ? contribuicao : 0)
        const chave = `${a.toFixed(2)},${b.toFixed(2)}`
        if (proximosEstados.has(chave)) continue
        proximosEstados.set(chave, { a, b, chavePai: chaveAtual, ultimaEscolha: fases })
      }
    }
    if (proximosEstados.size > LIMITE_ESTADOS_BUSCA_EXATA) return null
    niveis.push(proximosEstados)
    estados = proximosEstados
  }

  let melhorImbalance = Infinity
  let melhorChave = null
  for (const [chave, estado] of estados) {
    const c = numeroFases === 3 ? totalAcumulado - estado.a - estado.b : 0
    const cargas = numeroFases === 3 ? [estado.a, estado.b, c] : [estado.a, estado.b]
    const imbalance = Math.max(...cargas) - Math.min(...cargas)
    if (imbalance < melhorImbalance - 1e-9) {
      melhorImbalance = imbalance
      melhorChave = chave
    }
  }

  const escolhas = new Array(ordenados.length)
  let chaveAtual = melhorChave
  for (let nivel = niveis.length - 1; nivel >= 0; nivel -= 1) {
    const estado = niveis[nivel].get(chaveAtual)
    escolhas[nivel] = estado.ultimaEscolha
    chaveAtual = estado.chavePai
  }

  const porId = new Map()
  ordenados.forEach((circuito, indice) => porId.set(circuito.id, escolhas[indice]))
  return porId
}

// Processa da maior para a menor potência primeiro (só importa para o guloso — a busca exata é
// insensível à ordem), e guarda o "antes/depois" de cada decisão para poder explicar o resultado.
export function balancearFases(circuitos, numeroFases) {
  const cargaPorFase = Array.from({ length: numeroFases }, () => 0)
  const decisoesPorId = new Map()

  const ordenados = [...circuitos].sort((a, b) => b.potenciaVA - a.potenciaVA)
  const atribuicaoExata = numeroFases > 1 ? resolverAtribuicaoExata(ordenados, numeroFases) : null

  ordenados.forEach((circuito, indice) => {
    const cargasAntes = [...cargaPorFase]

    if (numeroFases === 1 || !circuito.ehFaseFase) {
      let indicesFase
      if (atribuicaoExata) {
        indicesFase = atribuicaoExata.get(circuito.id)
      } else {
        let indiceMenorCarga = 0
        for (let i = 1; i < numeroFases; i += 1) {
          if (cargaPorFase[i] < cargaPorFase[indiceMenorCarga]) indiceMenorCarga = i
        }
        indicesFase = [indiceMenorCarga]
      }
      indicesFase.forEach((i) => {
        cargaPorFase[i] += circuito.potenciaVA
      })
      decisoesPorId.set(circuito.id, {
        ordem: indice + 1,
        fases: indicesFase.map((i) => i + 1),
        cargasAntes,
        contribuicaoPorFase: circuito.potenciaVA,
      })
      return
    }

    let par
    if (atribuicaoExata) {
      par = atribuicaoExata.get(circuito.id)
    } else {
      let melhorPar = [0, 1]
      let melhorSoma = Infinity
      for (let i = 0; i < numeroFases; i += 1) {
        for (let j = i + 1; j < numeroFases; j += 1) {
          const soma = cargaPorFase[i] + cargaPorFase[j]
          if (soma < melhorSoma) {
            melhorSoma = soma
            melhorPar = [i, j]
          }
        }
      }
      par = melhorPar
    }
    const contribuicaoPorFase = circuito.potenciaVA / CONTRIBUICAO_FASE_FASE
    cargaPorFase[par[0]] += contribuicaoPorFase
    cargaPorFase[par[1]] += contribuicaoPorFase
    decisoesPorId.set(circuito.id, {
      ordem: indice + 1,
      fases: par.map((i) => i + 1),
      cargasAntes,
      contribuicaoPorFase,
    })
  })

  const circuitosComFase = circuitos.map((circuito) => {
    const decisao = decisoesPorId.get(circuito.id)
    return { ...circuito, fases: decisao.fases, decisaoFase: decisao }
  })

  // Ordem de exibição da explicação = ordem de processamento (maior pra menor potência).
  const explicacoes = [...circuitosComFase].sort((a, b) => a.decisaoFase.ordem - b.decisaoFase.ordem)

  return { circuitosComFase, cargaPorFase, explicacoes, balanceamentoExato: atribuicaoExata !== null }
}

// Ângulos de referência das fases (rotação A-B-C padrão) — fase 1 (A) = 0°, fase 2 (B) = -120°,
// fase 3 (C) = +120°. Bifásico usa só A/B (mesma convenção já usada em `resolverAtribuicaoExata`
// pra numeroFases===2: índices de fase 0 e 1, nunca 2).
const ANGULO_FASE_GRAUS = [0, -120, 120]

function paraRadianos(graus) {
  return (graus * Math.PI) / 180
}

// Corrente complexa (parte real/imaginária) vista de um terminal com tensão de referência de
// módulo `tensaoV` e ângulo `anguloRad`, pra uma carga de potência ativa `potenciaAtivaW` e
// reativa `potenciaReativaVAr` (sinal já aplicado — positiva pra indutiva, negativa pra
// capacitiva). Derivação: S = V·I* ⟹ I = S*/V*, e 1/V* = V/|V|² (V real seria trivial, mas V é
// complexo aqui) ⟹ Re(I) = (P·cosθ + Q·senθ)/V, Im(I) = (P·senθ − Q·cosθ)/V.
function correnteComplexa(potenciaAtivaW, potenciaReativaVAr, tensaoV, anguloRad) {
  return {
    re: (potenciaAtivaW * Math.cos(anguloRad) + potenciaReativaVAr * Math.sin(anguloRad)) / tensaoV,
    im: (potenciaAtivaW * Math.sin(anguloRad) - potenciaReativaVAr * Math.cos(anguloRad)) / tensaoV,
  }
}

// Cálculo vetorial completo da corrente em cada fase e no neutro, a partir da atribuição de fases
// já decidida por `balancearFases` (`circuitosComFase`, com `.fases` 1-based por circuito) — usa
// cosφ/tipoCarga já coletados por circuito (nenhum dado novo do usuário), em vez de somar VA
// escalarmente por fase (que ignora o ângulo entre circuitos com fatores de potência diferentes
// numa mesma fase, e nunca calcula a corrente real do neutro).
//
// Prova de que a soma vetorial das 3 correntes de fase é a corrente real do neutro: KCL na fonte
// (região fechada pelos 4 condutores A/B/C/N) dá I_A+I_B+I_C+I_N=0 sempre, qualquer topologia de
// carga — não precisa decompor por tipo de circuito. Um circuito fase-fase entre X e Y contribui
// +I num acumulador e −I no outro (mesma malha, uma corrente só, nunca passa pelo neutro); a soma
// dessa contribuição nos 3 acumuladores é sempre 0, então ela se cancela sozinha e só sobra a
// contribuição líquida dos circuitos fase-neutro — por isso não precisa de um caso especial pra
// excluir fase-fase da conta do neutro, o resultado já sai certo incluindo todo mundo.
//
// Importante: a tensão fase-fase de um par (X,Y) é calculada por SUBTRAÇÃO DIRETA de componentes
// (Vxy = Vx − Vy), nunca por um atalho de ângulo fixo tipo "30° à frente de X" — esse atalho só
// vale pra pares adjacentes na rotação A-B-C (A-B, B-C) e erra o sinal do ângulo em 60° pro par
// A-C (que anda "pra trás" na rotação) — e A-C é uma saída normal de `resolverAtribuicaoExata`/do
// guloso, não um caso raro.
//
// Casos de sanidade conferidos à mão antes de codificar (replicados no harness, G15): 3 cargas
// resistivas iguais, uma por fase → corrente do neutro ≈ 0; uma única carga sozinha numa fase →
// corrente do neutro = exatamente a corrente dessa fase; duas cargas resistivas iguais em 2 fases
// (a 3ª vazia) → corrente do neutro = a mesma magnitude de UMA fase isolada, não a soma nem o
// produto por √3 (trigonometria de fasores a 120°, `|Ia+Ib|²=Ia²+Ib²+2·Ia·Ib·cos120°`).
//
// A corrente por fase resultante (`correntePorFaseA`) só pode ficar MENOR OU IGUAL à soma escalar
// de VA/tensão usada antes desta função existir (desigualdade triangular: |ΣI| ≤ Σ|I|, e a soma
// escalar É exatamente Σ|I| por fase) — nunca maior, pra a mesma atribuição de fases. Fisicamente
// correto (o método anterior era conservador demais quando os fatores de potência divergem), mas
// pode fazer o disjuntor geral/condutor de fase recomendado cair de tamanho num projeto existente.
export function calcularCorrentesVetoriais(circuitosComFase, numeroFases, tensaoFaseNeutro) {
  const acumuladores = Array.from({ length: numeroFases }, () => ({ re: 0, im: 0 }))

  circuitosComFase.forEach((circuito) => {
    const cosPhi = circuito.cosPhi ?? 1
    const senPhi = Math.sqrt(Math.max(0, 1 - cosPhi * cosPhi))
    // Mesma convenção de sinal de quedaDeTensao.js: só capacitiva inverte o sinal da reativa.
    const sinal = circuito.tipoCarga === 'capacitiva' ? -1 : 1
    const potenciaAtivaW = circuito.potenciaVA * cosPhi
    const potenciaReativaVAr = circuito.potenciaVA * senPhi * sinal
    const indicesFase = circuito.fases.map((fase) => fase - 1)

    if (indicesFase.length === 1) {
      const anguloRad = paraRadianos(ANGULO_FASE_GRAUS[indicesFase[0]])
      const corrente = correnteComplexa(potenciaAtivaW, potenciaReativaVAr, tensaoFaseNeutro, anguloRad)
      acumuladores[indicesFase[0]].re += corrente.re
      acumuladores[indicesFase[0]].im += corrente.im
      return
    }

    const [x, y] = indicesFase
    const anguloX = paraRadianos(ANGULO_FASE_GRAUS[x])
    const anguloY = paraRadianos(ANGULO_FASE_GRAUS[y])
    const tensaoReferenciaRe = tensaoFaseNeutro * (Math.cos(anguloX) - Math.cos(anguloY))
    const tensaoReferenciaIm = tensaoFaseNeutro * (Math.sin(anguloX) - Math.sin(anguloY))
    const tensaoFaseFase = Math.sqrt(tensaoReferenciaRe * tensaoReferenciaRe + tensaoReferenciaIm * tensaoReferenciaIm)
    const anguloFaseFase = Math.atan2(tensaoReferenciaIm, tensaoReferenciaRe)
    const corrente = correnteComplexa(potenciaAtivaW, potenciaReativaVAr, tensaoFaseFase, anguloFaseFase)
    // Uma malha só entre X e Y — a mesma corrente "sai" de uma fase e "volta" pela outra.
    acumuladores[x].re += corrente.re
    acumuladores[x].im += corrente.im
    acumuladores[y].re -= corrente.re
    acumuladores[y].im -= corrente.im
  })

  const correntePorFaseA = acumuladores.map((acumulador) => Math.sqrt(acumulador.re ** 2 + acumulador.im ** 2))
  const somaRe = acumuladores.reduce((total, acumulador) => total + acumulador.re, 0)
  const somaIm = acumuladores.reduce((total, acumulador) => total + acumulador.im, 0)
  const correnteNeutroA = Math.sqrt(somaRe ** 2 + somaIm ** 2)

  return { correntePorFaseA, correnteNeutroA }
}
