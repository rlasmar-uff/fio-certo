import {
  CONDICOES_ATERRAMENTO_ENTERRADO,
  ESQUEMAS_ATERRAMENTO,
  ISOLACOES,
  METODOS_INSTALACAO,
  TABELA_MULTIPLICADOR_DISPARO_INSTANTANEO,
  TAXAS_TERCEIRA_HARMONICA,
  TENSOES_FASE_NEUTRO,
  TIPOS_CARGA,
  TIPOS_COMODO,
  TIPOS_INSTALACAO,
} from '../calculations/constantes.js'
import { DISTRIBUIDORAS } from '../calculations/distribuidoras.js'
import { TIPOS_PONTO_BANHEIRO } from '../calculations/locaisEspeciais.js'
import { DRS_MONTANTE } from '../calculations/seccionamento.js'

export const ESTADO_INICIAL = {
  tipoInstalacao: 'monofasica',
  tensaoFaseNeutro: 127,
  comodos: [],
  comprimentos: {},
  comprimentoRamalEntrada: '',
  // §9.5.2.2.2 a) — "admite-se" 600 VA até só 2 pontos (em vez de 3) nos ambientes de 600 VA
  // quando o total desses pontos no projeto passa de 6. É uma alternativa PERMISSIVA da norma, não
  // uma exigência — por isso só tem efeito quando o usuário declara explicitamente que quer
  // adotá-la (mesmo padrão de opt-in de `neutroReduzidoDeclarado`); default `false` mantém a
  // leitura base (sempre 3 pontos), mais conservadora.
  aplicarAlternativa600VA: false,
  // Ajuste avançado opcional dos fatores de correção (Tabelas 40/42/45) — '' (não preenchido) usa
  // os defaults automáticos: 30°C ao ar (ou 20°C de solo, para circuitos/alimentador enterrados —
  // método D) e nº de circuitos agrupados = total de circuitos gerados. `temperaturaSoloC` e
  // `resistividadeTermicaSoloKmW` só têm efeito em circuitos/alimentador no método D — ver
  // METODOS_INSTALACAO.
  temperaturaAmbienteC: '',
  temperaturaSoloC: '',
  resistividadeTermicaSoloKmW: '',
  numeroCircuitosAgrupadosManual: '',
  // Método de instalação (A1/A2/B1/B2/C/D — ver METODOS_INSTALACAO) por circuito terminal, no
  // mesmo padrão de mapa que `comprimentos`; ausente = B1 (fios em eletroduto, o mais comum).
  metodosInstalacao: {},
  metodoInstalacaoAlimentador: 'B1',
  // Isolação dos condutores (Tabela 36 = PVC, Tabela 37 = EPR/XLPE) — decisão de projeto, não por
  // circuito (o método de instalação varia dentro de uma casa; a isolação é decisão de compra).
  // `isolacaoCondutor` cobre os circuitos terminais; `isolacaoAlimentador`, o ramal de entrada —
  // separados porque é comum o alimentador ser EPR/XLPE e os circuitos internos PVC, nunca o
  // contrário.
  isolacaoCondutor: 'pvc',
  isolacaoAlimentador: 'pvc',
  // §6.2.6.2.6/Tabela 48 — redução do neutro do alimentador trifásico com fase > 25 mm². Só tem
  // efeito quando o usuário declara explicitamente que as 3 condições da norma valem — nunca
  // aplicado automaticamente.
  neutroReduzidoDeclarado: false,
  // §6.2.5.6.1 e §6.2.6.2.6 — taxa de 3ª harmônica e múltiplos. Tri-estado, não booleano: governa
  // ao mesmo tempo a redução do neutro (só com ≤ 15%) e o fator de 0,86 por neutro carregado (só
  // acima de 15%), cujos lados seguros são opostos. Ver TAXAS_TERCEIRA_HARMONICA.
  terceiraHarmonica: 'nao-declarado',
  // §5.3.5 — corrente de curto-circuito presumida na origem (dado do usuário, não da norma) e
  // curva do disjuntor geral (B/C/D, IEC 60898). '' = não informado = "não verificado".
  iccPresumidaA: '',
  // Opcional: a Icc fase-neutro na origem, quando a concessionária informa as duas. Sem ela, os
  // laços fase-neutro e fase-PE partem da trifásica (a maior, lado seguro para o I²t).
  iccFaseNeutroA: '',
  // N18 — distribuidora escolhida para a demanda de iluminação/tomadas (opcional, informativo,
  // nunca substitui o dimensionamento por NBR 5410). '' = nenhuma.
  distribuidoraId: '',
  curvaDisjuntorGeral: 'C',
  // §5.4.2.1.1/§6.3.5.2.1 b) — declarações sobre a instalação real que afetam só a recomendação
  // de DPS (exigência normativa vs. boa prática; Classe I além da Classe II). Default `false`:
  // sem declaração, a ferramenta continua recomendando Classe II como boa prática, sem alegar
  // exigência normativa — ver `recomendarDPS`.
  alimentacaoAerea: false,
  regiaoAltoIndiceDescargas: false,
  exposicaoDescargaDireta: false,
  // §4.2.2.2 — esquema de aterramento (ESQUEMAS_ATERRAMENTO) e §6.4.1.2.1/Tabela 52 — condição do
  // condutor de aterramento (CONDICOES_ATERRAMENTO_ENTERRADO). '' = não declarado.
  esquemaAterramento: '',
  condicaoAterramento: '',
  // §5.1.2.2.4.3 — resistência de aterramento medida (TT), opcional.
  resistenciaAterramentoOhm: '',
  // §6.3.3.2.6 — 'geral' (um DR de 30 mA para tudo) ou 'grupos' (um por grupo, `grupoDR` =
  // {circuitoId: nº do DR}); `drMontante` = DRS_MONTANTE ('' = nenhum), só no modo por grupos.
  modoDR: 'geral',
  grupoDR: {},
  drMontante: '',
  // F8 — instalação existente: {circuitoId: {secaoMm2, disjuntorA}} já instalados, a conferir.
  existentes: {},
  // F5 — folga da lista de materiais, em % sobre os comprimentos informados. '' = sem folga.
  folgaMateriaisPercentual: '',
  // F12 — simulador de consumo: dias de uso no mês, tarifa (R$/kWh) e horas/dia por carga
  // ({id da carga: horas}), tudo informado pelo usuário.
  consumo: { dias: '', tarifa: '', horas: {} },
  // N17 — percurso do eletroduto por circuito: {circuitoId: [{id, comprimentoM, curvas, externo}]}.
  percursos: {},
}

