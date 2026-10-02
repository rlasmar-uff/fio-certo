export const ROUTES = {
  home: '/',
  sobre: '/sobre',
  conformidade: '/conformidade',
  projetos: '/projetos',
  abrir: '/abrir',
  instalacao: '/calculadora/instalacao',
  comodos: '/calculadora/comodos',
  circuitos: '/calculadora/circuitos',
  dimensionamento: '/calculadora/dimensionamento',
  resultado: '/calculadora/resultado',
  memorial: '/calculadora/memorial',
  consumo: '/calculadora/consumo',
  planta: '/calculadora/planta',
  banheiro: '/calculadora/banheiro',
  comparar: '/calculadora/comparar',
}

// Ordem sem dependência circular: tudo o que afeta todas as etapas seguintes (tensão, ramal,
// Icc) vem primeiro, então nenhum número mostrado numa etapa muda depois por causa de uma
// etapa posterior.
export const ETAPAS_CALCULADORA = [
  { chave: 'instalacao', path: ROUTES.instalacao, label: 'Instalação' },
  { chave: 'comodos', path: ROUTES.comodos, label: 'Cômodos' },
  { chave: 'circuitos', path: ROUTES.circuitos, label: 'Circuitos' },
  { chave: 'dimensionamento', path: ROUTES.dimensionamento, label: 'Dimensionamento' },
  { chave: 'resultado', path: ROUTES.resultado, label: 'Proteção e resultado' },
]
