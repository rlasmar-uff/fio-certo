// NBR 5410 §9.1 — locais contendo banheira ou chuveiro: volumes 0-3 e grau de proteção mínimo.
// Geometria de referência (§9.1.2.1), não uma tabela numérica da norma.
export const VOLUMES_BANHEIRO = [
  { volume: 0, descricao: 'interior da banheira/piso-boxe (local inundável)', ipMinimo: 'IPX7' },
  { volume: 1, descricao: '0,6 m ao redor do chuveiro/banheira, até 2,25 m de altura', ipMinimo: 'IPX4' },
  { volume: 2, descricao: '+0,60 m além do volume 1, até 3 m de altura', ipMinimo: 'IPX3–IPX5' },
  { volume: 3, descricao: '+2,40 m além do volume 2, até 2,25 m de altura', ipMinimo: 'IPX1–IPX5' },
]

// NBR 5410 §9.1.2.1 — volumes 0 a 3 a partir da geometria marcada na planta (opcional, por
// cômodo do tipo banheiro): a caixa do chuveiro/banheira (largura × profundidade em metros; 0×0 =
// chuveiro sem piso-boxe, Figura 18), a altura do fundo dessa caixa acima do piso do banheiro
// (`boxAlturaBaseM`, opcional, default 0 — só relevante para banheira elevada; um piso-boxe ou
// rebaixo de chuveiro comum fica no piso) e os pontos elétricos, cada um com posição (x,y
// relativos ao canto superior esquerdo da caixa) e altura. Sem essa marcação
// (`comodo.geometriaBanheiro` ausente), a ferramenta continua só com o checklist informativo de
// `VOLUMES_BANHEIRO` acima — ver `VolumesBanheiro.jsx`.
export const TIPOS_PONTO_BANHEIRO = {
  tomada: 'Tomada',
  interruptor: 'Interruptor',
  luminaria: 'Luminária',
  aquecedor: 'Aquecedor de água / chuveiro elétrico',
  outro: 'Outro dispositivo (quadro, disjuntor...)',
}

// Distância horizontal do ponto até a caixa: dx/dy "clampados" em 0 quando o ponto já está entre
// as bordas da caixa naquele eixo. A mesma fórmula dá a distância até um ponto quando a caixa tem
// largura/profundidade zero — não precisa de um caso especial para "chuveiro sem piso-boxe".
function distanciaHorizontalM(ponto, box) {
  const dx = Math.max(-ponto.xM, 0, ponto.xM - box.wM)
  const dy = Math.max(-ponto.yM, 0, ponto.yM - box.hM)
  return Math.hypot(dx, dy)
}

// §9.1.2.1 b) — a superfície que limita o volume 1 é a que "circunscreve a banheira, o piso-boxe,
// o rebaixo do boxe **ou, na falta de uma clara delimitação do boxe**, uma superfície vertical
// situada 0,6 m ao redor do chuveiro ou ducha". Os 0,6 m são a ALTERNATIVA para quando não há box
// delimitado (Figura 18) — com box declarado (Figuras 16/17), volume 1 é a própria projeção do
// box, sem folga extra. `box.wM > 0 && box.hM > 0` é o sinal de que o usuário mediu um box real,
// em vez do 0×0 que representa "chuveiro solto" (ver comentário no topo do arquivo).
function temBoxDeclarado(box) {
  return box.wM > 0 && box.hM > 0
}

