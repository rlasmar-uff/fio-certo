// Constantes e tabelas simplificadas da NBR 5410, usadas pelos módulos de cálculo.
// Onde uma tabela completa da norma foi simplificada, isso é indicado no comentário.

// A tensão fase-neutro é o dado real que varia por concessionária/região no Brasil — em vez
// de tentar adivinhar isso por um rótulo de "sistema" ou região, perguntamos direto ao usuário.
// As únicas tensões fase-neutro padronizadas em baixa tensão no Brasil são 127V e 220V.
export const TENSOES_FASE_NEUTRO = [127, 220]

// A tensão fase-fase é derivada matematicamente da fase-neutro (não é uma escolha à parte):
// num sistema trifásico simétrico, V_fase-fase = V_fase-neutro × √3.
// 127V × √3 = 219,97V e 220V × √3 = 381,05V — arredondamos à dezena mais próxima porque
// os valores nominais padronizados são 220V e 380V, não o resultado bruto da conta.
export function calcularTensaoFaseFase(tensaoFaseNeutro) {
  return Math.round((tensaoFaseNeutro * Math.sqrt(3)) / 10) * 10
}

export const TIPOS_INSTALACAO = {
  monofasica: { label: 'Monofásica', numeroFases: 1, permiteFaseFase: false },
  bifasica: { label: 'Bifásica', numeroFases: 2, permiteFaseFase: true },
  trifasica: { label: 'Trifásica', numeroFases: 3, permiteFaseFase: true },
}

// Resolve as tensões e o número de fases realmente disponíveis a partir do tipo de
// instalação (quantas fases o padrão de entrada tem) × tensão fase-neutro informada pelo
// usuário. Monofásico nunca tem fase-fase (só existe 1 fase, não há entre-o-que escolher).
export function resolverConfigInstalacao(tipoInstalacao, tensaoFaseNeutro) {
  const tipo = TIPOS_INSTALACAO[tipoInstalacao]
  const permiteFaseFase = tipo.permiteFaseFase

  return {
    numeroFases: tipo.numeroFases,
    permiteFaseFase,
    tensaoFaseNeutro,
    tensaoFaseFase: permiteFaseFase ? calcularTensaoFaseFase(tensaoFaseNeutro) : null,
  }
}

// Opções de ligação para um equipamento (TUE): sempre existe fase-neutro; fase-fase só
// aparece quando a instalação tem mais de uma fase disponível.
export function obterOpcoesLigacao(tipoInstalacao, tensaoFaseNeutro) {
  const config = resolverConfigInstalacao(tipoInstalacao, tensaoFaseNeutro)
  const opcoes = [
    { valor: 'fase-neutro', label: `${config.tensaoFaseNeutro}V (fase-neutro)`, tensao: config.tensaoFaseNeutro },
  ]
  if (config.permiteFaseFase) {
    opcoes.push({ valor: 'fase-fase', label: `${config.tensaoFaseFase}V (fase-fase)`, tensao: config.tensaoFaseFase })
  }
  return opcoes
}

export const TIPOS_COMODO = {
  social: { label: 'Sala / Dormitório', tugPorMetroPerimetro: 5, tugPotenciaBase: 100 },
  servico: {
    label: 'Cozinha / Área de serviço / Copa',
    tugPorMetroPerimetro: 3.5,
    tugPotenciaBase: 600,
  },
  banheiro: { label: 'Banheiro', tugFixa: 1, tugPotenciaBase: 600 },
  // §9.5.2.2.1 c) — "em varandas, deve ser previsto pelo menos um ponto de tomada": regra própria,
  // sem perímetro nem faixa de área — não confundir com a alínea e) (`outro`, abaixo), que é outro
  // parágrafo da mesma subseção e tem suas próprias 3 faixas. Corrigido em 30/09/2026: até então
  // "Varanda / Outro" era um único tipo que aplicava a regra de `outro` (alínea e) à varanda.
  varanda: { label: 'Varanda', tugFixa: 1, tugPotenciaBase: 100 },
  // §9.5.2.2.1 e) — "demais cômodos e dependências de habitação": 1 ponto se área ≤ 2,25 m²; 1
  // ponto se 2,25 m² < área ≤ 6 m²; 1 ponto por 5 m de perímetro ou fração se área > 6 m² (a
  // distinção entre as duas primeiras faixas é só sobre ONDE o ponto pode ficar, que esta
  // ferramenta não modela) — ver o tratamento especial de `tipo === 'outro'` em
  // `calcularQuantidadeTugMinima`, previsaoDeCarga.js.
  outro: { label: 'Outro (demais cômodos e dependências)', tugPorMetroPerimetro: 5, tugPotenciaBase: 100 },
  // §9.4.4.3.2 — "não são admitidas tomadas de corrente, em nenhum volume, dentro do local da
  // sauna": prevalece sobre o mínimo de tomadas do §9.5.2.2.1.
  sauna: { label: 'Sauna', tugFixa: 0, tugPotenciaBase: 100 },
}

// NBR 5410 §9.5.2.2.2 a) — potência mínima por ponto de tomada (TUG) em banheiros, cozinhas,
// copas, áreas de serviço e análogos: 600VA nas 3 primeiras (ou 2, quando o conjunto desses
// ambientes no projeto passa de 6 pontos — `limite600VA`, ver `calcularLimite600VA`), 100VA nas
// excedentes. Demais cômodos: 100VA por ponto (§9.5.2.2.2 b), sempre, `limite600VA` não se aplica.
export function potenciaTugPorPonto(indice, potenciaBase, limite600VA = 3) {
  if (potenciaBase === 600) {
    return indice < limite600VA ? 600 : 100
  }
  return 100
}

