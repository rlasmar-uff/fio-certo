import EtapaCalculadora, { AcoesEtapa } from './EtapaCalculadora.jsx'
import Termo from '../../components/Termo.jsx'
import Campo from '../../components/Campo.jsx'
import Nota from '../../components/Nota.jsx'
import { validarNumero } from '../../components/validacao.js'
import { useProjeto } from '../../context/useProjeto.js'
import { situacaoCircuito } from '../../calculations/veredito.js'
import {
  DISJUNTORES_PADRONIZADOS,
  ISOLACOES,
  METODOS_INSTALACAO,
  SECOES_NOMINAIS_MM2,
  TABELA_41_RESISTIVIDADE_SOLO,
  listarTemperaturasDisponiveis,
} from '../../calculations/constantes.js'
import { ROUTES } from '../../routes.js'
import { ID_PERCURSO_ALIMENTADOR } from '../../calculations/percurso.js'

function nomeReferenciaAgrupamento(metodo) {
  const referencia = METODOS_INSTALACAO[metodo]?.referenciaAgrupamento
  if (referencia === 'tabela45') return 'Tabela 45'
  if (referencia === 'tabela42ref2') return 'Tabela 42, referência 2'
  return 'Tabela 42, referência 1'
}

function textoEletroduto(eletroduto) {
  if (!eletroduto) return '—'
  if (eletroduto.eletrodutoRecomendado)
    return `${eletroduto.eletrodutoRecomendado.nominalMm} mm (${eletroduto.eletrodutoRecomendado.referencia})`
  return eletroduto.erro
}

const ROTULO_EXISTENTE = { true: ['ok', 'atende'], false: ['alerta', 'não atende'], null: ['atencao', 'não verificado'] }

