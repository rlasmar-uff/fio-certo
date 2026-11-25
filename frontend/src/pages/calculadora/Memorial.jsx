import { Link } from 'react-router-dom'
import DiagramaUnifilar from '../../components/DiagramaUnifilar.jsx'
import VistaQuadro from '../../components/VistaQuadro.jsx'
import SecaoMateriais from './SecaoMateriais.jsx'
import Checklists from '../../components/Checklists.jsx'
import { useProjeto } from '../../context/useProjeto.js'
import { calcularVeredito } from '../../calculations/veredito.js'
import { montarChecklists } from '../../calculations/checklists.js'
import { montarQuadro } from '../../calculations/quadro.js'
import { calcularIluminacaoMinimaVA, configTipoComodo, calcularLimite600VA } from '../../calculations/previsaoDeCarga.js'
import { condutividadeCobre, CONVENCOES_RESISTIVIDADE } from '../../calculations/quedaDeTensao.js'
import { MANEIRAS_INSTALAR } from '../../calculations/agrupamento.js'
import {
  CONDICOES_ATERRAMENTO_ENTERRADO,
  ESQUEMAS_ATERRAMENTO,
  FORNECIMENTOS,
  ISOLACOES,
  RESSALVA_K_PEQUENA_SECAO,
  TABELA_46_CONDUTORES_CARREGADOS,
  TAXAS_TERCEIRA_HARMONICA,
  TIPOS_COMODO,
  TIPOS_INSTALACAO,
  obterReatanciaOhmMetro,
} from '../../calculations/constantes.js'
import { ROUTES } from '../../routes.js'

// Memorial técnico (§6.1.8.1): documento para imprimir ou salvar em PDF pelo navegador. Componentes próprios,
// sem <details>, botões nem links de navegação no corpo; cada número tem a fórmula, os valores e a cláusula.
// Modelo: docs/modelo-relatorio/modelo-memorial.html.

const num = (valor, casas = 2) =>
  valor === null || valor === undefined || Number.isNaN(Number(valor))
    ? '—'
    : Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
const inteiro = (valor) => (valor === null || valor === undefined ? '—' : Math.round(valor).toLocaleString('pt-BR'))
const mm2 = (valor) => (valor ? `${String(valor).replace('.', ',')} mm²` : '—')
// 81400 → "8,14 × 10⁴" (notação científica legível no papel).
const SOBRESCRITO = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' }
const cientifico = (valor) => {
  if (!valor) return '—'
  const expoente = Math.floor(Math.log10(Math.abs(valor)))
  return `${num(valor / 10 ** expoente)} × 10${String(expoente).split('').map((d) => SOBRESCRITO[d]).join('')}`
}
const ou = (texto) => (texto && String(texto).trim() ? texto : 'não informado')

function Selo({ estado, children }) {
  const simbolo = { ok: '✔', alerta: '✖', atencao: '◐' }[estado] ?? ''
  return (
    <span className={`selo-relatorio selo-${estado}`}>
      {simbolo} {children}
    </span>
  )
}

function Secao({ numero, titulo, children, novaPagina = false, id }) {
  return (
    <section className={`relatorio-secao${novaPagina ? ' relatorio-nova-pagina' : ''}`} id={id}>
      <h2>
        {numero && <span className="relatorio-num">{numero}</span>}
        {titulo}
      </h2>
      {children}
    </section>
  )
}

function Passo({ indice, titulo, clausula, children }) {
  return (
    <div className="relatorio-passo">
      <span className="relatorio-passo-i">{indice}</span>
      <div>
        <strong>{titulo}</strong> <span className="relatorio-ref">{clausula}</span>
        {children}
      </div>
    </div>
  )
}

const Formula = ({ children }) => <div className="relatorio-formula">{children}</div>

// Regra de previsão de carga aplicada a cada cômodo, em texto (§9.5.2.1.2 e §9.5.2.2).
function regraIluminacao(carga) {
  if (carga.iluminacaoRealVA !== null && carga.iluminacaoRealVA >= carga.iluminacaoMinimaVA)
    return `luminárias informadas: ${inteiro(carga.iluminacaoRealVA)} VA (mínimo ${inteiro(carga.iluminacaoMinimaVA)} VA)`
  if (carga.area <= 6) return '≤ 6 m² ⇒ 100'
  const blocos = Math.floor((carga.area - 6) / 4)
  return `100 + ${blocos}×60 (${num(carga.area - 6, 2)} m² acima de 6 ⇒ ${blocos} bloco${blocos === 1 ? '' : 's'} de 4 m² inteiros)`
}

function regraTomadas(comodo, carga, limite600VA) {
  const config = configTipoComodo(comodo.tipo)
  const manual = comodo.tugPontos !== '' && comodo.tugPontos !== undefined && comodo.tugPontos !== null
  let quantidade
  if (manual) quantidade = `${carga.tugQuantidade} pontos informados (mínimo ${carga.tugQuantidadeMinima})`
  else if (comodo.tipo === 'banheiro') quantidade = '1 ponto (alínea a)'
  else if (comodo.tipo === 'varanda') quantidade = '1 ponto (alínea c)'
  else if (comodo.tipo === 'sauna') quantidade = 'nenhum (§9.4.4.3.2)'
  else if (comodo.tipo === 'manutencao') quantidade = '1 ponto (§4.2.1.2.3 b)'
  else if ((comodo.tipo === 'outro' || comodo.tipo === 'externa') && carga.area <= 6) quantidade = '≤ 6 m² ⇒ 1 ponto (alínea e)'
  else quantidade = `⌈${num(comodo.perimetro, 2)}/${String(config.tugPorMetroPerimetro).replace('.', ',')}⌉ = ${carga.tugQuantidade}`
  if (config.tugPotenciaBase === 600) {
    const de600 = Math.min(carga.tugQuantidade, limite600VA)
    const de100 = carga.tugQuantidade - de600
    return `${quantidade}: ${de600}×600${de100 ? ` + ${de100}×100` : ''}`
  }
  const base = `${quantidade} × 100`
  return config.tugPotenciaMinimaVA && carga.tugVA > carga.tugQuantidade * 100 ? `${base} (mínimo de ${config.tugPotenciaMinimaVA} VA)` : base
}

const textoAgrupamento = (a) =>
  !a ? '—' : a.origem === 'grupo' ? `grupo "${a.grupo}" (${a.n} circuito(s))` : a.origem === 'global' ? `${a.n} circuito(s), informado` : `${a.n} circuito(s) no cômodo mais carregado do percurso`

