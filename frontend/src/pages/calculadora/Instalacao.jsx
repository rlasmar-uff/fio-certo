import EtapaCalculadora, { AcoesEtapa } from './EtapaCalculadora.jsx'
import Campo from '../../components/Campo.jsx'
import Nota from '../../components/Nota.jsx'
import { validarNumero } from '../../components/validacao.js'
import { useProjeto } from '../../context/useProjeto.js'
import {
  CONDICOES_ATERRAMENTO_ENTERRADO,
  ESQUEMAS_ATERRAMENTO,
  ISOLACOES,
  METODOS_INSTALACAO,
  TABELA_41_RESISTIVIDADE_SOLO,
  TABELA_MULTIPLICADOR_DISPARO_INSTANTANEO,
  TAXAS_TERCEIRA_HARMONICA,
  TENSOES_FASE_NEUTRO,
  TIPOS_INSTALACAO,
  listarTemperaturasDisponiveis,
  resolverConfigInstalacao,
} from '../../calculations/constantes.js'
import { DISTRIBUIDORAS } from '../../calculations/distribuidoras.js'
import { ROUTES } from '../../routes.js'

export default function Instalacao() {
  const {
    projeto,
    calculo,
    setTipoInstalacao,
    setTensaoFaseNeutro,
    setComprimentoRamalEntrada,
    setMetodoInstalacaoAlimentador,
    setIsolacaoAlimentador,
    setTemperaturaSoloC,
    setResistividadeTermicaSoloKmW,
    setNeutroReduzidoDeclarado,
    setTerceiraHarmonica,
    setIccPresumidaA,
    setIccFaseNeutroA,
    setCurvaDisjuntorGeral,
    setAlimentacaoAerea,
    setRegiaoAltoIndiceDescargas,
    setExposicaoDescargaDireta,
    setEsquemaAterramento,
    setCondicaoAterramento,
    setResistenciaAterramentoOhm,
    setDistribuidoraId,
  } = useProjeto()
  const { numeroFases, tensaoFaseFase } = calculo.configInstalacao
  const secaoFase = calculo.protecaoGeral.condutorFase.secaoMm2
  const neutroPodeReduzir = numeroFases === 3 && secaoFase !== null && secaoFase > 25

  return (
    <EtapaCalculadora
      titulo="Dados da instalação"
      clausulas="§6.2.7.1 · §5.3.5"
      referenciaNorma="Estes dados valem para a instalação inteira: a tensão define a corrente de cada circuito, e o ramal de entrada consome parte do limite total de 5% de queda de tensão a partir do ponto de entrega (§6.2.7.1 c) antes dos circuitos terminais. A Icc presumida habilita a verificação de curto-circuito (§5.3.5)."
    >
      <div className="grade-campos grade-campos-larga">
        <Campo
          label="Tensão fase-neutro na sua região"
          ajuda="A mesma das tomadas comuns. Se não souber, veja na conta de luz."
        >
          <select
            value={projeto.tensaoFaseNeutro}
            onChange={(evento) => setTensaoFaseNeutro(evento.target.value)}
            className="campo"
          >
            {TENSOES_FASE_NEUTRO.map((tensao) => (
              <option key={tensao} value={tensao}>
                {tensao}V {tensao === 127 ? '(mais comum no Brasil)' : '(parte do RJ, PR, SC e outras regiões)'}
              </option>
            ))}
          </select>
        </Campo>

        <Campo
          label="Tipo de instalação"
          ajuda={
            TIPOS_INSTALACAO[projeto.tipoInstalacao].permiteFaseFase
              ? `Fase-fase: ${projeto.tensaoFaseNeutro}V × √3 = ${tensaoFaseFase}V.`
              : undefined
          }
        >
          <select
            value={projeto.tipoInstalacao}
            onChange={(evento) => setTipoInstalacao(evento.target.value)}
            className="campo"
          >
            {Object.entries(TIPOS_INSTALACAO).map(([chave, valor]) => {
              const config = resolverConfigInstalacao(chave, projeto.tensaoFaseNeutro)
              const tensoes = [config.tensaoFaseNeutro, config.tensaoFaseFase].filter(Boolean)
              return (
                <option key={chave} value={chave}>
                  {valor.label} ({tensoes.join('/')}V)
                </option>
              )
            })}
          </select>
        </Campo>

        <Campo
          label="Comprimento do ramal de entrada"
          unidade="m"
          ajuda="Do medidor até o quadro de distribuição."
          erro={validarNumero(projeto.comprimentoRamalEntrada, { obrigatorio: true })}
        >
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.5"
            className="campo"
            value={projeto.comprimentoRamalEntrada}
            onChange={(evento) => setComprimentoRamalEntrada(evento.target.value)}
          />
        </Campo>
      </div>
      {projeto.comprimentoRamalEntrada === '' && (
        <p className="texto-atencao">
          Sem o comprimento do ramal, a queda de tensão do alimentador não é verificada e os circuitos
          recebem o limite cheio de 4%.
        </p>
      )}

      <h2>Aterramento</h2>
      <div className="grade-campos grade-campos-larga">
        <Campo label="Esquema de aterramento" ajuda="Pergunte ao eletricista ou veja o padrão de entrada. Na dúvida, deixe em branco.">
          <select
            className="campo"
            value={projeto.esquemaAterramento}
            onChange={(evento) => setEsquemaAterramento(evento.target.value)}
          >
            <option value="">Não declarado</option>
            {Object.entries(ESQUEMAS_ATERRAMENTO).map(([chave, esquema]) => (
              <option key={chave} value={chave}>
                {esquema.label}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Condutor de aterramento (até o eletrodo)" ajuda="Tabela 52 — define a seção mínima quando enterrado.">
          <select
            className="campo"
            value={projeto.condicaoAterramento}
            onChange={(evento) => setCondicaoAterramento(evento.target.value)}
          >
            <option value="">Não declarado</option>
            {Object.entries(CONDICOES_ATERRAMENTO_ENTERRADO).map(([chave, condicao]) => (
              <option key={chave} value={chave}>
                {condicao.label}
              </option>
            ))}
          </select>
        </Campo>
        {projeto.esquemaAterramento === 'TT' && (
          <Campo
            label="Resistência de aterramento medida (RA)"
            unidade="Ω"
            ajuda={`Opcional. Precisa ser ≤ ${calculo.seccionamento.tt?.raMaximaOhm.toFixed(0)} Ω com DR de 30 mA (UL ${calculo.seccionamento.ulV} V).`}
            erro={validarNumero(projeto.resistenciaAterramentoOhm)}
          >
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="1"
              className="campo"
              value={projeto.resistenciaAterramentoOhm}
              onChange={(evento) => setResistenciaAterramentoOhm(evento.target.value)}
            />
          </Campo>
        )}
      </div>
      <Nota titulo="O que muda com o esquema?">
        <p>
          A letra T/N diz como as massas (carcaças metálicas) se ligam à terra (§4.2.2.2). No TN-C-S,
          neutro e terra chegam juntos num condutor só (PEN), que precisa ter pelo menos 10 mm²
          (§6.4.3.4.1); depois de separados, o neutro nunca mais pode ser religado ao terra
          (§6.4.3.4.3). No TT, a casa tem eletrodo próprio e a proteção contra choque depende do DR.
        </p>
        <p>
          O esquema decide como o seccionamento automático é verificado (§5.1.2.2.4): no TN, pela
          impedância do laço de falta (Zs·Ia ≤ Uo), que precisa da Icc; no TT, pela resistência de
          aterramento (RA·IΔn ≤ UL — 50 V, ou 25 V com banheiro, Anexo C).
        </p>
      </Nota>

      <h2>Curto-circuito (opcional)</h2>
      <div className="grade-campos grade-campos-larga">
        <Campo
          label="Corrente de curto-circuito presumida (Icc)"
          unidade="A"
          ajuda="A maior no ponto de entrega (a trifásica, que a concessionária informa), ou de laudo. Em branco = não verificado."
          erro={validarNumero(projeto.iccPresumidaA, { maiorQueMin: true })}
        >
          <input
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            className="campo"
            value={projeto.iccPresumidaA}
            onChange={(evento) => setIccPresumidaA(evento.target.value)}
          />
        </Campo>
        <Campo
          label="Icc fase-neutro (opcional)"
          unidade="A"
          ajuda="Se a concessionária informar também a fase-neutro. Em branco = usa a de cima."
          erro={validarNumero(projeto.iccFaseNeutroA, { maiorQueMin: true })}
        >
          <input
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            className="campo"
            value={projeto.iccFaseNeutroA}
            disabled={!projeto.iccPresumidaA}
            onChange={(evento) => setIccFaseNeutroA(evento.target.value)}
          />
        </Campo>
        <Campo label="Curva dos disjuntores" ajuda="IEC 60898 — C é a mais comum em residências.">
          <select
            className="campo"
            value={projeto.curvaDisjuntorGeral}
            onChange={(evento) => setCurvaDisjuntorGeral(evento.target.value)}
          >
            {Object.keys(TABELA_MULTIPLICADOR_DISPARO_INSTANTANEO).map((curva) => (
              <option key={curva} value={curva}>
                Curva {curva}
              </option>
            ))}
          </select>
        </Campo>
      </div>
      <Nota titulo="De onde vem a Icc?">
        A corrente de curto-circuito presumida não vem da NBR 5410: depende da rede real, e só a
        concessionária ou um laudo informa. Com ela, a ferramenta verifica o alimentador (§5.3.5.5.2)
        e calcula a Icc em cada circuito terminal por propagação de impedância (§5.3.5.1), fase-neutro
        ou entre duas fases. A norma não traz a conversão entre tipos de falta: a ferramenta toma o
        valor informado como a Icc trifásica, a maior. Se você tiver também a fase-neutro, ela passa a
        valer nos circuitos fase-neutro e no seccionamento. A mesma curva vale para o disjuntor geral e
        para os dos circuitos.
      </Nota>

      <h2>Distribuidora (opcional)</h2>
      <div className="grade-campos grade-campos-larga">
        <Campo
          label="Distribuidora"
          ajuda="Só para comparar com a demanda de iluminação/tomadas que ela calcularia. Não muda o dimensionamento."
        >
          <select className="campo" value={projeto.distribuidoraId} onChange={(evento) => setDistribuidoraId(evento.target.value)}>
            <option value="">nenhuma / não informado</option>
            {Object.entries(DISTRIBUIDORAS).map(([id, distribuidora]) => (
              <option key={id} value={id}>
                {distribuidora.nome}
              </option>
            ))}
          </select>
        </Campo>
      </div>
      <Nota titulo="Para que serve a distribuidora?">
        Cada distribuidora tem sua própria norma de fornecimento, com fator de demanda próprio para
        iluminação e tomadas (algumas não reduzem nada) — não é a mesma coisa em todo o Brasil, e não
        é conteúdo da NBR 5410. A demanda calculada aqui aparece só para comparação no Resultado; o
        alimentador e o disjuntor geral continuam dimensionados pela soma cheia das cargas (mais
        segura). Chuveiro, ar-condicionado e motor ainda não entram nessa conta.
      </Nota>

      <h2>Proteção contra surtos (DPS)</h2>
      <p className="texto-fraco">
        Fatos sobre a instalação real. Na dúvida, deixe desmarcado: o DPS Classe II continua
        recomendado como boa prática.
      </p>
      <label className="campo-checkbox">
        <input
          type="checkbox"
          checked={projeto.alimentacaoAerea}
          onChange={(evento) => setAlimentacaoAerea(evento.target.checked)}
        />
        A instalação é alimentada por linha aérea (total ou parcialmente), ou inclui uma linha aérea.
      </label>
      <label className="campo-checkbox">
        <input
          type="checkbox"
          checked={projeto.regiaoAltoIndiceDescargas}
          onChange={(evento) => setRegiaoAltoIndiceDescargas(evento.target.checked)}
        />
        A região tem mais de 25 dias de trovoada por ano (AQ2/AQ3, Tabela 15).
      </label>
      <label className="campo-checkbox">
        <input
          type="checkbox"
          checked={projeto.exposicaoDescargaDireta}
          onChange={(evento) => setExposicaoDescargaDireta(evento.target.checked)}
        />
        A edificação está exposta a descarga atmosférica direta (isolada, alta ou com para-raios
        próprio) — indica DPS Classe I além da Classe II.
      </label>
      <Nota titulo='O que é a "Tabela 15"?'>
        <p>
          É a Tabela 15 da própria NBR 5410 (§4.2.6.1.12): só 3 códigos de exposição a descargas
          atmosféricas, sem mapa geográfico.
        </p>
        <table className="tabela-resultado">
          <thead>
            <tr>
              <th>Código</th>
              <th>Classificação</th>
              <th>Características</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>AQ1</td>
              <td>Desprezíveis</td>
              <td>—</td>
            </tr>
            <tr>
              <td>AQ2</td>
              <td>Indiretas</td>
              <td>≤ 25 dias de trovoada por ano</td>
            </tr>
            <tr>
              <td>AQ3</td>
              <td>Diretas</td>
              <td>&gt; 25 dias de trovoada por ano — redes aéreas</td>
            </tr>
          </tbody>
        </table>
        <p>
          A norma não diz qual cidade é AQ2 ou AQ3. O mapa isocerâunico vem de outra fonte (INPE/INMET
          ou a NBR 5419), por isso a ferramenta pede para você declarar.
        </p>
      </Nota>

      <details className="detalhes-calculo">
        <summary>Alimentador: condições de instalação (avançado)</summary>
        <div className="grade-campos">
          <Campo label="Método de instalação" ajuda={METODOS_INSTALACAO[projeto.metodoInstalacaoAlimentador].descricao}>
            <select
              className="campo"
              value={projeto.metodoInstalacaoAlimentador}
              onChange={(evento) => setMetodoInstalacaoAlimentador(evento.target.value)}
            >
              {Object.entries(METODOS_INSTALACAO).map(([chave, metodo]) => (
                <option key={chave} value={chave}>
                  {metodo.label}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Isolação" ajuda="Tabela 36 (PVC) ou 37 (EPR/XLPE).">
            <select
              className="campo"
              value={projeto.isolacaoAlimentador}
              onChange={(evento) => setIsolacaoAlimentador(evento.target.value)}
            >
              {Object.entries(ISOLACOES).map(([chave, isolacao]) => (
                <option key={chave} value={chave}>
                  {isolacao.label}
                </option>
              ))}
            </select>
          </Campo>
          {numeroFases === 3 && (
            <Campo label="Taxa de 3ª harmônica e múltiplos" ajuda="Declaração sobre a carga real.">
              <select
                className="campo"
                value={projeto.terceiraHarmonica}
                onChange={(evento) => setTerceiraHarmonica(evento.target.value)}
              >
                {Object.entries(TAXAS_TERCEIRA_HARMONICA).map(([chave, taxa]) => (
                  <option key={chave} value={chave}>
                    {taxa.label}
                  </option>
                ))}
              </select>
            </Campo>
          )}
          {METODOS_INSTALACAO[projeto.metodoInstalacaoAlimentador]?.enterrado && (
            <>
              <Campo label="Temperatura do solo" ajuda="Tabela 40 — padrão: 20°C.">
                <select
                  className="campo"
                  value={projeto.temperaturaSoloC}
                  onChange={(evento) => setTemperaturaSoloC(evento.target.value)}
                >
                  <option value="">Automático (20°C)</option>
                  {listarTemperaturasDisponiveis({ isolacao: projeto.isolacaoAlimentador, enterrado: true }).map(
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

        {numeroFases === 3 && (
          <Nota titulo="Por que declarar a 3ª harmônica?">
            Ela governa dois critérios opostos: acima de 15% o neutro passa a ser condutor carregado
            (fator 0,86, §6.2.5.6.1); até 15%, e só então, o neutro pode ser reduzido pela Tabela 48
            (§6.2.6.2.6). Sem declarar, nenhum dos dois é aplicado. Lâmpadas de descarga,
            fluorescentes e fontes chaveadas costumam passar de 15%.
          </Nota>
        )}
        {METODOS_INSTALACAO[projeto.metodoInstalacaoAlimentador]?.enterrado && (
          <Nota titulo="Método D (enterrado)">
            A ampacidade é referida à temperatura do solo (20°C), não à do ar, e o agrupamento usa a
            Tabela 45, sempre pelo espaçamento "nulo" entre eletrodutos (o mais severo), porque a
            ferramenta não modela a distância física entre eles.
          </Nota>
        )}

        {neutroPodeReduzir && (
          <label className="campo-checkbox">
            <input
              type="checkbox"
              checked={projeto.neutroReduzidoDeclarado}
              onChange={(evento) => setNeutroReduzidoDeclarado(evento.target.checked)}
            />
            Reduzir a seção do neutro (Tabela 48, §6.2.6.2.6) — só marque se valerem: (a) circuito
            trifásico presumivelmente equilibrado; (b) neutro protegido contra sobrecorrente. A 3ª
            condição (3ª harmônica ≤ 15%) é o campo acima.
          </label>
        )}
      </details>

      <AcoesEtapa avancar={ROUTES.comodos} rotuloAvancar="Avançar para cômodos" />
    </EtapaCalculadora>
  )
}
