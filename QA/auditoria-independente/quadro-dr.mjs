// Prova: no modo de DR padrão ("exigidos"), o quadro, o unifilar e a lista de materiais mostram o DR?
// Uso: node quadro-dr.mjs <raiz do repositório>
import { pathToFileURL } from 'node:url'
const raiz = process.argv[2]
const imp = (p) => import(pathToFileURL(`${raiz}/frontend/src/${p}`).href)
const { calcularProjetoCompleto } = await imp('calculations/projeto.js')
const { resolverConfigInstalacao } = await imp('calculations/constantes.js')
const { montarQuadro } = await imp('calculations/quadro.js')
const { listarMateriais } = await imp('calculations/materiais.js')
const { casaModelo } = await imp('projetos/casaModelo.js')

for (const modoDR of ['exigidos', 'geral', 'grupos']) {
  const projeto = { ...casaModelo(), modoDR }
  const cfg = resolverConfigInstalacao(projeto.tipoInstalacao, projeto.tensaoFaseNeutro)
  const calculo = { configInstalacao: cfg, ...calcularProjetoCompleto(projeto, cfg) }
  const quadro = montarQuadro(calculo)
  const mat = listarMateriais(projeto, calculo, {})
  const exigidos = calculo.dimensionados.filter((c) => c.exigenciaDR.exige).map((c) => c.nome)
  console.log(`\n== modoDR=${modoDR}`)
  console.log('circuitos que a norma exige sob DR:', exigidos.length, '| sob DR no cálculo:', calculo.dimensionados.filter((c) => c.sobDR).length)
  console.log('DRs calculados (drs.grupos):', JSON.stringify(calculo.protecaoGeral.drs.grupos?.map((g) => [g.correnteA, g.polos, g.circuitos.length])))
  console.log('posições DR no quadro:', JSON.stringify(quadro.posicoes.filter((p) => p.tipo === 'dr').map((p) => [p.detalhe, p.rotulo])))
  console.log('circuitos desenhados abaixo de cada DR:', JSON.stringify(quadro.grupos.map((g) => [g.numero, g.dr?.correnteA ?? null, g.circuitos.length])))
  console.log('DRs na lista de materiais:', JSON.stringify(mat.drs))
}
