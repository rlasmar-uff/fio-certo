import { gerarCircuitos } from '../calculations/circuitos.js'
import { resolverConfigInstalacao } from '../calculations/constantes.js'
import { ESTADO_INICIAL } from './estado.js'

// Projeto de demonstração ("Ver exemplo"): uma casa de 2 quartos, bifásica 127/220 V, TN-C-S.
// Potências, comprimentos e Icc são valores ilustrativos de um caso comum, não dados de uma obra
// real — servem para mostrar a ferramenta com todas as verificações preenchidas.
const COMODOS = [
  { id: 'ex-sala', nome: 'Sala', tipo: 'social', area: '18', perimetro: '17' },
  {
    id: 'ex-quarto1',
    nome: 'Quarto 1',
    tipo: 'social',
    area: '12',
    perimetro: '14',
    tue: [
      { id: 'ex-ar', nome: 'Ar-condicionado', quantidade: 1, potenciaW: '1000', ligacao: 'fase-fase', tipoCarga: 'indutiva', cosPhi: 0.85 },
    ],
  },
  { id: 'ex-quarto2', nome: 'Quarto 2', tipo: 'social', area: '10', perimetro: '13' },
  { id: 'ex-cozinha', nome: 'Cozinha', tipo: 'servico', area: '10', perimetro: '13', tomadasBancada: '2' },
  { id: 'ex-servico', nome: 'Área de serviço', tipo: 'servico', area: '5', perimetro: '9', tomadasBancada: '2' },
  {
    id: 'ex-banheiro',
    nome: 'Banheiro',
    tipo: 'banheiro',
    area: '4',
    perimetro: '8',
    tue: [
      { id: 'ex-chuveiro', nome: 'Chuveiro', quantidade: 1, potenciaW: '5500', ligacao: 'fase-fase', tipoCarga: 'resistiva', cosPhi: 1, aquecedorAgua: true, conexao: 'direta' },
    ],
  },
  { id: 'ex-varanda', nome: 'Varanda', tipo: 'varanda', area: '6', perimetro: '10' },
].map((comodo) => ({
  iluminacaoQuantidade: '',
  iluminacaoPotenciaUnitariaW: '',
  tugPontos: '',
  tue: [],
  ...comodo,
}))

const COMPRIMENTO_POR_TIPO_M = { iluminacao: '15', tug: '18', tue: '12' }

export function casaModelo() {
  const projeto = {
    ...ESTADO_INICIAL,
    tipoInstalacao: 'bifasica',
    tensaoFaseNeutro: 127,
    comodos: COMODOS,
    comprimentoRamalEntrada: '20',
    iccPresumidaA: '5000',
    iccFaseNeutroA: '5000',
    icnDisjuntorKA: '6',
    potenciaReservaPorCircuitoVA: '1000',
    esquemaAterramento: 'TN-C-S',
    condicaoAterramento: 'protegido-total',
  }
  // Comprimentos derivados dos circuitos que o próprio motor gera — os IDs dependem da divisão,
  // então não são fixados à mão aqui.
  const circuitos = gerarCircuitos(projeto.comodos, resolverConfigInstalacao(projeto.tipoInstalacao, projeto.tensaoFaseNeutro))
  projeto.comprimentos = Object.fromEntries(circuitos.map((circuito) => [circuito.id, COMPRIMENTO_POR_TIPO_M[circuito.tipo]]))
  // DR no modo padrão: só nos circuitos em que a norma o exige (§5.1.3.2.2).
  return projeto
}