// F8 — o usuário informa o que já está instalado; a ferramenta confere em vez de dimensionar.
function InstalacaoExistente({ circuito, valor, aoMudar }) {
  const resultado = circuito.existente
  return (
    <div className="bloco-existente">
      <h3 className="secao-titulo">Instalação existente</h3>
      <p className="texto-fraco">Se o circuito já existe, informe o que está instalado para conferir.</p>
      <div className="grade-campos">
        <Campo label="Seção instalada">
          <select className="campo" value={valor?.secaoMm2 ?? ''} onChange={(evento) => aoMudar({ secaoMm2: evento.target.value })}>
            <option value="">não informado</option>
            {SECOES_NOMINAIS_MM2.map((secao) => (
              <option key={secao} value={secao}>
                {secao.toLocaleString('pt-BR')} mm²
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Disjuntor instalado">
          <select className="campo" value={valor?.disjuntorA ?? ''} onChange={(evento) => aoMudar({ disjuntorA: evento.target.value })}>
            <option value="">não informado</option>
            {DISJUNTORES_PADRONIZADOS.map((corrente) => (
              <option key={corrente} value={corrente}>
                {corrente} A
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Condutor de proteção (PE) instalado">
          <select className="campo" value={valor?.peMm2 ?? ''} onChange={(evento) => aoMudar({ peMm2: evento.target.value })}>
            <option value="">não informado</option>
            {SECOES_NOMINAIS_MM2.map((secao) => (
              <option key={secao} value={secao}>
                {secao.toLocaleString('pt-BR')} mm²
              </option>
            ))}
          </select>
        </Campo>
      </div>
      {resultado && (
        <>
          <p>
            <span className={`etiqueta-status ${ROTULO_EXISTENTE[resultado.conforme][0]}`}>
              {resultado.secaoMm2.toLocaleString('pt-BR')} mm² com {resultado.disjuntorA} A: {ROTULO_EXISTENTE[resultado.conforme][1]}
            </span>
          </p>
          <ul className="lista-existente">
            {resultado.itens.map((item) => (
              <li key={item.criterio}>
                <span className={`etiqueta-status ${ROTULO_EXISTENTE[item.ok][0]}`}>{ROTULO_EXISTENTE[item.ok][1]}</span>{' '}
                <strong>{item.criterio}</strong> <span className="texto-fraco">({item.clausula})</span> — {item.detalhe}
              </li>
            ))}
          </ul>
          <p className="texto-fraco">O seccionamento considera o DR de 30 mA do projeto. Se a instalação não tiver DR, ele não vale.</p>
        </>
      )}
    </div>
  )
}

// N17 — trechos do eletroduto entre caixas (§6.2.11.1.6 b, §6.2.11.1.7).
function PercursoEletroduto({ percurso, titulo = 'Percurso do eletroduto', Titulo = 'h3', trechos, adicionar, atualizar, remover }) {
  const avaliacao = new Map((percurso?.trechos ?? []).map((trecho) => [trecho.id, trecho]))
  return (
    <div className="bloco-existente">
      <Titulo className="secao-titulo">{titulo}</Titulo>
      <p className="texto-fraco">
        Opcional. Um trecho vai de caixa a caixa (ou até a ponta da linha): até 15 m dentro da casa ou 30 m fora, menos 3 m por
        curva de 90°, e no máximo 3 curvas.
      </p>
      {trechos.map((trecho, indice) => {
        const resultado = avaliacao.get(trecho.id)
        return (
          <div key={trecho.id} className="linha-trecho">
            <div className="grade-campos">
              <Campo label={`Trecho ${indice + 1}: comprimento`} unidade="m" erro={validarNumero(trecho.comprimentoM, { maiorQueMin: true })}>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  className="campo"
                  value={trecho.comprimentoM}
                  onChange={(evento) => atualizar(trecho.id, { comprimentoM: evento.target.value })}
                />
              </Campo>
              <Campo label={`Trecho ${indice + 1}: curvas de 90°`} erro={validarNumero(trecho.curvas, { inteiro: true })}>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  className="campo"
                  value={trecho.curvas}
                  onChange={(evento) => atualizar(trecho.id, { curvas: evento.target.value })}
                />
              </Campo>
            </div>
            <label className="campo-checkbox">
              <input type="checkbox" checked={trecho.externo} onChange={(evento) => atualizar(trecho.id, { externo: evento.target.checked })} />
              Trecho em área externa
            </label>
            {resultado && (
              <p>
                <span className={`etiqueta-status ${resultado.conforme ? 'ok' : 'alerta'}`}>
                  {resultado.conforme ? 'conforme' : 'não conforme'}
                </span>{' '}
                limite {resultado.limiteM} m para {resultado.curvas} curva(s)
                {!resultado.curvasConforme && ' — mais de 3 curvas: ponha uma caixa no meio (§6.2.11.1.7)'}
                {resultado.curvasConforme && resultado.excessoM > 0 &&
                  ` — passa ${resultado.excessoM.toLocaleString('pt-BR')} m: ponha uma caixa intermediária; se não for possível, a NOTA de §6.2.11.1.6 b) admite eletroduto ${resultado.degrausAlternativa} tamanho(s) acima${resultado.eletrodutoAlternativa ? ` (${resultado.eletrodutoAlternativa})` : ''}`}
              </p>
            )}
            <button type="button" className="botao-texto botao-perigo" onClick={() => remover(trecho.id)}>
              Remover trecho {indice + 1}
            </button>
          </div>
        )
      })}
      <button type="button" className="botao-texto" onClick={adicionar}>
        + Adicionar trecho
      </button>
    </div>
  )
}

export default function Dimensionamento() {
  const {
    projeto,
    calculo,
    setTemperaturaAmbienteC,
    setTemperaturaSoloC,
    setResistividadeTermicaSoloKmW,
    setNumeroCircuitosAgrupadosManual,
    setIsolacaoCondutor,
    setExistente,
    addTrecho,
    updateTrecho,
    removeTrecho,
  } = useProjeto()
  const { circuitos, dimensionados, quedaAlimentadorPercentual, limiteQuedaTerminalDisponivel } = calculo

  return (
    <EtapaCalculadora
      titulo="Dimensionamento dos circuitos"
      clausulas="§6.2.5 · §6.2.6 · §6.2.7"
      referenciaNorma="§6.2.5/§6.2.6 — capacidade de condução de corrente (Tabelas 36 PVC e 37 EPR/XLPE) corrigida por temperatura (Tabela 40) e agrupamento (Tabelas 42/45), coordenação Ib ≤ In ≤ Iz (§5.3.4.1), queda de tensão (§6.2.7) e taxa de ocupação do eletroduto (§6.2.11.1.6)."
    >
      {dimensionados.length === 0 ? (
        <p className="placeholder">
          Nenhum circuito para dimensionar ainda. Volte para a etapa de cômodos e cadastre ao menos um.
        </p>
      ) : (
        <>
          <p>
            Cada circuito recebe a menor seção que atende <strong>ao mesmo tempo</strong> à corrente do
            disjuntor e à queda de tensão. O alimentador já consome{' '}
            <strong>{quedaAlimentadorPercentual.toFixed(2)}%</strong> dos 5% totais, então cada circuito
            tem até <strong>{limiteQuedaTerminalDisponivel.toFixed(2)}%</strong>.
          </p>

          {!projeto.iccPresumidaA && (
            <p className="texto-atencao">
              Curto-circuito (§6.2.6.1.2 c) não verificado: informe a Icc presumida na etapa de
              Instalação para habilitar.
            </p>
          )}
          {!calculo.seccionamento.esquema && (
            <p className="texto-atencao">
              Seccionamento automático (§6.2.6.1.2 d) não verificado: declare o esquema de aterramento na
              etapa de Instalação.
            </p>
          )}

          {calculo.protecaoGeral.eletroduto?.eletrodutoRecomendado && (
            <PercursoEletroduto
              percurso={calculo.protecaoGeral.percurso}
              Titulo="h2"
              titulo={`Percurso do eletroduto do alimentador (medidor → quadro, ${textoEletroduto(calculo.protecaoGeral.eletroduto)})`}
              trechos={projeto.percursos[ID_PERCURSO_ALIMENTADOR] ?? []}
              adicionar={() => addTrecho(ID_PERCURSO_ALIMENTADOR)}
              atualizar={(trechoId, patch) => updateTrecho(ID_PERCURSO_ALIMENTADOR, trechoId, patch)}
              remover={(trechoId) => removeTrecho(ID_PERCURSO_ALIMENTADOR, trechoId)}
            />
          )}

          <div className="tabela-scroll">
            <table className="tabela-resultado tabela-cartoes">
              <thead>
                <tr>
                  <th>Circuito</th>
                  <th className="numerico">Disjuntor</th>
                  <th className="numerico">Seção</th>
                  <th className="numerico">Queda de tensão</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {dimensionados.map((circuito) => {
                  const [variante, texto] = situacaoCircuito(circuito)
                  return (
                    <tr key={circuito.id}>
                      <td data-label="Circuito">
                        <strong>{circuito.nome}</strong>
                      </td>
                      <td data-label="Disjuntor" className="numerico">
                        {circuito.erro ? '—' : `${circuito.disjuntorA} A${circuito.polos === 2 ? ' (2P)' : ''}`}
                      </td>
                      <td data-label="Seção" className="numerico">
                        {circuito.erro ? '—' : <strong>{circuito.secaoMm2} mm²</strong>}
                      </td>
                      <td data-label="Queda de tensão" className="numerico">
                        {circuito.quedaPercentual === null || circuito.naoVerificado
                          ? '—'
                          : `${circuito.quedaPercentual.toFixed(2)}%`}
                      </td>
                      <td data-label="Situação">
                        <span className={`etiqueta-status ${variante}`}>{texto}</span>
                        {circuito.existente?.conforme === false && <span className="etiqueta-status alerta">existente não atende</span>}
                        {circuito.percurso?.conforme === false && <span className="etiqueta-status alerta">percurso</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <h2>Detalhes por circuito</h2>
          <div className="lista-detalhes">
            {dimensionados.map((circuito) => {
              const [variante, texto] = situacaoCircuito(circuito)
              const potenciaAtivaW = circuito.potenciaVA * circuito.cosPhi
              return (
                <details className="detalhes-calculo" key={circuito.id}>
                  <summary>
                    {circuito.nome} <span className={`etiqueta-status ${variante}`}>{texto}</span>
                  </summary>

                  {circuito.erro && <p className="texto-alerta">{circuito.erro}</p>}

                  <dl className="fatos">
                    <div>
                      <dt>Corrente de projeto (<Termo sigla="Ib" />)</dt>
                      <dd>{circuito.correnteProjetoA.toFixed(2)} A</dd>
                    </div>
                    <div>
                      <dt>Disjuntor (<Termo sigla="In" />)</dt>
                      <dd>
                        {circuito.erro ? '—' : `${circuito.disjuntorA} A, ${circuito.polos === 2 ? 'bipolar' : 'unipolar'}`}
                      </dd>
                    </div>
                    <div>
                      <dt>Seção adotada</dt>
                      <dd>
                        {circuito.secaoMm2 ? `${circuito.secaoMm2} mm²` : '—'}
                        {circuito.elevadaPorQuedaDeTensao && ` (só pela corrente: ${circuito.secaoPorAmpacidade} mm²)`}
                      </dd>
                    </div>
                    <div>
                      <dt>Capacidade corrigida (<Termo sigla="Iz" />)</dt>
                      <dd>{circuito.erro ? '—' : `${circuito.ampacidadeA.toFixed(1)} A`}</dd>
                    </div>
                    <div>
                      <dt>Terra (<Termo sigla="PE" />)</dt>
                      <dd>{circuito.secaoTerraMm2 ? `${circuito.secaoTerraMm2} mm²` : '—'}</dd>
                    </div>
                    <div>
                      <dt>Eletroduto</dt>
                      <dd>{textoEletroduto(circuito.eletroduto)}</dd>
                    </div>
                    <div>
                      <dt>Comprimento</dt>
                      <dd>{circuito.comprimentoInformado ? `${circuito.comprimentoM} m` : 'não informado'}</dd>
                    </div>
                    <div>
                      <dt>Sobrecarga: <Termo sigla="I₂" /> ≤ 1,45·Iz</dt>
                      <dd>
                        {circuito.sobrecarga
                          ? `${circuito.sobrecarga.i2A.toFixed(1)} A ≤ ${circuito.sobrecarga.limiteA.toFixed(1)} A`
                          : '—'}
                      </dd>
                    </div>
                    {circuito.iccQuadroA && (
                      <div>
                        <dt><Termo sigla="Icc" /> no quadro / na ponta</dt>
                        <dd>
                          {(circuito.iccQuadroA / 1000).toFixed(2)} kA /{' '}
                          {circuito.iccPontaA ? `${(circuito.iccPontaA / 1000).toFixed(2)} kA` : 'falta comprimento'}
                        </dd>
                      </div>
                    )}
                    {circuito.seccionamento && (
                      <div>
                        <dt>Seccionamento automático</dt>
                        <dd>
                          {circuito.seccionamento.zsOhm !== undefined
                            ? `Zs ${circuito.seccionamento.zsOhm.toFixed(3)} Ω · ${
                                circuito.seccionamento.porDisjuntor ? 'pelo disjuntor e pelo DR' : circuito.seccionamento.porDR ? 'pelo DR' : 'não atende'
                              }`
                            : circuito.seccionamento.raMaximaOhm
                              ? `TT: RA ≤ ${circuito.seccionamento.raMaximaOhm.toFixed(0)} Ω`
                              : 'não verificado'}
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt>Queda de tensão / limite</dt>
                      <dd>
                        {circuito.quedaPercentual === null || circuito.naoVerificado
                          ? '—'
                          : `${circuito.quedaPercentual.toFixed(2)}%`}{' '}
                        / {circuito.limitePercentual.toFixed(2)}%
                      </dd>
                    </div>
                  </dl>

                  <InstalacaoExistente
                    circuito={circuito}
                    valor={projeto.existentes[circuito.id]}
                    aoMudar={(patch) => setExistente(circuito.id, patch)}
                  />
                  {circuito.eletroduto && (
                    <PercursoEletroduto
                      percurso={circuito.percurso}
                      trechos={projeto.percursos[circuito.id] ?? []}
                      adicionar={() => addTrecho(circuito.id)}
                      atualizar={(trechoId, patch) => updateTrecho(circuito.id, trechoId, patch)}
                      remover={(trechoId) => removeTrecho(circuito.id, trechoId)}
                    />
                  )}

                  <h3 className="secao-titulo">Como foi calculado</h3>
                  <ol className="explicacao-calculo">
                    <li>
                      {circuito.cosPhi < 1 ? (
                        <>
                          potência ativa {potenciaAtivaW.toFixed(0)}W ÷ cosφ {circuito.cosPhi.toFixed(2)} ={' '}
                          {circuito.potenciaVA.toFixed(0)} VA de potência aparente.
                        </>
                      ) : (
                        <>carga resistiva (cosφ = 1) → potência aparente = potência ativa = {circuito.potenciaVA.toFixed(0)} VA.</>
                      )}
                    </li>
                    <li>
                      corrente de projeto (Ib) = {circuito.potenciaVA.toFixed(0)} VA ÷ {circuito.tensao} V ={' '}
                      <strong>{circuito.correnteProjetoA.toFixed(2)} A</strong>.
                    </li>
                    <li>
                      disjuntor (In): menor valor padronizado ≥ Ib →{' '}
                      <strong>{circuito.erro ? '—' : `${circuito.disjuntorA} A`}</strong>.
                    </li>
                    <li>
                      seção mínima normativa para{' '}
                      {circuito.tipo === 'iluminacao' ? 'iluminação' : circuito.tipo === 'tug' ? 'tomadas (TUG)' : 'uso específico (TUE)'}:{' '}
                      <strong>{circuito.secaoMinimaNormativa} mm²</strong> (§6.2.6.1.1).
                    </li>
                    <li>
                      método de instalação: <strong>{METODOS_INSTALACAO[circuito.metodoInstalacao].label}</strong> —{' '}
                      {METODOS_INSTALACAO[circuito.metodoInstalacao].descricao}
                    </li>
                    <li>
                      isolação: <strong>{ISOLACOES[circuito.isolacao]?.label ?? circuito.isolacao}</strong> —{' '}
                      {circuito.condutoresCarregados} condutores carregados (Tabela 46, §6.2.5.6) →{' '}
                      {circuito.ampacidadeTabelaA === null ? '—' : `${circuito.ampacidadeTabelaA} A`} de ampacidade
                      bruta na seção adotada.
                    </li>
                    <li>
                      {circuito.fatorTemperatura == null ? (
                        <span className="texto-alerta">{circuito.erro}</span>
                      ) : (
                        <>
                          fatores de correção: temperatura ×{circuito.fatorTemperatura.toFixed(2)} (Tabela 40) ×
                          agrupamento ×{circuito.fatorAgrupamento.toFixed(2)} ({nomeReferenciaAgrupamento(circuito.metodoInstalacao)},{' '}
                          {projeto.numeroCircuitosAgrupadosManual || circuitos.length} circuitos agrupados)
                          {circuito.fatorResistividadeSolo != null && circuito.fatorResistividadeSolo !== 1 && (
                            <> × resistividade do solo ×{circuito.fatorResistividadeSolo.toFixed(2)} (Tabela 41)</>
                          )}
                          .
                        </>
                      )}
                    </li>
                    <li>
                      queda de tensão: até <strong>{circuito.limitePercentual.toFixed(2)}%</strong> neste circuito
                      (§6.2.7.2 permite 4% no trecho terminal, dentro dos 5% totais do §6.2.7.1 c).
                    </li>
                    {circuito.eletroduto && (
                      <li>
                        {circuito.eletroduto.areaCondutoresMm2 === null ? (
                          <span className="texto-atencao">{circuito.eletroduto.erro}</span>
                        ) : (
                          <>
                            eletroduto: {circuito.eletroduto.numeroCondutores} condutores (2× {circuito.secaoMm2} mm² + 1×{' '}
                            {circuito.secaoTerraMm2} mm² de terra) ocupando{' '}
                            {circuito.eletroduto.areaCondutoresMm2.toFixed(1)} mm² — no máximo{' '}
                            {circuito.eletroduto.taxaMaximaPercentual}% da área útil (§6.2.11.1.6) →{' '}
                            <strong>{textoEletroduto(circuito.eletroduto)}</strong>.
                          </>
                        )}
                      </li>
                    )}
                    {projeto.iccPresumidaA && (
                      <li>
                        curto-circuito (§6.3.4.3.2 — energia I²t com a Icc no quadro, onde o disjuntor
                        está; disparo instantâneo garantido com a Icc na ponta do circuito; ambas
                        calculadas por impedância a partir da Icc declarada, §5.3.5.1):{' '}
                        {circuito.curtoCircuito.verificado ? (
                          <span className={circuito.curtoCircuito.conforme ? undefined : 'texto-alerta'}>
                            {circuito.curtoCircuito.conforme
                              ? `conforme — o condutor de ${circuito.secaoMm2} mm² suporta a energia de curto-circuito (§5.3.5.5.2).`
                              : circuito.curtoCircuito.motivo}
                          </span>
                        ) : (
                          <span className="texto-atencao">{circuito.curtoCircuito.motivo}</span>
                        )}
                      </li>
                    )}
                  </ol>

                  {circuito.trilhaSecao?.length > 0 && (
                    <div className="tabela-scroll">
                      <table className="tabela-resultado tabela-trilha">
                        <thead>
                          <tr>
                            <th className="numerico">Seção</th>
                            <th className="numerico">Iz tabela</th>
                            <th className="numerico">Iz corrigido</th>
                            <th>Atende In ≤ Iz?</th>
                            <th className="numerico">Queda de tensão</th>
                            <th>Atende ao limite ({circuito.limitePercentual.toFixed(2)}%)?</th>
                            <th>Resultado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {circuito.trilhaSecao.map((linha) => (
                            <tr key={linha.secao}>
                              <td className="numerico">{linha.secao} mm²</td>
                              <td className="numerico">{linha.ampacidade} A</td>
                              <td className="numerico">{linha.ampacidadeCorrigida.toFixed(1)} A</td>
                              <td>{linha.atendeAmpacidade ? 'sim' : 'não'}</td>
                              <td className="numerico">
                                {linha.quedaPercentual === null ? '—' : `${linha.quedaPercentual.toFixed(2)}%`}
                              </td>
                              <td>{linha.atendeQueda ? 'sim' : 'não'}</td>
                              <td>
                                {linha.aprovada && linha.secao === circuito.secaoMm2 ? (
                                  <span className="etiqueta-status ok">adotada</span>
                                ) : linha.aprovada ? (
                                  <span className="texto-calculado">atenderia, mas já havia menor</span>
                                ) : (
                                  <span className="texto-fraco">rejeitada</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {circuito.eletroduto?.trilha?.length > 0 && (
                    <div className="tabela-scroll">
                      <table className="tabela-resultado tabela-trilha">
                        <thead>
                          <tr>
                            <th>Eletroduto</th>
                            <th className="numerico">Área útil</th>
                            <th className="numerico">Ocupação</th>
                            <th>Resultado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {circuito.eletroduto.trilha.map((linha) => (
                            <tr key={linha.referencia}>
                              <td>
                                {linha.nominalMm} mm ({linha.referencia})
                              </td>
                              <td className="numerico">{linha.areaInternaMm2.toFixed(0)} mm²</td>
                              <td className="numerico">{linha.ocupacaoPercentual.toFixed(1)}%</td>
                              <td>
                                {linha.referencia === circuito.eletroduto.eletrodutoRecomendado?.referencia ? (
                                  <span className="etiqueta-status ok">adotado</span>
                                ) : linha.atende ? (
                                  <span className="texto-calculado">atenderia, mas já havia menor</span>
                                ) : (
                                  <span className="texto-fraco">ocupação acima do limite</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </details>
              )
            })}
          </div>

          <Nota titulo="Eletroduto e agrupamento são a mesma coisa?">
            Não. O agrupamento (Tabela 42) mede quantos <em>circuitos</em> se aquecem entre si; a taxa de
            ocupação (§6.2.11.1.6) mede se os <em>condutores</em> de um circuito cabem no eletroduto do
            próprio trecho. Os diâmetros de cabo e eletroduto são valores comerciais típicos (a NBR 5410
            não tabela dimensões de produto) — confira com o material comprado se a ocupação ficar perto
            do limite.
          </Nota>

          <details className="detalhes-calculo">
            <summary>Condições de instalação (avançado)</summary>
            <p className="texto-fraco">
              Padrão: PVC, 30°C e todos os {circuitos.length} circuitos agrupados no mesmo eletroduto (pior
              caso razoável). Mude só se a instalação real for diferente.
            </p>
            <div className="grade-campos">
              <Campo label="Isolação dos condutores" ajuda="Tabela 36 (PVC) ou 37 (EPR/XLPE).">
                <select
                  className="campo"
                  value={projeto.isolacaoCondutor}
                  onChange={(evento) => setIsolacaoCondutor(evento.target.value)}
                >
                  {Object.entries(ISOLACOES).map(([chave, isolacao]) => (
                    <option key={chave} value={chave}>
                      {isolacao.label}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo label="Temperatura ambiente" ajuda="Tabela 40 — métodos ao ar.">
                <select
                  className="campo"
                  value={projeto.temperaturaAmbienteC}
                  onChange={(evento) => setTemperaturaAmbienteC(evento.target.value)}
                >
                  <option value="">Automático (30°C)</option>
                  {listarTemperaturasDisponiveis({ isolacao: projeto.isolacaoCondutor, enterrado: false }).map(
                    ({ temperaturaC }) => (
                      <option key={temperaturaC} value={temperaturaC}>
                        {temperaturaC}°C
                      </option>
                    ),
                  )}
                </select>
              </Campo>
              <Campo
                label="Circuitos agrupados"
                ajuda={`Tabela 42 — automático: ${circuitos.length}.`}
                erro={validarNumero(projeto.numeroCircuitosAgrupadosManual, { min: 1, inteiro: true })}
              >
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  step="1"
                  className="campo"
                  placeholder={String(circuitos.length)}
                  value={projeto.numeroCircuitosAgrupadosManual}
                  onChange={(evento) => setNumeroCircuitosAgrupadosManual(evento.target.value)}
                />
              </Campo>
              {dimensionados.some((circuito) => METODOS_INSTALACAO[circuito.metodoInstalacao]?.enterrado) && (
                <>
                  <Campo label="Temperatura do solo" ajuda="Tabela 40 — métodos enterrados.">
                    <select
                      className="campo"
                      value={projeto.temperaturaSoloC}
                      onChange={(evento) => setTemperaturaSoloC(evento.target.value)}
                    >
                      <option value="">Automático (20°C)</option>
                      {listarTemperaturasDisponiveis({ isolacao: projeto.isolacaoCondutor, enterrado: true }).map(
                        ({ temperaturaC }) => (
                          <option key={temperaturaC} value={temperaturaC}>
                            {temperaturaC}°C
                          </option>
                        ),
                      )}
                    </select>
                  </Campo>
                  <Campo label="Resistividade térmica do solo" ajuda="Tabela 41 — padrão: 2,5 K·m/W.">
                    <select
                      className="campo"
                      value={projeto.resistividadeTermicaSoloKmW}
                      onChange={(evento) => setResistividadeTermicaSoloKmW(evento.target.value)}
                    >
                      <option value="">Automático (2,5 K·m/W)</option>
                      {TABELA_41_RESISTIVIDADE_SOLO.map((linha) => (
                        <option key={linha.resistividadeKmW} value={linha.resistividadeKmW}>
                          {linha.resistividadeKmW} K·m/W
                        </option>
                      ))}
                    </select>
                  </Campo>
                </>
              )}
            </div>
            {dimensionados.some((circuito) => METODOS_INSTALACAO[circuito.metodoInstalacao]?.enterrado) && (
              <p className="texto-fraco">
                Circuitos no método D (enterrado) usam a temperatura do solo (20°C) e o agrupamento da
                Tabela 45, sempre pelo espaçamento "nulo" entre eletrodutos (o mais severo).
              </p>
            )}
          </details>
        </>
      )}

      <AcoesEtapa voltar={ROUTES.circuitos} avancar={ROUTES.resultado} rotuloAvancar="Ver proteção e resultado" />
    </EtapaCalculadora>
  )
}
