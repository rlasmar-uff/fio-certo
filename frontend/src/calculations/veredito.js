import { TIPOS_COMODO } from './constantes.js'
import { calcularPrevisaoDeCarga } from './previsaoDeCarga.js'

// Veredito geral do projeto: o que é não conforme (vermelho), o que ficou sem verificar por falta
// de dado (âmbar) e, para cada item, a etapa onde se resolve. Nada aqui calcula norma — só reúne
// o que o motor já decidiu.

// Situação de um circuito terminal dimensionado, em [variante da etiqueta, texto].
export function situacaoCircuito(circuito) {
  if (circuito.erro) return ['alerta', 'sem seção viável']
  if (circuito.curtoCircuito.verificado && !circuito.curtoCircuito.conforme) return ['alerta', 'curto-circuito']
  if (circuito.eletroduto?.erro && circuito.eletroduto.areaCondutoresMm2 !== null) return ['alerta', 'eletroduto']
  if (circuito.seccionamento?.conforme === false) return ['alerta', 'seccionamento']
  if (circuito.naoVerificado) return ['atencao', 'falta comprimento']
  return ['ok', 'conforme']
}

// Números principais do projeto, em [rótulo, valor], para o topo do Resultado e do Memorial.
export function destaquesProjeto(projeto, calculo) {
  const { protecaoGeral, dimensionados } = calculo
  const { totais } = calcularPrevisaoDeCarga(projeto.comodos, projeto.aplicarAlternativa600VA)
  const { drs, idr, condutorFase, secaoNeutroMm2, secaoTerraMm2, disjuntorGeralA } = protecaoGeral
  const dr =
    drs.modo === 'grupos'
      ? `${drs.grupos.length} DR(s) de 30 mA${idr ? ` + ${idr.sensibilidadeMA} mA tipo S` : ''}`
      : idr?.correnteA
        ? `${idr.correnteA} A · ${idr.sensibilidadeMA} mA`
        : '—'
  return [
    ['Carga prevista', `${Math.round(totais.totalVA)} VA`],
    ['Circuitos', String(dimensionados.length)],
    ['Disjuntor geral', disjuntorGeralA ? `${disjuntorGeralA} A` : '—'],
    ['Proteção diferencial', dr],
    ['Alimentador (fase/neutro/PE)', condutorFase.secaoMm2 ? `${condutorFase.secaoMm2}/${secaoNeutroMm2}/${secaoTerraMm2} mm²` : '—'],
  ]
}

