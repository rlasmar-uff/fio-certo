import { useState } from 'react'
import Campo from '../../components/Campo.jsx'
import Nota from '../../components/Nota.jsx'
import { CampoSelecao } from '../../components/CamposProjeto.jsx'
import { useProjeto } from '../../context/useProjeto.js'
import { CATALOGOS_ELETRODUTO, ISOLACOES, SECOES_NOMINAIS_MM2 } from '../../calculations/constantes.js'
import { ESPACAMENTOS_TAB44, ESPACAMENTOS_TAB45, FORMAS_AGRUPAMENTO } from '../../calculations/agrupamento.js'
import { quantidadeMaximaCondutores, secoesComAreaCatalogada } from '../../calculations/eletroduto.js'
import { FORMACOES_EFG, capacidadeCorrigidaEFG } from '../../calculations/capacidadesEFG.js'

const numeroOuVazio = (texto) => (texto === '' ? '' : Number(texto))

// Grupos de agrupamento e eletrodutos compartilhados (semanas 5 e 8): fator K2 por grupo (Tabelas 42 a 45) e
// eletroduto único somando os condutores de todos os circuitos do grupo.
export function Agrupamentos() {
  const { projeto, calculo, addAgrupamento, updateAgrupamento, removeAgrupamento } = useProjeto()
  const resultados = new Map(calculo.agrupamentos.map((g) => [g.id, g]))
  const grupos = projeto.agrupamentos ?? []
  const emOutroGrupo = (id, grupoId) => grupos.some((g) => g.id !== grupoId && g.circuitoIds.includes(id))

  return (
    <>
      <h2>Agrupamentos e eletrodutos compartilhados</h2>
      <p>
        Por padrão cada circuito é dimensionado como se estivesse com os demais em feixe (Tabela 42, linha 1). Se circuitos reais dividem o
        mesmo eletroduto, bandeja ou vala, monte o grupo: o fator K2 sai da tabela da forma escolhida e o eletroduto soma todos os condutores.
      </p>
      {grupos.map((grupo) => {
        const resultado = resultados.get(grupo.id)
        const atualizar = (patch) => updateAgrupamento(grupo.id, patch)
        const alternar = (lista, id) => (lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id])
        return (
          <div className="cartao-equipamento" key={grupo.id}>
            <div className="cartao-cabecalho cartao-cabecalho-pequeno">
              <span className="cartao-cabecalho-titulo">{grupo.nome}</span>
              <button type="button" className="botao-remover" aria-label={`Remover ${grupo.nome}`} onClick={() => removeAgrupamento(grupo.id)}>
                ×
              </button>
            </div>
            <div className="grade-campos grade-campos-larga">
              <Campo label="Nome">
                <input type="text" className="campo" value={grupo.nome} onChange={(evento) => atualizar({ nome: evento.target.value })} />
              </Campo>
              <Campo label="Forma de agrupamento">
                <select className="campo" value={grupo.forma} onChange={(evento) => atualizar({ forma: evento.target.value })}>
                  {Object.entries(FORMAS_AGRUPAMENTO).map(([chave, f]) => (
                    <option key={chave} value={chave}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </Campo>
              {grupo.forma === 'enterrado-direto' && (
                <Campo label="Distância entre cabos (Tabela 44)">
                  <select className="campo" value={grupo.espacamento || 'nula'} onChange={(evento) => atualizar({ espacamento: evento.target.value })}>
                    {ESPACAMENTOS_TAB44.map((e) => (
                      <option key={e} value={e}>{e}</option>
                    ))}
                  </select>
                </Campo>
              )}
              {grupo.forma === 'enterrado-eletroduto' && (
                <Campo label="Espaçamento entre eletrodutos (Tabela 45)">
                  <select className="campo" value={grupo.espacamento || 'nulo'} onChange={(evento) => atualizar({ espacamento: evento.target.value })}>
                    {ESPACAMENTOS_TAB45.map((e) => (
                      <option key={e} value={e}>{e}</option>
                    ))}
                  </select>
                </Campo>
              )}
              {grupo.forma === 'multicamadas' && (
                <>
                  <Campo label="Número de camadas">
                    <input type="number" min="2" step="1" className="campo" value={grupo.camadas} onChange={(evento) => atualizar({ camadas: numeroOuVazio(evento.target.value) })} />
                  </Campo>
                  <Campo label="Circuitos por camada">
                    <input type="number" min="2" step="1" className="campo" value={grupo.circuitosPorCamada} onChange={(evento) => atualizar({ circuitosPorCamada: numeroOuVazio(evento.target.value) })} />
                  </Campo>
                </>
              )}
            </div>
            {grupo.forma === 'enterrado-eletroduto' && (
              <label className="campo-checkbox">
                <input type="checkbox" checked={Boolean(grupo.multipolar)} onChange={(evento) => atualizar({ multipolar: evento.target.checked })} />
                Cabos multipolares (subtabela da Tabela 45); desmarcado = condutores isolados ou unipolares
              </label>
            )}
            <label className="campo-checkbox">
              <input type="checkbox" checked={grupo.homogeneo !== false} onChange={(evento) => atualizar({ homogeneo: evento.target.checked })} />
              Condutores semelhantes (seções dentro de três valores normalizados sucessivos); desmarcado vale F = 1/√n
            </label>
            <label className="campo-checkbox">
              <input type="checkbox" checked={Boolean(grupo.eletroduto)} onChange={(evento) => atualizar({ eletroduto: evento.target.checked })} />
              Os circuitos do grupo dividem um mesmo eletroduto
            </label>
            <fieldset className="grade-checks">
              <legend>Circuitos do grupo (cada circuito entra em um grupo só)</legend>
              {calculo.dimensionados.map((c) => (
                <label key={c.id} className="campo-checkbox">
                  <input
                    type="checkbox"
                    disabled={emOutroGrupo(c.id, grupo.id)}
                    checked={grupo.circuitoIds.includes(c.id)}
                    onChange={() => atualizar({ circuitoIds: alternar(grupo.circuitoIds, c.id) })}
                  />
                  {c.nome}
                  {grupo.circuitoIds.includes(c.id) && (
                    <label className="campo-checkbox">
                      <input type="checkbox" checked={grupo.excluidos.includes(c.id)} onChange={() => atualizar({ excluidos: alternar(grupo.excluidos, c.id) })} />
                      ≤ 30% de carga (não conta no número de circuitos)
                    </label>
                  )}
                </label>
              ))}
            </fieldset>
            {resultado && (
              <p className="texto-calculado">
                {resultado.n} circuito(s) contado(s) · fator de agrupamento K2 = {resultado.fator === null ? 'sem valor tabelado (fora da tabela)' : resultado.fator.toFixed(2)}
                {!resultado.semelhante && ' (grupo não semelhante)'}
                {resultado.eletrodutoCalculo?.eletrodutoRecomendado &&
                  ` · eletroduto: ${resultado.eletrodutoCalculo.numeroCondutores} condutores → ${resultado.eletrodutoCalculo.eletrodutoRecomendado.nominalMm} mm (${resultado.eletrodutoCalculo.eletrodutoRecomendado.referencia})`}
              </p>
            )}
            {resultado?.problemas.map((p) => (
              <p key={p} className="texto-alerta">{p}</p>
            ))}
          </div>
        )
      })}
      <button type="button" className="botao-texto" onClick={addAgrupamento}>
        + Adicionar grupo de agrupamento
      </button>
    </>
  )
}

// Catálogo de eletroduto, áreas externas do cabo e quantidade máxima de condutores (semana 8).
export function CatalogoEletroduto() {
  const { projeto, setMapa } = useProjeto()
  const catalogo = CATALOGOS_ELETRODUTO[projeto.catalogoEletroduto] ?? Object.values(CATALOGOS_ELETRODUTO)[0]
  const isolacao = projeto.isolacaoCondutor
  const secoes = secoesComAreaCatalogada(isolacao)
  return (
    <>
      <h2>Eletroduto: catálogo e área dos cabos</h2>
      <div className="grade-campos grade-campos-larga">
        <CampoSelecao
          chave="catalogoEletroduto"
          label="Catálogo de eletroduto"
          ajuda="A NBR 5410 dá só as taxas de ocupação (53% / 31% / 40%). Diâmetros e áreas vêm do catálogo (Creder, tabelas 3.22 e 10.4)."
          opcoes={Object.entries(CATALOGOS_ELETRODUTO).map(([chave, c]) => [chave, c.label])}
        />
      </div>
      <details className="detalhes-calculo">
        <summary>Área externa dos cabos (substituir a do catálogo do Creder)</summary>
        <p>Se o cabo comprado tem área externa diferente, informe-a por seção; vazio usa o valor da tabela 3.22 do Creder.</p>
        <div className="grade-campos">
          {SECOES_NOMINAIS_MM2.map((s) => (
            <Campo key={s} label={`${s} mm²`} unidade="mm²">
              <input type="number" min="0" step="any" className="campo" aria-label={`Área externa do cabo de ${s} mm²`} value={projeto.areasCabo?.[s] ?? ''} onChange={(evento) => setMapa('areasCabo', s, evento.target.value)} />
            </Campo>
          ))}
        </div>
      </details>
      <details className="detalhes-calculo">
        <summary>Quantidade máxima de condutores iguais por eletroduto</summary>
        <div className="tabela-scroll">
          <table className="tabela-resultado">
            <thead>
              <tr>
                <th>Seção</th>
                {catalogo.itens.map((i) => (
                  <th key={i.dn} className="numerico">{i.rosca ?? `${i.dn} mm`}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {secoes.map((s) => (
                <tr key={s}>
                  <td>{s} mm²</td>
                  {catalogo.itens.map((i) => (
                    <td key={i.dn} className="numerico">{quantidadeMaximaCondutores(s, i, { isolacao, areasCabo: projeto.areasCabo })}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="texto-fraco">Maior n com n·A ≤ f(n)·A útil, f = 53% (1 condutor), 31% (2) e 40% (3 ou mais).</p>
      </details>
    </>
  )
}

// Extras de cada circuito: impedância (r, x) e retorno diferente, pontos de carga ao longo do circuito radial,
// queda em volts, partida de motor e "critério térmico" × "dimensionamento completo" (semanas 4, 6 e 8).
export function ExtrasCircuito({ circuito }) {
  const { projeto, setMapa } = useProjeto()
  const imp = projeto.impedancias?.[circuito.id] ?? { rOhmKm: '', xOhmKm: '' }
  const mudarImp = (campo) => (evento) => {
    const novo = { ...imp, [campo]: evento.target.value }
    setMapa('impedancias', circuito.id, novo.rOhmKm === '' && novo.xOhmKm === '' ? '' : novo)
  }
  const pontos = projeto.pontosCarga?.[circuito.id] ?? []
  const salvarPontos = (lista) => setMapa('pontosCarga', circuito.id, lista.length ? lista : '')
  const mudarPonto = (indice, patch) => salvarPontos(pontos.map((p, i) => (i === indice ? { ...p, ...patch } : p)))
  const partida = circuito.partida

  return (
    <>
      <h3 className="secao-titulo">Queda de tensão em detalhe</h3>
      <dl className="fatos">
        <div>
          <dt>Modo de cálculo</dt>
          <dd>{circuito.modoQueda === 'impedancia' ? 'por impedância informada (r, x)' : 'por resistividade'} · {circuito.convencaoResistividade ?? 'operacao'}</dd>
        </div>
        <div>
          <dt>ΔU / admissível</dt>
          <dd>
            {circuito.quedaVolts == null ? '—' : `${circuito.quedaVolts.toFixed(2)} V`} / {circuito.quedaAdmissivelVolts == null ? '—' : `${circuito.quedaAdmissivelVolts.toFixed(2)} V`}
          </dd>
        </div>
        <div>
          <dt>Critério térmico</dt>
          <dd>{circuito.atendeCriterioTermico ? 'atende (corrente e seção mínima)' : 'não atende'}</dd>
        </div>
        <div>
          <dt>Dimensionamento completo</dt>
          <dd>
            {circuito.dimensionamentoCompleto === true
              ? 'sim: queda, sobrecarga, curto-circuito e seccionamento verificados e atendidos'
              : circuito.dimensionamentoCompleto === false
                ? 'não: há verificação reprovada'
                : 'pendente: falta verificar algum item (comprimento, Icc, esquema de aterramento)'}
          </dd>
        </div>
        {partida && (
          <div>
            <dt>Partida do motor (≤ 10%)</dt>
            <dd>
              {partida.informada
                ? `${partida.quedaTotalPercentual.toFixed(2)}% com ${partida.correnteA} A — ${partida.conforme ? 'conforme' : 'NÃO conforme'}`
                : 'pendente: informe a corrente de partida e o comprimento'}
            </dd>
          </div>
        )}
      </dl>

      <div className="bloco-avancado">
        <h4>Impedância, retorno e pontos de carga deste circuito (avançado)</h4>
        <div className="grade-campos">
          <Campo label="r do cabo" unidade="Ω/km" ajuda="Com r e x informados, a queda sai por impedância em vez de resistividade.">
            <input type="number" min="0" step="any" className="campo" aria-label={`r de ${circuito.nome}`} value={imp.rOhmKm} onChange={mudarImp('rOhmKm')} />
          </Campo>
          <Campo label="x do cabo" unidade="Ω/km">
            <input type="number" min="0" step="any" className="campo" aria-label={`x de ${circuito.nome}`} value={imp.xOhmKm} onChange={mudarImp('xOhmKm')} />
          </Campo>
          <Campo label="Seção do retorno (se diferente)" unidade="mm²">
            <input type="number" min="0" step="any" className="campo" aria-label={`Seção do retorno de ${circuito.nome}`} value={projeto.secoesRetorno?.[circuito.id] ?? ''} onChange={(evento) => setMapa('secoesRetorno', circuito.id, evento.target.value)} />
          </Campo>
        </div>
        <h4>Circuito radial com vários pontos de carga</h4>
        <p className="texto-fraco">Com os pontos informados, a queda usa o comprimento equivalente Σ(Iᵢ·Lᵢ)/I (ΔU = Σ ΔUᵢ de cada trecho).</p>
        {pontos.map((ponto, indice) => (
          <div className="grade-campos" key={indice}>
            <Campo label={`Ponto ${indice + 1}: distância do quadro`} unidade="m">
              <input type="number" min="0" step="any" className="campo" aria-label={`Distância do ponto ${indice + 1} de ${circuito.nome}`} value={ponto.distanciaM ?? ''} onChange={(evento) => mudarPonto(indice, { distanciaM: evento.target.value })} />
            </Campo>
            <Campo label={`Ponto ${indice + 1}: corrente`} unidade="A">
              <input type="number" min="0" step="any" className="campo" aria-label={`Corrente do ponto ${indice + 1} de ${circuito.nome}`} value={ponto.correnteA ?? ''} onChange={(evento) => mudarPonto(indice, { correnteA: evento.target.value })} />
            </Campo>
            <button type="button" className="botao-remover" aria-label={`Remover ponto ${indice + 1}`} onClick={() => salvarPontos(pontos.filter((_, i) => i !== indice))}>
              ×
            </button>
          </div>
        ))}
        <button type="button" className="botao-texto" onClick={() => salvarPontos([...pontos, { id: `p${pontos.length + 1}`, distanciaM: '', correnteA: '' }])}>
          + Adicionar ponto de carga
        </button>
      </div>
    </>
  )
}

// Consulta das Tabelas 38 e 39 (métodos E, F e G, cobre): não entra no dimensionamento automático — a ferramenta
// dimensiona pelos métodos A1 a D das Tabelas 36 e 37 — e serve para conferir uma instalação em bandeja ou ao ar livre.
export function ConsultaEFG() {
  const { projeto } = useProjeto()
  const [isolacao, setIsolacao] = useState(projeto.isolacaoCondutor)
  const [secao, setSecao] = useState(25)
  const [formacao, setFormacao] = useState('E-2')
  const [temperatura, setTemperatura] = useState(30)
  const [k2, setK2] = useState(1)
  const r = capacidadeCorrigidaEFG({ isolacao, secaoMm2: secao, formacao, temperaturaC: Number(temperatura), fatorAgrupamento: Number(k2) || 1 })
  return (
    <details className="detalhes-calculo">
      <summary>Consulta de ampacidade: métodos E, F e G (Tabelas 38 e 39, cobre)</summary>
      <p>Só cobre, como no documento. Iz = Iz tabelado × K1 (temperatura do ar, Tabela 40) × K2 (agrupamento, informado por você).</p>
      <div className="grade-campos grade-campos-larga">
        <Campo label="Isolação">
          <select className="campo" value={isolacao} onChange={(evento) => setIsolacao(evento.target.value)}>
            {Object.entries(ISOLACOES).map(([chave, i]) => (
              <option key={chave} value={chave}>{i.label}</option>
            ))}
          </select>
        </Campo>
        <Campo label="Seção">
          <select className="campo" value={secao} onChange={(evento) => setSecao(Number(evento.target.value))}>
            {SECOES_NOMINAIS_MM2.filter((s) => s >= 1.5 && s <= 240).map((s) => (
              <option key={s} value={s}>{s} mm²</option>
            ))}
          </select>
        </Campo>
        <Campo label="Formação dos cabos">
          <select className="campo" value={formacao} onChange={(evento) => setFormacao(evento.target.value)}>
            {Object.entries(FORMACOES_EFG).map(([chave, f]) => (
              <option key={chave} value={chave}>{f.label}</option>
            ))}
          </select>
        </Campo>
        <Campo label="Temperatura do ar" unidade="°C">
          <input type="number" step="5" className="campo" value={temperatura} onChange={(evento) => setTemperatura(evento.target.value)} />
        </Campo>
        <Campo label="Fator de agrupamento K2" ajuda="Das Tabelas 42 e 43.">
          <input type="number" min="0" max="1" step="0.01" className="campo" value={k2} onChange={(evento) => setK2(evento.target.value)} />
        </Campo>
      </div>
      <p className="texto-calculado">
        {r
          ? `Iz tabelado ${r.tabeladaA} A × K1 ${r.k1.toFixed(2)} × K2 ${Number(r.k2).toFixed(2)} = ${r.corrigidaA.toFixed(1)} A`
          : 'Sem valor tabelado para esta combinação (a tabela só tem a seção para a formação escolhida, ou o K1 não existe para essa temperatura).'}
      </p>
      <Nota titulo="Alumínio e outras seções">Só cobre está implementado: o documento do grupo usa cobre. Para alumínio, consulte a norma.</Nota>
    </details>
  )
}