// Métodos de instalação residenciais reais suportados (NBR 5410 Tabela 33 mapeia a situação
// física real para um "método de referência" — a distinção B1×B2 NÃO é embutido×aparente (os
// dois existem embutidos OU aparentes); é fios soltos×cabo multipolar. Fora do escopo: E/F/G
// (bandeja/leito/espaçados) — instalação industrial, não residencial.
//
// `referenciaAgrupamento` diz qual tabela de fator de agrupamento (FCA) usar — ver
// `obterFatorAgrupamento`: 'tabela42ref1' (em feixe/embutido/conduto fechado — vale para A1, A2,
// B1 e B2, que são todos "em conduto fechado" na definição do §6.2.5.1.2); 'tabela42ref2' (camada
// única sobre parede/piso — só C); 'tabela45' (linhas em eletrodutos enterrados — só D). `enterrado`
// diz se a temperatura de referência do método é a do SOLO (20°C) em vez do ar (30°C) — ver
// `obterFatorTemperatura`.
export const METODOS_INSTALACAO = {
  A1: {
    label: 'A1 — fios em eletroduto embutido em parede isolante',
    descricao:
      'Condutores isolados (fios soltos) em eletroduto embutido em parede termicamente isolante (drywall, wood frame, steel frame — §6.2.5.1.2, nota 1). Dissipa pior que B1, mesma situação só que sem alvenaria maciça ao redor do eletroduto.',
    referenciaAgrupamento: 'tabela42ref1',
    enterrado: false,
  },
  A2: {
    label: 'A2 — cabo multipolar em eletroduto embutido em parede isolante',
    descricao:
      'Um cabo multipolar em eletroduto embutido em parede termicamente isolante — o A1 está para o A2 como o B1 está para o B2 (fios soltos vs. cabo multipolar).',
    referenciaAgrupamento: 'tabela42ref1',
    enterrado: false,
  },
  B1: {
    label: 'B1 — fios em eletroduto',
    descricao:
      'Condutores isolados (fios soltos) dentro de eletroduto, embutido na alvenaria ou aparente sobre a parede — o método mais comum em instalação residencial brasileira (Tabela 33, itens 3 e 7).',
    referenciaAgrupamento: 'tabela42ref1',
    enterrado: false,
  },
  B2: {
    label: 'B2 — cabo multipolar em eletroduto',
    descricao:
      'Um cabo multipolar (vários condutores dentro de uma capa só) dentro de eletroduto, embutido ou aparente (Tabela 33, itens 4 e 8).',
    referenciaAgrupamento: 'tabela42ref1',
    enterrado: false,
  },
  C: {
    label: 'C — cabo direto na parede/teto',
    descricao:
      'Cabo (unipolar ou multipolar) fixado diretamente na parede ou teto, sem eletroduto (Tabela 33, itens 11/11A). Sem eletroduto, a taxa de ocupação (§6.2.11.1.6) não se aplica.',
    referenciaAgrupamento: 'tabela42ref2',
    enterrado: false,
  },
  D: {
    label: 'D — cabo em eletroduto enterrado',
    descricao:
      'Cabo multipolar em eletroduto (metálico, plástico ou de barro) enterrado no solo, a 0,7 m de profundidade (§6.2.5.1.2, nota 4) — o ramal de entrada enterrado. Ampacidade referida a 20°C de solo, não 30°C de ar; agrupamento pela Tabela 45, não pela 42.',
    referenciaAgrupamento: 'tabela45',
    enterrado: true,
  },
}
export const METODO_INSTALACAO_PADRAO = 'B1'

// Escada de seções nominais usada por esta ferramenta (subconjunto da escada da norma, que vai
// de 0,5 a 1000 mm²). É a lista canônica para qualquer arredondamento "para a seção comercial
// seguinte" — não usar a tabela de ampacidade para isso, são coisas diferentes.
export const SECOES_NOMINAIS_MM2 = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120]

// Tabela 36 da NBR 5410 — condutores de COBRE, isolação PVC, 70°C no condutor, ambiente de
// referência 30°C (ar) / 20°C (solo). Uma linha por seção, na ordem de coluna da tabela
// impressa: cada método de referência aparece duas vezes, para 2 e para 3 condutores
// CARREGADOS (ver TABELA_46_CONDUTORES_CARREGADOS). O formato de tupla preserva o alinhamento
// de coluna da página, que é justamente a defesa contra o erro de transcrição já cometido neste
// projeto (o `pdftotext -layout` desalinha a coluna de seções em relação às de valores).
//
// Transcrição conferida em três fontes independentes: a coluna de 2 condutores bate 36/36 com a
// tabela anterior (verificada contra a página impressa); a coluna B1/3c bate 12/12 com
// TABELA_36_REFERENCIA, digitada à mão no harness; e ambas com o PDF.
//
// A1, A2 e D estão transcritos mas ainda NÃO são selecionáveis (METODOS_INSTALACAO só expõe
// B1/B2/C): usá-los exige os fatores de correção próprios (Tabela 40 coluna de solo para D,
// Tabelas 44/45 de agrupamento enterrado), que ainda não existem aqui.
export const COLUNAS_AMPACIDADE = [
  'A1_2', 'A1_3', 'A2_2', 'A2_3', 'B1_2', 'B1_3',
  'B2_2', 'B2_3', 'C_2', 'C_3', 'D_2', 'D_3',
]

export const TABELA_36_COBRE_PVC = [
  // secao   A1/2  A1/3  A2/2  A2/3  B1/2  B1/3  B2/2  B2/3   C/2   C/3   D/2   D/3
  [   1.5,   14.5, 13.5,   14,   13, 17.5, 15.5, 16.5,   15, 19.5, 17.5,   22,   18],
  [   2.5,   19.5,   18, 18.5, 17.5,   24,   21,   23,   20,   27,   24,   29,   24],
  [     4,     26,   24,   25,   23,   32,   28,   30,   27,   36,   32,   38,   31],
  [     6,     34,   31,   32,   29,   41,   36,   38,   34,   46,   41,   47,   39],
  [    10,     46,   42,   43,   39,   57,   50,   52,   46,   63,   57,   63,   52],
  [    16,     61,   56,   57,   52,   76,   68,   69,   62,   85,   76,   81,   67],
  [    25,     80,   73,   75,   68,  101,   89,   90,   80,  112,   96,  104,   86],
  [    35,     99,   89,   92,   83,  125,  110,  111,   99,  138,  119,  125,  103],
  [    50,    119,  108,  110,   99,  151,  134,  133,  118,  168,  144,  148,  122],
  [    70,    151,  136,  139,  125,  192,  171,  168,  149,  213,  184,  183,  151],
  [    95,    182,  164,  167,  150,  232,  207,  201,  179,  258,  223,  216,  179],
  [   120,    210,  188,  192,  172,  269,  239,  232,  206,  299,  259,  246,  203],
]