// Ficha de cálculo de um circuito terminal (§6.2.6.1.2: todos os critérios, ao mesmo tempo).
function FichaCircuito({ circuito, numero, projeto }) {
  const c = circuito
  const maneira = projeto.maneirasInstalacao?.[c.id]
  const sigma = condutividadeCobre(c.isolacao, projeto.convencaoResistividade)
  const rOhmM = c.secaoMm2 ? 1 / (sigma * c.secaoMm2) : null
  const xOhmM = c.secaoMm2 && !CONVENCOES_RESISTIVIDADE[projeto.convencaoResistividade]?.rho ? obterReatanciaOhmMetro(c.secaoMm2) : 0
  const senPhi = Math.sqrt(Math.max(0, 1 - c.cosPhi * c.cosPhi))
  const trilha = (c.trilhaSecao ?? []).filter((linha) => linha.secao <= (c.secaoMm2 ?? Infinity))
  const cc = c.curtoCircuito
  const secc = c.seccionamento
  const estadoFinal = c.erro || cc?.conforme === false || secc?.conforme === false || c.sobrecarga?.conforme === false ? 'alerta' : c.dimensionamentoCompleto ? 'ok' : 'atencao'

  return (
    <article className="relatorio-ficha">
      <header className="relatorio-ficha-cab">
        <strong>
          C{numero} · {c.nome}
        </strong>
        <span>
          {inteiro(c.potenciaVA)} VA · {c.tensao} V {(c.fases ?? []).map((f) => `F${f}`).join('+')} · {c.comprimentoInformado ? `${num(c.comprimentoM, 1)} m` : 'sem comprimento'} ·{' '}
          {c.metodoInstalacao} · {ISOLACOES[c.isolacao]?.label ?? c.isolacao}
        </span>
      </header>
      <div className="relatorio-ficha-corpo">
        {c.erro && <p className="relatorio-alerta">{c.erro}</p>}
        <Passo indice="1" titulo="Corrente de projeto" clausula="§6.2.7.4">
          <Formula>
            {c.cosPhi < 1 && `S = P/cosφ = ${inteiro(c.potenciaVA * c.cosPhi)} W / ${num(c.cosPhi)} = ${inteiro(c.potenciaVA)} VA\n`}
            Ib = S / U = {inteiro(c.potenciaVA)} VA / {c.tensao} V = {num(c.correnteProjetoA)} A
          </Formula>
        </Passo>
        <Passo indice="2" titulo="Dispositivo de proteção" clausula="§5.3.4.1 a) · §9.5.4">
          <Formula>
            In = menor corrente nominal ≥ Ib → {c.disjuntorA ?? '—'} A, {c.polos === 2 ? 'bipolar (secciona as duas fases)' : 'unipolar'}, curva {projeto.curvaDisjuntorGeral}
          </Formula>
        </Passo>
        <Passo
          indice="3"
          titulo="Capacidade de condução e seção"
          clausula={`Tab. 33 (${maneira ? `maneira ${maneira} → ` : ''}${c.metodoInstalacao}) · Tab. 46 (${c.condutoresCarregados} carregados) · Tab. ${c.isolacao === 'epr' ? 37 : 36} · Tab. 40/42-45 · Tab. 47`}
        >
          <Formula>
            Iz = Itab × FCT × FCA = Itab × {num(c.fatorTemperatura)} × {num(c.fatorAgrupamento)}
            {c.fatorResistividadeSolo && c.fatorResistividadeSolo !== 1 ? ` × ${num(c.fatorResistividadeSolo)} (Tab. 41)` : ''}
            {'\n'}FCA: {textoAgrupamento(c.agrupamento)} · seção mínima {mm2(c.secaoMinimaNormativa)}
            {c.secaoMinimaCurtoMm2 ? ` · curto-circuito: S ≥ ${num(c.secaoMinimaCurtoMm2)} mm²` : ''} · critério: In ≤ Iz e ΔU ≤ {num(c.limitePercentual)} %
          </Formula>
          {trilha.length > 0 && (
            <table className="relatorio-tabela relatorio-tabela-compacta">
              <thead>
                <tr>
                  <th className="n">Seção</th>
                  <th className="n">Itab</th>
                  <th className="n">Iz</th>
                  <th>In ≤ Iz</th>
                  <th className="n">ΔU</th>
                  <th>I²t</th>
                  <th>Resultado</th>
                </tr>
              </thead>
              <tbody>
                {trilha.map((linha) => (
                  <tr key={linha.secao} className={linha.secao === c.secaoMm2 ? 'relatorio-adotada' : undefined}>
                    <td className="n">{mm2(linha.secao)}</td>
                    <td className="n">{num(linha.ampacidade, 1)} A</td>
                    <td className="n">{num(linha.ampacidadeCorrigida, 1)} A</td>
                    <td>{linha.atendeAmpacidade ? 'sim' : 'não'}</td>
                    <td className="n">{linha.quedaPercentual === null ? '—' : `${num(linha.quedaPercentual)} %`}</td>
                    <td>{linha.atendeCurto === false ? 'não' : 'sim'}</td>
                    <td>{linha.secao === c.secaoMm2 ? 'adotada' : 'rejeitada'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Passo>
        <Passo indice="4" titulo="Queda de tensão" clausula="§6.2.7.1 · §6.2.7.2">
          {!c.comprimentoInformado ? (
            <p>
              <Selo estado="atencao">não verificada</Selo> comprimento não informado.
            </p>
          ) : c.modoQueda === 'impedancia' ? (
            <Formula>
              ΔU = 2·L·Ib·(r·cosφ + x·senφ) com r e x informados ={' '}
              {num(c.quedaVolts)} V → {num(c.quedaPercentual)} % (limite {num(c.limitePercentual)} %)
            </Formula>
          ) : (
            <Formula>
              R = 1/(σ·S) = 1/({num(sigma, 1)} × {String(c.secaoMm2).replace('.', ',')}) = {num(rOhmM * 1000, 3)} mΩ/m{xOhmM ? ` · X = ${num(xOhmM * 1000, 3)} mΩ/m` : ''}
              {'\n'}ΔU = 2 · L · Ib · (R·cosφ{xOhmM && senPhi ? ' + X·senφ' : ''}) = 2 × {num(c.comprimentoM, 1)} × {num(c.correnteProjetoA)} × ({num(rOhmM * 1000, 3)}×{num(c.cosPhi)}
              {xOhmM && senPhi ? ` + ${num(xOhmM * 1000, 3)}×${num(senPhi)}` : ''}) mΩ = {num(c.quedaVolts)} V → {num(c.quedaPercentual)} %
              {'\n'}Disponível no circuito: {num(c.limitePercentual)} % (mín. de 4 % e do que sobra do total depois do alimentador)
            </Formula>
          )}
        </Passo>
        <Passo indice="5" titulo="Sobrecarga" clausula="§5.3.4.1 b)">
          {c.sobrecarga ? (
            <Formula>
              I₂ = {num(c.sobrecarga.relacaoI2In)} · In = {num(c.sobrecarga.i2A)} A ≤ {c.sobrecarga.prolongada ? 'Iz' : '1,45 · Iz'} = {num(c.sobrecarga.limiteA)} A →{' '}
              {c.sobrecarga.conforme === null ? 'não verificado' : c.sobrecarga.conforme ? 'atende' : 'NÃO atende'}
            </Formula>
          ) : (
            <p>—</p>
          )}
        </Passo>
        <Passo indice="6" titulo="Curto-circuito" clausula="§5.3.5.5.2 · §6.3.4.3.2 · Tab. 30">
          {cc?.verificado ? (
            <Formula>
              Icc no quadro = {num(c.iccQuadroA / 1000)} kA · Icc na ponta = {num(c.iccPontaA / 1000)} kA ≥ {num(cc.limiarInstantaneoA, 0)} A (disparo instantâneo garantido)
              {'\n'}I²t = ({num(c.iccQuadroA, 0)} A)² × {num(cc.tempoS, 2)} s = {cientifico(cc.energiaPassanteA2s)} A²s{' '}
              {cc.conforme ? '≤' : '>'} k²S² = ({cc.k} × {String(c.secaoMm2).replace('.', ',')})² = {cientifico(cc.energiaSuportadaA2s)} A²s
            </Formula>
          ) : (
            <p>
              <Selo estado="atencao">não verificado</Selo> {cc?.motivo}
            </p>
          )}
        </Passo>
        <Passo indice="7" titulo="Seccionamento automático" clausula={projeto.esquemaAterramento === 'TT' ? '§5.1.2.2.4.3' : '§5.1.2.2.4.2 d)'}>
          {!secc ? (
            <p>
              <Selo estado="atencao">não verificado</Selo> esquema de aterramento não declarado.
            </p>
          ) : secc.zsOhm !== undefined ? (
            <Formula>
              Zs = {num(secc.zsOhm, 3)} Ω → Ifalta = U₀/Zs = {projeto.tensaoFaseNeutro} / {num(secc.zsOhm, 3)} = {num(secc.correnteFaltaA, 0)} A ·{' '}
              {secc.porDisjuntor ? `≥ Ia = ${num(secc.iaDisjuntorA, 0)} A (disjuntor)` : `< Ia = ${num(secc.iaDisjuntorA, 0)} A`}
              {secc.porDR ? ` · com DR de 30 mA: Zs ≤ ${num(secc.zsMaximaDrOhm, 0)} Ω` : ''} → {secc.conforme ? 'atende' : secc.verificado ? 'NÃO atende' : 'não verificado'}
            </Formula>
          ) : secc.raMaximaOhm ? (
            <Formula>
              TT: RA·IΔn ≤ UL → RA ≤ {num(secc.raMaximaOhm, 0)} Ω {secc.verificado ? (secc.conforme ? '(medida: atende)' : '(medida: NÃO atende)') : '(medir em obra)'}
            </Formula>
          ) : (
            <p>
              <Selo estado="atencao">não verificado</Selo> {secc.motivo}
            </p>
          )}
        </Passo>
        <Passo indice="8" titulo="Condutor de proteção, eletroduto e DR" clausula="Tab. 58 · §6.2.11.1.6 a) · §5.1.3.2.2">
          <Formula>
            PE: {mm2(c.secaoTerraMm2)} ({c.peDetalhe?.metodo ?? 'Tabela 58'})
            {'\n'}Eletroduto:{' '}
            {c.eletroduto?.eletrodutoRecomendado
              ? `${c.eletroduto.numeroCondutores} condutores, ${num(c.eletroduto.areaCondutoresMm2, 1)} mm² ≤ ${c.eletroduto.taxaMaximaPercentual}% da área útil → DN ${c.eletroduto.eletrodutoRecomendado.nominalMm} (${c.eletroduto.eletrodutoRecomendado.referencia})`
              : c.eletroduto?.erro ?? 'sem eletroduto (método C)'}
            {'\n'}DR: {c.sobDR ? `sim, 30 mA — ${c.exigenciaDR?.exige ? c.exigenciaDR.motivos.join('; ') : 'escolha do projetista'}` : 'não exigido'}
          </Formula>
        </Passo>
        <p className="relatorio-ficha-resumo">
          <Selo estado={estadoFinal}>{estadoFinal === 'ok' ? 'circuito conforme' : estadoFinal === 'alerta' ? 'não conforme' : 'verificação incompleta'}</Selo>{' '}
          {c.secaoMm2 ? `${c.ehFaseFase ? '2F' : 'F + N'} ${mm2(c.secaoMm2)} + PE ${mm2(c.secaoTerraMm2)}` : '—'} · disjuntor {c.polos}P {c.disjuntorA ?? '—'} A curva{' '}
          {projeto.curvaDisjuntorGeral}
          {c.sobDR ? ' · sob DR 30 mA' : ''}
          {c.elevadaPorCurto ? ' · seção elevada pelo curto-circuito' : ''}
          {c.elevadaPorQuedaDeTensao ? ' · seção elevada pela queda de tensão' : ''}
        </p>
      </div>
    </article>
  )
}

// Matriz de conformidade: cada cláusula verificada, com o estado no projeto.
function linhasMatriz(projeto, calculo, previsao) {
  const { dimensionados: d, protecaoGeral: pg, complementares: comp, locaisEspeciais: le, seccionamento } = calculo
  const estado = (falha, pendente) => (falha ? 'alerta' : pendente ? 'atencao' : 'ok')
  const linhas = []
  const abaixo = previsao.porComodo.filter((c) => c.iluminacaoAbaixoDoMinimo || c.tugAbaixoDoMinimo)
  linhas.push(['§9.5.2', 'Carga mínima de iluminação e tomadas', `${previsao.porComodo.length} cômodos`, estado(abaixo.length, false), abaixo.length ? `abaixo do mínimo: ${abaixo.map((c) => c.nome).join(', ')}` : 'conforme'])
  if (comp.bancadas.length)
    linhas.push(['§9.5.2.2.1 b)', '≥ 2 tomadas acima da bancada', comp.bancadas.map((b) => b.nome).join(', '), estado(comp.bancadas.some((b) => b.conforme === false), comp.bancadas.some((b) => b.conforme === null)), comp.bancadas.some((b) => b.conforme === null) ? 'não informado' : 'informado'])
  linhas.push(['§9.5.3', 'Divisão em circuitos; > 10 A em circuito próprio', `${d.length} circuitos`, 'ok', 'conforme'])
  const sobre = d.map((c) => c.sobrecarga?.conforme)
  linhas.push(['§5.3.4.1', 'Ib ≤ In ≤ Iz e I₂ ≤ 1,45·Iz', 'circuitos e alimentador', estado(sobre.includes(false) || pg.sobrecarga?.conforme === false, sobre.includes(null)), sobre.includes(false) ? 'não conforme' : 'conforme'])
  const semComp = d.filter((c) => c.naoVerificado).length
  const piorQueda = Math.max(0, ...d.filter((c) => c.quedaPercentual !== null && !c.naoVerificado).map((c) => c.quedaPercentual + calculo.quedaAlimentadorPercentual))
  linhas.push(['§6.2.7', `Queda ≤ 4 % no circuito e ≤ ${num(calculo.limiteQuedaTotalPercentual, 1)} % no total`, `pior total: ${num(piorQueda)} %`, estado(d.some((c) => c.erro), semComp || pg.condutorFase.naoVerificado), semComp ? `${semComp} sem comprimento` : 'conforme'])
  const ccNaoVerif = d.filter((c) => !c.curtoCircuito?.verificado).length
  linhas.push(['§5.3.5.5.2', 'I²t ≤ k²S² (curto-circuito)', 'circuitos e alimentador', estado(d.some((c) => c.curtoCircuito?.conforme === false) || pg.curtoCircuito.conforme === false, ccNaoVerif || !pg.curtoCircuito.verificado), ccNaoVerif ? `${ccNaoVerif} não verificado(s)` : 'conforme'])
  const icn = comp.capacidadeInterrupcao
  linhas.push(['§5.3.5.5.1', 'Icn ≥ Icc presumida', icn ? `Icc ${num(icn.geralKA)} kA` : 'sem Icc', estado(icn?.conforme === false, !icn || icn.conforme === null), !icn ? 'Icc não informada' : icn.conforme === null ? 'Icn não informada' : icn.conforme ? 'conforme' : 'não conforme'])
  const seccNaoVerif = d.filter((c) => c.seccionamento && !c.seccionamento.verificado).length
  linhas.push(['§5.1.2.2.4', 'Seccionamento automático', seccionamento.esquema ?? 'esquema não declarado', estado(d.some((c) => c.seccionamento?.conforme === false), !seccionamento.esquema || seccNaoVerif), !seccionamento.esquema ? 'esquema não declarado' : seccNaoVerif ? `${seccNaoVerif} não verificado(s)` : 'conforme'])
  const exigidosSemDR = d.filter((c) => c.exigenciaDR?.exige && !c.sobDR).length
  linhas.push(['§5.1.3.2.2', 'DR de 30 mA onde exigido', `${d.filter((c) => c.sobDR).length} circuito(s) sob DR`, estado(exigidosSemDR, false), exigidosSemDR ? `${exigidosSemDR} sem DR` : 'conforme'])
  linhas.push(['§6.2.6.2', 'Neutro: corrente real ≤ capacidade', `${num(pg.verificacaoNeutro.correnteA, 1)} A`, estado(pg.verificacaoNeutro.conforme === false, pg.verificacaoNeutro.conforme === null), pg.verificacaoNeutro.conforme ? 'conforme' : 'ver alimentador'])
  if (comp.pen) linhas.push(['§6.4.3.4.1', 'PEN ≥ 10 mm²', mm2(comp.pen.secaoMm2), estado(!comp.pen.conforme, false), comp.pen.conforme ? 'conforme' : 'não conforme'])
  linhas.push(['§6.2.11.1.6 a)', 'Taxa de ocupação do eletroduto', 'circuitos e alimentador', estado(d.some((c) => c.eletroduto?.erro && c.eletroduto.areaCondutoresMm2 !== null), false), 'conforme'])
  if (le.possuiBanheiro) linhas.push(['§9.1.4', 'Pontos do banheiro fora dos volumes proibidos', le.comodosBanheiro.join(', '), estado(le.pontosNaoConformes?.length, !le.pontosPorComodo?.length), le.pontosNaoConformes?.length ? `${le.pontosNaoConformes.length} ponto(s) no volume errado` : le.pontosPorComodo?.length ? 'conforme' : 'pontos não marcados: conferir em obra'])
  linhas.push(['§5.4.2.1.1', 'DPS', pg.dps.exigidaPelaNorma ? 'exigido' : 'não exigido', pg.dps.exigidaPelaNorma && !comp.dps.esquemaConexao ? 'atencao' : 'ok', pg.dps.exigidaPelaNorma ? (comp.dps.esquemaConexao ? `esquema de conexão ${comp.dps.esquemaConexao.esquema}` : 'declarar o esquema de aterramento') : 'não exigido nesta instalação'])
  linhas.push(['Tabela 59', 'Reserva do quadro no alimentador', `${calculo.reservaAlimentador.circuitos} espaço(s)`, calculo.reservaAlimentador.considerada ? 'ok' : 'atencao', calculo.reservaAlimentador.considerada ? 'considerada' : 'potência não declarada'])
  return linhas
}

export default function Memorial() {
  const { projeto, calculo, projetoAtivo } = useProjeto()
  const { configInstalacao } = calculo
  const data = new Date().toLocaleDateString('pt-BR')

  if (projeto.comodos.length === 0) {
    return (
      <section className="etapa-calculadora">
        <h1>Memorial técnico</h1>
        <p className="placeholder">Nenhum cômodo cadastrado ainda.</p>
        <Link to={ROUTES.comodos}>← Ir para cômodos</Link>
      </section>
    )
  }

  const veredito = calcularVeredito(projeto, calculo)
  const { numero } = montarQuadro(calculo)
  const pg = calculo.protecaoGeral
  const previsao = calculo.previsaoDeCarga
  const limite600VA = calcularLimite600VA(projeto.comodos, projeto.aplicarAlternativa600VA)
  const tensoes = [configInstalacao.tensaoFaseNeutro, configInstalacao.tensaoFaseFase].filter(Boolean).join('/')
  const circuitosOrdenados = [...calculo.dimensionados].sort((a, b) => (numero.get(a.id) ?? 99) - (numero.get(b.id) ?? 99))
  const piorQuedaTotal = Math.max(0, ...calculo.dimensionados.filter((c) => c.quedaPercentual !== null && !c.naoVerificado).map((c) => c.quedaPercentual + calculo.quedaAlimentadorPercentual))
  const drTexto =
    pg.drs.modo === 'geral'
      ? `1 DR ${pg.idr?.correnteA ?? '—'} A · 30 mA (todos os circuitos)`
      : pg.drs.grupos.length
        ? `${pg.drs.grupos.map((g) => `${g.correnteA ?? '—'} A`).join(' + ')} · 30 mA`
        : 'nenhum exigido'
  const estadoVeredito = veredito.estado
  const tituloVeredito = {
    ok: 'Conforme em tudo o que a ferramenta verifica.',
    atencao: `Conforme no que foi verificado; ${veredito.pendencias.length} item(ns) dependem de dado ou de conferência.`,
    alerta: `${veredito.problemas.length} não conformidade(s) — ver seção 13.`,
  }[estadoVeredito]
  const matriz = linhasMatriz(projeto, calculo, previsao)
  const alimentadorTexto = pg.condutorFase.secaoMm2
    ? `${configInstalacao.numeroFases}F ${String(pg.condutorFase.secaoMm2).replace('.', ',')} + ${projeto.esquemaAterramento === 'TN-C-S' ? 'PEN' : 'N'} ${String(pg.secaoNeutroMm2).replace('.', ',')}${projeto.esquemaAterramento === 'TN-C-S' ? '' : ` + PE ${String(pg.secaoTerraMm2).replace('.', ',')}`} mm²`
    : '—'
  const cabecalho = `${projetoAtivo.nome} · Memorial técnico · ${ou(projeto.revisao)} · ${data}`

  return (
    <article className="relatorio" data-cabecalho={cabecalho}>
      <div className="etapa-acoes memorial-acoes">
        <Link className="botao-secundario" to={ROUTES.resultado}>
          ← Voltar ao resultado
        </Link>
        <button type="button" className="botao-principal" onClick={() => window.print()}>
          Imprimir / salvar em PDF
        </button>
      </div>

      {/* ------------------------------------------------------------------ Capa */}
      <section className="relatorio-capa">
        <div className="relatorio-marca">Fio Certo · memorial técnico</div>
        <h1>Memorial técnico da instalação elétrica de baixa tensão</h1>
        <p className="relatorio-sub">
          Residência · {TIPOS_INSTALACAO[projeto.tipoInstalacao].label.toLowerCase()} {tensoes} V · ABNT NBR 5410:2004 (versão corrigida 17.03.2008)
        </p>
        <table className="relatorio-id">
          <tbody>
            <tr><td>Projeto</td><td><strong>{projetoAtivo.nome}</strong></td></tr>
            <tr><td>Endereço</td><td>{ou(projeto.endereco)}</td></tr>
            <tr><td>Cliente</td><td>{ou(projeto.cliente)}</td></tr>
            <tr><td>Responsável técnico</td><td>{ou(projeto.responsavelTecnico)} · registro: {ou(projeto.registroProfissional)} · ART/TRT: {ou(projeto.numeroART)}</td></tr>
            <tr><td>Revisão / data</td><td>{ou(projeto.revisao)} · {data}</td></tr>
            <tr><td>Gerado por</td><td>Fio Certo (rlasmar-uff.github.io/fio-certo)</td></tr>
          </tbody>
        </table>
        <dl className="relatorio-fatos">
          <div><dt>Carga instalada</dt><dd>{inteiro(previsao.totais.totalVA)} VA</dd></div>
          <div><dt>Disjuntor geral</dt><dd>{pg.disjuntorGeralA ?? '—'} A · {configInstalacao.numeroFases}P</dd></div>
          <div><dt>Alimentador</dt><dd>{alimentadorTexto}</dd></div>
          <div><dt>Circuitos</dt><dd>{calculo.dimensionados.length} + {calculo.complementares.reservaQuadro.reservaMinima} reserva</dd></div>
          <div><dt>Proteção diferencial</dt><dd>{drTexto}</dd></div>
          <div><dt>Queda máxima total</dt><dd>{num(piorQuedaTotal)} %</dd></div>
        </dl>
        <div className={`relatorio-veredito relatorio-veredito-${estadoVeredito}`}>
          <span aria-hidden="true">{{ ok: '✔', atencao: '◐', alerta: '✖' }[estadoVeredito]}</span>
          <div>
            <strong>{tituloVeredito}</strong> Detalhes nas seções 12 e 13.
          </div>
        </div>
        <p className="relatorio-aviso">
          Documento de apoio gerado a partir dos dados informados. Não substitui o projeto elétrico nem a Anotação de Responsabilidade
          Técnica (ART) de um profissional habilitado. Os cálculos seguem a NBR 5410; dados de produto (correntes nominais, diâmetros,
          resistência e reatância, Icn) estão identificados como tal.
        </p>
      </section>

      {/* ------------------------------------------------------------------ Sumário + 1 */}
      <Secao titulo="Sumário" novaPagina>
        <ol className="relatorio-sumario">
          {['Objeto e escopo', 'Dados de entrada', 'Premissas e parâmetros de projeto', 'Previsão de carga', 'Divisão em circuitos e fases', 'Memória de cálculo por circuito', 'Alimentador e proteção geral', 'Proteções complementares', 'Locais especiais', 'Diagrama unifilar e quadro', 'Lista de materiais', 'Matriz de conformidade', 'Pendências e limitações', 'Verificação final em obra', 'Referências'].map((titulo, i) => (
            <li key={titulo}>
              <span>{i + 1}</span> {titulo}
            </li>
          ))}
        </ol>
      </Secao>
      <Secao numero="1" titulo="Objeto e escopo">
        <p>
          Este memorial descreve o dimensionamento da instalação elétrica de baixa tensão identificada na capa, do ponto de entrega aos
          pontos de utilização, conforme a ABNT NBR 5410:2004: previsão de carga, divisão em circuitos, seleção de condutores e dispositivos de
          proteção, queda de tensão, curto-circuito, seccionamento automático, proteção diferencial, proteção contra surtos, aterramento e
          equipotencialização (§6.1.8.1).
        </p>
        <p>
          Não cobre o padrão de entrada da distribuidora, o SPDA (NBR 5419) e as instalações de sinal. A verificação final em obra (Cap. 7)
          está listada na seção 14.
        </p>
        <p className="relatorio-nota">
          Cada resultado traz a fórmula, os valores substituídos e a cláusula ou tabela da norma. O que não pôde ser verificado aparece
          marcado <Selo estado="atencao">não verificado</Selo> no próprio lugar, com o motivo.
        </p>
      </Secao>

      {/* ------------------------------------------------------------------ 2 */}
      <Secao numero="2" titulo="Dados de entrada" novaPagina>
        <div className="relatorio-grade">
          <table className="relatorio-tabela">
            <thead><tr><th colSpan={2}>Alimentação</th></tr></thead>
            <tbody>
              <tr><td>Fornecimento</td><td>{FORNECIMENTOS[projeto.fornecimento]?.label}</td></tr>
              <tr><td>Tensões</td><td>{tensoes} V ({TIPOS_INSTALACAO[projeto.tipoInstalacao].label.toLowerCase()})</td></tr>
              <tr><td>Esquema de aterramento</td><td>{ESQUEMAS_ATERRAMENTO[projeto.esquemaAterramento]?.label ?? 'não declarado'}</td></tr>
              <tr><td>Icc trifásica / fase-neutro</td><td>{projeto.iccPresumidaA ? `${num(projeto.iccPresumidaA / 1000)} kA` : 'não informada'} / {projeto.iccFaseNeutroA ? `${num(projeto.iccFaseNeutroA / 1000)} kA` : 'igual à trifásica'}</td></tr>
              <tr><td>Ramal de entrada</td><td>{projeto.comprimentoRamalEntrada ? `${projeto.comprimentoRamalEntrada} m` : 'não informado'} · maneira {projeto.maneiraAlimentador} ({projeto.metodoInstalacaoAlimentador})</td></tr>
              <tr><td>Condutor de aterramento</td><td>{CONDICOES_ATERRAMENTO_ENTERRADO[projeto.condicaoAterramento]?.label ?? 'não declarado'}</td></tr>
            </tbody>
          </table>
          <table className="relatorio-tabela">
            <thead><tr><th colSpan={2}>Condições e dispositivos</th></tr></thead>
            <tbody>
              <tr><td>Isolação (circuitos / alimentador)</td><td>{ISOLACOES[projeto.isolacaoCondutor]?.label} / {ISOLACOES[projeto.isolacaoAlimentador]?.label}</td></tr>
              <tr><td>Temperatura ambiente</td><td>{projeto.temperaturaAmbienteC ? `${projeto.temperaturaAmbienteC} °C` : '30 °C (referência)'}</td></tr>
              <tr><td>Agrupamento</td><td>{projeto.numeroCircuitosAgrupadosManual ? `${projeto.numeroCircuitosAgrupadosManual} circuitos (informado)` : 'por cômodo, salvo grupos informados'}</td></tr>
              <tr><td>Disjuntores</td><td>curva {projeto.curvaDisjuntorGeral} · Icn {projeto.icnDisjuntorKA ? `${projeto.icnDisjuntorKA} kA` : 'não informada'}</td></tr>
              <tr><td>DR</td><td>{{ exigidos: 'onde a norma exige', geral: 'um DR para toda a instalação', grupos: 'um DR por grupo' }[projeto.modoDR]} · tipo {projeto.tipoDR}</td></tr>
              <tr><td>Classe AQ / alimentação aérea</td><td>{projeto.classeAQ}{projeto.regiaoAltoIndiceDescargas ? ' (> 25 dias de trovoada)' : ''} / {projeto.alimentacaoAerea ? 'sim' : 'não'}</td></tr>
            </tbody>
          </table>
        </div>
        <h3>Cômodos</h3>
        <table className="relatorio-tabela">
          <thead>
            <tr><th>Cômodo</th><th>Tipo</th><th className="n">Área</th><th className="n">Perímetro</th><th>Equipamentos de uso específico</th></tr>
          </thead>
          <tbody>
            {projeto.comodos.map((comodo) => (
              <tr key={comodo.id}>
                <td>{comodo.nome || '(sem nome)'}</td>
                <td>{TIPOS_COMODO[comodo.tipo]?.label}{comodo.piscina ? ' · piscina' : ''}</td>
                <td className="n">{num(comodo.area, 2)} m²</td>
                <td className="n">{comodo.perimetro ? `${num(comodo.perimetro, 2)} m` : '—'}</td>
                <td>
                  {(comodo.tue ?? []).length
                    ? comodo.tue.map((e) => `${e.quantidade > 1 ? `${e.quantidade}× ` : ''}${e.nome || 'equipamento'} ${e.potenciaW} W ${e.ligacao === 'fase-fase' ? 'F-F' : 'F-N'}${e.cosPhi && Number(e.cosPhi) < 1 ? ` cosφ ${num(e.cosPhi)}` : ''}`).join('; ')
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <h3>Circuitos — percurso</h3>
        <table className="relatorio-tabela">
          <thead>
            <tr><th>Circuito</th><th className="n">Comprimento</th><th>Maneira de instalar (Tab. 33)</th><th>Método</th><th>Agrupamento</th></tr>
          </thead>
          <tbody>
            {circuitosOrdenados.map((c) => {
              const maneira = projeto.maneirasInstalacao?.[c.id] || '7'
              return (
                <tr key={c.id}>
                  <td>C{numero.get(c.id)} {c.nome}</td>
                  <td className="n">{c.comprimentoInformado ? `${num(c.comprimentoM, 1)} m` : 'não informado'}</td>
                  <td>{maneira} — {MANEIRAS_INSTALAR.find((m) => m.codigo === maneira)?.descricao}</td>
                  <td>{c.metodoInstalacao}</td>
                  <td>{textoAgrupamento(c.agrupamento)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Secao>

      {/* ------------------------------------------------------------------ 3 */}
      <Secao numero="3" titulo="Premissas e parâmetros de projeto (§6.1.8.1 f)">
        <table className="relatorio-tabela">
          <thead><tr><th style={{ width: '32%' }}>Parâmetro</th><th>Valor adotado e fundamento</th></tr></thead>
          <tbody>
            <tr><td>Fator de demanda</td><td>1,00 (carga cheia). A NBR 5410 manda considerar a não-simultaneidade (§4.2.1.1.2) mas não traz tabela de fatores.</td></tr>
            <tr><td>Resistência do condutor</td><td>{CONVENCOES_RESISTIVIDADE[projeto.convencaoResistividade]?.label}: σ = {num(condutividadeCobre(projeto.isolacaoCondutor, projeto.convencaoResistividade), 1)} S·m/mm² (dado de material, não da NBR 5410).</td></tr>
            <tr><td>Reatância dos condutores</td><td>Catálogo de fabricante, 0,10 a 0,16 Ω/km conforme a seção (a NBR 5410 não a tabela).</td></tr>
            <tr><td>Impedância da fonte</td><td>Puramente reativa, X = U₀/Icc — convenção de cálculo de curto-circuito em BT; a norma admite determinar a Icc por cálculo (§5.3.5.1).</td></tr>
            <tr><td>Fator k (I²t ≤ k²S²)</td><td>{ISOLACOES[projeto.isolacaoCondutor]?.label}: k = {projeto.isolacaoCondutor === 'epr' ? 143 : 115} (Tabela 30). {RESSALVA_K_PEQUENA_SECAO}</td></tr>
            <tr><td>Tempo de atuação no curto</td><td>10 ms, válido só na faixa de disparo instantâneo garantido (curva {projeto.curvaDisjuntorGeral}); abaixo dela, "não verificado".</td></tr>
            <tr><td>Agrupamento</td><td>Sem grupo informado, os circuitos que atendem um mesmo cômodo passam juntos; vale o cômodo mais desfavorável do percurso (§6.2.5.8).</td></tr>
            <tr><td>Taxa de 3ª harmônica</td><td>{TAXAS_TERCEIRA_HARMONICA[projeto.terceiraHarmonica]?.label} (§6.2.5.6.1, §6.2.6.2).</td></tr>
            <tr><td>Correntes nominais de disjuntor</td><td>4 a 125 A (norma de produto, NBR NM 60898); a NBR 5410 não as lista.</td></tr>
          </tbody>
        </table>
      </Secao>

      {/* ------------------------------------------------------------------ 4 */}
      <Secao numero="4" titulo="Previsão de carga" novaPagina>
        <p>
          Iluminação pelo §9.5.2.1.2 (100 VA até 6 m² e mais 60 VA a cada 4 m² <em>inteiros</em>); tomadas pelo §9.5.2.2.1 (quantidade por
          perímetro, &quot;ou fração&quot;) e §9.5.2.2.2 (600 VA nas {limite600VA} primeiras em áreas molhadas, 100 VA nas demais); equipamentos pela
          potência nominal (§4.2.1.2.1).
        </p>
        <table className="relatorio-tabela">
          <thead>
            <tr><th>Cômodo</th><th>Iluminação — regra</th><th className="n">VA</th><th>Tomadas — regra</th><th className="n">VA</th><th className="n">Equip.</th><th className="n">Total</th></tr>
          </thead>
          <tbody>
            {previsao.porComodo.map((carga) => {
              const comodo = projeto.comodos.find((x) => x.id === carga.comodoId)
              return (
                <tr key={carga.comodoId}>
                  <td>{carga.nome || '(sem nome)'} · {num(carga.area, 2)} m²</td>
                  <td><code>{carga.rejeitado ? `rejeitado: ${carga.rejeitado}` : regraIluminacao(carga)}</code></td>
                  <td className="n">{inteiro(carga.iluminacaoVA)}</td>
                  <td><code>{carga.rejeitado ? '—' : regraTomadas(comodo, carga, limite600VA)}</code></td>
                  <td className="n">{inteiro(carga.tugVA)}</td>
                  <td className="n">{carga.tueVA ? inteiro(carga.tueVA) : '—'}</td>
                  <td className="n">{inteiro(carga.totalVA)}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <td>Total</td><td /><td className="n">{inteiro(previsao.totais.iluminacaoVA)}</td><td /><td className="n">{inteiro(previsao.totais.tugVA)}</td>
              <td className="n">{inteiro(previsao.totais.tueVA)}</td><td className="n">{inteiro(previsao.totais.totalVA)}</td>
            </tr>
          </tfoot>
        </table>
        <p className="relatorio-nota">
          Mínimo de iluminação conferido: {previsao.porComodo.map((c) => `${c.nome} ${inteiro(calcularIluminacaoMinimaVA(c.area))} VA`).join(' · ')}.
        </p>
      </Secao>

      {/* ------------------------------------------------------------------ 5 */}
      <Secao numero="5" titulo="Divisão em circuitos e fases">
        <p>
          Iluminação e tomadas em circuitos separados (§4.2.5.5){projeto.circuitoMisto ? ', com circuitos mistos nas condições do §9.5.3.3' : ''};
          tomadas de cozinha e áreas de serviço em circuitos exclusivos (§9.5.3.2); equipamento acima de 10 A em circuito independente (§9.5.3.1);
          cargas distribuídas entre as fases para o maior equilíbrio possível (§4.2.5.6).
        </p>
        <table className="relatorio-tabela">
          <thead>
            <tr><th>Nº</th><th>Circuito</th><th>Cômodos</th><th className="n">S</th><th className="n">U</th><th className="n">Ib</th><th>Fase(s)</th></tr>
          </thead>
          <tbody>
            {circuitosOrdenados.map((c) => (
              <tr key={c.id}>
                <td>C{numero.get(c.id)}</td>
                <td>{c.nome}</td>
                <td>{c.comodos.join(', ')}</td>
                <td className="n">{inteiro(c.potenciaVA)} VA</td>
                <td className="n">{c.tensao} V</td>
                <td className="n">{num(c.correnteProjetoA)} A</td>
                <td>{(c.fases ?? []).map((f) => `F${f}`).join('+') || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {configInstalacao.numeroFases > 1 && (
          <p>
            Correntes de fase (soma fasorial, com a reserva declarada): {pg.correntePorFaseA.map((i, k) => `F${k + 1} = ${num(i, 1)} A`).join(' · ')} · neutro{' '}
            {num(pg.verificacaoNeutro.correnteA, 1)} A.
          </p>
        )}
      </Secao>

      {/* ------------------------------------------------------------------ 6 */}
      <Secao numero="6" titulo="Memória de cálculo por circuito" novaPagina>
        <p className="relatorio-nota">
          §6.2.6.1.2: a seção atende ao mesmo tempo à capacidade de condução, à sobrecarga, ao curto-circuito, ao seccionamento automático, à
          queda de tensão e à seção mínima. Uma ficha por circuito, na numeração do quadro.
        </p>
        {circuitosOrdenados.map((c) => (
          <FichaCircuito key={c.id} circuito={c} numero={numero.get(c.id)} projeto={projeto} />
        ))}
      </Secao>

      {/* ------------------------------------------------------------------ 7 */}
      <Secao numero="7" titulo="Alimentador e proteção geral" novaPagina>
        {pg.condutorFase.erro ? (
          <p className="relatorio-alerta">{pg.condutorFase.erro}</p>
        ) : (
          <>
            <Passo indice="1" titulo="Corrente de entrada" clausula="§6.2.6.2 · §4.2.1.1.2">
              <Formula>
                Soma fasorial das correntes dos circuitos por fase, fator de demanda 1,00: {pg.correntePorFaseA.map((i, k) => `F${k + 1} = ${num(i)} A`).join(' · ')} → Ib = {num(pg.correnteEntradaA)} A
              </Formula>
            </Passo>
            <Passo indice="2" titulo="Disjuntor geral e condutor de fase" clausula={`§5.3.4.1 · Tab. 46 (${TABELA_46_CONDUTORES_CARREGADOS[pg.condutorFase.esquema]} carregados) · Tab. ${pg.condutorFase.isolacao === 'epr' ? 37 : 36} · Tab. 47`}>
              <Formula>
                In = {pg.disjuntorGeralA} A · método {pg.condutorFase.metodoInstalacao} · Iz = {num(pg.condutorFase.ampacidadeTabelaA, 1)} × {num(pg.condutorFase.fatorTemperatura)} × {num(pg.condutorFase.fatorAgrupamento)}
                {pg.condutorFase.neutroCarregado ? ' × 0,86 (4 carregados, §6.2.5.6.1)' : ''} = {num(pg.condutorFase.ampacidadeA, 1)} A → fase {mm2(pg.condutorFase.secaoMm2)}
                {pg.condutorFase.elevadaPeloPEN ? ` (elevada para ${pg.condutorFase.secaoMinimaPenMm2} mm²: PEN, §6.4.3.4.1)` : ''}
              </Formula>
            </Passo>
            <Passo indice="3" titulo="Queda de tensão no alimentador" clausula="§6.2.7.1">
              {pg.condutorFase.naoVerificado ? (
                <p><Selo estado="atencao">não verificada</Selo> comprimento do ramal não informado.</p>
              ) : (
                <Formula>
                  Cálculo fasorial por fase, com o neutro real: ΔU = {num(pg.condutorFase.quedaPercentual)} % de {num(calculo.limiteQuedaTotalPercentual, 1)} % → sobra {num(calculo.limiteQuedaTerminalDisponivel)} % para os circuitos
                </Formula>
              )}
            </Passo>
            <Passo indice="4" titulo="Neutro e condutor de proteção" clausula="§6.2.6.2 · Tab. 48 · Tab. 58">
              <Formula>
                Neutro{projeto.esquemaAterramento === 'TN-C-S' ? ' (PEN)' : ''}: {mm2(pg.secaoNeutroMm2)}{pg.neutroReduzido ? ' (reduzido, Tab. 48)' : ''} · corrente real {num(pg.verificacaoNeutro.correnteA)} A ≤ {num(pg.verificacaoNeutro.ampacidadeA, 1)} A
                {'\n'}PE: {mm2(pg.secaoTerraMm2)} ({pg.peDetalhe?.metodo ?? 'Tabela 58'}){projeto.esquemaAterramento === 'TN-C-S' ? ' — a partir do quadro (no ramal, o PEN)' : ''}
              </Formula>
            </Passo>
            <Passo indice="5" titulo="Curto-circuito e capacidade de interrupção" clausula="§5.3.5.5.1 · §5.3.5.5.2">
              {pg.curtoCircuito.verificado ? (
                <Formula>
                  I²t = ({num(pg.iccQuadroA, 0)} A)² × {num(pg.curtoCircuito.tempoS, 2)} s = {cientifico(pg.curtoCircuito.energiaPassanteA2s)} A²s{' '}
                  {pg.curtoCircuito.conforme ? '≤' : '>'} k²S² = ({pg.curtoCircuito.k} × {String(pg.condutorFase.secaoMm2).replace('.', ',')})² ={' '}
                  {cientifico(pg.curtoCircuito.energiaSuportadaA2s)} A²s
                  {calculo.complementares.capacidadeInterrupcao ? `\nIcn ≥ ${num(calculo.complementares.capacidadeInterrupcao.geralKA)} kA (geral) e ≥ ${num(calculo.complementares.capacidadeInterrupcao.terminaisKA)} kA (circuitos)` : ''}
                </Formula>
              ) : (
                <p><Selo estado="atencao">não verificado</Selo> {pg.curtoCircuito.motivo}</p>
              )}
            </Passo>
            {pg.eletroduto?.eletrodutoRecomendado && (
              <Passo indice="6" titulo="Eletroduto do ramal" clausula="§6.2.11.1.6 a)">
                <Formula>
                  {pg.eletroduto.numeroCondutores} condutores, {num(pg.eletroduto.areaCondutoresMm2, 1)} mm² ≤ {pg.eletroduto.taxaMaximaPercentual}% → DN {pg.eletroduto.eletrodutoRecomendado.nominalMm} ({pg.eletroduto.eletrodutoRecomendado.referencia})
                </Formula>
              </Passo>
            )}
          </>
        )}
      </Secao>

      {/* ------------------------------------------------------------------ 8 */}
      <Secao numero="8" titulo="Proteções complementares">
        <table className="relatorio-tabela">
          <thead><tr><th style={{ width: '24%' }}>Item</th><th>Especificação</th><th style={{ width: '16%' }}>Cláusula</th></tr></thead>
          <tbody>
            <tr>
              <td>Proteção diferencial</td>
              <td>
                {pg.drs.modo === 'geral'
                  ? `DR geral ${pg.idr?.correnteA ?? '—'} A, ${pg.idr?.polos} polos, 30 mA, tipo ${projeto.tipoDR}`
                  : pg.drs.grupos.length
                    ? pg.drs.grupos.map((g) => `DR ${g.numero}: ${g.correnteA ?? '—'} A, ${g.polos} polos, 30 mA, tipo ${projeto.tipoDR} (${g.circuitos.map((x) => `C${numero.get(x.id)}`).join(', ')})`).join(' · ')
                    : 'nenhum circuito exige DR'}
                {pg.drs.montante ? ` · a montante: DR ${pg.idr?.correnteA ?? '—'} A, ${pg.drs.montante.sensibilidadeMA} mA, tipo S (seletividade, §6.3.6.3.2)` : ''}
              </td>
              <td>§5.1.3.2.2 · §6.3.3.2</td>
            </tr>
            <tr>
              <td>DPS</td>
              <td>
                {pg.dps.exigidaPelaNorma
                  ? `${pg.dps.descricao}; esquema de conexão ${calculo.complementares.dps.esquemaConexao?.esquema ?? '—'}; Uc ≥ ${Math.ceil(calculo.complementares.dps.ucMinimoFaseV)} V, Up ≤ ${num(calculo.complementares.dps.upMaximoKV, 1)} kV, In ≥ ${calculo.complementares.dps.inMinimoKA} kA${calculo.complementares.dps.iimpMinimoKA ? `, Iimp ≥ ${calculo.complementares.dps.iimpMinimoKA} kA` : ''}; condutor DPS-PE ≥ ${calculo.complementares.dps.secaoCondutorPeMm2} mm²`
                  : pg.dps.motivoExigencia}
              </td>
              <td>§5.4.2.1.1 · §6.3.5.2 · Tab. 49</td>
            </tr>
            <tr>
              <td>Esquema de aterramento</td>
              <td>{ESQUEMAS_ATERRAMENTO[projeto.esquemaAterramento]?.label ?? 'não declarado'}{calculo.seccionamento.tt ? ` · RA ≤ ${num(calculo.seccionamento.tt.raMaximaOhm, 0)} Ω (UL ${calculo.seccionamento.ulV} V)` : ''}</td>
              <td>§4.2.2.2 · §5.1.2.2.4</td>
            </tr>
            {calculo.complementares.pen && (
              <tr><td>PEN</td><td>{mm2(calculo.complementares.pen.secaoMm2)} (mínimo 10 mm²); depois da separação, o neutro não é religado ao terra.</td><td>§6.4.3.4</td></tr>
            )}
            <tr>
              <td>Condutor de aterramento</td>
              <td>{calculo.complementares.condutorAterramento?.condicao ? `≥ ${mm2(calculo.complementares.condutorAterramento.secaoMm2)} (${calculo.complementares.condutorAterramento.condicao.label.toLowerCase()})` : 'condição não declarada'}</td>
              <td>§6.4.1.2.1 · Tab. 52</td>
            </tr>
            <tr>
              <td>Equipotencialização principal</td>
              <td>≥ {mm2(calculo.complementares.equipotencializacao.principalMm2)} (metade do maior PE; mínimo 6, limite 25 mm²)</td>
              <td>§6.4.4.1.1</td>
            </tr>
            {calculo.complementares.equipotencializacao.suplementar && (
              <tr>
                <td>Equipotencialização suplementar</td>
                <td>Banheiro: massa × elemento condutivo ≥ {mm2(calculo.complementares.equipotencializacao.suplementar.massaElementoMm2)}; massa × massa ≥ o menor PE das duas.</td>
                <td>§6.4.4.1.2 · §9.1.3.1.2</td>
              </tr>
            )}
            <tr>
              <td>Reserva do quadro</td>
              <td>{calculo.complementares.reservaQuadro.reservaMinima} espaço(s); {calculo.reservaAlimentador.considerada ? `${calculo.reservaAlimentador.potenciaPorCircuitoVA} VA cada, incluídos no alimentador` : 'potência não declarada'}.</td>
              <td>§6.5.4.7 · Tab. 59</td>
            </tr>
          </tbody>
        </table>
      </Secao>

      {/* ------------------------------------------------------------------ 9 */}
      <Secao numero="9" titulo="Locais especiais">
        {!calculo.locaisEspeciais.possuiBanheiro && !calculo.locaisEspeciais.piscina && !calculo.locaisEspeciais.sauna ? (
          <p>Não há locais da seção 9 da norma neste projeto.</p>
        ) : (
          <>
            {calculo.locaisEspeciais.possuiBanheiro && (
              <>
                <h3>Locais com banheira ou chuveiro (§9.1)</h3>
                <table className="relatorio-tabela">
                  <thead><tr><th>Volume</th><th>Limites</th><th>Grau de proteção mínimo</th></tr></thead>
                  <tbody>
                    {calculo.locaisEspeciais.volumes.map((v) => (
                      <tr key={v.volume}><td>{v.volume}</td><td>{v.descricao}</td><td>{v.ipMinimo}</td></tr>
                    ))}
                  </tbody>
                </table>
                {calculo.locaisEspeciais.pontosPorComodo.length > 0 ? (
                  <ul>
                    {calculo.locaisEspeciais.pontosPorComodo.flatMap((comodo) =>
                      comodo.pontos.map((p) => (
                        <li key={`${comodo.comodoId}-${p.id}`}>
                          {comodo.comodoNome} — {p.nome} ({num(p.alturaM, 2)} m): {p.volume === null ? 'fora dos volumes' : `volume ${p.volume}`} —{' '}
                          <Selo estado={p.conforme ? 'ok' : 'alerta'}>{p.conforme ? 'conforme' : 'não conforme'}</Selo> {p.motivo ?? ''} ({p.clausula})
                        </li>
                      )),
                    )}
                  </ul>
                ) : (
                  <p>
                    <Selo estado="atencao">conferir em obra</Selo> pontos elétricos não marcados na planta: nenhum dispositivo de proteção,
                    seccionamento ou comando (inclui tomada) nos volumes 0, 1 e 2 (§9.1.4.3.1); tomada no volume 3 só com DR, SELV ou
                    separação (§9.1.4.3.2).
                  </p>
                )}
              </>
            )}
            {calculo.locaisEspeciais.piscina && (
              <>
                <h3>Piscina (§9.2)</h3>
                <p>
                  {calculo.locaisEspeciais.piscina.comodos.join(', ')}: equipotencialização suplementar dos volumes 0, 1 e 2 (§9.2.3.1.4);
                  volumes 0 e 1 só com SELV até 12 V (§9.2.3.1.1); volume 2 com DR de 30 mA nos circuitos do local (§9.2.3.1.2 b, §9.2.4.3.3 b).
                </p>
              </>
            )}
            {calculo.locaisEspeciais.sauna && (
              <>
                <h3>Sauna (§9.4)</h3>
                <ul>
                  {calculo.locaisEspeciais.sauna.regras.map((r) => (
                    <li key={r.texto}>{r.texto} ({r.clausula})</li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </Secao>

      {/* ------------------------------------------------------------------ 10 */}
      <section className="relatorio-secao relatorio-paisagem">
        <h2>
          <span className="relatorio-num">10</span>Diagrama unifilar e quadro de distribuição
        </h2>
        <p className="relatorio-nota">§6.1.8.1 b) · numeração dos circuitos igual à do quadro (§6.1.5.4).</p>
        <DiagramaUnifilar projeto={projeto} calculo={calculo} />
        <VistaQuadro calculo={calculo} />
      </section>

      {/* ------------------------------------------------------------------ 11 */}
      <Secao numero="11" titulo="Lista de materiais (§6.1.8.1 e)" novaPagina>
        <SecaoMateriais editavel={false} />
      </Secao>

      {/* ------------------------------------------------------------------ 12 */}
      <Secao numero="12" titulo="Matriz de conformidade" novaPagina>
        <p className="relatorio-legenda">
          <Selo estado="ok">conforme</Selo> <Selo estado="alerta">não conforme</Selo> <Selo estado="atencao">não verificado / depende de dado</Selo>
        </p>
        <table className="relatorio-tabela">
          <thead><tr><th>Cláusula</th><th>Requisito</th><th>Onde</th><th>Situação</th></tr></thead>
          <tbody>
            {matriz.map(([clausula, requisito, onde, estado, texto]) => (
              <tr key={clausula + requisito}>
                <td>{clausula}</td>
                <td>{requisito}</td>
                <td>{onde}</td>
                <td><Selo estado={estado}>{texto}</Selo></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Secao>

      {/* ------------------------------------------------------------------ 13 */}
      <Secao numero="13" titulo="Pendências e limitações">
        <h3>Não conformidades</h3>
        {veredito.problemas.length ? (
          <ul>{veredito.problemas.map((p) => <li key={p.texto}>{p.texto}</li>)}</ul>
        ) : (
          <p>Nenhuma.</p>
        )}
        <h3>Pendências deste projeto</h3>
        {veredito.pendencias.length ? (
          <ul>{veredito.pendencias.map((p) => <li key={p.texto}>{p.texto}</li>)}</ul>
        ) : (
          <p>Nenhuma.</p>
        )}
        <h3>Limitações da ferramenta (sempre)</h3>
        <ul>{veredito.limitacoes.map((t) => <li key={t}>{t}</li>)}</ul>
      </Secao>

      {/* ------------------------------------------------------------------ 14 */}
      <Secao numero="14" titulo="Verificação final em obra (Cap. 7) e listas de verificação" novaPagina>
        <Checklists grupos={montarChecklists(projeto, calculo)} abertos />
      </Secao>

      {/* ------------------------------------------------------------------ 15 */}
      <Secao numero="15" titulo="Referências">
        <ul className="relatorio-referencias">
          <li>ASSOCIAÇÃO BRASILEIRA DE NORMAS TÉCNICAS. <strong>ABNT NBR 5410:2004</strong>: instalações elétricas de baixa tensão. Rio de Janeiro: ABNT, 2004. Versão corrigida de 17 mar. 2008.</li>
          <li>ABNT NBR NM 60898 — disjuntores (correntes nominais, curvas B/C/D, Icn, I₂ = 1,45·In).</li>
          <li>IEC 61008-2-1 e IEC 61009-2-1 — dispositivos DR (tipos AC e A), citadas no §6.3.3.2.</li>
          <li>IEC 61643-1 — dispositivos de proteção contra surtos, citada no §6.3.5.2.4.</li>
          <li>CREDER, Hélio. <strong>Instalações elétricas</strong>. 16. ed. Rio de Janeiro: LTC, 2016 — dados de produto (diâmetros de eletroduto e de cabo).</li>
        </ul>
        <div className="relatorio-assinatura">
          <div>Local e data</div>
          <div>
            {ou(projeto.responsavelTecnico)} · registro {ou(projeto.registroProfissional)} · ART/TRT {ou(projeto.numeroART)}
          </div>
        </div>
      </Secao>
    </article>
  )
}
