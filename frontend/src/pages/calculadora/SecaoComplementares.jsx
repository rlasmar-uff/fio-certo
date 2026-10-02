import { Link } from 'react-router-dom'
import { useProjeto } from '../../context/useProjeto.js'
import { ESQUEMAS_ATERRAMENTO } from '../../calculations/constantes.js'
import { ROUTES } from '../../routes.js'
import { ClausulaInfo } from '../../components/RefNorma.jsx'

const kA = (valor) => `${valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kA`
const kw = (valor) => `${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kW`

function Linha({ item, clausula, status, rotulo, children }) {
  return (
    <tr>
      <td data-label="Item">
        <strong>{item}</strong>
        <span className="texto-fraco">
          {' '}
          · {clausula}
          {clausula !== '—' && <ClausulaInfo clausula={clausula}>{children}</ClausulaInfo>}
        </span>
      </td>
      <td data-label="Requisito" className="celula-quebra">
        {children}
      </td>
      <td data-label="Situação">
        <span className={`etiqueta-status ${status}`}>{rotulo}</span>
      </td>
    </tr>
  )
}

// Verificações da NBR 5410 que não mudam seções nem disjuntores: requisitos mínimos para
// especificar a compra e conferências que dependem de declarações do usuário.
export default function SecaoComplementares() {
  const { calculo } = useProjeto()
  const { complementares: c, dimensionados, protecaoGeral } = calculo
  const secc = calculo.seccionamento
  const tn = {
    conformes: dimensionados.filter((circuito) => circuito.seccionamento?.conforme === true).length,
    naoConformes: dimensionados.filter((circuito) => circuito.seccionamento?.conforme === false).length,
    naoVerificados: dimensionados.filter((circuito) => circuito.seccionamento && !circuito.seccionamento.verificado).length,
  }
  const sobrecargaOk = dimensionados.every((circuito) => circuito.sobrecarga?.conforme !== false) && protecaoGeral.sobrecarga?.conforme !== false

  return (
    <>
      <h2>Verificações complementares</h2>
      <div className="tabela-scroll">
        <table className="tabela-resultado tabela-cartoes">
          <thead>
            <tr>
              <th>Item</th>
              <th>Requisito</th>
              <th>Situação</th>
            </tr>
          </thead>
          <tbody>
            <Linha
              item="Esquema de aterramento"
              clausula="§4.2.2.2"
              status={c.esquemaAterramento ? '' : 'atencao'}
              rotulo={c.esquemaAterramento ?? 'não declarado'}
            >
              {c.esquemaAterramento ? (
                ESQUEMAS_ATERRAMENTO[c.esquemaAterramento].label
              ) : (
                <>
                  Declare na etapa de <Link to={ROUTES.instalacao}>Instalação</Link>.
                </>
              )}
            </Linha>

            {secc.esquema === 'TT' && (
              <Linha
                item="Seccionamento automático (TT)"
                clausula="§5.1.2.2.4.3"
                status={secc.tt.verificado ? (secc.tt.conforme ? 'ok' : 'alerta') : 'atencao'}
                rotulo={secc.tt.verificado ? (secc.tt.conforme ? 'conforme' : 'não conforme') : 'medir RA'}
              >
                RA·IΔn ≤ UL: com DR de 30 mA e UL {secc.ulV} V{secc.ulV === 25 ? ' (banheiro = situação 2)' : ''}, RA ≤{' '}
                <strong>{secc.tt.raMaximaOhm.toFixed(0)} Ω</strong>.{secc.tt.motivo && ` ${secc.tt.motivo}`}
              </Linha>
            )}

            {(secc.esquema === 'TN-S' || secc.esquema === 'TN-C-S') && (
              <Linha
                item="Seccionamento automático (TN)"
                clausula="§5.1.2.2.4.2 d"
                status={tn.naoConformes ? 'alerta' : tn.naoVerificados ? 'atencao' : 'ok'}
                rotulo={tn.naoConformes ? 'não conforme' : tn.naoVerificados ? 'não verificado' : 'conforme'}
              >
                Zs·Ia ≤ Uo no ponto mais distante. Circuitos: {tn.conformes} conforme(s)
                {tn.naoVerificados > 0 && `, ${tn.naoVerificados} não verificado(s)`}
                {tn.naoConformes > 0 && `, ${tn.naoConformes} não conforme(s)`} — pelo DR de 30 mA (Zs ≤{' '}
                {(calculo.configInstalacao.tensaoFaseNeutro / 0.03).toFixed(0)} Ω) ou pelo disjuntor. Alimentador (só o
                disjuntor geral):{' '}
                {secc.alimentador.verificado
                  ? secc.alimentador.conforme
                    ? `conforme, falta de ${secc.alimentador.correnteFaltaA.toFixed(0)} A ≥ ${secc.alimentador.iaDisjuntorA} A.`
                    : secc.alimentador.motivo
                  : secc.alimentador.motivo}
              </Linha>
            )}

            {c.pen && (
              <Linha item="Condutor PEN" clausula="§6.4.3.4.1" status={c.pen.conforme ? 'ok' : 'alerta'} rotulo={c.pen.conforme ? 'conforme' : 'não conforme'}>
                Trecho PEN (alimentador) com {c.pen.secaoMm2} mm² — mínimo {c.pen.secaoMinimaMm2} mm² em cobre. Depois da
                separação, o neutro não pode ser religado ao terra (§6.4.3.4.3).
              </Linha>
            )}

            <Linha
              item="Capacidade de interrupção"
              clausula="§5.3.5.5.1"
              status={c.capacidadeInterrupcao ? '' : 'atencao'}
              rotulo={c.capacidadeInterrupcao ? 'especificar' : 'falta a Icc'}
            >
              {c.capacidadeInterrupcao ? (
                <>
                  Disjuntor geral: Icn ≥ <strong>{kA(c.capacidadeInterrupcao.geralKA)}</strong>
                  {c.capacidadeInterrupcao.terminaisKA && (
                    <>
                      {' '}
                      · disjuntores dos circuitos: Icn ≥ <strong>{kA(c.capacidadeInterrupcao.terminaisKA)}</strong> (Icc no quadro)
                    </>
                  )}
                </>
              ) : (
                <>
                  A capacidade de interrupção do disjuntor deve ser ≥ Icc presumida no ponto. Informe a Icc na etapa de{' '}
                  <Link to={ROUTES.instalacao}>Instalação</Link>.
                </>
              )}
            </Linha>

            <Linha item="Sobrecarga: I₂ ≤ 1,45·Iz" clausula="§5.3.4.1 b" status={sobrecargaOk ? 'ok' : 'alerta'} rotulo={sobrecargaOk ? 'conforme' : 'não conforme'}>
              Com disjuntor IEC 60898 (I₂ = 1,45·In), equivale a In ≤ Iz — conferido em todos os circuitos e no alimentador.
            </Linha>

            {calculo.demandaConcessionaria && (
              <Linha item="Demanda pela distribuidora (informativo)" clausula="—" status="" rotulo="não é NBR 5410">
                {calculo.demandaConcessionaria.aplicavel ? (
                  <>
                    Iluminação e tomadas: carga instalada {kw(calculo.demandaConcessionaria.cargaInstaladaKw)} ×
                    fator de demanda {(calculo.demandaConcessionaria.fatorDemanda * 100).toFixed(0)}% ={' '}
                    <strong>{kw(calculo.demandaConcessionaria.demandaKw)}</strong>
                    {calculo.demandaConcessionaria.semReducao && ' (a norma desta distribuidora não reduz carga residencial)'}, segundo{' '}
                    {calculo.demandaConcessionaria.distribuidora.nome} ({calculo.demandaConcessionaria.distribuidora.documento}). O
                    alimentador e o disjuntor geral continuam dimensionados pela soma cheia das cargas, sem redução — só
                    iluminação/tomadas entram nesta comparação; chuveiro, ar-condicionado e motor ainda não.
                  </>
                ) : (
                  <>
                    {calculo.demandaConcessionaria.distribuidora.nome} {calculo.demandaConcessionaria.motivo} — sem valor para
                    mostrar aqui.
                  </>
                )}
              </Linha>
            )}

            <Linha item="Equipotencialização principal" clausula="§6.4.4.1.1" status="" rotulo="especificar">
              {c.equipotencializacao.principalMm2 ? (
                <>
                  Condutores ligados ao BEP: ≥ <strong>{c.equipotencializacao.principalMm2} mm²</strong> (metade do maior PE,{' '}
                  {c.equipotencializacao.maiorPeMm2} mm²; mínimo 6, limite 25).
                </>
              ) : (
                '—'
              )}
            </Linha>

            {c.equipotencializacao.suplementar && (
              <Linha item="Equipotencialização suplementar (banheiro)" clausula="§6.4.4.1.2" status="" rotulo="especificar">
                Massa × elemento condutivo (tubulação, box metálico): ≥ <strong>{c.equipotencializacao.suplementar.massaElementoMm2} mm²</strong>
                {c.equipotencializacao.suplementar.semProtecaoMecanicaMm2 > c.equipotencializacao.suplementar.massaElementoMm2
                  ? ` com proteção mecânica, ≥ ${c.equipotencializacao.suplementar.semProtecaoMecanicaMm2} mm² sem`
                  : ''}
                . Massa × massa: ≥ o menor PE das duas.
              </Linha>
            )}

            {calculo.locaisEspeciais.piscina && (
              <Linha item="Piscina" clausula="§9.2.3.1.4 · §9.2.4.3.3" status="" rotulo="especificar">
                {calculo.locaisEspeciais.piscina.comodos.join(', ')}: equipotencialização suplementar dos volumes 0, 1 e 2
                obrigatória; volumes 0 e 1 só com SELV até 12 V. No volume 2, todos os circuitos já estão sob DR de 30 mA.
              </Linha>
            )}

            {calculo.locaisEspeciais.sauna && (
              <Linha
                item="Sauna"
                clausula="§9.4.4"
                status={calculo.locaisEspeciais.sauna.comTomada.length ? 'alerta' : calculo.locaisEspeciais.sauna.aquecedores.length ? 'atencao' : ''}
                rotulo={calculo.locaisEspeciais.sauna.comTomada.length ? 'não conforme' : calculo.locaisEspeciais.sauna.aquecedores.length ? 'confira' : 'especificar'}
              >
                {calculo.locaisEspeciais.sauna.comTomada.length > 0 && (
                  <>Tomada informada em {calculo.locaisEspeciais.sauna.comTomada.join(', ')}: a norma não admite tomada na sauna (§9.4.4.3.2). </>
                )}
                {calculo.locaisEspeciais.sauna.aquecedores.length > 0 && (
                  <>
                    No volume 3, o cabo do aquecedor precisa de isolação para 170 °C (§9.4.4.1.4). A ferramenta dimensiona só PVC
                    (70 °C) e EPR/XLPE (90 °C): use o cabo indicado pelo fabricante do aquecedor nesse trecho.{' '}
                  </>
                )}
                IP24 em todos os componentes; desligamento automático do aquecedor acima de 140 °C no volume 4.
              </Linha>
            )}

            <Linha
              item="Condutor de aterramento"
              clausula="§6.4.1.2.1 · Tab. 52"
              status={c.condutorAterramento?.condicao ? '' : 'atencao'}
              rotulo={c.condutorAterramento?.condicao ? 'especificar' : 'não declarado'}
            >
              {c.condutorAterramento?.condicao ? (
                <>
                  ≥ <strong>{c.condutorAterramento.secaoMm2} mm²</strong> em cobre ({c.condutorAterramento.condicao.label.toLowerCase()}; nunca
                  abaixo do PE do alimentador, {c.condutorAterramento.secaoPeAlimentadorMm2} mm²).
                </>
              ) : (
                <>
                  Enterrado: cobre ≥ 2,5 mm² (protegido contra corrosão e danos mecânicos), 16 mm² (só contra corrosão) ou 50 mm² (sem
                  proteção contra corrosão). Declare a condição na etapa de <Link to={ROUTES.instalacao}>Instalação</Link>.
                </>
              )}
            </Linha>

            <Linha item="Condutor de proteção fora do eletroduto" clausula="§6.4.3.1.4" status="" rotulo="conferir">
              PE que não siga no mesmo cabo ou eletroduto das fases: ≥ 2,5 mm² com proteção mecânica, ≥ 4 mm² sem.
            </Linha>

            <Linha item="DPS — especificação mínima" clausula="§6.3.5.2.4 · §6.3.5.2.9" status="" rotulo="especificar">
              Up ≤ <strong>{c.dps.upMaximoKV.toLocaleString('pt-BR')} kV</strong> · Uc ≥{' '}
              <strong>{Math.ceil(c.dps.ucMinimoFaseV)} V</strong> (fase-neutro/PE; neutro-PE ≥ {c.dps.ucMinimoNeutroPeV} V) · In ≥{' '}
              <strong>{c.dps.inMinimoKA} kA</strong> por modo ({c.dps.inMinimoNeutroPeKA} kA no neutro-PE, esquema de conexão 3)
              {c.dps.iimpMinimoKA && (
                <>
                  {' '}
                  · Iimp ≥ <strong>{c.dps.iimpMinimoKA.toLocaleString('pt-BR')} kA</strong> por modo
                </>
              )}{' '}
              · condutor DPS-PE ≥ <strong>{c.dps.secaoCondutorPeMm2} mm²</strong> · ligações de preferência ≤{' '}
              {c.dps.comprimentoLigacoesM.toLocaleString('pt-BR')} m no total.
            </Linha>

            <Linha item="Reserva no quadro" clausula="§6.5.4.7 · Tab. 59" status="" rotulo="especificar">
              {c.reservaQuadro.circuitos} circuito(s) → prever espaço para pelo menos <strong>{c.reservaQuadro.reservaMinima}</strong> circuito(s)
              de reserva. A norma pede que essa reserva entre no cálculo do alimentador, mas não diz com quantos VA.
            </Linha>

            {c.bancadas.map((bancada) => (
              <Linha
                key={bancada.comodoId}
                item={`Tomadas na bancada — ${bancada.nome || 'cozinha'}`}
                clausula="§9.5.2.2.1 b"
                status={bancada.conforme === null ? 'atencao' : bancada.conforme ? 'ok' : 'alerta'}
                rotulo={bancada.conforme === null ? 'não informado' : bancada.conforme ? 'conforme' : 'não conforme'}
              >
                Pelo menos 2 tomadas acima da bancada da pia
                {bancada.informado ? ` — cadastradas: ${bancada.quantidade}.` : '. Informe no cômodo, na etapa de '}
                {!bancada.informado && <Link to={ROUTES.comodos}>Cômodos</Link>}
                {!bancada.informado && '.'}
              </Linha>
            ))}

            {c.motores.map((motor) => (
              <Linha
                key={`${motor.comodo}-${motor.nome}`}
                item={`Partida de motor — ${motor.nome}`}
                clausula="§6.5.1.2.1"
                status="atencao"
                rotulo="consultar"
              >
                Equipamento indutivo de {(motor.potenciaW / 1000).toLocaleString('pt-BR')} kW (acima de 3,7 kW): em partida direta, consulte a
                distribuidora local.
              </Linha>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