// Entradas ausentes ou inválidas. O motor nunca "conserta" um dado em silêncio a favor do
// projeto: ausente vira pendência (não verificado); inválido vira problema.
const vazio = (valor) => valor === '' || valor === null || valor === undefined
export function avaliarEntradas(projeto, config = null) {
  const invalidos = []
  const ausentes = []
  const numeroInvalido = (valor, { exclusivoZero = false } = {}) => {
    if (vazio(valor)) return false
    const n = Number(valor)
    return !Number.isFinite(n) || (exclusivoZero ? n <= 0 : n < 0)
  }
  if (!projeto.comodos.length) ausentes.push('Nenhum cômodo cadastrado')
  for (const comodo of projeto.comodos) {
    const nome = comodo.nome || 'Cômodo sem nome'
    if (!TIPOS_COMODO[comodo.tipo]) invalidos.push(`${nome}: tipo de cômodo desconhecido`)
    if (vazio(comodo.area)) ausentes.push(`${nome}: área não informada`)
    else if (numeroInvalido(comodo.area, { exclusivoZero: true })) invalidos.push(`${nome}: área inválida`)
    if (!vazio(comodo.tugPontos) && Number.isFinite(Number(comodo.tugPontos)) && !Number.isInteger(Number(comodo.tugPontos))) invalidos.push(`${nome}: número de pontos de tomada fracionário`)
    if (comodo.excecaoLocalizacao && !String(comodo.excecaoMotivo ?? '').trim()) ausentes.push(`${nome}: exceção de localização escolhida sem o motivo registrado (3.1 e 4.2 do compilado)`)
    const usaPerimetro = TIPOS_COMODO[comodo.tipo]?.tugFixa === undefined
    if (usaPerimetro && vazio(comodo.perimetro)) ausentes.push(`${nome}: perímetro não informado (tomadas mínimas)`)
    else if (numeroInvalido(comodo.perimetro)) invalidos.push(`${nome}: perímetro inválido`)
    for (const equipamento of comodo.tue ?? []) {
      const rotulo = `${nome} · ${equipamento.nome || 'equipamento sem nome'}`
      const potenciaIndefinida = vazio(equipamento.potenciaW) && Number(equipamento.tensaoV) > 0 && Number(equipamento.correnteNominalA) > 0
      if (potenciaIndefinida) ausentes.push(`${rotulo}: potência indefinida — adotada S = U·I a partir da corrente nominal (hipótese de 4.2.1.2.3 c)`)
      else if (vazio(equipamento.potenciaW)) ausentes.push(`${rotulo}: potência não informada (equipamento fora do cálculo)`)
      else if (numeroInvalido(equipamento.potenciaW, { exclusivoZero: true })) invalidos.push(`${rotulo}: potência inválida`)
      const quantidade = Number(equipamento.quantidade)
      if (!vazio(equipamento.quantidade) && !(Number.isInteger(quantidade) && quantidade >= 1)) invalidos.push(`${rotulo}: quantidade inválida`)
      if (!vazio(equipamento.cosPhi) && !(Number(equipamento.cosPhi) > 0 && Number(equipamento.cosPhi) <= 1)) invalidos.push(`${rotulo}: fator de potência fora de (0, 1]`)
      if (!vazio(equipamento.rendimento) && !(Number(equipamento.rendimento) > 0 && Number(equipamento.rendimento) <= 1)) invalidos.push(`${rotulo}: rendimento fora de (0, 1]`)
      if (equipamento.tipoPotencia === 'saida' && !(Number(equipamento.rendimento) > 0 && Number(equipamento.rendimento) <= 1)) invalidos.push(`${rotulo}: potência de saída exige o rendimento (não se assume valor)`)
      if (equipamento.tipoCarga && equipamento.tipoCarga !== 'resistiva' && vazio(equipamento.cosPhi)) ausentes.push(`${rotulo}: fator de potência não informado`)
      if (equipamento.aquecedorAgua && equipamento.conexao === 'tomada') invalidos.push(`${rotulo}: aquecedor elétrico de água deve ter conexão direta, sem tomada (9.5.2.3)`)
      if (equipamento.conexao === 'tomada' && Number(equipamento.distanciaM) > 1.5) invalidos.push(`${rotulo}: ponto de tomada a mais de 1,5 m do equipamento (4.2.1.2.3 d)`)
      if (equipamento.motor && !(Number(equipamento.correntePartidaA) > 0)) ausentes.push(`${rotulo}: motor sem a corrente de partida — queda na partida (10%) não verificada (6.5.1.3.3)`)
      if (config && Number(equipamento.tensaoV) > 0) {
        const tensaoDaLigacao = equipamento.ligacao === 'fase-fase' && config.permiteFaseFase ? config.tensaoFaseFase : config.tensaoFaseNeutro
        if (Number(equipamento.tensaoV) !== tensaoDaLigacao) invalidos.push(`${rotulo}: tensão do equipamento (${equipamento.tensaoV} V) incompatível com a ligação (${tensaoDaLigacao} V)`)
      }
    }
  }
  for (const [id, valor] of Object.entries(projeto.comprimentos ?? {})) {
    if (numeroInvalido(valor)) invalidos.push(`Circuito ${id}: comprimento inválido`)
  }
  if (numeroInvalido(projeto.comprimentoRamalEntrada)) invalidos.push('Comprimento do ramal inválido')
  return { invalidos, ausentes }
}