// Tabela 37 da NBR 5410 — condutores de COBRE, isolação EPR ou XLPE, 90°C no condutor, mesmo
// ambiente de referência da Tabela 36 (30°C ar / 20°C solo). Mesmo formato de tupla e mesma
// ordem de coluna (`COLUNAS_AMPACIDADE`) da Tabela 36 — só o valor de cada célula muda.
//
// Transcrição conferida por um segundo agente, que reconstruiu a tabela por um método
// independente (geometria de página via `pdftotext -table`, não o zip por ordinal usado para a
// Tabela 36) sem ver estes valores antes — bateu célula a célula. Duas verificações adicionais,
// nenhuma das quais sobreviveria a um erro de fase: EPR > PVC nas 144 células (12 seções × 12
// colunas, ver G17.1) e a razão EPR/PVC fica em 1,31 (A1/2c) a 1,19 (D/2c) em toda a escada —
// um deslize de uma linha jogaria essa razão para ~1,7 ou ~1,0.
export const TABELA_37_COBRE_EPR = [
  // secao   A1/2  A1/3  A2/2  A2/3  B1/2  B1/3  B2/2  B2/3   C/2   C/3   D/2   D/3
  [   1.5,     19,   17, 18.5, 16.5,   23,   20,   22, 19.5,   24,   22,   26,   22],
  [   2.5,     26,   23,   25,   22,   31,   28,   30,   26,   33,   30,   34,   29],
  [     4,     35,   31,   33,   30,   42,   37,   40,   35,   45,   40,   44,   37],
  [     6,     45,   40,   42,   38,   54,   48,   51,   44,   58,   52,   56,   46],
  [    10,     61,   54,   57,   51,   75,   66,   69,   60,   80,   71,   73,   61],
  [    16,     81,   73,   76,   68,  100,   88,   91,   80,  107,   96,   95,   79],
  [    25,    106,   95,   99,   89,  133,  117,  119,  105,  138,  119,  121,  101],
  [    35,    131,  117,  121,  109,  164,  144,  146,  128,  171,  147,  146,  122],
  [    50,    158,  141,  145,  130,  198,  175,  175,  154,  209,  179,  173,  144],
  [    70,    200,  179,  183,  164,  253,  222,  221,  194,  269,  229,  213,  178],
  [    95,    241,  216,  220,  197,  306,  269,  265,  233,  328,  278,  252,  211],
  [   120,    278,  249,  253,  227,  354,  312,  305,  268,  382,  322,  287,  240],
]

const INDICE_AMPACIDADE_PVC = new Map(
  TABELA_36_COBRE_PVC.map((linha) => [linha[0], linha]),
)
const INDICE_AMPACIDADE_EPR = new Map(
  TABELA_37_COBRE_EPR.map((linha) => [linha[0], linha]),
)

// NBR 5410 Tabela 46 — número de condutores CARREGADOS a adotar, em função do esquema de
// condutores vivos do circuito. §6.2.5.6.2: o condutor de proteção (PE) nunca é contado; o PEN
// conta como neutro.
//
// Atenção ao "bifásico" brasileiro: são duas fases defasadas de 120° derivadas de uma rede
// trifásica a quatro fios, MAIS o neutro — ou seja, "duas fases com neutro" → 3 condutores
// carregados. Não é o "monofásico a três condutores" da tabela (rede split-phase a 180°, 2
// condutores), com que é fácil confundir.
export const TABELA_46_CONDUTORES_CARREGADOS = {
  'monofasico-2': 2,
  'monofasico-3': 2,
  'duas-fases-sem-neutro': 2,
  'duas-fases-com-neutro': 3,
  'trifasico-sem-neutro': 3,
  'trifasico-com-neutro': 3,
}
export const ESQUEMA_CONDUTORES_PADRAO = 'monofasico-2'

// §6.2.5.6.1 — num circuito trifásico com neutro em que a taxa de 3ª harmônica e múltiplos passa
// de 15%, o neutro passa a ser condutor carregado: são 4 condutores carregados. Como as tabelas
// 36-39 não têm coluna de 4, a norma manda aplicar este fator sobre a coluna de 3.
export const FATOR_NEUTRO_CARREGADO = 0.86

// Taxa de 3ª harmônica e múltiplos declarada pelo usuário. Não é booleano, porque o valor seguro
// aponta para lados OPOSTOS nos dois lugares que consomem esse dado: a redução do neutro
// (§6.2.6.2.6 / Tabela 48) só pode ocorrer com taxa ≤ 15%, enquanto o fator de 0,86 (§6.2.5.6.1)
// só deixa de ser aplicado com taxa ≤ 15%. Um booleano obrigaria um dos dois a assumir o lado
// inseguro quando o usuário não declarou nada. Com "não declarado" (default), nenhum dos dois
// age: o neutro não reduz e o 0,86 não é aplicado, e ambos os critérios aparecem como não
// verificados.
//
// Quatro estados, não três: o §6.2.6.2.5 tem um SEGUNDO limiar, acima do primeiro — "quando ...
// a taxa de terceira harmônica e seus múltiplos for superior a 33%, pode ser necessário um
// condutor neutro com seção SUPERIOR à dos condutores de fase" (dimensionado pelo Anexo F, que
// pede o conteúdo harmônico real das correntes de fase — dado que esta ferramenta não coleta).
// "acima-15" cobria 20% e 60% com o mesmo tratamento; "acima-33" isola o caso em que o neutro
// pode precisar ser MAIOR, para avisar em vez de ficar calado (ver `avisoNeutroSuperior` em
// `dimensionarProtecaoGeral`, protecaoGeral.js). Continua tendo `neutroCarregado: true` — acima
// de 33% também está acima de 15%.
export const TAXAS_TERCEIRA_HARMONICA = {
  'nao-declarado': { label: 'Não declarado', reduzNeutro: false, neutroCarregado: false, avisoNeutroSuperior: false },
  'ate-15': { label: 'Até 15%', reduzNeutro: true, neutroCarregado: false, avisoNeutroSuperior: false },
  'acima-15': { label: 'Acima de 15%, até 33%', reduzNeutro: false, neutroCarregado: true, avisoNeutroSuperior: false },
  'acima-33': { label: 'Acima de 33%', reduzNeutro: false, neutroCarregado: true, avisoNeutroSuperior: true },
}
export const TERCEIRA_HARMONICA_PADRAO = 'nao-declarado'

// Traduz o número de fases do alimentador para o esquema da Tabela 46. Um alimentador sempre
// tem neutro nesta ferramenta (não há alimentador trifásico a 3 fios modelado aqui).
export function esquemaDoAlimentador(numeroFases) {
  if (numeroFases >= 3) return 'trifasico-com-neutro'
  if (numeroFases === 2) return 'duas-fases-com-neutro'
  return 'monofasico-2'
}

// Traduz um circuito terminal para o esquema da Tabela 46: fase-fase não tem neutro (2
// condutores carregados), fase-neutro é o monofásico a dois condutores (2 também).
export function esquemaDoCircuito(ehFaseFase) {
  return ehFaseFase ? 'duas-fases-sem-neutro' : 'monofasico-2'
}

