import EtapaCalculadora, { AcoesEtapa } from './EtapaCalculadora.jsx'
import Nota from '../../components/Nota.jsx'
import { validarNumero } from '../../components/validacao.js'
import { useProjeto } from '../../context/useProjeto.js'
import Campo from '../../components/Campo.jsx'
import { CampoMarcar, CampoNumero } from '../../components/CamposProjeto.jsx'
import { MANEIRAS_INSTALAR, MANEIRA_PADRAO } from '../../calculations/agrupamento.js'
import { CORRENTE_MAXIMA_CIRCUITO_PADRAO_A, CORRENTE_MAXIMA_CIRCUITO_MISTO_A } from '../../calculations/constantes.js'
import { DRS_MONTANTE } from '../../calculations/seccionamento.js'
import { ROUTES } from '../../routes.js'

export default function Circuitos() {
  const { projeto, calculo, setComprimento, setManeiraInstalacao, setMapa, setModoDR, setGrupoDR, setDrMontante } = useProjeto()
  const { circuitosComFase, cargaPorFase, explicacoesFase: explicacoes } = calculo
  const porGrupos = projeto.modoDR === 'grupos'
  const balanceamento = calculo.balanceamento
  const { numeroFases } = calculo.configInstalacao

  return (
    <EtapaCalculadora
      titulo="Divisão em circuitos"
      clausulas="§9.5.3"
      referenciaNorma="§9.5.3 — divisão da instalação em circuitos: iluminação e tomadas separadas, circuito exclusivo para equipamento acima de 10 A (aqui, por simplificação conservadora, para todo equipamento de uso específico)."
    >
      {circuitosComFase.length === 0 ? (
        <p className="placeholder">
          Nenhum circuito gerado ainda. Volte para a etapa de cômodos e cadastre ao menos um.
        </p>
      ) : (
        <>
          <p>
            Circuitos agrupados automaticamente a partir dos cômodos. Informe o comprimento de cada um
            (do quadro até o ponto mais distante) e como os fios vão passar.
          </p>

          <div className="grade-campos grade-campos-larga">
            <Campo label="Proteção diferencial (DR)" ajuda="§6.3.3.2.6 — dividir evita que a fuga normal de todos os circuitos derrube a casa inteira.">
              <select className="campo" value={projeto.modoDR} onChange={(evento) => setModoDR(evento.target.value)}>
                <option value="geral">Todos os circuitos sob um DR de 30 mA para toda a instalação</option>
                <option value="grupos">Todos os circuitos, com um DR de 30 mA por grupo</option>
                <option value="exigidos">Um DR de 30 mA para cada circuito que a norma exige (§5.1.3.2.2) — padrão</option>
              </select>
            </Campo>
            <CampoNumero
              chave="correnteMaximaCircuitoA"
              label="Corrente máxima por circuito"
              unidade="A"
              ajuda={`Critério do compilado: o circuito é limitado pela corrente, não por VA fixo. Padrão ${CORRENTE_MAXIMA_CIRCUITO_PADRAO_A} A; circuito misto (iluminação + tomadas, §9.5.3.1) até ${CORRENTE_MAXIMA_CIRCUITO_MISTO_A} A.`}
            />
            {porGrupos && (
              <Campo label="DR a montante dos grupos" ajuda="Opcional. Para ser seletivo: tipo S e ≥ 3× 30 mA (§6.3.6.3.2).">
                <select className="campo" value={projeto.drMontante} onChange={(evento) => setDrMontante(evento.target.value)}>
                  <option value="">Nenhum (só disjuntor geral)</option>
                  {Object.entries(DRS_MONTANTE).map(([chave, dr]) => (
                    <option key={chave} value={chave}>
                      {dr.label}
                    </option>
                  ))}
                </select>
              </Campo>
            )}
          </div>
          <CampoMarcar chave="circuitoMisto">Permitir circuito misto: iluminação e tomadas de uso geral no mesmo circuito (§9.5.3.1, com as condições do compilado).</CampoMarcar>

          <div className="tabela-scroll">
            <table className="tabela-resultado tabela-cartoes">
              <thead>
                <tr>
                  <th>Circuito</th>
                  <th>Cômodos</th>
                  <th className="numerico">Potência</th>
                  <th className="numerico">Tensão</th>
                  {numeroFases > 1 && <th className="numerico">Fase</th>}
                  <th className="numerico">Comprimento</th>
                  <th>Maneira de instalar (Tabela 33)</th>
                  {numeroFases > 1 && <th>Fase (manual)</th>}
                  {porGrupos && <th>DR</th>}
                </tr>
              </thead>
              <tbody>
                {circuitosComFase.map((circuito) => {
                  const comprimento = projeto.comprimentos[circuito.id] ?? ''
                  const erroComprimento = validarNumero(comprimento)
                  const maneira = projeto.maneirasInstalacao?.[circuito.id] || MANEIRA_PADRAO
                  return (
                    <tr key={circuito.id}>
                      <td data-label="Circuito">
                        <strong>{circuito.nome}</strong>
                      </td>
                      <td data-label="Cômodos" className="celula-quebra">
                        {circuito.comodos.join(', ')}
                      </td>
                      <td data-label="Potência" className="numerico">{circuito.potenciaVA.toFixed(0)} VA</td>
                      <td data-label="Tensão" className="numerico">
                        {circuito.tensao} V{circuito.ehFaseFase ? ' (F-F)' : ''}
                      </td>
                      {numeroFases > 1 && (
                        <td data-label="Fase" className="numerico">
                          {circuito.fases.map((fase) => `F${fase}`).join('+')}
                        </td>
                      )}
                      <td data-label="Comprimento" className="numerico">
                        <span className="campo-com-unidade campo-numero">
                          <input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="0.5"
                            className="campo"
                            aria-label={`Comprimento de ${circuito.nome} (m)`}
                            aria-invalid={erroComprimento ? true : undefined}
                            title={erroComprimento ?? undefined}
                            value={comprimento}
                            onChange={(evento) => setComprimento(circuito.id, evento.target.value)}
                          />
                          <span className="campo-unidade" aria-hidden="true">
                            m
                          </span>
                        </span>
                      </td>
                      <td data-label="Maneira">
                        <select
                          className="campo campo-compacto"
                          aria-label={`Maneira de instalar de ${circuito.nome}`}
                          value={maneira}
                          onChange={(evento) => setManeiraInstalacao(circuito.id, evento.target.value)}
                          title={MANEIRAS_INSTALAR.find((m) => m.codigo === maneira)?.descricao}
                        >
                          {MANEIRAS_INSTALAR.map((m) => (
                            <option key={m.codigo} value={m.codigo}>
                              {m.codigo} → {m.metodo}
                            </option>
                          ))}
                        </select>
                      </td>
                      {numeroFases > 1 && (
                        <td data-label="Fase manual">
                          <select
                            className="campo campo-compacto"
                            aria-label={`Fase de ${circuito.nome}`}
                            value={(projeto.fasesManuais?.[circuito.id] ?? []).join('+')}
                            onChange={(evento) => setMapa('fasesManuais', circuito.id, evento.target.value ? evento.target.value.split('+').map(Number) : '')}
                          >
                            <option value="">Automática</option>
                            {circuito.ehFaseFase
                              ? [[1, 2], [1, 3], [2, 3]].filter(([, b]) => b <= numeroFases).map((par) => <option key={par.join('+')} value={par.join('+')}>F{par[0]}+F{par[1]}</option>)
                              : Array.from({ length: numeroFases }, (_, k) => <option key={k} value={k + 1}>F{k + 1}</option>)}
                          </select>
                        </td>
                      )}
                      {porGrupos && (
                        <td data-label="DR">
                          <select
                            className="campo campo-numero"
                            aria-label={`DR de ${circuito.nome}`}
                            value={projeto.grupoDR[circuito.id] || 1}
                            onChange={(evento) => setGrupoDR(circuito.id, evento.target.value)}
                          >
                            {circuitosComFase.map((_, indice) => (
                              <option key={indice} value={indice + 1}>
                                DR {indice + 1}
                              </option>
                            ))}
                          </select>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {numeroFases > 1 && (
            <>
              <h2>Carga por fase</h2>
              <div className="tabela-scroll">
                <table className="tabela-resultado">
                  <thead>
                    <tr>
                      {cargaPorFase.map((_, indice) => (
                        <th key={indice} className="numerico">
                          Fase {indice + 1}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {cargaPorFase.map((carga, indice) => (
                        <td key={indice} className="numerico">
                          {Math.round(carga)} VA
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
              {balanceamento && (
                <>
                  <h2>Distribuição por fase: correntes e dispersão δ</h2>
                  <div className="tabela-scroll">
                    <table className="tabela-resultado">
                      <thead>
                        <tr>
                          <th>Cenário</th>
                          {cargaPorFase.map((_, k) => (
                            <th key={k} className="numerico">I fase {k + 1}</th>
                          ))}
                          <th className="numerico">δ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[['Distribuição automática', balanceamento.automatico], [balanceamento.ajusteManual ? 'Adotada (com ajuste manual)' : 'Adotada', balanceamento.adotado], ['Sem os equipamentos de uso específico', balanceamento.semEquipamentos]].map(([nome, c]) => (
                          <tr key={nome}>
                            <td>{nome}</td>
                            {c.correntesA.map((i, k) => (
                              <td key={k} className="numerico">{i.toFixed(1)} A</td>
                            ))}
                            <td className="numerico">{c.deltaPercentual === null ? '—' : `${c.deltaPercentual.toFixed(1)}%`}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Nota titulo="O que é o δ">
                    <p>
                      δ = 100·máx(|Iₖ − Imédia|)/Imédia, com as correntes de fase por soma fasorial. É um indicador de dispersão para comparar
                      alternativas, não o fator de desequilíbrio por componentes simétricas nem um limite da NBR 5410 (4.2.5.6 não fixa percentual).
                    </p>
                  </Nota>
                </>
              )}

              <Nota titulo="Como as fases foram balanceadas?">
                <p>
                  Cada circuito vai para a(s) fase(s) menos carregada(s) até o momento. Circuitos
                  fase-fase usam duas fases com a MESMA corrente nas duas (não a metade), por isso a
                  potência que entra em cada fase neste resumo é a do circuito dividida por √3.
                </p>
                <ol className="explicacao-fases">
                  {explicacoes.map((circuito) => {
                    const { cargasAntes, fases, contribuicaoPorFase } = circuito.decisaoFase
                    const cargasAntesTexto = cargasAntes
                      .map((carga, indice) => `F${indice + 1}=${Math.round(carga)}VA`)
                      .join(', ')
                    return (
                      <li key={circuito.id}>
                        <strong>{circuito.nome}</strong> ({circuito.potenciaVA.toFixed(0)} VA
                        {circuito.ehFaseFase ? ', fase-fase' : ''}) — processado nesta ordem porque é a
                        {circuito.decisaoFase.ordem === 1 ? ' maior' : `${circuito.decisaoFase.ordem}ª maior`}{' '}
                        carga da lista. Cargas acumuladas antes desta atribuição: {cargasAntesTexto}. Como{' '}
                        {fases.length > 1
                          ? `F${fases[0]} e F${fases[1]} eram (juntas) a menor soma disponível`
                          : `F${fases[0]} era a menor carga disponível`}
                        , recebeu {Math.round(contribuicaoPorFase)} VA {fases.length > 1 ? 'em cada uma' : ''} →{' '}
                        {fases.map((f) => `F${f}`).join('+')}.
                      </li>
                    )
                  })}
                </ol>
              </Nota>
            </>
          )}
        </>
      )}

      <AcoesEtapa voltar={ROUTES.comodos} avancar={ROUTES.dimensionamento} rotuloAvancar="Avançar para dimensionamento" />
    </EtapaCalculadora>
  )
}
