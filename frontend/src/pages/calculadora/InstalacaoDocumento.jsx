import Campo from '../../components/Campo.jsx'
import Nota from '../../components/Nota.jsx'
import { CampoMarcar, CampoNumero, CampoSelecao, CampoTexto } from '../../components/CamposProjeto.jsx'
import { useProjeto } from '../../context/useProjeto.js'
import { FORNECIMENTOS, LINHAS_DISJUNTOR } from '../../calculations/constantes.js'
import { CONVENCOES_RESISTIVIDADE } from '../../calculations/quedaDeTensao.js'
import { PERFIS_DEMANDA } from '../../calculations/demanda.js'
import { MANEIRAS_INSTALAR, metodoDaManeira } from '../../calculations/agrupamento.js'

// Painéis das semanas 6 a 8 do compilado do Grupo de Pesquisa: limites de queda, convenção de resistividade,
// modo por impedância, dispositivos (linha, Icn, I₂/In), PE por cálculo, DPS (classe AQ), neutro e demanda.
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

      <h2>Dispositivos de proteção (§5.3, §5.1.3.2, semana 7)</h2>
      <div className="grade-campos grade-campos-larga">
        <CampoSelecao
          chave="linhaDisjuntor"
          label="Linha de disjuntores"
          ajuda="A NBR 5410 não lista correntes nominais: elas vêm do catálogo (Creder, tabela 4.4). A linha define as correntes disponíveis e a capacidade de ruptura Icn."
          opcoes={Object.entries(LINHAS_DISJUNTOR).map(([chave, l]) => [chave, l.label])}
        />
        {projeto.linhaDisjuntor === 'serie' && (
          <CampoNumero chave="icnDisjuntorKA" label="Icn do disjuntor (opcional)" unidade="kA" ajuda="Sem linha de fabricante, informe a capacidade de ruptura para compará-la com a Icc presumida (§5.3.5.5.1)." />
        )}
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
          ajuda="AC: só correntes senoidais. A: também com componente contínua. B: também corrente contínua lisa. Escolha pela carga."
          opcoes={[['AC', 'AC'], ['A', 'A'], ['B', 'B']]}
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

      {numeroFases >= 2 && (
        <>
          <h2>Neutro e 3ª harmônica (§6.2.6.2)</h2>
          {numeroFases === 3 && projeto.neutroReduzidoDeclarado && (
            <>
              <CampoMarcar chave="neutroEquilibrado">O circuito é presumivelmente equilibrado em serviço normal (6.2.6.2.6 a).</CampoMarcar>
              <CampoMarcar chave="neutroProtegido">O neutro é protegido contra sobrecorrentes (6.2.6.2.6 c, conforme 5.3.2.2).</CampoMarcar>
            </>
          )}
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

      <h2>Demanda (semana 3, §8–9)</h2>
      <div className="grade-campos grade-campos-larga">
        <CampoSelecao
          chave="perfilDemanda"
          label="Perfil de demanda"
          ajuda="O perfil de Creder (tabela 3.20) é bibliográfico e didático, aplicado por parcelas de carga. Cargas de uso específico ficam a 100%."
          opcoes={Object.entries(PERFIS_DEMANDA).map(([chave, p]) => [chave, p.label])}
        />
        <CampoTexto chave="demandaDocumento" label="Documento de demanda" ajuda="Para deixar de ser 'estimativa bibliográfica': identifique distribuidora (acima), documento, revisão e grupo de carga." />
        <CampoTexto chave="demandaRevisao" label="Revisão do documento" />
        <CampoTexto chave="demandaGrupo" label="Grupo de carga abrangido" />
      </div>
      <Nota titulo="O que a demanda faz e não faz">
        A demanda é uma estimativa da carga simultânea e não reduz pontos de tomada nem a potência nominal de equipamentos. A
        ferramenta continua dimensionando o alimentador pela carga cheia (lado seguro): a demanda não fornece, sozinha, a corrente de cada
        fase.
      </Nota>
    </>
  )
}