// Ampacidade bruta da Tabela 36 (PVC) ou 37 (EPR/XLPE) para uma seção, método de referência e
// número de condutores carregados. Retorna null para combinação inexistente — quem chama decide
// o que fazer, em vez de receber silenciosamente o valor de outro método (o código anterior caía
// em B1 por default, mascarando um método inválido).
export function obterAmpacidade({ isolacao = 'pvc', metodo, condutoresCarregados, secaoMm2 }) {
  const indice = isolacao === 'epr' ? INDICE_AMPACIDADE_EPR : INDICE_AMPACIDADE_PVC
  const linha = indice.get(secaoMm2)
  if (!linha) return null
  const coluna = COLUNAS_AMPACIDADE.indexOf(`${metodo}_${condutoresCarregados}`)
  if (coluna === -1) return null
  return linha[coluna + 1] ?? null
}

// Seção mínima normativa por tipo de circuito (NBR 5410 §6.2.6.1.1 / Tabela 47, condutores
// isolados em instalação fixa — cobre). "geral" = alimentador/ramal de entrada.
export const SECAO_MINIMA_MM2 = {
  iluminacao: 1.5,
  tug: 2.5,
  tue: 2.5,
  geral: 2.5,
}

// Piso PRÁTICO do alimentador (10 mm²) — não é um mínimo da NBR 5410 (na Tabela 47, 10 mm² é a
// linha de CONDUTORES NUS; para cabo isolado o mínimo normativo é os 2,5 mm² acima). É uma
// exigência típica das normas de fornecimento das concessionárias (Enel, Light, CPFL etc.),
// mantida como piso por padrão porque é o que qualquer concessionária brasileira vai exigir na
// prática — sem ela, o alimentador ficaria "conforme a NBR" mas não instalável.
export const PISO_PRATICO_ALIMENTADOR_MM2 = 10

// Disjuntores termomagnéticos com correntes nominais padronizadas.
export const DISJUNTORES_PADRONIZADOS = [10, 16, 20, 25, 32, 40, 50, 63, 70, 80, 100, 125, 150, 175, 200, 225, 250]

// Correntes nominais comerciais mais comuns de interruptores/disjuntores diferenciais residuais (DR).
export const IDR_CORRENTES_PADRONIZADAS = [25, 40, 63, 80, 100]

// NBR 5410 §5.1.3.2.2 — sensibilidade exigida para proteção contra choques em circuitos de
// tomadas em geral e em áreas internas molhadas (banheiros, cozinhas, áreas de serviço, áreas
// externas): DR de alta sensibilidade, corrente diferencial-residual nominal ≤ 30 mA.
export const IDR_SENSIBILIDADE_ALTA_MA = 30

// Tensão máxima de operação contínua (Uc) mais usada comercialmente para DPS Classe II em
// instalações residenciais, conforme a tensão fase-neutro da rede.
export function recomendarTensaoDps(tensaoFaseNeutro) {
  return tensaoFaseNeutro <= 127 ? 175 : 275
}

// NBR 5410 Tabela 58 — seção mínima do condutor de proteção (terra/PE) em função da seção do
// condutor fase correspondente (condutores de mesma natureza/material).
export function calcularSecaoTerra(secaoFaseMm2) {
  if (secaoFaseMm2 === null || secaoFaseMm2 === undefined) return null
  if (secaoFaseMm2 <= 16) return secaoFaseMm2
  if (secaoFaseMm2 <= 35) return 16
  const necessaria = secaoFaseMm2 / 2
  return SECOES_NOMINAIS_MM2.find((secao) => secao >= necessaria) ?? null
}

// NBR 5410 §6.2.6.2.6 / Tabela 48 — seção reduzida do condutor NEUTRO de um circuito trifásico
// com neutro, quando a fase passa de 25 mm². Só pode ser usada quando as 3 condições do
// §6.2.6.2.6 valem ao mesmo tempo (circuito presumivelmente equilibrado; 3ª harmônica ≤ 15%;
// neutro protegido contra sobrecorrente) — por isso não é aplicada automaticamente, ver
// `dimensionarCondutorNeutroGeral`. Não confundir com a Tabela 58 (seção do condutor de
// PROTEÇÃO/terra), que é outra tabela e já reduzia corretamente antes desta mudança.
export const TABELA_48_NEUTRO_REDUZIDO = [
  { secaoFase: 35, secaoNeutro: 25 },
  { secaoFase: 50, secaoNeutro: 25 },
  { secaoFase: 70, secaoNeutro: 35 },
  { secaoFase: 95, secaoNeutro: 50 },
  { secaoFase: 120, secaoNeutro: 70 },
  { secaoFase: 150, secaoNeutro: 70 },
  { secaoFase: 185, secaoNeutro: 95 },
  { secaoFase: 240, secaoNeutro: 120 },
  { secaoFase: 300, secaoNeutro: 150 },
  { secaoFase: 400, secaoNeutro: 185 },
]

// Tabela 48 é definida só a partir de 25 mm² de fase — abaixo disso o neutro sempre é igual à
// fase (§6.2.6.2.2/6.2.6.2.4), sem exceção.
export function obterSecaoNeutroReduzida(secaoFaseMm2) {
  if (secaoFaseMm2 === null || secaoFaseMm2 === undefined || secaoFaseMm2 <= 25) return secaoFaseMm2
  const linha = [...TABELA_48_NEUTRO_REDUZIDO].reverse().find((l) => secaoFaseMm2 >= l.secaoFase)
  return linha?.secaoNeutro ?? secaoFaseMm2
}

// NBR 5410 §5.3.5.5.2 / Tabela 30 — fator k da fórmula I²·t ≤ k²·S² (proteção contra
// curto-circuito), cobre, por isolação. PVC: 115 até 300 mm² (a única faixa que esta ferramenta
// alcança — maior seção considerada: 120 mm²), 103 acima disso. EPR/XLPE: 143 (a fonte extraída
// não registra quebra de faixa para esta isolação dentro do que foi conferido — não inventar uma).
//
// NOTA 1 da própria Tabela 30: "Outros valores de k, para os casos mencionados abaixo, ainda não
// estão normalizados: condutores de pequena seção (principalmente para seções inferiores a
// 10 mm²)". É a faixa de praticamente todo circuito terminal residencial (1,5/2,5/4/6 mm²) — por
// isso `null` aqui, não um valor emprestado da faixa maior: mesmo padrão de "nunca extrapolar" já
// usado em `obterFatorTemperatura`/`obterFatorResistividadeSolo`. Quem chama precisa tratar
// `null` como "não verificável", nunca multiplicar direto (ver `verificarCurtoCircuito`).
export function obterK({ isolacao = 'pvc', secaoMm2 } = {}) {
  if (secaoMm2 !== null && secaoMm2 !== undefined && secaoMm2 < 10) return null
  if (isolacao === 'epr') return 143
  return secaoMm2 !== null && secaoMm2 !== undefined && secaoMm2 > 300 ? 103 : 115
}