export function gerarId() {
  return Math.random().toString(36).slice(2, 10)
}

const ehObjeto = (valor) => valor !== null && typeof valor === 'object' && !Array.isArray(valor)
const ehEscalar = (valor) => typeof valor === 'string' || typeof valor === 'number'
const idValido = (valor) => (typeof valor === 'string' && valor ? valor : gerarId())

function mesmoTipo(padrao, valor) {
  if (Array.isArray(padrao)) return Array.isArray(valor)
  if (ehObjeto(padrao)) return ehObjeto(valor)
  if (typeof padrao === 'boolean') return typeof valor === 'boolean'
  return ehEscalar(valor) // campos de formulário guardam número ou texto indistintamente
}

// Campos de escolha: só valores que a interface oferece ('' = não declarado, onde existe).
const OPCOES = {
  tipoInstalacao: Object.keys(TIPOS_INSTALACAO),
  isolacaoCondutor: Object.keys(ISOLACOES),
  isolacaoAlimentador: Object.keys(ISOLACOES),
  metodoInstalacaoAlimentador: Object.keys(METODOS_INSTALACAO),
  terceiraHarmonica: Object.keys(TAXAS_TERCEIRA_HARMONICA),
  curvaDisjuntorGeral: Object.keys(TABELA_MULTIPLICADOR_DISPARO_INSTANTANEO),
  esquemaAterramento: ['', ...Object.keys(ESQUEMAS_ATERRAMENTO)],
  condicaoAterramento: ['', ...Object.keys(CONDICOES_ATERRAMENTO_ENTERRADO)],
  modoDR: ['geral', 'grupos'],
  drMontante: ['', ...Object.keys(DRS_MONTANTE)],
}

// Mapa {id: valor}: fica só o par cujo valor passa em `aceita`.
function filtrarMapa(mapa, aceita) {
  return Object.fromEntries(Object.entries(mapa).filter(([, valor]) => aceita(valor)))
}