// §9.1.2.1: volume 0 = interior da caixa (banheira/piso-boxe/rebaixo); volume 1 = a coluna de ar
// acima do volume 0 (com box) ou +0,6 m ao redor do ponto (sem box), até 2,25 m acima do FUNDO da
// banheira/piso do boxe; volume 2 = +0,60 m além da borda do volume 1, até 3 m acima do piso do
// banheiro; volume 3 = +2,40 m além da borda do volume 2, até 2,25 m acima do piso do banheiro.
// `null` = fora de todos os volumes (nenhuma restrição desta subseção).
//
// `box.baseM` (opcional, default 0) é a altura do fundo da banheira/piso do boxe ACIMA do piso do
// banheiro — só afeta o teto do volume 1 (medido do fundo da banheira, §9.1.2.1 b), nunca os tetos
// dos volumes 2 e 3 (medidos do piso do banheiro, alíneas c) e d) — bases de referência
// DIFERENTES, não confundir). Para o caso comum (chuveiro/piso-boxe ao nível do piso), baseM=0 e
// o teto do volume 1 volta a ser 2,25 m como antes.
//
// Simplificação conservadora e documentada: a faixa entre o teto do volume 1 e 3 m (diretamente
// acima do volume 1) entra no volume 2. As Figuras 16-18 da norma (imagens, não reproduzíveis por
// extração de texto) desenham essa faixa como uma "tampa" sobre o volume 1; sem poder conferir a
// figura, adotou-se a leitura mais restritiva (permanece dentro de um volume protegido), nunca a
// mais permissiva (ficaria de fora de qualquer volume).
export function classificarVolume(ponto, box) {
  const d = distanciaHorizontalM(ponto, box)
  const h = Number(ponto.alturaM)
  const baseM = Number(box.baseM) || 0
  const tetoVolume1 = baseM + 2.25

  // §9.1.2.1 a) — volume 0 é o interior INUNDÁVEL da banheira/piso-boxe/rebaixo: uma caixa rasa
  // no piso, não uma coluna que se estende para cima. A norma não dá um número para o "teto" do
  // volume 0 (de novo, é a figura que mostra isso) e esta ferramenta não modela a profundidade do
  // box — por isso volume 0 só é identificado exatamente no fundo do box (alturaM = baseM, dentro
  // da projeção horizontal). Qualquer ponto acima disso, mesmo diretamente sobre o box, é a coluna
  // de ar que a própria norma já inclui no volume 1 (b): "limitado: pelo volume 0; ... e pelo
  // plano horizontal situado 2,25 m acima do fundo da banheira").
  if (d === 0 && h === baseM) return 0

  if (temBoxDeclarado(box)) {
    if (d === 0) return h <= tetoVolume1 ? 1 : h <= 3 ? 2 : null
    if (d <= 0.6) return h <= 3 ? 2 : null
    if (d <= 3.0) return h <= 2.25 ? 3 : null
    return null
  }

  // Sem box delimitado (chuveiro/ducha "solto", Figura 18): os 0,6 m contam a partir do próprio
  // ponto de referência do chuveiro (alternativa de §9.1.2.1 b). Faixas mantidas como antes desta
  // correção: volume 1 até 0,6 m, volume 2 até 1,2 m, volume 3 até 3,6 m.
  if (d <= 0.6) return h <= tetoVolume1 ? 1 : h <= 3 ? 2 : null
  if (d <= 1.2) return h <= 3 ? 2 : null
  if (d <= 3.6) return h <= 2.25 ? 3 : null
  return null
}

// §9.1.4.3.1 (proibição de dispositivo de proteção/seccionamento/comando, inclui tomada, nos
// volumes 0-2) · §9.1.4.3.2 (tomada no volume 3, com transformador de separação, SELV, ou DR
// ≤30mA — esta ferramenta já garante DR ≤30mA em todo circuito) · §9.1.4.4 (classe de equipamento
// por volume: volume 1 só aquecedor classe I/II; volume 2 + luminária classe II).
const REGRAS_PONTO = {
  tomada: {
    permitido: (volume) => volume === null || volume === 3,
    clausula: (volume) => (volume === 3 ? '§9.1.4.3.2' : '§9.1.4.3.1'),
    motivo: (volume) =>
      volume === null
        ? null
        : volume === 3
          ? 'permitida no volume 3 com transformador de separação, SELV, ou DR ≤30mA — esta instalação já tem DR ≤30mA em todo circuito'
          : `dispositivo de comando/seccionamento (inclui tomada) proibido no volume ${volume}`,
  },
  interruptor: {
    permitido: (volume) => volume === null || volume === 3,
    clausula: () => '§9.1.4.3.1',
    motivo: (volume) => (volume === null || volume === 3 ? null : `dispositivo de comando proibido no volume ${volume}`),
  },
  luminaria: {
    permitido: (volume) => volume === null || volume === 2 || volume === 3,
    clausula: () => '§9.1.4.4',
    motivo: (volume) =>
      volume === 0 || volume === 1
        ? `luminária só é prevista a partir do volume 2, classe II — não no volume ${volume}`
        : volume === 2
          ? 'permitida no volume 2, desde que classe II — confira a classe do equipamento'
          : null,
  },
  aquecedor: {
    permitido: (volume) => volume !== 0,
    clausula: () => '§9.1.4.4',
    motivo: (volume) =>
      volume === 0
        ? 'aquecedor de água não pode ficar no volume 0'
        : volume === 1 || volume === 2
          ? 'permitido, desde que classe I ou II — confira a classe do equipamento'
          : null,
  },
  outro: {
    permitido: (volume) => volume === null || volume === 3,
    clausula: () => '§9.1.4.3.1',
    motivo: (volume) => (volume === null || volume === 3 ? null : `dispositivo de proteção/seccionamento/comando proibido no volume ${volume}`),
  },
}