// Multiplicador de disparo instantâneo (magnético) dos disjuntores termomagnéticos residenciais,
// conforme as curvas da IEC 60898 — dado do DISJUNTOR, não da NBR 5410 (a norma só define o
// critério I²t≤k²S², não a curva do dispositivo). Curva C é a mais comum em instalação
// residencial brasileira (equilibra proteção contra curto-circuito e tolerância a picos de
// partida de motores/transformadores).
export const TABELA_MULTIPLICADOR_DISPARO_INSTANTANEO = {
  B: { min: 3, max: 5 },
  C: { min: 5, max: 10 },
  D: { min: 10, max: 20 },
}
export const CURVA_DISJUNTOR_PADRAO = 'C'

// NBR 5410 §4.2.2.2 — esquemas de aterramento de uso residencial (TN-C, sem PE separado, e IT
// ficam de fora). Declaração do usuário: depende de como a concessionária entrega e de como o
// padrão de entrada foi montado. '' = não declarado.
export const ESQUEMAS_ATERRAMENTO = {
  'TN-C-S': { label: 'TN-C-S — neutro e terra juntos (PEN) até o quadro, separados daí em diante' },
  'TN-S': { label: 'TN-S — neutro e terra separados em toda a instalação' },
  TT: { label: 'TT — terra da casa em eletrodo próprio, separado do neutro da rede' },
}

// NBR 5410 §6.4.1.2.1 / Tabela 52 — seção mínima (cobre) do condutor de aterramento enterrado.
// Sem proteção contra corrosão a tabela dá 50 mm² nas duas colunas (solos ácidos ou alcalinos).
export const CONDICOES_ATERRAMENTO_ENTERRADO = {
  'protegido-total': { label: 'Enterrado, protegido contra corrosão e contra danos mecânicos', secaoMinimaMm2: 2.5 },
  'protegido-corrosao': { label: 'Enterrado, protegido contra corrosão, sem proteção mecânica', secaoMinimaMm2: 16 },
  'sem-protecao-corrosao': { label: 'Enterrado, sem proteção contra corrosão', secaoMinimaMm2: 50 },
  'nao-enterrado': { label: 'Não enterrado (Tabela 52 não se aplica)', secaoMinimaMm2: null },
}

// Tempo de atuação típico de um disjuntor termomagnético na região de disparo instantâneo
// (magnética) — não é um valor da NBR 5410 nem uma curva exata de fabricante (que exigiria o
// datasheet do disjuntor específico); é a ordem de grandeza usual (meio ciclo de rede,
// ~10 ms) usada em verificações rápidas de curto-circuito quando só a corrente presumida é
// conhecida. Abaixo do limiar de disparo instantâneo, a atuação cai na faixa térmica/tempo-
// -corrente do disjuntor, que só a curva do fabricante define — por isso, nesse caso, esta
// ferramenta declara "não verificável", em vez de aplicar esse tempo fora do regime em que ele
// é válido.
export const TEMPO_DISPARO_INSTANTANEO_S = 0.01

// NBR 5410 §6.2.7.2 — limite que o circuito terminal, isoladamente, nunca pode ultrapassar.
export const LIMITE_QUEDA_TERMINAL_PERCENTUAL = 4

// NBR 5410 §6.2.7.1 c) — limite TOTAL de queda a partir do ponto de entrega, para o caso de
// entrega em tensão secundária (o único modelado aqui — transformador/gerador próprio dão 7%
// e ficam fora do escopo). Alimentador e circuito terminal DIVIDEM este orçamento: o disponível
// para o terminal é `Math.min(LIMITE_QUEDA_TERMINAL_PERCENTUAL, LIMITE_QUEDA_TOTAL_PERCENTUAL -
// quedaDoAlimentador)`, não 4% fixos.
export const LIMITE_QUEDA_TOTAL_PERCENTUAL = 5

// Tabela 40 da NBR 5410 — fator de correção de temperatura (FCT) da ampacidade, nas 4 colunas:
// ambiente de referência 30°C (linhas ao ar) ou 20°C (linhas subterrâneas — método D), cada um
// para as duas isolações suportadas. As células ausentes (`null`) são ausência REAL da tabela
// impressa (PVC não opera continuamente acima de ~70°C no condutor, então a norma não tabela
// FCT de PVC além de 60°C ambiente) — nunca extrapoladas.
//
// Conferida por um segundo agente que reconstruiu a tabela por geometria de página (não viu estes
// valores antes) e, adicionalmente, verificou que as 48 células batem EXATAMENTE (2 casas
// decimais) com a forma fechada f = √((θmax−θ)/(θmax−θref)), θmax=70/90°C conforme a isolação,
// θref=30°C (ar) ou 20°C (solo) — um erro de fase de uma linha quebraria todas de uma vez, é uma
// verificação muito mais forte que qualquer âncora pontual.
export const TABELA_40_FCT = [
  { temperaturaC: 10, arPvc: 1.22, arEpr: 1.15, soloPvc: 1.1, soloEpr: 1.07 },
  { temperaturaC: 15, arPvc: 1.17, arEpr: 1.12, soloPvc: 1.05, soloEpr: 1.04 },
  { temperaturaC: 20, arPvc: 1.12, arEpr: 1.08, soloPvc: 1.0, soloEpr: 1.0 },
  { temperaturaC: 25, arPvc: 1.06, arEpr: 1.04, soloPvc: 0.95, soloEpr: 0.96 },
  { temperaturaC: 30, arPvc: 1.0, arEpr: 1.0, soloPvc: 0.89, soloEpr: 0.93 },
  { temperaturaC: 35, arPvc: 0.94, arEpr: 0.96, soloPvc: 0.84, soloEpr: 0.89 },
  { temperaturaC: 40, arPvc: 0.87, arEpr: 0.91, soloPvc: 0.77, soloEpr: 0.85 },
  { temperaturaC: 45, arPvc: 0.79, arEpr: 0.87, soloPvc: 0.71, soloEpr: 0.8 },
  { temperaturaC: 50, arPvc: 0.71, arEpr: 0.82, soloPvc: 0.63, soloEpr: 0.76 },
  { temperaturaC: 55, arPvc: 0.61, arEpr: 0.76, soloPvc: 0.55, soloEpr: 0.71 },
  { temperaturaC: 60, arPvc: 0.5, arEpr: 0.71, soloPvc: 0.45, soloEpr: 0.65 },
  { temperaturaC: 65, arPvc: null, arEpr: 0.65, soloPvc: null, soloEpr: 0.6 },
  { temperaturaC: 70, arPvc: null, arEpr: 0.58, soloPvc: null, soloEpr: 0.53 },
  { temperaturaC: 75, arPvc: null, arEpr: 0.5, soloPvc: null, soloEpr: 0.46 },
  { temperaturaC: 80, arPvc: null, arEpr: 0.41, soloPvc: null, soloEpr: 0.38 },
]

