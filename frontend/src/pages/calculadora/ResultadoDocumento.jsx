import Nota from '../../components/Nota.jsx'
import { useProjeto } from '../../context/useProjeto.js'
import { DISTRIBUIDORAS } from '../../calculations/distribuidoras.js'

const va = (v) => `${Math.round(v)} VA`

// Blocos de resultado das semanas 3 a 8 do compilado: demanda por parcelas, DR por circuito, esquema de conexão
// do DPS, Icn, neutro pelo Anexo F, condutor de proteção e reserva do quadro. Cada bloco só aparece com dados.
export default function ResultadoDocumento() {
  const { projeto, calculo } = useProjeto()
  const { demandaPerfil: d, protecaoGeral: pg, complementares: comp, reservaAlimentador: reserva, dimensionados } = calculo
  const drs = pg.drs
  const distribuidora = DISTRIBUIDORAS[projeto.distribuidoraId]

  return (
    <>
      <h2>Demanda estimada (Creder, tabela 3.20)</h2>
      <div className="tabela-scroll">
        <table className="tabela-resultado">
          <thead>
            <tr>
              <th>Parcela</th>
              <th className="numerico">Carga</th>
              <th className="numerico">Fator</th>
              <th className="numerico">Demanda</th>
            </tr>
          </thead>
          <tbody>
            {d.faixas.map((f) => (
              <tr key={f.de}>
                <td>{f.ate === Infinity ? `acima de ${f.de} VA` : `${f.de} a ${f.ate} VA`}</td>
                <td className="numerico">{va(f.parcelaVA)}</td>
                <td className="numerico">{(f.fator * 100).toFixed(0)}%</td>
                <td className="numerico">{va(f.demandaVA)}</td>
              </tr>
            ))}
            <tr>
              <td>Iluminação e tomadas (D geral)</td>
              <td className="numerico">{va(d.cargaGeralVA)}</td>
              <td className="numerico" />
              <td className="numerico">{va(d.demandaGeralVA)}</td>
            </tr>
            <tr>
              <td>Cargas de uso específico (100%)</td>
              <td className="numerico">{va(d.cargaEspecificaVA)}</td>
              <td className="numerico">100%</td>
              <td className="numerico">{va(d.cargaEspecificaVA)}</td>
            </tr>
            <tr>
              <td><strong>Demanda total</strong></td>
              <td className="numerico" />
              <td className="numerico">{d.fatorEquivalente === null ? '—' : `${(d.fatorEquivalente * 100).toFixed(0)}%`}</td>
              <td className="numerico"><strong>{va(d.demandaTotalVA)}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className={d.estimativaBibliografica ? 'texto-atencao' : 'texto-calculado'}>
        {d.estimativaBibliografica
          ? 'Estimativa bibliográfica: sem distribuidora, documento, revisão e grupo de carga identificados.'
          : `Perfil identificado: ${distribuidora?.nome ?? projeto.distribuidoraId}, ${projeto.demandaDocumento}, rev. ${projeto.demandaRevisao}, ${projeto.demandaGrupo}. Não equivale a aprovação pela concessionária.`}
      </p>
      <details className="detalhes-calculo">
        <summary>Hipóteses da demanda</summary>
        <ul>
          {d.hipoteses.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      </details>

      <h2>Proteção diferencial (DR) por circuito</h2>
      <p>
        {drs.modo === 'exigidos'
          ? 'Modo padrão: DR de 30 mA nos circuitos em que a NBR 5410 o exige (§5.1.3.2.2). O DR é proteção adicional e não substitui o PE.'
          : 'Modo escolhido pelo projetista: DR de 30 mA em todos os circuitos.'}
      </p>
      <div className="tabela-scroll">
        <table className="tabela-resultado">
          <thead>
            <tr>
              <th>Circuito</th>
              <th>DR</th>
              <th>Motivo</th>
            </tr>
          </thead>
          <tbody>
            {dimensionados.map((c) => (
              <tr key={c.id}>
                <td>{c.nome}</td>
                <td>{c.sobDR ? 'sim (30 mA)' : 'não exigido'}</td>
                <td className="celula-quebra">{c.exigenciaDR?.exige ? c.exigenciaDR.motivos.join('; ') : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {comp.capacidadeInterrupcao && (
        <>
          <h2>Capacidade de interrupção (§5.3.5.5.1)</h2>
          <p className={comp.capacidadeInterrupcao.conforme === false ? 'texto-alerta' : 'texto-calculado'}>
            Icc presumida: {comp.capacidadeInterrupcao.geralKA.toFixed(2)} kA na origem
            {comp.capacidadeInterrupcao.terminaisKA !== null && ` e ${comp.capacidadeInterrupcao.terminaisKA.toFixed(2)} kA nos terminais`} · Icn do disjuntor:{' '}
            {comp.capacidadeInterrupcao.icnKA === null ? 'não informada (escolha a linha de disjuntores)' : `${comp.capacidadeInterrupcao.icnKA} kA`}
            {comp.capacidadeInterrupcao.conforme === true && ' — conforme.'}
            {comp.capacidadeInterrupcao.conforme === false && ' — NÃO conforme: use disjuntor de maior capacidade de ruptura.'}
          </p>
        </>
      )}

      <h2>DPS: esquema de conexão e especificação</h2>
      {comp.dps.esquemaConexao ? (
        <p>
          Esquema de conexão {comp.dps.esquemaConexao.esquema}
          {comp.dps.esquemaConexao.obrigatorio && ' (obrigatório: DPS a montante do DR no TT)'}
          {comp.dps.esquemaConexao.alternativo && ` (o esquema ${comp.dps.esquemaConexao.alternativo} também é admitido)`}: {comp.dps.modos.join('; ')}.
        </p>
      ) : (
        <p className="texto-atencao">Esquema de aterramento não declarado: o esquema de conexão do DPS fica pendente.</p>
      )}
      <ul>
        <li>Up ≤ {comp.dps.upMaximoKV} kV; Uc ≥ {comp.dps.ucMinimoFaseV.toFixed(0)} V (fase) e ≥ {comp.dps.ucMinimoNeutroPeV} V (neutro-PE); In ≥ {comp.dps.inMinimoKA} kA por modo.</li>
        {comp.dps.esquema3 && <li>Esquema 3, neutro-PE: In ≥ {comp.dps.inMinimoNeutroPeKA} kA{comp.dps.iimpMinimoNeutroPeKA ? ` e Iimp ≥ ${comp.dps.iimpMinimoNeutroPeKA} kA` : ''}.</li>}
        {comp.dps.iimpMinimoKA && <li>Exposição direta: Iimp ≥ {comp.dps.iimpMinimoKA} kA por modo.</li>}
        <li>Condutor DPS-PE ≥ {comp.dps.secaoCondutorPeMm2} mm², ligações com até {comp.dps.comprimentoLigacoesM} m; corrente subsequente ≥ {comp.dps.correnteSubsequenteMinimaA} A.</li>
        {comp.dps.drDeveSuportar3kA && <li>DPS a jusante de DR: o DR deve suportar surtos de pelo menos 3 kA (8/20 µs), como o tipo S.</li>}
      </ul>

      {pg.neutroHarmonicas?.aplicavel && (
        <>
          <h2>Neutro com 3ª harmônica (Anexo F)</h2>
          <p>
            f<sub>h</sub> = {pg.neutroHarmonicas.fh.toFixed(2)} → I<sub>N</sub> = {pg.neutroHarmonicas.correnteNeutroA.toFixed(1)} A.
          </p>
          <Nota titulo="Verificação complementar">{pg.neutroHarmonicas.nota}</Nota>
        </>
      )}

      {pg.peDetalhe?.secaoMm2 && (
        <>
          <h2>Condutor de proteção do alimentador (PE)</h2>
          <p>
            {pg.peDetalhe.secaoMm2} mm² — {pg.peDetalhe.metodo}. Tabela 58: {pg.peDetalhe.tabela58Mm2} mm²
            {pg.peDetalhe.calculoMm2 !== null && `; cálculo (S ≥ √(I²t)/k, k = ${pg.peDetalhe.kUsado}): ${pg.peDetalhe.calculoMm2} mm²`}
            {pg.peDetalhe.minimoMm2 !== null && `; mínimo fora do cabo: ${pg.peDetalhe.minimoMm2} mm²`}.
          </p>
          {pg.peDetalhe.pendencia && <p className="texto-atencao">{pg.peDetalhe.pendencia}</p>}
        </>
      )}

      <h2>Reserva do quadro (Tabela 59)</h2>
      <p>
        {reserva.circuitos} circuito(s) de reserva.{' '}
        {reserva.considerada
          ? `Cada um entra no alimentador com ${reserva.potenciaPorCircuitoVA} VA.`
          : 'A potência de cada reserva não foi declarada: o alimentador não inclui reserva (informe na etapa Instalação).'}
      </p>
    </>
  )
}
