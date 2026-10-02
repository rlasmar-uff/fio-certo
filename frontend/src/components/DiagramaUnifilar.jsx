import { montarQuadro } from '../calculations/quadro.js'

// F6 — diagrama unifilar (§6.1.8.1) gerado do resultado: entrada, disjuntor geral, DPS, DR(s) e
// cada circuito com disjuntor, seção, fase(s) e nome. Traço em `currentColor`, então segue o
// tema na tela e sai preto na impressão.
const COLUNA = 76
const MARGEM = 24
const Y_BARRA = 150
const Y_DR = 190
const Y_SUBBARRA = 240
const Y_DISJUNTOR = 262
const Y_FIM = 420

const mm2 = (valor) => `${String(valor).replace('.', ',')}`

function Disjuntor({ x, y }) {
  return (
    <g>
      <rect x={x - 7} y={y} width="14" height="14" className="unifilar-simbolo" />
      <line x1={x - 7} y1={y + 14} x2={x + 7} y2={y} className="unifilar-traco" />
    </g>
  )
}

function Caixa({ x, y, texto, largura = 40 }) {
  return (
    <g>
      <rect x={x - largura / 2} y={y} width={largura} height="22" rx="3" className="unifilar-simbolo" />
      <text x={x} y={y + 15} textAnchor="middle" className="unifilar-texto unifilar-forte">
        {texto}
      </text>
    </g>
  )
}

function Terra({ x, y }) {
  return (
    <g className="unifilar-traco">
      <line x1={x} y1={y} x2={x} y2={y + 8} />
      <line x1={x - 9} y1={y + 8} x2={x + 9} y2={y + 8} />
      <line x1={x - 6} y1={y + 12} x2={x + 6} y2={y + 12} />
      <line x1={x - 3} y1={y + 16} x2={x + 3} y2={y + 16} />
    </g>
  )
}

// Uma coluna por circuito, com um terço de coluna de folga entre grupos de DR; a primeira coluna
// é da entrada e do DPS.
function distribuirColunas(grupos) {
  let x = MARGEM + COLUNA
  const colunasGrupo = grupos.map((grupo) => {
    const xs = grupo.circuitos.map((_, indice) => x + COLUNA / 2 + indice * COLUNA)
    const centro = xs.length ? (xs[0] + xs.at(-1)) / 2 : x + COLUNA / 2
    x += Math.max(1, xs.length) * COLUNA + COLUNA / 3
    return { grupo, xs, centro }
  })
  return { colunasGrupo, largura: Math.max(420, x + MARGEM) }
}