// Um ponto sem altura declarada não pode ser classificado — fica de fora da lista (não é "não
// conforme", é "não verificável"), em vez de assumir uma altura que ninguém informou.
export function verificarPontosBanheiro(geometriaBanheiro) {
  if (!geometriaBanheiro?.pontos?.length) return []
  const box = {
    wM: Number(geometriaBanheiro.boxLarguraM) || 0,
    hM: Number(geometriaBanheiro.boxProfundidadeM) || 0,
    baseM: Number(geometriaBanheiro.boxAlturaBaseM) || 0,
  }
  return geometriaBanheiro.pontos
    .filter((ponto) => ponto.alturaM !== '' && ponto.alturaM !== undefined && ponto.alturaM !== null && Number.isFinite(Number(ponto.alturaM)))
    .map((ponto) => {
      const volume = classificarVolume(ponto, box)
      const regra = REGRAS_PONTO[ponto.tipo] ?? REGRAS_PONTO.outro
      return {
        id: ponto.id,
        nome: ponto.nome || TIPOS_PONTO_BANHEIRO[ponto.tipo] || TIPOS_PONTO_BANHEIRO.outro,
        tipo: ponto.tipo,
        alturaM: Number(ponto.alturaM),
        volume,
        conforme: regra.permitido(volume),
        clausula: regra.clausula(volume),
        motivo: regra.motivo(volume),
      }
    })
}

// NBR 5410 §9.1.3.1.2 (equipotencialização suplementar) e §5.1.3.2.2 a) (DR ≤30mA para circuitos
// de locais com banheira/chuveiro) — presume-se que todo cômodo cadastrado como "banheiro" contém
// banheira/chuveiro (§9.1.1), simplificação conservadora que nunca perde um requisito real. `idrGeral`
// vem de `dimensionarIDR` (protecaoGeral.js) e é reaproveitado, nunca recalculado aqui.
export function avaliarRequisitosBanheiro(comodos, idrGeral) {
  const possuiBanheiro = comodos.some((comodo) => comodo.tipo === 'banheiro')
  if (!possuiBanheiro) return { possuiBanheiro: false }

  const banheiros = comodos.filter((comodo) => comodo.tipo === 'banheiro')
  const pontosPorComodo = banheiros
    .map((comodo) => ({ comodoId: comodo.id, comodoNome: comodo.nome, pontos: verificarPontosBanheiro(comodo.geometriaBanheiro) }))
    .filter((item) => item.pontos.length > 0)
  const pontosNaoConformes = pontosPorComodo.flatMap((item) =>
    item.pontos.filter((ponto) => ponto.conforme === false).map((ponto) => ({ ...ponto, comodoNome: item.comodoNome })),
  )

  return {
    possuiBanheiro: true,
    comodosBanheiro: banheiros.map((comodo) => comodo.nome),
    equipotencializacaoSuplementarExigida: true,
    drAtendePorIdrGeral: idrGeral !== null && idrGeral.sensibilidadeMA <= 30,
    volumes: VOLUMES_BANHEIRO,
    pontosPorComodo,
    pontosNaoConformes,
  }
}

