// Prova ponta a ponta: piscina marcada como a interface permite (tipo "outro"), modo de DR padrão.
import { pathToFileURL } from 'node:url'
const raiz = process.argv[2]
const imp = (p) => import(pathToFileURL(`${raiz}/frontend/src/${p}`).href)
const { calcularProjetoCompleto } = await imp('calculations/projeto.js')
const { resolverConfigInstalacao } = await imp('calculations/constantes.js')
const { ESTADO_INICIAL } = await imp('projetos/estado.js')

const projeto = {
  ...ESTADO_INICIAL,
  tipoInstalacao: 'monofasica',
  tensaoFaseNeutro: 220,
  comodos: [
    { id: 'sala', nome: 'Sala', tipo: 'social', area: '20', perimetro: '18', tue: [] },
    { id: 'pisc', nome: 'Área da piscina', tipo: 'outro', area: '30', perimetro: '22', piscina: true,
      tue: [{ id: 'bomba', nome: 'Bomba da piscina', quantidade: 1, potenciaW: '750', ligacao: 'fase-neutro', tipoCarga: 'indutiva', cosPhi: 0.8 }] },
  ],
}
console.log('modoDR padrão:', projeto.modoDR)
const r = calcularProjetoCompleto(projeto, resolverConfigInstalacao(projeto.tipoInstalacao, projeto.tensaoFaseNeutro))
for (const c of r.dimensionados) {
  if (c.comodoIds?.includes('pisc')) console.log(`${c.nome.padEnd(45)} sobDR=${c.sobDR} exige=${c.exigenciaDR.exige}`)
}
console.log('piscina detectada:', JSON.stringify(r.locaisEspeciais.piscina?.comodos))
