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

export function calcularVeredito(projeto, calculo) {
  const { dimensionados, protecaoGeral, complementares, seccionamento } = calculo
  const problemas = []
  const pendencias = []
  const contar = (lista, condicao) => lista.filter(condicao).length

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
  if (complementares.motores.length) pendencias.push({ texto: `${complementares.motores.length} motor(es) acima de 3,7 kW: consultar a distribuidora`, etapa: 'comodos' })

  return {
    estado: problemas.length ? 'alerta' : pendencias.length ? 'atencao' : 'ok',
    problemas,
    pendencias,
  }
}
