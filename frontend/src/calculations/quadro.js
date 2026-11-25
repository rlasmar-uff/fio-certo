// Composição do quadro de distribuição (vista do QD, unifilar e lista de materiais usam a mesma
// ordem e a mesma numeração de circuitos). Não é cálculo da norma: organiza o que já foi
// dimensionado. Largura em módulos DIN (1 módulo = 1 polo, 18 mm) — ordem de grandeza de
// catálogo, não dado da NBR 5410; confira no fabricante (DR e DPS variam).

// Número de DPS por esquema de conexão (§6.3.5.2.2, figura 13): 1 = um por fase, ao PE/PEN; 2 = um por
// fase ao PE e um entre neutro e PE; 3 = um por fase ao neutro e um entre neutro e PE.
export function modulosDPS(esquemaConexao, numeroFases) {
  if (esquemaConexao === 1) return numeroFases
  return numeroFases + 1
}

// Cada circuito fase-fase ocupa 2 polos; fase-neutro, 1 (o neutro não é seccionado, §6.3.2.2).
export function montarQuadro(calculo) {
  const { protecaoGeral: pg, dimensionados, complementares, configInstalacao } = calculo
  const numeroFases = configInstalacao.numeroFases
  const disjuntor = (circuito) => ({
    tipo: 'disjuntor',
    circuitoId: circuito.id,
    rotulo: circuito.erro ? '—' : `${circuito.disjuntorA} A`,
    detalhe: circuito.nome,
    polos: circuito.polos,
    modulos: circuito.polos,
    fases: circuito.fases ?? [],
  })

  const posicoes = []
  posicoes.push({
    tipo: 'geral',
    rotulo: pg.disjuntorGeralA ? `${pg.disjuntorGeralA} A` : '—',
    detalhe: 'Disjuntor geral',
    polos: numeroFases,
    modulos: numeroFases,
  })
  // DPS: só quando a NBR 5410 o exige (§5.4.2.1.1); a quantidade segue o esquema de conexão (§6.3.5.2.2).
  const esquemaDPS = complementares.dps?.esquemaConexao?.esquema ?? null
  if (pg.dps?.exigidaPelaNorma) {
    const n = modulosDPS(esquemaDPS, numeroFases)
    posicoes.push({ tipo: 'dps', rotulo: pg.dps.rotulo, detalhe: esquemaDPS ? `DPS · esquema ${esquemaDPS}` : 'DPS', polos: n, modulos: n })
  }

  const { drs } = pg
  const grupos = []
  if (drs?.modo === 'grupos' || drs?.modo === 'exigidos') {
    if (drs.montante && pg.idr) {
      posicoes.push({
        tipo: 'dr',
        rotulo: `${pg.idr.correnteA ?? '—'} A · ${drs.montante.sensibilidadeMA} mA S`,
        detalhe: 'DR a montante',
        polos: pg.idr.polos,
        modulos: pg.idr.polos,
      })
    }
    for (const grupo of drs.grupos) {
      const ids = new Set(grupo.circuitos.map((circuito) => circuito.id))
      const circuitos = dimensionados.filter((circuito) => ids.has(circuito.id))
      grupos.push({ numero: grupo.numero, dr: grupo, circuitos })
      posicoes.push({
        tipo: 'dr',
        rotulo: `${grupo.correnteA ?? '—'} A · ${grupo.sensibilidadeMA} mA`,
        detalhe: `DR ${grupo.numero}`,
        polos: grupo.polos,
        modulos: grupo.polos,
      })
      posicoes.push(...circuitos.map(disjuntor))
    }
    // Modo "exigidos": os circuitos em que a norma não exige DR saem direto do barramento.
    const semDR = dimensionados.filter((circuito) => !circuito.sobDR)
    if (semDR.length) {
      grupos.push({ numero: null, dr: null, circuitos: semDR })
      posicoes.push(...semDR.map(disjuntor))
    }
  } else {
    const idr = pg.idr
    grupos.push({ numero: 1, dr: idr, circuitos: dimensionados })
    posicoes.push({
      tipo: 'dr',
      rotulo: idr ? `${idr.correnteA ?? '—'} A · ${idr.sensibilidadeMA} mA` : '—',
      detalhe: 'DR geral',
      polos: idr?.polos ?? numeroFases + 1,
      modulos: idr?.polos ?? numeroFases + 1,
    })
    posicoes.push(...dimensionados.map(disjuntor))
  }

  // Circuitos numerados na ordem em que ficam no quadro (agrupados por DR), para a etiqueta do
  // disjuntor bater com o unifilar (§6.1.5.4: fácil reconhecer o circuito de cada dispositivo).
  const numero = new Map()
  for (const posicao of posicoes) {
    if (posicao.tipo !== 'disjuntor') continue
    posicao.numero = numero.size + 1
    numero.set(posicao.circuitoId, posicao.numero)
  }

  // §6.5.4.7 / Tabela 59 — reserva em número de circuitos; 1 módulo cada (um circuito futuro
  // fase-fase ocuparia 2).
  const reserva = complementares.reservaQuadro.reservaMinima
  for (let i = 0; i < reserva; i++) posicoes.push({ tipo: 'reserva', rotulo: 'Res.', detalhe: 'Reserva (Tabela 59)', polos: 1, modulos: 1 })

  return {
    posicoes,
    grupos,
    numero,
    reserva,
    modulos: posicoes.reduce((soma, posicao) => soma + posicao.modulos, 0),
  }
}
