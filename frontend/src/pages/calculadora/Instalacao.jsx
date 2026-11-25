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
import { CampoMarcar, CampoTexto } from '../../components/CamposProjeto.jsx'
import { ROUTES } from '../../routes.js'
import InstalacaoDocumento from './InstalacaoDocumento.jsx'
import { num } from '../../calculations/formatacao.js'

export default function Instalacao() {
  const {
    projeto,
    calculo,
    setTipoInstalacao,
    setTensaoFaseNeutro,
    setComprimentoRamalEntrada,
    setIsolacaoAlimentador,
    setTemperaturaSoloC,
    setResistividadeTermicaSoloKmW,
    setNeutroReduzidoDeclarado,
    setTerceiraHarmonica,
    setIccPresumidaA,
    setIccFaseNeutroA,
    setPotenciaReservaPorCircuitoVA,
    setCurvaDisjuntorGeral,
    setAlimentacaoAerea,
    setRegiaoAltoIndiceDescargas,
    setExposicaoDescargaDireta,
    setEsquemaAterramento,
    setCondicaoAterramento,
    setResistenciaAterramentoOhm,
  } = useProjeto()
  const { numeroFases, tensaoFaseFase } = calculo.configInstalacao
  const secaoFase = calculo.protecaoGeral.condutorFase.secaoMm2
  const neutroPodeReduzir = numeroFases === 3 && secaoFase !== null && secaoFase > 25

  return (
    <EtapaCalculadora
      titulo="Dados da instalação"
      clausulas="§6.2.7.1 · §5.3.5"
      referenciaNorma={`Estes dados valem para a instalação inteira: a tensão define a corrente de cada circuito, e o ramal de entrada consome parte do limite total de ${calculo.limiteQuedaTotalPercentual.toLocaleString('pt-BR')}% de queda de tensão (§6.2.7.1) antes dos circuitos terminais. A Icc presumida habilita a verificação de curto-circuito (§5.3.5).`}
    >
      <h2>Identificação (memorial, §6.1.8.1)</h2>
      <div className="grade-campos grade-campos-larga">
        <CampoTexto chave="cliente" label="Cliente (opcional)" />
        <CampoTexto chave="endereco" label="Endereço da instalação (opcional)" />
        <CampoTexto chave="responsavelTecnico" label="Responsável técnico (opcional)" />
        <CampoTexto chave="registroProfissional" label="Registro profissional (CREA/CFT, opcional)" />
        <CampoTexto chave="numeroART" label="Nº da ART/TRT (opcional)" />
        <CampoTexto chave="revisao" label="Revisão do documento" />
      </div>

      <h2>Alimentação</h2>
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
                {tensao} V
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
          recebem o limite cheio de 4% (§6.2.7.2).
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
            ajuda={`Opcional. Precisa ser ≤ ${num(calculo.seccionamento.tt?.raMaximaOhm, 0)} Ω com DR de 30 mA (UL ${calculo.seccionamento.ulV} V).`}
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
        <Campo
          label="Potência de cada circuito de reserva (opcional)"
          unidade="VA"
          ajuda="Tabela 59: a reserva do quadro deve entrar no cálculo do alimentador. Em branco = reserva NÃO considerada (fica como pendência)."
          erro={validarNumero(projeto.potenciaReservaPorCircuitoVA, { maiorQueMin: true })}
        >
          <input
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            className="campo"
            value={projeto.potenciaReservaPorCircuitoVA}
            onChange={(evento) => setPotenciaReservaPorCircuitoVA(evento.target.value)}
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

      <h2>Proteção contra surtos (DPS)</h2>
      <p className="texto-fraco">
        Fatos sobre a instalação real. A NBR 5410 exige DPS com alimentação aérea em região AQ2, ou em
        região AQ3 (§5.4.2.1.1); fora disso ele não é exigido.
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
        A região tem mais de 25 dias de trovoada por ano (AQ2, Tabela 15).
      </label>
      <label className="campo-checkbox">
        <input
          type="checkbox"
          checked={projeto.exposicaoDescargaDireta}
          onChange={(evento) => setExposicaoDescargaDireta(evento.target.checked)}
        />
        A edificação está exposta a descarga atmosférica direta (isolada, alta ou com para-raios
        próprio) — o DPS precisa também de corrente de impulso Iimp (§6.3.5.2.1 b, §6.3.5.2.4 d).
      </label>
      <Nota titulo='O que é a "Tabela 15"?'>
        <p>
          É a Tabela 15 da própria NBR 5410 (§4.2.6.1.12): três códigos de exposição a descargas
          atmosféricas, sem mapa geográfico.
        </p>
        <table className="tabela-resultado">
          <thead>
            <tr>
              <th>Código</th>
              <th>Classificação</th>
              <th>Características</th>
              <th>Aplicações e exemplos</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>AQ1</td>
              <td>Desprezíveis</td>
              <td>≤ 25 dias por ano</td>
              <td>—</td>
            </tr>
            <tr>
              <td>AQ2</td>
              <td>Indiretas</td>
              <td>&gt; 25 dias por ano; riscos provenientes da rede de alimentação</td>
              <td>Instalações alimentadas por redes aéreas</td>
            </tr>
            <tr>
              <td>AQ3</td>
              <td>Diretas</td>
              <td>Riscos provenientes da exposição dos componentes da instalação</td>
              <td>Partes da instalação situadas no exterior das edificações</td>
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
            (§6.2.6.2.6). Sem declarar, nenhum dos dois é aplicado. A norma cita como exemplo de
            taxa acima de 15% circuitos de luminárias com lâmpadas de descarga, incluindo as
            fluorescentes; e acima de 33%, circuitos que alimentam principalmente computadores
            (§6.2.6.2.3 e §6.2.6.2.5, notas).
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
          <fieldset className="grade-checks">
            <legend>Neutro reduzido (Tabela 48, §6.2.6.2.6) — as três condições valem ao mesmo tempo</legend>
            <label className="campo-checkbox">
              <input
                type="checkbox"
                checked={projeto.neutroReduzidoDeclarado}
                onChange={(evento) => setNeutroReduzidoDeclarado(evento.target.checked)}
              />
              Reduzir a seção do neutro do alimentador
            </label>
            {projeto.neutroReduzidoDeclarado && (
              <>
                <CampoMarcar chave="neutroEquilibrado">a) o circuito é presumivelmente equilibrado em serviço normal</CampoMarcar>
                <CampoMarcar chave="neutroProtegido">c) o neutro é protegido contra sobrecorrentes (§5.3.2.2)</CampoMarcar>
                <p className="texto-fraco">b) a taxa de 3ª harmônica e múltiplos não passa de 15%: declare no campo acima.</p>
              </>
            )}
          </fieldset>
        )}
      </details>

      <InstalacaoDocumento />

      <AcoesEtapa avancar={ROUTES.comodos} rotuloAvancar="Avançar para cômodos" />
    </EtapaCalculadora>
  )
}
