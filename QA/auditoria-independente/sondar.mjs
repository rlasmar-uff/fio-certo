// Sonda: roda a casa-modelo e imprime o que o motor entrega, circuito a circuito.
import { pathToFileURL } from 'node:url'
const raiz = process.argv[2]
const imp = (p) => import(pathToFileURL(`${raiz}/frontend/src/${p}`).href)
const { calcularProjetoCompleto } = await imp('calculations/projeto.js')
const { resolverConfigInstalacao } = await imp('calculations/constantes.js')
const { casaModelo } = await imp('projetos/casaModelo.js')

const p = casaModelo()
const cfg = resolverConfigInstalacao(p.tipoInstalacao, p.tensaoFaseNeutro)
const r = calcularProjetoCompleto(p, cfg)
console.log('circuitos:', r.circuitos.length, 'limite queda terminal:', r.limiteQuedaTerminalDisponivel.toFixed(3))
for (const c of r.dimensionados) {
  console.log(
    [c.nome.padEnd(48), `${c.potenciaVA.toFixed(0)}VA`, `${c.tensao}V`, `Ib=${c.correnteProjetoA.toFixed(2)}`, `In=${c.disjuntorA}`,
     `S=${c.secaoMm2}`, `Sampac=${c.secaoPorAmpacidade}`, `FCA=${c.fatorAgrupamento}`, `Iz=${c.ampacidadeA?.toFixed(1)}`,
     `dV=${c.quedaPercentual?.toFixed(2)}%`, `PE=${c.secaoTerraMm2}`, `DR=${c.sobDR}`,
     `cc=${c.curtoCircuito?.verificado}/${c.curtoCircuito?.conforme}`].join(' | '),
  )
  if (c.curtoCircuito && !c.curtoCircuito.verificado) console.log('      cc motivo:', c.curtoCircuito.motivo)
}
const g = r.protecaoGeral
console.log('alimentador: I por fase', g.correntePorFaseA.map((x) => x.toFixed(2)), 'In', g.disjuntorGeralA, 'S', g.condutorFase.secaoMm2,
  'N', g.secaoNeutroMm2, 'PE', g.secaoTerraMm2, 'queda', g.condutorFase.quedaPercentual?.toFixed(3), 'Ineutro', g.correnteNeutroA.toFixed(2))
console.log('cc geral:', JSON.stringify(g.curtoCircuito))
console.log('DRs:', JSON.stringify(g.drs?.grupos?.map((x) => [x.numero, x.correnteA, x.polos, x.circuitos.length])))