function colunaFct(isolacao, enterrado) {
  if (enterrado) return isolacao === 'epr' ? 'soloEpr' : 'soloPvc'
  return isolacao === 'epr' ? 'arEpr' : 'arPvc'
}

// `temperaturaC` nulo/ausente = referência da própria tabela (30°C ar / 20°C solo) = fator 1, o
// default quando o usuário não ajustou a condição de instalação. Fora da faixa tabelada para a
// isolação/ambiente escolhidos (ex.: 65°C com PVC), devolve `null` — nunca extrapola; quem chama
// precisa tratar esse `null` como "não verificado", não multiplicar direto (null*x vira 0 e
// mascararia a causa real do problema).
export function obterFatorTemperatura(temperaturaC, { isolacao = 'pvc', enterrado = false } = {}) {
  if (temperaturaC === null || temperaturaC === undefined || temperaturaC === '') return 1
  const linha = TABELA_40_FCT.find((l) => l.temperaturaC === Number(temperaturaC))
  if (!linha) return null
  return linha[colunaFct(isolacao, enterrado)] ?? null
}

// Lista as temperaturas realmente tabeladas para uma isolação/ambiente — usada para popular o
// seletor da UI, de forma que o usuário nunca consiga escolher uma combinação fora da faixa (em
// vez de deixar escolher e só depois avisar "não verificado").
export function listarTemperaturasDisponiveis({ isolacao = 'pvc', enterrado = false } = {}) {
  const coluna = colunaFct(isolacao, enterrado)
  return TABELA_40_FCT.filter((l) => l[coluna] !== null).map((l) => ({ temperaturaC: l.temperaturaC, fator: l[coluna] }))
}

// Tabela 41 — fator de correção para linhas subterrâneas em solo com resistividade térmica
// diferente da referência de 2,5 K·m/W (§6.2.5.4). Só 4 pontos tabelados (a norma remete à NBR
// 11301 para valores mais precisos) — por isso o fallback é o ponto mais próximo, mesma lógica
// de `obterReatanciaOhmMetro`, não uma interpolação que a fonte não sustenta.
export const TABELA_41_RESISTIVIDADE_SOLO = [
  { resistividadeKmW: 1, fator: 1.18 },
  { resistividadeKmW: 1.5, fator: 1.1 },
  { resistividadeKmW: 2, fator: 1.05 },
  { resistividadeKmW: 3, fator: 0.96 },
]

// `resistividadeKmW` nulo/ausente = 2,5 K·m/W (a própria referência da Tabela 36/37 para linhas
// subterrâneas) = fator 1 — default quando o usuário não declarou a resistividade real do solo.
export function obterFatorResistividadeSolo(resistividadeKmW) {
  if (resistividadeKmW === null || resistividadeKmW === undefined || resistividadeKmW === '') return 1
  const tabela = TABELA_41_RESISTIVIDADE_SOLO
  const valor = Number(resistividadeKmW)
  const linha =
    tabela.find((l) => l.resistividadeKmW === valor) ??
    [...tabela].sort((a, b) => Math.abs(a.resistividadeKmW - valor) - Math.abs(b.resistividadeKmW - valor))[0]
  return linha.fator
}

// Tabela 42, referência 1 da NBR 5410 — fator de correção de agrupamento (FCA) para condutores
// "em feixe: ao ar livre ou sobre superfície; embutidos; em conduto fechado" — vale tanto para
// B1 quanto para B2 (os dois são "em conduto fechado", a diferença entre eles é fios soltos vs.
// cabo multipolar, não o tipo de agrupamento térmico). Indexada pelo número de CIRCUITOS
// agrupados, não de condutores.
export const TABELA_FCA_AGRUPAMENTO = [
  { ateCircuitos: 1, fator: 1.0 },
  { ateCircuitos: 2, fator: 0.8 },
  { ateCircuitos: 3, fator: 0.7 },
  { ateCircuitos: 4, fator: 0.65 },
  { ateCircuitos: 5, fator: 0.6 },
  { ateCircuitos: 6, fator: 0.57 },
  { ateCircuitos: 7, fator: 0.54 },
  { ateCircuitos: 8, fator: 0.52 },
  { ateCircuitos: 11, fator: 0.5 },
  { ateCircuitos: 15, fator: 0.45 },
  { ateCircuitos: 19, fator: 0.41 },
  { ateCircuitos: Infinity, fator: 0.38 },
]

// Tabela 42, referência 2 — "camada única sobre parede, piso, ou em bandeja não perfurada ou
// prateleira" — é a linha que vale para o método C (cabo direto na parede/teto, sem eletroduto):
// dissipa mais calor que dentro de um conduto fechado, por isso o fator é menos severo que o da
// referência 1 para a mesma quantidade de circuitos. A norma funde as faixas 9-11/12-15/16-19/≥20
// num único valor (0,70), diferente da referência 1 (que tem um valor por faixa).
export const TABELA_FCA_METODO_C = [
  { ateCircuitos: 1, fator: 1.0 },
  { ateCircuitos: 2, fator: 0.85 },
  { ateCircuitos: 3, fator: 0.79 },
  { ateCircuitos: 4, fator: 0.75 },
  { ateCircuitos: 5, fator: 0.73 },
  { ateCircuitos: 6, fator: 0.72 },
  { ateCircuitos: 7, fator: 0.72 },
  { ateCircuitos: 8, fator: 0.71 },
  { ateCircuitos: Infinity, fator: 0.7 },
]