export default function DiagramaUnifilar({ projeto, calculo }) {
  const { grupos, numero } = montarQuadro(calculo)
  const pg = calculo.protecaoGeral
  const fases = calculo.configInstalacao.numeroFases
  const tnCS = projeto.esquemaAterramento === 'TN-C-S'

  const { colunasGrupo, largura } = distribuirColunas(grupos)
  const xEntrada = MARGEM + COLUNA / 2
  const xDps = MARGEM + COLUNA / 2
  const montante = pg.drs?.modo === 'grupos' && pg.drs.montante && pg.idr

  const alimentador = pg.condutorFase?.secaoMm2
    ? `${fases}F ${mm2(pg.condutorFase.secaoMm2)} + ${tnCS ? 'PEN' : 'N'} ${mm2(pg.secaoNeutroMm2)}${tnCS ? '' : ` + PE ${mm2(pg.secaoTerraMm2)}`} mm²`
    : 'alimentador sem seção'

  return (
    <div className="unifilar-rolagem">
      <svg
        className="unifilar"
        width={largura}
        height={Y_FIM + 66}
        viewBox={`0 0 ${largura} ${Y_FIM + 66}`}
        role="img"
        aria-labelledby="unifilar-titulo"
      >
        <title id="unifilar-titulo">
          Diagrama unifilar: disjuntor geral {pg.disjuntorGeralA ?? '—'} A, {calculo.dimensionados.length} circuitos
        </title>

        {/* Entrada e disjuntor geral */}
        <text x={xEntrada + 12} y="16" className="unifilar-texto unifilar-forte">
          Entrada · {projeto.comprimentoRamalEntrada || '?'} m · {alimentador}
        </text>
        <line x1={xEntrada} y1="8" x2={xEntrada} y2="44" className="unifilar-traco" />
        <Disjuntor x={xEntrada} y={44} />
        <text x={xEntrada + 14} y="56" className="unifilar-texto">
          Geral {pg.disjuntorGeralA ?? '—'} A · {fases}P
        </text>
        <line x1={xEntrada} y1="58" x2={xEntrada} y2={montante ? 88 : Y_BARRA} className="unifilar-traco" />
        {montante && (
          <>
            <Caixa x={xEntrada} y={88} texto="DR" />
            <text x={xEntrada + 26} y="103" className="unifilar-texto">
              {pg.idr.correnteA} A · {pg.drs.montante.sensibilidadeMA} mA tipo S
            </text>
            <line x1={xEntrada} y1="110" x2={xEntrada} y2={Y_BARRA} className="unifilar-traco" />
          </>
        )}

        {/* Barramento principal */}
        <line x1={xEntrada} y1={Y_BARRA} x2={largura - MARGEM} y2={Y_BARRA} className="unifilar-barra" />

        {/* DPS */}
        <line x1={xDps} y1={Y_BARRA} x2={xDps} y2={Y_DR} className="unifilar-traco" />
        <Caixa x={xDps} y={Y_DR} texto="DPS" largura={44} />
        <line x1={xDps} y1={Y_DR + 22} x2={xDps} y2={Y_DR + 34} className="unifilar-traco" />
        <Terra x={xDps} y={Y_DR + 34} />
        <text x={xDps} y={Y_DR + 70} textAnchor="middle" className="unifilar-texto">
          Classe {pg.dps?.classe ?? 'II'}
        </text>

        {colunasGrupo.map(({ grupo, xs, centro }) => (
          <g key={grupo.numero}>
            <line x1={centro} y1={Y_BARRA} x2={centro} y2={Y_DR} className="unifilar-traco" />
            <Caixa x={centro} y={Y_DR} texto="DR" />
            <text x={centro + 6} y={Y_DR - 6} className="unifilar-texto">
              {grupo.dr ? `${grupo.dr.correnteA ?? '—'} A · ${grupo.dr.sensibilidadeMA} mA` : 'DR —'}
            </text>
            <line x1={centro} y1={Y_DR + 22} x2={centro} y2={Y_SUBBARRA} className="unifilar-traco" />
            {xs.length > 0 && <line x1={xs[0]} y1={Y_SUBBARRA} x2={xs.at(-1)} y2={Y_SUBBARRA} className="unifilar-barra" />}
            {grupo.circuitos.map((circuito, indice) => {
              const cx = xs[indice]
              return (
                <g key={circuito.id}>
                  <line x1={cx} y1={Y_SUBBARRA} x2={cx} y2={Y_DISJUNTOR} className="unifilar-traco" />
                  <Disjuntor x={cx} y={Y_DISJUNTOR} />
                  <line x1={cx} y1={Y_DISJUNTOR + 14} x2={cx} y2={Y_FIM} className="unifilar-traco" />
                  <text x={cx} y={Y_FIM + 14} textAnchor="middle" className="unifilar-texto unifilar-forte">
                    C{numero.get(circuito.id)}
                  </text>
                  <text x={cx} y={Y_FIM + 28} textAnchor="middle" className="unifilar-texto">
                    {circuito.erro ? '—' : `${circuito.disjuntorA} A`}
                  </text>
                  <text x={cx} y={Y_FIM + 42} textAnchor="middle" className="unifilar-texto">
                    {circuito.secaoMm2 ? `${mm2(circuito.secaoMm2)} mm²` : '—'}
                  </text>
                  <text x={cx} y={Y_FIM + 56} textAnchor="middle" className="unifilar-texto">
                    {(circuito.fases ?? []).map((f) => `F${f}`).join('+') || '—'}
                  </text>
                  <text
                    x={cx + 5}
                    y={Y_DISJUNTOR + 20}
                    transform={`rotate(90 ${cx + 5} ${Y_DISJUNTOR + 20})`}
                    className="unifilar-texto unifilar-nome"
                  >
                    {circuito.nome.length > 22 ? `${circuito.nome.slice(0, 21)}…` : circuito.nome}
                  </text>
                </g>
              )
            })}
          </g>
        ))}
      </svg>
    </div>
  )
}
