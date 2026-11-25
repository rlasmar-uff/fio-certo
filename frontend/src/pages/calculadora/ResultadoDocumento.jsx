import Nota from '../../components/Nota.jsx'
import { useProjeto } from '../../context/useProjeto.js'
import { num, decimal } from '../../calculations/formatacao.js'

// Blocos de resultado: DR por circuito, esquema de conexão do DPS, Icn, neutro pelo Anexo F, condutor de proteção
// e reserva do quadro. Cada bloco só aparece com dados.
export default function ResultadoDocumento() {
  const { calculo } = useProjeto()
  const { protecaoGeral: pg, complementares: comp, reservaAlimentador: reserva, dimensionados } = calculo
  const drs = pg.drs

  return (
    <>
      <h2>Proteção diferencial (DR) por circuito</h2>
      <p>
        {drs.modo === 'exigidos'
          ? 'Modo padrão: DR de 30 mA nos circuitos em que a NBR 5410 o exige (§5.1.3.2.2; no TT, todos — §5.1.2.2.4.3 a). O DR é proteção adicional e não substitui o PE.'
          : 'Modo escolhido pelo projetista: DR de 30 mA em todos os circuitos.'}
      </p>
      <div className="tabela-scroll">
        <table className="tabela-resultado">
          <thead>
            <tr>
              <th>Circuito</th>
              <th>DR</th>
              <th>Motivo da exigência</th>
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
            Icc presumida: {num(comp.capacidadeInterrupcao.geralKA, 2)} kA na origem
            {comp.capacidadeInterrupcao.terminaisKA !== null && ` e ${num(comp.capacidadeInterrupcao.terminaisKA, 2)} kA nos terminais`} · Icn do disjuntor:{' '}
            {comp.capacidadeInterrupcao.icnKA === null ? 'não informada (etapa de Instalação)' : `${decimal(comp.capacidadeInterrupcao.icnKA)} kA`}
            {comp.capacidadeInterrupcao.conforme === true && ' — conforme.'}
            {comp.capacidadeInterrupcao.conforme === false && ' — NÃO conforme: use disjuntor de maior capacidade de interrupção.'}
          </p>
        </>
      )}

      <h2>DPS: exigência, esquema de conexão e especificação</h2>
      {!pg.dps.exigidaPelaNorma ? (
        <p>{pg.dps.motivoExigencia}.</p>
      ) : (
        <>
          {comp.dps.esquemaConexao ? (
            <p>
              Exigido ({pg.dps.motivoExigencia}). Esquema de conexão {comp.dps.esquemaConexao.esquema}
              {comp.dps.esquemaConexao.obrigatorio && ' (obrigatório: DPS a montante do DR no TT)'}
              {comp.dps.esquemaConexao.alternativo && ` (o esquema ${comp.dps.esquemaConexao.alternativo} também é admitido)`}: {comp.dps.modos.join('; ')}.
            </p>
          ) : (
            <p className="texto-atencao">Esquema de aterramento não declarado: o esquema de conexão do DPS fica pendente.</p>
          )}
          <ul>
            <li>Up ≤ {decimal(comp.dps.upMaximoKV)} kV; Uc ≥ {num(comp.dps.ucMinimoFaseV, 0)} V (fase) e ≥ {comp.dps.ucMinimoNeutroPeV} V (neutro-PE); In ≥ {decimal(comp.dps.inMinimoKA)} kA por modo.</li>
            {comp.dps.esquema3 && <li>Esquema 3, neutro-PE: In ≥ {decimal(comp.dps.inMinimoNeutroPeKA)} kA{comp.dps.iimpMinimoNeutroPeKA ? ` e Iimp ≥ ${decimal(comp.dps.iimpMinimoNeutroPeKA)} kA` : ''}.</li>}
            {comp.dps.iimpMinimoKA && <li>Exposição direta: Iimp ≥ {decimal(comp.dps.iimpMinimoKA)} kA por modo.</li>}
            <li>Condutor DPS-PE ≥ {decimal(comp.dps.secaoCondutorPeMm2)} mm², ligações com até {decimal(comp.dps.comprimentoLigacoesM)} m; corrente subsequente ≥ {comp.dps.correnteSubsequenteMinimaA} A.</li>
            {comp.dps.drDeveSuportar3kA && <li>DPS a jusante de DR: o DR deve suportar surtos de pelo menos 3 kA (8/20 µs), como o tipo S.</li>}
          </ul>
        </>
      )}

      {pg.neutroHarmonicas?.aplicavel && (
        <>
          <h2>Neutro com 3ª harmônica (Anexo F)</h2>
          <p>
            f<sub>h</sub> = {num(pg.neutroHarmonicas.fh, 2)} → I<sub>N</sub> = {num(pg.neutroHarmonicas.correnteNeutroA, 1)} A.
          </p>
          <Nota titulo="Verificação complementar">{pg.neutroHarmonicas.nota}</Nota>
        </>
      )}

      {pg.peDetalhe?.secaoMm2 && (
        <>
          <h2>Condutor de proteção do alimentador (PE)</h2>
          <p>
            {decimal(pg.peDetalhe.secaoMm2)} mm² — {pg.peDetalhe.metodo}. Tabela 58: {decimal(pg.peDetalhe.tabela58Mm2)} mm²
            {pg.peDetalhe.calculoMm2 !== null && `; cálculo (S ≥ √(I²t)/k, k = ${pg.peDetalhe.kUsado}): ${decimal(pg.peDetalhe.calculoMm2)} mm²`}
            {pg.peDetalhe.minimoMm2 !== null && `; mínimo fora do cabo: ${decimal(pg.peDetalhe.minimoMm2)} mm²`}.
          </p>
        </>
      )}

      <h2>Reserva do quadro (Tabela 59)</h2>
      <p>
        {reserva.circuitos} circuito(s) de reserva.{' '}
        {reserva.considerada
          ? `Cada um entra no alimentador com ${reserva.potenciaPorCircuitoVA} VA (Tabela 59, nota).`
          : 'A potência de cada reserva não foi declarada: o alimentador não inclui reserva (informe na etapa Instalação).'}
      </p>
    </>
  )
}
