import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { TIPOS_CARGA, TIPOS_COMODO, obterOpcoesLigacao } from '../calculations/constantes.js'
import { PRESETS_EQUIPAMENTOS } from '../conteudo/presets.js'
import { calcularCargaComodo, calcularLimite600VA } from '../calculations/previsaoDeCarga.js'
import { verificarPontosBanheiro } from '../calculations/locaisEspeciais.js'
import { useProjeto } from '../context/useProjeto.js'
import { ROUTES } from '../routes.js'
import Campo from './Campo.jsx'
import { validarNumero } from './validacao.js'

export default function ComodoCard({ comodo, indice }) {
  const { projeto, updateComodo, removeComodo, addTue, updateTue, removeTue } = useProjeto()
  // Cômodo recém-criado (sem área) abre expandido; os já preenchidos abrem recolhidos.
  const [aberto, setAberto] = useState(() => !comodo.area)
  const idCorpo = useId()
  const config = TIPOS_COMODO[comodo.tipo]
  const precisaPerimetro = config.tugFixa === undefined
  const limite600VA = calcularLimite600VA(projeto.comodos, projeto.aplicarAlternativa600VA)
  const carga = calcularCargaComodo(comodo, limite600VA)
  const opcoesLigacao = obterOpcoesLigacao(projeto.tipoInstalacao, projeto.tensaoFaseNeutro)
  const nome = comodo.nome || `Cômodo ${indice + 1}`
  const incompleto = !(Number(comodo.area) > 0) || (precisaPerimetro && !(Number(comodo.perimetro) > 0))

  return (
    <div className="cartao-comodo">
      <div className="cartao-cabecalho">
        <button
          type="button"
          className="cartao-alternar"
          aria-expanded={aberto}
          aria-controls={idCorpo}
          onClick={() => setAberto(!aberto)}
        >
          <span className="cartao-alternar-seta" aria-hidden="true">
            {aberto ? '▾' : '▸'}
          </span>
          <span className="cartao-cabecalho-titulo">{nome}</span>
          <span className="cartao-cabecalho-resumo">
            {config.label}
            {comodo.area && ` · ${comodo.area} m²`} · {Math.round(carga.totalVA)} VA
          </span>
          {incompleto && <span className="etiqueta-status atencao">incompleto</span>}
        </button>
        <button
          type="button"
          className="botao-remover"
          aria-label={`Remover ${nome}`}
          onClick={() => {
            if (window.confirm(`Remover "${nome}" e todos os seus equipamentos?`)) removeComodo(comodo.id)
          }}
        >
          ×
        </button>
      </div>

      {aberto && (
        <div className="cartao-corpo" id={idCorpo}>
          <div className="grade-campos">
            <Campo label="Nome">
              <input
                type="text"
                placeholder="ex: Sala"
                value={comodo.nome}
                onChange={(evento) => updateComodo(comodo.id, { nome: evento.target.value })}
                className="campo"
              />
            </Campo>
            <Campo label="Tipo de cômodo">
              <select
                value={comodo.tipo}
                onChange={(evento) => updateComodo(comodo.id, { tipo: evento.target.value })}
                className="campo"
              >
                {Object.entries(TIPOS_COMODO).map(([chave, valor]) => (
                  <option key={chave} value={chave}>
                    {valor.label}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Área" unidade="m²" erro={validarNumero(comodo.area, { obrigatorio: true, maiorQueMin: true })}>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                value={comodo.area}
                onChange={(evento) => updateComodo(comodo.id, { area: evento.target.value })}
                className="campo"
              />
            </Campo>
            {precisaPerimetro && (
              <Campo
                label="Perímetro"
                unidade="m"
                erro={validarNumero(comodo.perimetro, { obrigatorio: true, maiorQueMin: true })}
              >
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  value={comodo.perimetro}
                  onChange={(evento) => updateComodo(comodo.id, { perimetro: evento.target.value })}
                  className="campo"
                />
              </Campo>
            )}
          </div>
          {comodo.tipo === 'outro' && (
            <label className="campo-checkbox">
              <input
                type="checkbox"
                checked={Boolean(comodo.piscina)}
                onChange={(evento) => updateComodo(comodo.id, { piscina: evento.target.checked })}
              />
              Aqui fica uma piscina ou fonte em que se possa entrar (§9.2)
            </label>
          )}
          {comodo.tipo === 'sauna' && (
            <p className="texto-atencao">
              Sauna (§9.4): nenhuma tomada no local e dispositivos de proteção e comando do lado de fora. Cadastre o
              aquecedor como equipamento abaixo.
            </p>
          )}
          {comodo.tipo === 'banheiro' &&
            (() => {
              const pontos = verificarPontosBanheiro(comodo.geometriaBanheiro)
              const naoConformes = pontos.filter((ponto) => ponto.conforme === false).length
              return (
                <p className="texto-calculado">
                  {pontos.length > 0 ? (
                    <>
                      {pontos.length} ponto(s) elétrico(s) marcado(s) nos volumes do §9.1
                      {naoConformes > 0 && <> — <strong>{naoConformes} não conforme(s)</strong></>}.{' '}
                    </>
                  ) : (
                    'Nenhum ponto elétrico marcado nos volumes do §9.1 ainda (opcional). '
                  )}
                  <Link to={`${ROUTES.banheiro}?comodo=${comodo.id}`}>Marcar chuveiro e pontos na planta →</Link>
                </p>
              )
            })()}

          <div className="secao-comodo">
            <h3 className="secao-titulo">Iluminação</h3>
            <div className="grade-campos">
              <Campo label="Luminárias (qtd.)" erro={validarNumero(comodo.iluminacaoQuantidade, { inteiro: true })}>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  placeholder="ex: 5"
                  value={comodo.iluminacaoQuantidade ?? ''}
                  onChange={(evento) => updateComodo(comodo.id, { iluminacaoQuantidade: evento.target.value })}
                  className="campo"
                />
              </Campo>
              <Campo label="Potência unitária" unidade="W" erro={validarNumero(comodo.iluminacaoPotenciaUnitariaW)}>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="5"
                  placeholder="ex: 150"
                  value={comodo.iluminacaoPotenciaUnitariaW ?? ''}
                  onChange={(evento) =>
                    updateComodo(comodo.id, { iluminacaoPotenciaUnitariaW: evento.target.value })
                  }
                  className="campo"
                />
              </Campo>
            </div>
            <p className="texto-calculado">
              {carga.iluminacaoVA === carga.iluminacaoMinimaVA
                ? `Usando o mínimo da norma: ${carga.iluminacaoMinimaVA} VA (sem luminárias informadas).`
                : `${comodo.iluminacaoQuantidade} × ${comodo.iluminacaoPotenciaUnitariaW}W = ${carga.iluminacaoVA} VA (mínimo da norma: ${carga.iluminacaoMinimaVA} VA).`}
            </p>
          </div>

          <div className="secao-comodo">
            <h3 className="secao-titulo">Tomadas (TUG)</h3>
            <div className="grade-campos">
              <Campo
                label="Pontos de tomada"
                ajuda={`mínimo da norma: ${carga.tugQuantidadeMinima}`}
                erro={validarNumero(comodo.tugPontos, { inteiro: true })}
              >
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  placeholder={String(carga.tugQuantidadeMinima)}
                  value={comodo.tugPontos ?? ''}
                  onChange={(evento) => updateComodo(comodo.id, { tugPontos: evento.target.value })}
                  className="campo"
                />
              </Campo>
              {comodo.tipo === 'servico' && (
                <Campo
                  label="Tomadas acima da bancada da pia"
                  ajuda="mínimo da norma: 2 (§9.5.2.2.1 b)"
                  erro={
                    validarNumero(comodo.tomadasBancada, { inteiro: true }) ??
                    (comodo.tomadasBancada !== undefined && comodo.tomadasBancada !== '' && Number(comodo.tomadasBancada) < 2
                      ? 'Abaixo do mínimo de 2.'
                      : null)
                  }
                >
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    step="1"
                    placeholder="2"
                    value={comodo.tomadasBancada ?? ''}
                    onChange={(evento) => updateComodo(comodo.id, { tomadasBancada: evento.target.value })}
                    className="campo"
                  />
                </Campo>
              )}
            </div>
          </div>

          {(carga.iluminacaoAbaixoDoMinimo || carga.tugAbaixoDoMinimo) && (
            <p className="texto-alerta">
              {carga.iluminacaoAbaixoDoMinimo &&
                `Iluminação abaixo do mínimo da norma (mínimo: ${carga.iluminacaoMinimaVA} VA). `}
              {carga.tugAbaixoDoMinimo &&
                `Tomadas abaixo do mínimo da norma (mínimo: ${carga.tugQuantidadeMinima} pontos).`}
            </p>
          )}

          <div className="secao-comodo">
            <h3 className="secao-titulo">Equipamentos de uso específico (TUE)</h3>

            {(comodo.tue ?? []).length > 0 && (
              <div className="lista-equipamentos">
                {comodo.tue.map((equipamento, indiceEquipamento) => {
                  const nomeEquipamento = equipamento.nome || `Equipamento ${indiceEquipamento + 1}`
                  return (
                    <div className="cartao-equipamento" key={equipamento.id}>
                      <div className="cartao-cabecalho cartao-cabecalho-pequeno">
                        <span className="cartao-cabecalho-titulo">{nomeEquipamento}</span>
                        <button
                          type="button"
                          className="botao-remover"
                          aria-label={`Remover ${nomeEquipamento}`}
                          onClick={() => {
                            if (window.confirm(`Remover "${nomeEquipamento}"?`)) removeTue(comodo.id, equipamento.id)
                          }}
                        >
                          ×
                        </button>
                      </div>

                      <div className="grade-campos">
                        <Campo label="Modelo típico" ajuda="Preenche nome, potência e tipo de carga.">
                          <select
                            className="campo"
                            value=""
                            onChange={(evento) => {
                              const preset = PRESETS_EQUIPAMENTOS.find((item) => item.chave === evento.target.value)
                              if (!preset) return
                              // 220 V: em 127/220 é entre fases; em 220/380 é fase-neutro (fase-fase daria 380 V).
                              const faseFase =
                                preset.faseFase && projeto.tensaoFaseNeutro <= 127 && opcoesLigacao.some((opcao) => opcao.valor === 'fase-fase')
                              updateTue(comodo.id, equipamento.id, {
                                nome: preset.nome,
                                potenciaW: String(preset.potenciaW),
                                tipoCarga: preset.tipoCarga,
                                cosPhi: TIPOS_CARGA[preset.tipoCarga].cosPhiPadrao,
                                ligacao: faseFase ? 'fase-fase' : 'fase-neutro',
                                potenciaTipica: true,
                              })
                            }}
                          >
                            <option value="">escolher…</option>
                            {PRESETS_EQUIPAMENTOS.map((preset) => (
                              <option key={preset.chave} value={preset.chave}>
                                {preset.nome} — {preset.potenciaW} W
                              </option>
                            ))}
                          </select>
                        </Campo>
                        <Campo label="Nome">
                          <input
                            type="text"
                            placeholder="ex: Chuveiro"
                            value={equipamento.nome}
                            onChange={(evento) => updateTue(comodo.id, equipamento.id, { nome: evento.target.value })}
                            className="campo"
                          />
                        </Campo>
                        <Campo
                          label="Qtd."
                          erro={validarNumero(equipamento.quantidade, { obrigatorio: true, min: 1, inteiro: true })}
                        >
                          <input
                            type="number"
                            inputMode="numeric"
                            min="1"
                            step="1"
                            value={equipamento.quantidade ?? 1}
                            onChange={(evento) =>
                              updateTue(comodo.id, equipamento.id, { quantidade: evento.target.value })
                            }
                            className="campo"
                          />
                        </Campo>
                        <Campo
                          label="Potência unitária"
                          unidade="W"
                          ajuda={equipamento.potenciaTipica ? 'Potência típica — confira a placa do aparelho.' : undefined}
                          erro={validarNumero(equipamento.potenciaW, { obrigatorio: true, maiorQueMin: true })}
                        >
                          <input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            value={equipamento.potenciaW}
                            onChange={(evento) =>
                              updateTue(comodo.id, equipamento.id, { potenciaW: evento.target.value, potenciaTipica: false })
                            }
                            className="campo"
                          />
                        </Campo>
                        <Campo label="Ligação">
                          <select
                            value={equipamento.ligacao ?? 'fase-neutro'}
                            onChange={(evento) => updateTue(comodo.id, equipamento.id, { ligacao: evento.target.value })}
                            className="campo"
                          >
                            {opcoesLigacao.map((opcao) => (
                              <option key={opcao.valor} value={opcao.valor}>
                                {opcao.label}
                              </option>
                            ))}
                          </select>
                        </Campo>
                        <Campo label="Tipo de carga" ajuda="Motor/compressor puxa mais corrente que a potência sugere.">
                          <select
                            value={equipamento.tipoCarga ?? 'resistiva'}
                            onChange={(evento) =>
                              updateTue(comodo.id, equipamento.id, {
                                tipoCarga: evento.target.value,
                                cosPhi: TIPOS_CARGA[evento.target.value].cosPhiPadrao,
                              })
                            }
                            className="campo"
                          >
                            {Object.entries(TIPOS_CARGA).map(([chave, valor]) => (
                              <option key={chave} value={chave}>
                                {valor.label}
                              </option>
                            ))}
                          </select>
                        </Campo>
                        {(equipamento.tipoCarga ?? 'resistiva') !== 'resistiva' && (
                          <Campo
                            label="Fator de potência (cosφ)"
                            erro={validarNumero(equipamento.cosPhi, { obrigatorio: true, maiorQueMin: true, max: 1 })}
                          >
                            <input
                              type="number"
                              inputMode="decimal"
                              min="0"
                              max="1"
                              step="0.01"
                              value={equipamento.cosPhi}
                              onChange={(evento) => updateTue(comodo.id, equipamento.id, { cosPhi: evento.target.value })}
                              className="campo"
                            />
                          </Campo>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <button type="button" className="botao-texto" onClick={() => addTue(comodo.id)}>
              + Adicionar equipamento
            </button>
          </div>

          <p className="cartao-comodo-resumo">
            Iluminação: <strong>{carga.iluminacaoVA} VA</strong> · Tomadas:{' '}
            <strong>
              {carga.tugQuantidade} pontos / {carga.tugVA} VA
            </strong>
            {carga.tueVA > 0 && (
              <>
                {' '}
                · Equipamentos: <strong>{Math.round(carga.tueVA)} VA</strong>
              </>
            )}{' '}
            · Total: <strong>{Math.round(carga.totalVA)} VA</strong>
          </p>
        </div>
      )}
    </div>
  )
}
