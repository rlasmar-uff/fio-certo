import Campo from '../../components/Campo.jsx'
import Nota from '../../components/Nota.jsx'
import { CampoMarcar, CampoNumero, CampoSelecao } from '../../components/CamposProjeto.jsx'
import { useProjeto } from '../../context/useProjeto.js'
import { FORNECIMENTOS } from '../../calculations/constantes.js'
import { CONVENCOES_RESISTIVIDADE } from '../../calculations/quedaDeTensao.js'
import { MANEIRAS_INSTALAR, metodoDaManeira } from '../../calculations/agrupamento.js'

// Painéis das semanas 6 a 8 do compilado do Grupo de Pesquisa: limites de queda, convenção de resistividade,
// modo por impedância, dispositivos (Icn, I₂/In, tipo do DR), PE por cálculo, DPS (classe AQ) e neutro.
export default function InstalacaoDocumento() {
  const { projeto, setCampo, calculo } = useProjeto()
  const numeroFases = calculo.configInstalacao.numeroFases
  const impedancia = projeto.impedanciaAlimentador ?? { rOhmKm: '', xOhmKm: '' }
  const aoMudarImpedancia = (campo) => (evento) => setCampo('impedanciaAlimentador', { ...impedancia, [campo]: evento.target.value })

  return (
    <>
      <h2>Queda de tensão: fornecimento, resistividade e impedância (§6.2.7)</h2>
      <div className="grade-campos grade-campos-larga">
        <CampoSelecao
          chave="fornecimento"
          label="Situação de alimentação"
          ajuda="Define o limite total de queda (§6.2.7.1). Nos casos de 7% vale o acréscimo de 0,005 ponto percentual por metro de linha principal acima de 100 m, até 0,5 ponto (o ramal de entrada conta como linha principal); o acréscimo não vale no caso de 5% nem nos circuitos terminais (limite de 4%)."
          opcoes={Object.entries(FORNECIMENTOS).map(([chave, f]) => [chave, f.label])}
        />
        <CampoSelecao
          chave="convencaoResistividade"
          label="Resistência do condutor"
          ajuda="Cabo real: use a resistência na temperatura de operação. A convenção didática (ρ = 1/58) serve para reproduzir os exemplos do compilado e despreza a reatância."
          opcoes={Object.entries(CONVENCOES_RESISTIVIDADE).map(([chave, c]) => [chave, c.label])}
        />
        <Campo label="r do alimentador (opcional)" unidade="Ω/km" ajuda="Modo por impedância: informe r e x do cabo; a rotina usa um modo ou o outro, nunca os dois. Não aplique a correção de temperatura se o r do fabricante já estiver corrigido.">
          <input type="number" inputMode="decimal" min="0" step="any" className="campo" value={impedancia.rOhmKm} onChange={aoMudarImpedancia('rOhmKm')} />
        </Campo>
        <Campo label="x do alimentador (opcional)" unidade="Ω/km" ajuda="Reatância por quilômetro. Os dois campos precisam estar preenchidos para valer.">
          <input type="number" inputMode="decimal" min="0" step="any" className="campo" value={impedancia.xOhmKm} onChange={aoMudarImpedancia('xOhmKm')} />
        </Campo>
      </div>

      <h2>Maneira de instalar do alimentador (Tabela 33)</h2>
      <div className="grade-campos grade-campos-larga">
        <Campo label="Maneira de instalar" ajuda="Primeiro identifique a maneira real; dela sai o método de referência. Os números (1, 7, 11, 61…) são maneiras; A1 a D são modelos térmicos.">
          <select
            className="campo"
            value={projeto.maneiraAlimentador}
            onChange={(evento) => {
              setCampo('maneiraAlimentador', evento.target.value)
              setCampo('metodoInstalacaoAlimentador', metodoDaManeira(evento.target.value) ?? 'B1')
            }}
          >
            {MANEIRAS_INSTALAR.map((m) => (
              <option key={m.codigo} value={m.codigo}>
                {m.codigo} → {m.metodo} — {m.descricao}
              </option>
            ))}
          </select>
        </Campo>
      </div>

      <h2>Dispositivos de proteção (§5.3, §5.1.3.2, §6.3.3.2)</h2>
      <div className="grade-campos grade-campos-larga">
        <CampoNumero
          chave="icnDisjuntorKA"
          label="Icn dos disjuntores (opcional)"
          unidade="kA"
          ajuda="Capacidade de interrupção do disjuntor que será comprado (característica do produto). É comparada com a Icc presumida no ponto de instalação (§5.3.5.5.1)."
        />
        <CampoSelecao
          chave="tipoDispositivo"
          label="Tipo do dispositivo de sobrecarga"
          ajuda="I₂/In é característica do dispositivo: 1,45 para disjuntor conforme a NBR NM 60898. Fusível gG (I₂ > 1,45·In) ou outro dispositivo exige a relação do fabricante."
          opcoes={[['disjuntor-nm60898', 'Disjuntor NBR NM 60898 (I₂ = 1,45·In)'], ['outro', 'Outro dispositivo (informar I₂/In)']]}
        />
        {projeto.tipoDispositivo === 'outro' && <CampoNumero chave="relacaoI2InOutro" label="Relação I₂/In do fabricante" />}
        <CampoSelecao
          chave="tipoDR"
          label="Tipo do DR"
          ajuda="§6.3.3.2.2: onde a corrente de falta pode ter componente contínua, só DR que a detecte (tipo A, nota). §6.3.3.2.3: tipo AC só onde não se prevê falta não senoidal."
          opcoes={[['A', 'A'], ['AC', 'AC'], ['B', 'B']]}
        />
      </div>
      <CampoMarcar chave="sobrecargaProlongada">
        A sobrecarga pode durar mais de 100 h em 12 meses ou 500 h na vida do condutor (5.3.4.1, nota): vale I₂ ≤ Iz no lugar de I₂ ≤ 1,45·Iz.
      </CampoMarcar>

      <h2>Condutor de proteção (PE, §6.4.3.1)</h2>
      <div className="grade-campos grade-campos-larga">
        <CampoNumero chave="peFaltaA" label="Corrente de falta presumida (opcional)" unidade="A" ajuda="Com a corrente e o tempo, o PE também é calculado por S ≥ √(I²·t)/k e vale o maior entre o cálculo e a Tabela 58." />
        <CampoNumero chave="peTempoS" label="Tempo de atuação (opcional)" unidade="s" ajuda="Tempo do dispositivo de proteção, de no máximo 5 s." />
      </div>
      <CampoMarcar chave="peForaDoCabo">O PE passa fora do cabo e do conduto das fases (6.4.3.1.4): mínimo de 2,5 mm² com proteção mecânica e 4 mm² sem.</CampoMarcar>
      {projeto.peForaDoCabo && <CampoMarcar chave="peProtecaoMecanica">O PE tem proteção contra danos mecânicos.</CampoMarcar>}

      {numeroFases >= 2 && projeto.terceiraHarmonica === 'acima-33' && (
        <>
          <h2>Neutro e 3ª harmônica (§6.2.6.2, Anexo F)</h2>
          {projeto.terceiraHarmonica === 'acima-33' && (
            <div className="grade-campos grade-campos-larga">
              <CampoNumero chave="h3Percentual" label="Taxa de 3ª harmônica estimada (opcional)" unidade="%" ajuda="Anexo F: com a taxa, a ferramenta calcula a corrente de neutro; sem ela, usa f = 1,73 (3F+N) ou 1,41 (2F+N). É verificação complementar — o neutro não é dimensionado automaticamente." />
            </div>
          )}
        </>
      )}

      <h2>DPS (§5.4.2, §6.3.5.2)</h2>
      <div className="grade-campos grade-campos-larga">
        <CampoSelecao
          chave="classeAQ"
          label="Classe AQ de descargas atmosféricas"
          ajuda="Tabela 15: AQ1 = sem exigência; AQ2 = mais de 25 dias de trovoada por ano; AQ3 = exposição direta dos componentes. DPS é obrigatório com linha aérea e AQ2, ou em AQ3."
          opcoes={[['AQ1', 'AQ1'], ['AQ2', 'AQ2 (mais de 25 dias de trovoada por ano)'], ['AQ3', 'AQ3 (exposição direta)']]}
        />
      </div>
      <CampoMarcar chave="dpsMontanteDoDR">O DPS fica a montante do DR (no TT, isso obriga o esquema de conexão 3, 6.3.5.2.6 b).</CampoMarcar>

      <Nota titulo="Fator de demanda">
        A NBR 5410 manda considerar a possibilidade de não-simultaneidade (§4.2.1.1.2), mas não traz tabela de fatores
        de demanda. A ferramenta dimensiona o alimentador pela carga cheia (fator 1,00), e o memorial registra esse fator
        como parâmetro de projeto (§6.1.8.1 f).
      </Nota>
    </>
  )
}