// Tabela 45 — fator de agrupamento para linhas em ELETRODUTOS enterrados (método D; cabos
// diretamente enterrados, sem eletroduto, usariam a Tabela 44 — fora do escopo, ver
// `METODOS_INSTALACAO.D`). A norma tabela por espaçamento entre eletrodutos (nulo/0,25m/0,5m/1m);
// como esta ferramenta não modela a distância física entre eletrodutos, usa-se sempre a coluna
// "nulo" (a mais severa) — mesma lógica conservadora de "declarar o pior caso plausível" já usada
// no número de circuitos agrupados.
//
// A Tabela 45 impressa tem DUAS sub-tabelas lado a lado: "cabos multipolares em eletrodutos — um
// cabo por eletroduto" e "condutores isolados ou cabos unipolares em eletrodutos — um condutor
// [circuito] por eletroduto". Esta ferramenta modela o método D com condutor UNIPOLAR em todo o
// resto do pipeline (`DIAMETRO_EXTERNO_CONDUTOR_MM` é cabo flexível unipolar; a taxa de ocupação
// do eletroduto é calculada sobre ele) — por isso é a segunda sub-tabela, mais severa, que se
// aplica aqui; usar a de cabo multipolar (corrigido em 30/09/2026) combinaria um fator de
// agrupamento mais permissivo com uma geometria de condutor que não é a dele. Só tabelada até 6
// circuitos; mesmo critério das duas tabelas de agrupamento acima (Tabela 42 refs. 1/2): mantém o
// último fator tabelado como piso, em vez de extrapolar um valor pior sem base normativa.
export const TABELA_45_AGRUPAMENTO_ENTERRADO = [
  { ateCircuitos: 1, fator: 1.0 },
  { ateCircuitos: 2, fator: 0.8 },
  { ateCircuitos: 3, fator: 0.7 },
  { ateCircuitos: 4, fator: 0.65 },
  { ateCircuitos: 5, fator: 0.6 },
  { ateCircuitos: Infinity, fator: 0.6 },
]

// `numeroCircuitos` nulo/ausente = 1 (nenhum agrupamento) — mas o padrão usado por esta
// ferramenta não é deixar de fora: ver `calcularProjetoCompleto`, que passa o total de
// circuitos terminais gerados quando o usuário não ajustou manualmente. `metodoInstalacao`
// escolhe a referência certa via `METODOS_INSTALACAO[...].referenciaAgrupamento` — não é mais um
// `if` binário B1/B2 × C, agora são 3 tabelas possíveis (a 3ª, para o método D, ver Tabela 45).
export function obterFatorAgrupamento(numeroCircuitos, metodoInstalacao = METODO_INSTALACAO_PADRAO) {
  const n = Math.max(1, Number(numeroCircuitos) || 1)
  const referencia = METODOS_INSTALACAO[metodoInstalacao]?.referenciaAgrupamento ?? 'tabela42ref1'
  const tabela =
    referencia === 'tabela45'
      ? TABELA_45_AGRUPAMENTO_ENTERRADO
      : referencia === 'tabela42ref2'
        ? TABELA_FCA_METODO_C
        : TABELA_FCA_AGRUPAMENTO
  const linha = tabela.find((l) => n <= l.ateCircuitos)
  return linha?.fator ?? tabela[tabela.length - 1].fator
}

// Condutividade do cobre NA TEMPERATURA DE OPERAÇÃO do condutor (Ω·mm²/m), usada na fórmula
// de queda de tensão. A Tabela 36 é definida para o condutor a 70°C (isolação PVC) — não a
// 20°C (σ=56, valor de catálogo/bitola à temperatura ambiente). Usar 56 aqui subestimaria a
// queda em ~20%. σ₇₀ = 1 / [ρ₂₀ · (1 + 0,00393 · 50)], ρ₂₀ = 1/56.
export const CONDUTIVIDADE_COBRE_70C = 46.8

// Mesma conta, na temperatura de operação do condutor EPR/XLPE (Tabela 37): 90°C, não 70°C.
// σ₉₀ = 1 / [ρ₂₀ · (1 + 0,00393 · 70)], mesmo ρ₂₀ = 1/56 — convenção de resistividade mantida
// igual à já usada para o PVC (trocar de convenção, ex. IEC 60228, mudaria também o resultado do
// PVC existente em ~3,5% e não é uma mudança desta fase). Efeito esperado: EPR/XLPE tem MAIS
// ampacidade que PVC na mesma seção (Tabela 37 > Tabela 36), mas também MAIS queda de tensão pra
// mesma corrente/seção, porque o condutor opera mais quente — os dois critérios puxam em
// direções opostas, e é para isso que a trilha de seções já mostra os dois lado a lado.
export const CONDUTIVIDADE_COBRE_90C = 43.9

// Agrupa o que muda por isolação: temperatura de operação (define a base da queda de tensão) e
// condutividade (idem). O fator k (Tabela 30) fica em `obterK`, não aqui, porque também depende
// da seção (quebra de faixa em 300 mm² só para PVC).
export const ISOLACOES = {
  pvc: { label: 'PVC (70°C)', temperaturaOperacaoC: 70, condutividade: CONDUTIVIDADE_COBRE_70C },
  epr: { label: 'EPR/XLPE (90°C)', temperaturaOperacaoC: 90, condutividade: CONDUTIVIDADE_COBRE_90C },
}
export const ISOLACAO_PADRAO = 'pvc'

// Reatância indutiva por seção (Ω/km) — a NBR 5410 não tabela isso (o texto completo da norma não
// usa a palavra "reatância" em lugar nenhum); vem do catálogo técnico Corfio/Cordeiro (fabricante
// de cabos), Tabela 8 "Resistências elétricas e reatâncias indutivas... em condutos fechados",
// cobre, mesmo cenário de instalação (B1/B2) já usado por esta ferramenta. A própria fonte também
// tabela "ao ar livre" (cenário do método C) com valores praticamente idênticos seção a seção
// (diferença ≤0,01 Ω/km) — não vale a pena manter duas tabelas quase iguais, então os três métodos
// (B1/B2/C) usam esta única tabela. Substitui a constante fixa anterior (~0,08 Ω/km): imprecisa
// nas duas pontas (subestimava em seções pequenas, ~0,15-0,16 real; superestimava um pouco nas
// grandes, ~0,10 real) — a própria fonte nota que a reatância é despresível abaixo de 50 mm², o
// que explica por que a constante antiga nunca deu resultado absurdo, só impreciso.
export const TABELA_REATANCIA_OHM_KM_POR_MM2 = [
  { secao: 1.5, reatanciaOhmKm: 0.16 },
  { secao: 2.5, reatanciaOhmKm: 0.15 },
  { secao: 4, reatanciaOhmKm: 0.14 },
  { secao: 6, reatanciaOhmKm: 0.13 },
  { secao: 10, reatanciaOhmKm: 0.13 },
  { secao: 16, reatanciaOhmKm: 0.12 },
  { secao: 25, reatanciaOhmKm: 0.12 },
  { secao: 35, reatanciaOhmKm: 0.11 },
  { secao: 50, reatanciaOhmKm: 0.11 },
  { secao: 70, reatanciaOhmKm: 0.1 },
  { secao: 95, reatanciaOhmKm: 0.1 },
  { secao: 120, reatanciaOhmKm: 0.1 },
]