// NBR 5410 §9.2 — piscinas (e fontes em que se possa entrar, NOTA 1 de §9.2.1). Volumes de §9.2.2.1,
// grau de proteção de §9.2.4.1 e regras de §9.2.3.1 / §9.2.4.3.
export const VOLUMES_PISCINA = [
  {
    volume: 0,
    descricao: 'interior do reservatório (piscina e lava-pés)',
    ipMinimo: 'IPX8',
    regra: 'só SELV até 12 V c.a. (§9.2.3.1.1); nenhum dispositivo nem tomada (§9.2.4.3.1)',
  },
  {
    volume: 1,
    descricao: 'até 2 m das bordas, até 2,5 m de altura',
    ipMinimo: 'IPX5 (IPX4 em piscina pequena coberta, sem jato d’água)',
    regra: 'só SELV até 12 V c.a.; sem dispositivos nem caixas de derivação, exceto de SELV (§9.2.4.2.3)',
  },
  {
    volume: 2,
    descricao: 'mais 1,5 m além do volume 1, até 2,5 m de altura',
    ipMinimo: 'IPX2 coberta · IPX4 ao tempo · IPX5 com jato d’água',
    regra: 'tomadas e interruptores só com DR ≤ 30 mA, SELV ou separação elétrica individual (§9.2.4.3.3)',
  },
]

// NBR 5410 §9.4 — sauna. Os volumes são os da figura 22; aqui só as regras do texto.
export const REGRAS_SAUNA = [
  { texto: 'Todos os componentes com grau de proteção mínimo IP24.', clausula: '§9.4.4.1.1' },
  { texto: 'Volume 1: só o aquecedor e seus acessórios.', clausula: '§9.4.4.1.2' },
  { texto: 'Volume 3: componentes para 125 °C contínuos e condutores com isolação para 170 °C.', clausula: '§9.4.4.1.4' },
  { texto: 'Volume 4: só termostatos, protetores térmicos e suas linhas.', clausula: '§9.4.4.1.5' },
  { texto: 'Dispositivos de proteção e comando que não integrem o aquecedor ficam fora da sauna.', clausula: '§9.4.4.3.1' },
  { texto: 'Nenhuma tomada dentro da sauna.', clausula: '§9.4.4.3.2' },
  { texto: 'Dispositivo que desligue o aquecedor se a temperatura no volume 4 passar de 140 °C.', clausula: '§9.4.4.3.3' },
]

// Piscina: marcada no cômodo (`piscina: true`, área externa onde ela fica). Sauna: tipo de cômodo.
// Todo circuito desta ferramenta fica sob um DR de 30 mA (geral ou de grupo), o que atende
// §9.2.3.1.2 b) e §9.2.4.3.3 b) no volume 2 da piscina.
export function avaliarPiscinaESauna(comodos, porComodo) {
  const piscinas = comodos.filter((comodo) => comodo.piscina)
  const saunas = comodos.filter((comodo) => comodo.tipo === 'sauna')
  const tomadas = new Map(porComodo.map((carga) => [carga.comodoId, carga.tugQuantidade]))
  return {
    piscina: piscinas.length
      ? { comodos: piscinas.map((comodo) => comodo.nome), equipotencializacaoSuplementarExigida: true, volumes: VOLUMES_PISCINA }
      : null,
    sauna: saunas.length
      ? {
          comodos: saunas.map((comodo) => comodo.nome),
          // §9.4.4.3.2 — tomada informada à mão numa sauna é não conformidade.
          comTomada: saunas.filter((comodo) => tomadas.get(comodo.id) > 0).map((comodo) => comodo.nome),
          // §9.4.4.1.4 — a ferramenta só dimensiona PVC (70 °C) e EPR/XLPE (90 °C): o trecho do
          // aquecedor no volume 3 precisa de cabo para 170 °C, que ela não tabela.
          aquecedores: saunas.flatMap((comodo) => (comodo.tue ?? []).map((equipamento) => equipamento.nome || 'aquecedor')),
          regras: REGRAS_SAUNA,
        }
      : null,
  }
}