// Um projeto vindo de fora (arquivo, link, localStorage de outra versão) é dado não confiável:
// só entram as chaves conhecidas, cada uma com o tipo do estado inicial, e os campos de escolha
// só com opções que existem; o que não bate fica no valor padrão, em vez de quebrar o cálculo.
export function normalizarProjeto(dados) {
  if (!ehObjeto(dados)) throw new Error('O conteúdo não é um projeto.')
  const projeto = { ...ESTADO_INICIAL }
  for (const [chave, padrao] of Object.entries(ESTADO_INICIAL)) {
    if (mesmoTipo(padrao, dados[chave])) projeto[chave] = dados[chave]
  }
  for (const [chave, opcoes] of Object.entries(OPCOES)) {
    if (!opcoes.includes(projeto[chave])) projeto[chave] = ESTADO_INICIAL[chave]
  }
  projeto.tensaoFaseNeutro = TENSOES_FASE_NEUTRO.includes(Number(projeto.tensaoFaseNeutro))
    ? Number(projeto.tensaoFaseNeutro)
    : ESTADO_INICIAL.tensaoFaseNeutro
  if (!Object.hasOwn(DISTRIBUIDORAS, projeto.distribuidoraId)) projeto.distribuidoraId = ''

  projeto.comprimentos = filtrarMapa(projeto.comprimentos, ehEscalar)
  projeto.metodosInstalacao = filtrarMapa(projeto.metodosInstalacao, (metodo) => Object.hasOwn(METODOS_INSTALACAO, metodo))
  projeto.grupoDR = filtrarMapa(projeto.grupoDR, (numero) => Number.isInteger(Number(numero)) && Number(numero) > 0)
  projeto.existentes = filtrarMapa(projeto.existentes, ehObjeto)
  projeto.percursos = Object.fromEntries(
    Object.entries(projeto.percursos)
      .filter(([, trechos]) => Array.isArray(trechos))
      .map(([id, trechos]) => [id, trechos.filter(ehObjeto).map((trecho) => ({ ...trecho, id: idValido(trecho.id) }))]),
  )
  const consumo = projeto.consumo
  projeto.consumo = {
    dias: ehEscalar(consumo.dias) ? consumo.dias : '',
    tarifa: ehEscalar(consumo.tarifa) ? consumo.tarifa : '',
    horas: ehObjeto(consumo.horas) ? filtrarMapa(consumo.horas, ehEscalar) : {},
  }

  projeto.comodos = projeto.comodos.filter(ehObjeto).map((comodo) => ({
    ...comodo,
    id: idValido(comodo.id),
    tipo: Object.hasOwn(TIPOS_COMODO, comodo.tipo) ? comodo.tipo : 'social',
    tue: (Array.isArray(comodo.tue) ? comodo.tue : []).filter(ehObjeto).map((equipamento) => ({
      ...equipamento,
      id: idValido(equipamento.id),
      ligacao: equipamento.ligacao === 'fase-fase' ? 'fase-fase' : 'fase-neutro',
      tipoCarga: Object.hasOwn(TIPOS_CARGA, equipamento.tipoCarga) ? equipamento.tipoCarga : 'resistiva',
    })),
    // N19 — geometria do banheiro marcada na planta (opcional; ver `VolumesBanheiro.jsx` e
    // `locaisEspeciais.js`). Ausente = a ferramenta segue só com o checklist informativo.
    geometriaBanheiro: ehObjeto(comodo.geometriaBanheiro)
      ? {
          boxLarguraM: ehEscalar(comodo.geometriaBanheiro.boxLarguraM) ? comodo.geometriaBanheiro.boxLarguraM : 0,
          boxProfundidadeM: ehEscalar(comodo.geometriaBanheiro.boxProfundidadeM) ? comodo.geometriaBanheiro.boxProfundidadeM : 0,
          // Altura do fundo da banheira/piso-boxe acima do piso do banheiro — default 0 (chuveiro
          // ou piso-boxe ao nível do piso, o caso comum). Só relevante para banheira elevada; ver
          // `classificarVolume` em locaisEspeciais.js.
          boxAlturaBaseM: ehEscalar(comodo.geometriaBanheiro.boxAlturaBaseM) ? comodo.geometriaBanheiro.boxAlturaBaseM : 0,
          pontos: (Array.isArray(comodo.geometriaBanheiro.pontos) ? comodo.geometriaBanheiro.pontos : [])
            .filter(ehObjeto)
            .map((ponto) => ({
              id: idValido(ponto.id),
              nome: typeof ponto.nome === 'string' ? ponto.nome : '',
              tipo: Object.hasOwn(TIPOS_PONTO_BANHEIRO, ponto.tipo) ? ponto.tipo : 'outro',
              xM: ehEscalar(ponto.xM) ? ponto.xM : 0,
              yM: ehEscalar(ponto.yM) ? ponto.yM : 0,
              alturaM: ehEscalar(ponto.alturaM) ? ponto.alturaM : '',
            })),
        }
      : undefined,
  }))
  return projeto
}