// Converte a tabela acima (Ω/km) pra Ω/m, na seção mais próxima disponível — todas as seções que
// esta ferramenta usa (`TABELA_AMPACIDADE_MM2`) estão cobertas, então o fallback pela mais próxima
// só evita `undefined` em uso indevido, não deve disparar em uso normal.
export function obterReatanciaOhmMetro(secaoMm2) {
  if (secaoMm2 === null || secaoMm2 === undefined) return 0
  const tabela = TABELA_REATANCIA_OHM_KM_POR_MM2
  const linha =
    tabela.find((l) => l.secao === secaoMm2) ??
    [...tabela].sort((a, b) => Math.abs(a.secao - secaoMm2) - Math.abs(b.secao - secaoMm2))[0]
  return linha.reatanciaOhmKm / 1000
}

// Tipos de carga considerados para fins de fator de potência em equipamentos (TUE).
// Iluminação e tomadas de uso geral são tratadas como resistivas (cosφ = 1) nesta versão.
export const TIPOS_CARGA = {
  resistiva: { label: 'Resistiva (chuveiro, forno, resistência)', cosPhiPadrao: 1 },
  indutiva: { label: 'Indutiva (motor, compressor, ar-condicionado)', cosPhiPadrao: 0.85 },
  capacitiva: { label: 'Capacitiva (raro em residências)', cosPhiPadrao: 0.9 },
}

export const POTENCIA_MAXIMA_CIRCUITO_ILUMINACAO_VA = 1500
export const POTENCIA_MAXIMA_CIRCUITO_TUG_VA = 2000

// Diâmetro externo aproximado de cabo flexível de cobre, isolação PVC, 450/750V — o tipo padrão
// em instalação residencial embutida (mesmo cabo já assumido na Tabela 36/§6.2.5). NÃO vem da
// NBR 5410: a norma regula a TAXA de ocupação do eletroduto (§6.2.11.1.6), não o diâmetro
// comercial do cabo — isso é dado de catálogo de fabricante (fonte: Corfio, cabo flexível BWF
// 750V, conforme ABNT NBR NM 247-3; página do produto cabo-flexivel-bwf-750v, reconferida em
// 29/09/2026: externo = condutor + 2·isolação nas 12 seções). Varia alguns décimos de mm entre fabricantes; usado só pelo
// dimensionamento de eletroduto (`eletroduto.js`), nunca para ampacidade ou queda de tensão.
//
// EPR/XLPE: cabo unipolar flexível HEPR 90°C 0,6/1 kV (isolação + cobertura), o cabo de 90°C
// usado em instalação embutida — fonte: página do produto da Corfio (cabo-flexivel-1kv-hepr),
// "Diâmetro externo nominal", consultada em 29/09/2026. Conferência da transcrição: em todas as
// 12 seções, externo = condutor + 2·isolação + 2·cobertura + 0,2 mm. É bem mais grosso que o PVC
// 750 V (a cobertura), então o eletroduto de um circuito EPR sai maior.
// Seção sem diâmetro aqui → `eletroduto.js` recusa dimensionar (retorna `erro`) em vez de supor.
export const DIAMETRO_EXTERNO_CONDUTOR_MM = {
  pvc: {
    1.5: 2.95,
    2.5: 3.55,
    4: 4.05,
    6: 4.65,
    10: 6.0,
    16: 7.0,
    25: 8.6,
    35: 10.15,
    50: 11.8,
    70: 13.5,
    95: 15.7,
    120: 17.2,
  },
  epr: {
    1.5: 4.95,
    2.5: 5.35,
    4: 5.85,
    6: 6.45,
    10: 7.6,
    16: 8.6,
    25: 10.4,
    35: 11.95,
    50: 13.6,
    70: 15.5,
    95: 17.5,
    120: 19.2,
  },
}

// Eletrodutos de PVC rígido roscável, classe A — diâmetro interno útil por referência comercial.
// Também não vem da NBR 5410: dimensão de PRODUTO do eletroduto, definida pela norma específica
// do eletroduto (ABNT NBR 15465, antiga NBR 6150), não pela 5410. Valores típicos de catálogo;
// podem variar ±1 mm entre fabricantes — ver nota de aproximação na tela de resultado.
export const ELETRODUTOS_PVC_RIGIDO = [
  { referencia: '3/8"', nominalMm: 16, diametroInternoMm: 12.8 },
  { referencia: '1/2"', nominalMm: 20, diametroInternoMm: 16.4 },
  { referencia: '3/4"', nominalMm: 25, diametroInternoMm: 21.3 },
  { referencia: '1"', nominalMm: 32, diametroInternoMm: 27.5 },
  { referencia: '1.1/4"', nominalMm: 40, diametroInternoMm: 36.1 },
  { referencia: '1.1/2"', nominalMm: 50, diametroInternoMm: 41.4 },
  { referencia: '2"', nominalMm: 60, diametroInternoMm: 52.8 },
  { referencia: '2.1/2"', nominalMm: 75, diametroInternoMm: 67.1 },
  { referencia: '3"', nominalMm: 85, diametroInternoMm: 79.6 },
  { referencia: '4"', nominalMm: 110, diametroInternoMm: 103.1 },
]

// NBR 5410 §6.2.11.1.6 a) — taxa de ocupação máxima do eletroduto: quociente entre a soma das
// áreas das seções transversais dos condutores (pelo diâmetro EXTERNO) e a área útil do
// eletroduto. Depende do número de condutores no trecho — TODOS eles (fase, neutro, terra/PE),
// não só os "carregados" (essa distinção é só da Tabela 36/ampacidade, não vale aqui).
export function obterTaxaOcupacaoMaxima(numeroCondutores) {
  if (numeroCondutores <= 1) return 0.53
  if (numeroCondutores === 2) return 0.31
  return 0.4
}