// O que esta ferramenta NÃO verifica, sempre — independente dos dados informados. Aparece junto do
// veredito (inclusive no memorial) para que "conforme" nunca seja lido como aprovação integral.
export const LIMITACOES_FERRAMENTA = [
  'Energia passante (I²t ≤ k²S²) nos circuitos de seção abaixo de 10 mm²: a Tabela 30 (NOTA 1) não normaliza o fator k nessa faixa — quase todo circuito terminal residencial.',
  'Curva tempo-corrente real do disjuntor: só o limite superior da faixa magnética da IEC 60898 (B 5·In, C 10·In, D 20·In) é usado; abaixo dele o disparo fica "não verificado".',
  'Seletividade entre dispositivos de proteção e coordenação de DPS em cascata.',
  'Harmônicas além da 3ª ordem e neutro de seção maior que a fase (Anexo F), quando a taxa de 3ª harmônica passa de 33%.',
  'Tipo do DR (AC/A/B) em relação às cargas, e a verificação em campo (continuidade, isolação, resistência de aterramento).',
  'Padrão de entrada e exigências das distribuidoras: só informativo.',
  'A reatância dos condutores vem de catálogo de fabricante (a NBR 5410 não a tabela).',
]

export function calcularVeredito(projeto, calculo) {
  const { dimensionados, protecaoGeral, complementares, seccionamento } = calculo
  const problemas = []
  const pendencias = []
  const contar = (lista, condicao) => lista.filter(condicao).length

  const entradas = avaliarEntradas(projeto, calculo.configInstalacao ?? null)
  for (const texto of entradas.invalidos) problemas.push({ texto: `Dado inválido — ${texto}`, etapa: 'comodos' })
  for (const texto of entradas.ausentes) pendencias.push({ texto: `Dado ausente — ${texto}`, etapa: 'comodos' })

  const circuitosNaoConformes = contar(dimensionados, (circuito) => situacaoCircuito(circuito)[0] === 'alerta')
  if (circuitosNaoConformes) problemas.push({ texto: `${circuitosNaoConformes} circuito(s) não conforme(s)`, etapa: 'dimensionamento' })
  if (protecaoGeral.condutorFase.erro) problemas.push({ texto: 'Alimentador sem seção viável', etapa: 'resultado' })
  if (protecaoGeral.verificacaoNeutro.conforme === false) problemas.push({ texto: 'Neutro do alimentador abaixo da corrente real', etapa: 'instalacao' })
  if (protecaoGeral.curtoCircuito.verificado && !protecaoGeral.curtoCircuito.conforme)
    problemas.push({ texto: 'Alimentador não suporta o curto-circuito', etapa: 'instalacao' })
  if (complementares.pen?.conforme === false) problemas.push({ texto: 'PEN abaixo de 10 mm²', etapa: 'instalacao' })
  if (seccionamento.tt?.conforme === false) problemas.push({ texto: 'RA acima do limite do TT', etapa: 'instalacao' })
  if (seccionamento.alimentador?.conforme === false) problemas.push({ texto: 'Seccionamento do alimentador', etapa: 'instalacao' })
  const bancadas = contar(complementares.bancadas, (bancada) => bancada.conforme === false)
  if (bancadas) problemas.push({ texto: `${bancadas} cozinha(s) com menos de 2 tomadas na bancada`, etapa: 'comodos' })
  // §9.5.2.1.2 / §9.5.2.2.1 — carga de iluminação ou número de tomadas informados à mão abaixo do
  // mínimo da norma. Antes só aparecia como aviso no cartão do cômodo e o veredito dizia "conforme".
  const { porComodo } = calcularPrevisaoDeCarga(projeto.comodos, projeto.aplicarAlternativa600VA)
  const iluminacaoAbaixo = porComodo.filter((carga) => carga.iluminacaoAbaixoDoMinimo).map((carga) => carga.nome)
  if (iluminacaoAbaixo.length)
    problemas.push({ texto: `Iluminação abaixo do mínimo da norma (§9.5.2.1.2): ${iluminacaoAbaixo.join(', ')}`, etapa: 'comodos' })
  const tugAbaixo = porComodo.filter((carga) => carga.tugAbaixoDoMinimo).map((carga) => carga.nome)
  if (tugAbaixo.length)
    problemas.push({ texto: `Menos tomadas que o mínimo da norma (§9.5.2.2.1): ${tugAbaixo.join(', ')}`, etapa: 'comodos' })
  const { sauna, pontosNaoConformes } = calculo.locaisEspeciais
  if (sauna?.comTomada.length) problemas.push({ texto: `Tomada dentro da sauna (${sauna.comTomada.join(', ')})`, etapa: 'comodos' })
  if (pontosNaoConformes?.length)
    problemas.push({ texto: `${pontosNaoConformes.length} ponto(s) elétrico(s) no volume errado do banheiro`, etapa: 'comodos' })
  const percursos = dimensionados.filter((circuito) => circuito.percurso?.conforme === false).map((circuito) => circuito.nome)
  if (calculo.protecaoGeral.percurso?.conforme === false) percursos.unshift('alimentador')
  if (percursos.length) problemas.push({ texto: `Percurso do eletroduto: ${percursos.join(', ')}`, etapa: 'dimensionamento' })
  const existentes = dimensionados.filter((circuito) => circuito.existente?.conforme === false)
  if (existentes.length)
    problemas.push({
      texto: `Instalação existente: ${existentes.map((circuito) => `${circuito.nome} (${circuito.existente.falhas.join(', ')})`).join('; ')}`,
      etapa: 'dimensionamento',
    })

  if (projeto.comprimentoRamalEntrada === '') pendencias.push({ texto: 'Comprimento do ramal de entrada', etapa: 'instalacao' })
  const semComprimento = contar(dimensionados, (circuito) => circuito.naoVerificado)
  if (semComprimento) pendencias.push({ texto: `${semComprimento} circuito(s) sem comprimento (queda de tensão)`, etapa: 'circuitos' })
  if (!projeto.iccPresumidaA) pendencias.push({ texto: 'Icc presumida (curto-circuito e capacidade de interrupção)', etapa: 'instalacao' })
  if (!seccionamento.esquema) pendencias.push({ texto: 'Esquema de aterramento (seccionamento automático)', etapa: 'instalacao' })
  else {
    const seccNaoVerificado = contar(dimensionados, (circuito) => circuito.seccionamento && !circuito.seccionamento.verificado)
    if (seccNaoVerificado) pendencias.push({ texto: `Seccionamento automático não verificado em ${seccNaoVerificado} circuito(s)`, etapa: seccionamento.esquema === 'TT' ? 'instalacao' : 'circuitos' })
  }
  const bancadasSemInformar = contar(complementares.bancadas, (bancada) => bancada.conforme === null)
  if (bancadasSemInformar) pendencias.push({ texto: 'Tomadas da bancada da pia', etapa: 'comodos' })
  if (protecaoGeral.drs.avisoIntempestivo) pendencias.push({ texto: 'DR único para todos os circuitos (risco de disparo por fuga somada)', etapa: 'circuitos' })
  // Tabela 59, NOTA — reserva do quadro no cálculo do alimentador.
  if (!calculo.reservaAlimentador?.considerada)
    pendencias.push({ texto: 'Reserva do quadro (Tabela 59) não considerada no alimentador: informe a potência por circuito de reserva', etapa: 'instalacao' })
  // §6.2.5.6.1 — sem a taxa de 3ª harmônica declarada, o neutro não é contado como carregado (fator
  // 0,86) nem reduzido; o alimentador trifásico fica sem essa verificação.
  if (protecaoGeral.correntePorFaseA.length === 3 && projeto.terceiraHarmonica === 'nao-declarado')
    pendencias.push({ texto: 'Taxa de 3ª harmônica não declarada (neutro carregado, §6.2.5.6.1)', etapa: 'instalacao' })
  // Ikmin: sem a Icc fase-neutro, o laço parte da trifásica — premissa, não dado.
  if (projeto.iccPresumidaA && !projeto.iccFaseNeutroA)
    pendencias.push({ texto: 'Icc fase-neutro não informada: Ikmin e seccionamento partem da Icc trifásica (premissa)', etapa: 'instalacao' })
  // S7 e S8 — itens do compilado que o motor calcula e o veredito precisa expor.
  for (const grupo of calculo.agrupamentos ?? []) grupo.problemas.forEach((texto) => problemas.push({ texto: `Agrupamento ${grupo.nome || grupo.id}: ${texto}`, etapa: 'dimensionamento' }))
  for (const c of dimensionados) {
    if (c.partida?.informada && c.partida.conforme === false) problemas.push({ texto: `${c.nome}: queda na partida do motor ${c.partida.quedaTotalPercentual.toFixed(2)}% acima de 10% (6.5.1.3.3)`, etapa: 'dimensionamento' })
    if (c.sobrecarga && c.sobrecarga.conforme === null) pendencias.push({ texto: `${c.nome}: relação I₂/In do dispositivo não informada — sobrecarga (b) não verificada`, etapa: 'instalacao' })
  }
  if (complementares.capacidadeInterrupcao?.conforme === false) problemas.push({ texto: 'Capacidade de interrupção do disjuntor menor que a Icc presumida (5.3.5.5.1)', etapa: 'instalacao' })
  else if (complementares.capacidadeInterrupcao && complementares.capacidadeInterrupcao.icnKA === null) pendencias.push({ texto: 'Capacidade de interrupção (Icn) do disjuntor não informada: escolha a linha de disjuntores ou informe a Icn', etapa: 'instalacao' })
  if (protecaoGeral.peDetalhe?.pendencia) pendencias.push({ texto: protecaoGeral.peDetalhe.pendencia, etapa: 'instalacao' })
  if (projeto.neutroReduzidoDeclarado && protecaoGeral.correntePorFaseA.length === 3 && !(projeto.neutroEquilibrado && projeto.neutroProtegido))
    pendencias.push({ texto: 'Neutro reduzido pedido, mas faltam confirmar o circuito equilibrado e o neutro protegido contra sobrecorrentes (6.2.6.2.6): o neutro não foi reduzido', etapa: 'instalacao' })
  if (protecaoGeral.neutroHarmonicas?.aplicavel) pendencias.push({ texto: `Neutro com 3ª harmônica acima de 33%: corrente de neutro estimada ${protecaoGeral.neutroHarmonicas.correnteNeutroA.toFixed(1)} A (anexo F) — verificação complementar, a seção do neutro não foi dimensionada`, etapa: 'instalacao' })
  if (calculo.complementares?.dps && protecaoGeral.dps?.exigidaPelaNorma && !projeto.esquemaAterramento) pendencias.push({ texto: 'DPS exigido pela norma: declare o esquema de aterramento para definir o esquema de conexão e a tensão Uc', etapa: 'instalacao' })
  if (dimensionados.some((c) => c.exigenciaDR?.exige && /chuveiro/i.test(c.nome))) {
    const nua = projeto.comodos.some((comodo) => (comodo.tue ?? []).some((e) => e.resistenciaNua))
    if (nua) pendencias.push({ texto: 'Chuveiro de resistência nua: DR de alta sensibilidade não convive com ele, por causa da corrente de fuga (Creder, S8 §4.2) — use resistência blindada', etapa: 'comodos' })
  }
  if (complementares.motores.length) pendencias.push({ texto: `${complementares.motores.length} motor(es) acima de 3,7 kW: consultar a distribuidora`, etapa: 'comodos' })

  return {
    estado: problemas.length ? 'alerta' : pendencias.length ? 'atencao' : 'ok',
    problemas,
    pendencias,
    limitacoes: LIMITACOES_FERRAMENTA,
  }
}
