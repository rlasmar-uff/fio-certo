import { Link } from 'react-router-dom'
import { ROUTES } from '../../routes.js'
import { useProjeto } from '../../context/useProjeto.js'
import { ISOLACOES, METODOS_INSTALACAO } from '../../calculations/constantes.js'
import { TIPOS_PONTO_BANHEIRO } from '../../calculations/locaisEspeciais.js'
import { ClausulaInfo } from '../../components/RefNorma.jsx'

// Saída da proteção geral e do alimentador. As entradas (ramal, Icc, DPS, condições do
// alimentador) ficam na etapa de Instalação.
export default function SecaoProtecaoGeral() {
  const { projeto, calculo } = useProjeto()
  const { protecaoGeral, locaisEspeciais } = calculo
  const { numeroFases } = calculo.configInstalacao
  const {
    correnteEntradaA,
    disjuntorGeralA,
    idr,
    dps,
    condutorFase,
    secaoNeutroMm2,
    neutroReduzido,
    avisoNeutroSuperior,
    verificacaoNeutro,
    secaoTerraMm2,
    curtoCircuito,
    drs,
  } = protecaoGeral

  return (
    <>
      <h2>Proteção geral</h2>
      <div className="tabela-scroll">
        <table className="tabela-resultado tabela-cartoes">
          <thead>
            <tr>
              <th>Dispositivo</th>
              <th className="numerico">Corrente</th>
              <th>Características</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td data-label="Dispositivo">Disjuntor geral</td>
              <td data-label="Corrente" className="numerico">{disjuntorGeralA ? `${disjuntorGeralA} A` : '—'}</td>
              <td data-label="Características">Corrente de projeto (Ib): {correnteEntradaA.toFixed(2)} A</td>
            </tr>
            {(drs.modo === 'geral' || idr) && (
              <tr>
                <td data-label="Dispositivo">{drs.modo === 'geral' ? 'IDR (DR geral)' : 'DR a montante (tipo S)'}</td>
                <td data-label="Corrente" className="numerico">{idr?.correnteA ? `${idr.correnteA} A` : '—'}</td>
                <td data-label="Características" className="celula-quebra">
                  {idr ? (
                    <>
                      {idr.polos} polos · {idr.sensibilidadeMA} mA
                      {idr.tipoS ? (
                        <>
                          {' '}
                          tipo S — seletivo com os DRs de 30 mA (§6.3.6.3.2)
                          <ClausulaInfo clausula="§6.3.6.3.2">
                            Onde há DR a montante e DRs de 30 mA nos circuitos, o de montante precisa ser seletivo
                            (tipo S ou temporizado) — senão os dois podem atuar juntos numa fuga que só o DR do
                            circuito deveria resolver, desligando a instalação inteira por um problema local.
                          </ClausulaInfo>
                        </>
                      ) : (
                        ' (alta sensibilidade)'
                      )}
                    </>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            )}
            {drs.grupos.map((grupo) => (
              <tr key={grupo.numero}>
                <td data-label="Dispositivo">DR {grupo.numero}</td>
                <td data-label="Corrente" className="numerico">{grupo.correnteA ? `${grupo.correnteA} A` : '—'}</td>
                <td data-label="Características" className="celula-quebra">
                  {grupo.polos} polos · {grupo.sensibilidadeMA} mA · {grupo.circuitos.map((circuito) => circuito.nome).join(', ')}
                </td>
              </tr>
            ))}
            <tr>
              <td data-label="Dispositivo">DPS</td>
              <td data-label="Corrente" className="numerico">—</td>
              <td data-label="Características" className="celula-quebra">
                Classe {dps.classe} · Un ≈ {dps.tensaoMaximaOperacaoV} V (fase-neutro/fase-terra, na
                origem da instalação) ·{' '}
                <span className="etiqueta-status" title={dps.motivoExigencia}>
                  {dps.exigidaPelaNorma ? 'exigido pela norma' : 'recomendação'}
                </span>
              </td>
            </tr>
            {locaisEspeciais.possuiBanheiro && (
              <tr>
                <td data-label="Dispositivo">Equipotencialização suplementar (banheiro)</td>
                <td data-label="Corrente" className="numerico">—</td>
                <td data-label="Características" className="celula-quebra">
                  <span className="etiqueta-status">exigido pela norma</span> (§9.1.3.1.2)
                  <ClausulaInfo clausula="§9.1.3.1.2">
                    Reunir massas e elementos condutivos estranhos (tubulações metálicas, box metálico etc.) dos
                    volumes 0 a 3 com uma ligação equipotencial própria, além da equipotencialização principal da
                    instalação.
                  </ClausulaInfo>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {condutorFase.erro ? (
        <p className="texto-alerta">{condutorFase.erro}</p>
      ) : (
        <>
          <h2>Alimentador (ramal de entrada até o quadro geral)</h2>
          <div className="tabela-scroll">
            <table className="tabela-resultado tabela-cartoes">
              <thead>
                <tr>
                  <th>Condutor</th>
                  <th className="numerico">Seção adotada</th>
                  <th className="numerico">Capacidade corrigida (Iz)</th>
                  <th className="numerico">Queda de tensão</th>
                  <th className="numerico">Corrente real (neutro)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td data-label="Condutor">Fase</td>
                  <td data-label="Seção adotada" className="numerico">
                    <strong>{condutorFase.secaoMm2} mm²</strong>
                    {condutorFase.elevadaPeloPisoPratico && (
                      <span className="etiqueta-status" title="Elevada pelo piso prático da concessionária">
                        {' '}
                        piso concessionária
                      </span>
                    )}
                  </td>
                  <td data-label="Capacidade corrigida (Iz)" className="numerico">{condutorFase.ampacidadeA.toFixed(1)} A</td>
                  <td data-label="Queda de tensão" className="numerico">
                    {condutorFase.quedaPercentual === null ? (
                      '—'
                    ) : condutorFase.naoVerificado ? (
                      <span className="etiqueta-status atencao">não verificado</span>
                    ) : (
                      `${condutorFase.quedaPercentual.toFixed(2)}%`
                    )}
                  </td>
                  <td data-label="Corrente real (neutro)" className="numerico">—</td>
                </tr>
                <tr>
                  <td data-label="Condutor">Neutro</td>
                  <td data-label="Seção adotada" className="numerico">
                    <strong>{secaoNeutroMm2} mm²</strong>
                    {neutroReduzido && (
                      <span className="etiqueta-status ok" title="Reduzido pela Tabela 48, §6.2.6.2.6">
                        {' '}
                        reduzido
                      </span>
                    )}
                  </td>
                  <td data-label="Capacidade corrigida (Iz)" className="numerico">
                    {verificacaoNeutro.ampacidadeA === null ? '—' : `${verificacaoNeutro.ampacidadeA.toFixed(1)} A`}
                  </td>
                  <td data-label="Queda de tensão" className="numerico">—</td>
                  <td data-label="Corrente real (neutro)" className="numerico">
                    {verificacaoNeutro.ampacidadeA === null ? (
                      '—'
                    ) : (
                      <span
                        className={`etiqueta-status ${verificacaoNeutro.conforme ? 'ok' : 'alerta'}`}
                        title="Corrente real do neutro, calculada por soma vetorial (§6.2.6.2)"
                      >
                        {verificacaoNeutro.correnteA.toFixed(2)} A
                      </span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td data-label="Condutor">Terra (PE)</td>
                  <td data-label="Seção adotada" className="numerico">
                    <strong>{secaoTerraMm2} mm²</strong>
                  </td>
                  <td data-label="Capacidade corrigida (Iz)" className="numerico">—</td>
                  <td data-label="Queda de tensão" className="numerico">—</td>
                  <td data-label="Corrente real (neutro)" className="numerico">—</td>
                </tr>
              </tbody>
            </table>
          </div>

          {verificacaoNeutro.ampacidadeA !== null && !verificacaoNeutro.conforme && (
            <p className="texto-alerta">
              Atenção: a corrente real do neutro, calculada por soma vetorial ({verificacaoNeutro.correnteA.toFixed(2)}{' '}
              A), excede a capacidade do condutor adotado ({verificacaoNeutro.ampacidadeA.toFixed(1)} A) — reveja a
              seção do neutro{neutroReduzido ? ' ou a declaração de redução (Tabela 48)' : ''}.
            </p>
          )}

          {protecaoGeral.eletroduto && (
            <p className={protecaoGeral.eletroduto.eletrodutoRecomendado ? undefined : protecaoGeral.eletroduto.areaCondutoresMm2 === null ? 'texto-atencao' : 'texto-alerta'}>
              Eletroduto do ramal de entrada: {numeroFases} fase(s) + neutro + terra ={' '}
              {protecaoGeral.eletroduto.numeroCondutores} condutores (§6.2.11.1.6) →{' '}
              <strong>
                {protecaoGeral.eletroduto.eletrodutoRecomendado
                  ? `${protecaoGeral.eletroduto.eletrodutoRecomendado.nominalMm} mm (${protecaoGeral.eletroduto.eletrodutoRecomendado.referencia})`
                  : protecaoGeral.eletroduto.erro}
              </strong>
              {protecaoGeral.eletroduto.eletrodutoRecomendado && '.'}
            </p>
          )}

          {locaisEspeciais.possuiBanheiro && (
            <div className="nota-simplificacao">
              {locaisEspeciais.pontosPorComodo.length > 0 ? (
                <>
                  <p>
                    Pontos elétricos marcados na planta (§9.1.2.1) — banheiro(s): {locaisEspeciais.comodosBanheiro.join(', ')}.
                  </p>
                  <ul>
                    {locaisEspeciais.pontosPorComodo.flatMap((comodoBanheiro) =>
                      comodoBanheiro.pontos.map((ponto) => (
                        <li key={ponto.id}>
                          <strong>
                            {comodoBanheiro.comodoNome} — {ponto.nome}
                          </strong>{' '}
                          ({TIPOS_PONTO_BANHEIRO[ponto.tipo]}, {ponto.alturaM.toLocaleString('pt-BR')} m):{' '}
                          {ponto.volume === null ? 'fora dos volumes' : `volume ${ponto.volume}`} —{' '}
                          <span className={`etiqueta-status ${ponto.conforme ? 'ok' : 'alerta'}`}>
                            {ponto.conforme ? 'conforme' : 'não conforme'}
                          </span>
                          {ponto.motivo && ` — ${ponto.motivo}`} ({ponto.clausula}).
                        </li>
                      )),
                    )}
                  </ul>
                </>
              ) : (
                <>
                  <p>
                    Projeto com banheiro/chuveiro cadastrado ({locaisEspeciais.comodosBanheiro.join(', ')}) — NBR 5410
                    §9.1 divide o local em 4 volumes com grau de proteção (IP) mínimo próprio. A ferramenta não modela
                    a geometria real do ambiente por padrão — para conferir de verdade, marque o chuveiro e os pontos
                    na planta (link na etapa de Cômodos). Sem isso, confira fisicamente cada volume contra o projeto:
                  </p>
                  <ul>
                    {locaisEspeciais.volumes.map((vol) => (
                      <li key={vol.volume}>
                        <strong>Volume {vol.volume}</strong> — {vol.descricao}: grau de proteção mínimo {vol.ipMinimo}.
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <p>
                Nos volumes 0, 1 e 2 não é permitido instalar dispositivo de proteção, seccionamento ou comando
                (inclui tomada) — §9.1.4.3.1. Tomada só no volume 3, com transformador de separação, SELV, ou DR ≤30mA
                — §9.1.4.3.2.
              </p>
            </div>
          )}

          <details className="detalhes-calculo">
            <summary>Ver como cada valor foi calculado</summary>
            <ol className="explicacao-calculo">
              <li>
                Corrente de entrada (Ib): soma vetorial das correntes de cada circuito por fase
                (considera o cosφ de cada circuito e o ângulo de 120° entre fases, não só a soma
                de VA) — por fase:{' '}
                {protecaoGeral.correntePorFaseA.map((corrente) => `${corrente.toFixed(2)} A`).join(' / ')}; a pior
                fase dá <strong>{correnteEntradaA.toFixed(2)} A</strong>.
              </li>
              <li>
                Disjuntor geral (In): menor valor padronizado ≥ Ib → <strong>{disjuntorGeralA} A</strong>.
              </li>
              {drs.modo === 'geral' ? (
                <li>
                  IDR: corrente nominal padronizada ≥ In do disjuntor geral →{' '}
                  <strong>{idr.correnteA} A</strong>, com {idr.polos} polos (número de fases + neutro) e
                  sensibilidade alta ({idr.sensibilidadeMA} mA), exigida pela NBR 5410 §5.1.3.2.2 para
                  circuitos de tomadas em geral e áreas molhadas.
                </li>
              ) : (
                <li>
                  DRs por grupo (30 mA): corrente nominal padronizada ≥ soma dos In dos disjuntores do
                  grupo, limitada ao In do disjuntor geral — critério desta ferramenta para que o DR nunca
                  conduza mais que a proteção a montante deixa passar (§6.3.6.2.2 só exige que ele seja
                  protegido contra sobrecorrente). Polos: fases do grupo + neutro.
                </li>
              )}
              {locaisEspeciais.possuiBanheiro && (
                <li>
                  Locais com banheira/chuveiro ({locaisEspeciais.comodosBanheiro.join(', ')}): o DR de{' '}
                  30 mA que protege os circuitos já atende a exigência de DR ≤30mA para os circuitos desses cômodos
                  (§5.1.3.2.2 a). Falta ainda a equipotencialização suplementar dos volumes 0 a 3 (§9.1.3.1.2),
                  que é uma ligação física e não entra no dimensionamento elétrico.
                </li>
              )}
              <li>
                DPS Classe {dps.classe}, tensão máxima de operação contínua compatível com a rede
                (≈ {dps.tensaoMaximaOperacaoV} V) — {dps.motivoExigencia}. Corrente de descarga e
                quantidade de módulos ficam fora do escopo desta ferramenta, a definir em projeto.
              </li>
              <li>
                Seção mínima normativa do alimentador (circuito de distribuição, cabo isolado):{' '}
                <strong>{condutorFase.secaoMinimaNormativa} mm²</strong> (NBR 5410 §6.2.6.1.1). Por
                padrão, a ferramenta ainda eleva para{' '}
                <strong>{condutorFase.pisoPraticoMm2} mm²</strong> — não por exigência da NBR 5410
                (a Tabela 47 só cita 10 mm² para condutor NU), mas porque é o piso que as normas de
                fornecimento das concessionárias brasileiras exigem na prática.
              </li>
              <li>
                Tabela e coluna usadas: isolação{' '}
                <strong>{ISOLACOES[condutorFase.isolacao]?.label ?? condutorFase.isolacao}</strong> (
                {condutorFase.isolacao === 'epr' ? 'Tabela 37' : 'Tabela 36'}) — este alimentador é{' '}
                {condutorFase.esquema === 'trifasico-com-neutro'
                  ? 'trifásico com neutro'
                  : condutorFase.esquema === 'duas-fases-com-neutro'
                    ? 'duas fases com neutro'
                    : 'monofásico a dois condutores'}
                , ou seja{' '}
                <strong>{condutorFase.condutoresCarregados} condutores carregados</strong> (Tabela
                46, §6.2.5.6) — o condutor de proteção nunca entra nessa contagem. Para{' '}
                {condutorFase.secaoMm2} mm² no método {condutorFase.metodoInstalacao}, essa coluna
                dá <strong>{condutorFase.ampacidadeTabelaA} A</strong> de ampacidade bruta.
                {condutorFase.neutroCarregado && (
                  <>
                    {' '}
                    Como a 3ª harmônica foi declarada acima de 15%, o neutro também conduz: são 4
                    condutores carregados, e a norma manda aplicar o fator 0,86 sobre a coluna de 3
                    (§6.2.5.6.1), já que não existe coluna de 4.
                  </>
                )}
              </li>
              <li>
                Fatores de correção aplicados à ampacidade: temperatura ×{condutorFase.fatorTemperatura.toFixed(2)}{' '}
                (Tabela 40{METODOS_INSTALACAO[condutorFase.metodoInstalacao]?.enterrado ? ', coluna do solo' : ''})
                × agrupamento ×{condutorFase.fatorAgrupamento.toFixed(2)} (
                {METODOS_INSTALACAO[condutorFase.metodoInstalacao]?.referenciaAgrupamento === 'tabela45'
                  ? 'Tabela 45'
                  : METODOS_INSTALACAO[condutorFase.metodoInstalacao]?.referenciaAgrupamento === 'tabela42ref2'
                    ? 'Tabela 42, referência 2'
                    : 'Tabela 42, referência 1'}
                ){condutorFase.fatorResistividadeSolo !== 1 && (
                  <> × resistividade do solo ×{condutorFase.fatorResistividadeSolo.toFixed(2)} (Tabela 41)</>
                )}
                .
              </li>
              <li>
                Seção da fase: a menor que atende simultaneamente à ampacidade corrigida do disjuntor
                geral ({disjuntorGeralA} A) e à queda de tensão total disponível (
                {condutorFase.limitePercentual}% — §6.2.7.1 c, o alimentador consome deste orçamento
                antes dos circuitos terminais) → <strong>{condutorFase.secaoMm2} mm²</strong>, com
                ampacidade corrigida de <strong>{condutorFase.ampacidadeA?.toFixed(1)} A</strong>.
              </li>
              <li>
                Seção do neutro:{' '}
                {neutroReduzido ? (
                  <>
                    reduzida pela Tabela 48 (§6.2.6.2.6), já que a fase ({condutorFase.secaoMm2} mm²)
                    passa de 25 mm² e as 3 condições da norma foram declaradas → <strong>{secaoNeutroMm2} mm²</strong>.
                  </>
                ) : (
                  <>
                    igual à seção da fase (<strong>{secaoNeutroMm2} mm²</strong>) — critério padrão desta
                    ferramenta; só reduz num alimentador trifásico com fase acima de 25 mm² e com a
                    redução declarada explicitamente (etapa de Instalação, "Alimentador: condições
                    de instalação").
                  </>
                )}
              </li>
              {avisoNeutroSuperior && (
                <li className="texto-alerta">
                  Com 3ª harmônica acima de 33%, o §6.2.6.2.5 adverte que o condutor neutro{' '}
                  <strong>pode precisar ser MAIOR</strong> que o de fase — não apenas igual, como
                  calculado acima. O dimensionamento dessa seção maior depende do Anexo F
                  (conteúdo harmônico real das correntes de fase), que esta ferramenta não coleta;
                  trate a seção do neutro acima como não verificada nesse cenário e avalie com um
                  profissional habilitado.
                </li>
              )}
              <li>
                Seção do terra (PE): pela Tabela 58 da NBR 5410, em função da seção de fase
                ({condutorFase.secaoMm2} mm²) → <strong>{secaoTerraMm2} mm²</strong>.
              </li>
              <li>
                Corrente real do neutro (§6.2.6.2): soma vetorial das 3 correntes de fase, não a
                maior fase isolada (a soma vetorial cancela a contribuição de circuitos fase-fase,
                que não usam o neutro, e captura o desequilíbrio real entre as fases fase-neutro) →{' '}
                <strong>{verificacaoNeutro.correnteA.toFixed(2)} A</strong>
                {verificacaoNeutro.ampacidadeA !== null && (
                  <>
                    {' '}
                    — {verificacaoNeutro.conforme ? 'dentro da' : 'ACIMA da'} capacidade do
                    condutor adotado ({verificacaoNeutro.ampacidadeA.toFixed(1)} A).
                  </>
                )}
              </li>
              {protecaoGeral.eletroduto && (
                <li>
                  {protecaoGeral.eletroduto.areaCondutoresMm2 === null ? (
                    <span className="texto-atencao">{protecaoGeral.eletroduto.erro}</span>
                  ) : (
                    <>
                      Eletroduto: {protecaoGeral.eletroduto.numeroCondutores} condutores físicos no
                      trecho ({numeroFases} fase(s) + neutro + terra) ocupando{' '}
                      {protecaoGeral.eletroduto.areaCondutoresMm2.toFixed(1)} mm² — no máximo{' '}
                      {protecaoGeral.eletroduto.taxaMaximaPercentual}% da área útil do eletroduto
                      (§6.2.11.1.6) →{' '}
                      <strong>
                        {protecaoGeral.eletroduto.eletrodutoRecomendado
                          ? `${protecaoGeral.eletroduto.eletrodutoRecomendado.nominalMm} mm (${protecaoGeral.eletroduto.eletrodutoRecomendado.referencia})`
                          : protecaoGeral.eletroduto.erro}
                      </strong>
                      {protecaoGeral.eletroduto.eletrodutoRecomendado && '.'}
                    </>
                  )}
                </li>
              )}
            </ol>

            {condutorFase.trilha?.length > 0 && (
              <div className="tabela-scroll">
                <table className="tabela-resultado tabela-trilha">
                  <thead>
                    <tr>
                      <th className="numerico">Seção</th>
                      <th className="numerico">Iz tabela</th>
                      <th className="numerico">Iz corrigido</th>
                      <th>Atende In ≤ Iz?</th>
                      <th className="numerico">Queda de tensão</th>
                      <th>Atende ao limite?</th>
                      <th>Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {condutorFase.trilha.map((linha) => (
                      <tr key={linha.secao}>
                        <td className="numerico">{linha.secao} mm²</td>
                        <td className="numerico">{linha.ampacidade} A</td>
                        <td className="numerico">{linha.ampacidadeCorrigida.toFixed(1)} A</td>
                        <td>{linha.atendeAmpacidade ? 'sim' : 'não'}</td>
                        <td className="numerico">
                          {linha.quedaPercentual === null ? '—' : `${linha.quedaPercentual.toFixed(2)}%`}
                        </td>
                        <td>{linha.atendeQueda ? 'sim' : 'não'}</td>
                        <td>
                          {linha.secao === condutorFase.secaoMm2 ? (
                            <span className="etiqueta-status ok">adotada</span>
                          ) : linha.aprovada ? (
                            <span className="texto-calculado">atenderia, mas já havia menor</span>
                          ) : (
                            <span className="texto-fraco">rejeitada</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {protecaoGeral.eletroduto?.trilha?.length > 0 && (
              <div className="tabela-scroll">
                <table className="tabela-resultado tabela-trilha">
                  <thead>
                    <tr>
                      <th>Eletroduto</th>
                      <th className="numerico">Área útil</th>
                      <th className="numerico">Ocupação</th>
                      <th>Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {protecaoGeral.eletroduto.trilha.map((linha) => (
                      <tr key={linha.referencia}>
                        <td>
                          {linha.nominalMm} mm ({linha.referencia})
                        </td>
                        <td className="numerico">{linha.areaInternaMm2.toFixed(0)} mm²</td>
                        <td className="numerico">{linha.ocupacaoPercentual.toFixed(1)}%</td>
                        <td>
                          {linha.referencia === protecaoGeral.eletroduto.eletrodutoRecomendado?.referencia ? (
                            <span className="etiqueta-status ok">adotado</span>
                          ) : linha.atende ? (
                            <span className="texto-calculado">atenderia, mas já havia menor</span>
                          ) : (
                            <span className="texto-fraco">ocupação acima do limite</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </details>
        </>
      )}

      {curtoCircuito.verificado ? (
        <p className={curtoCircuito.conforme ? 'texto-calculado' : 'texto-alerta'}>
          Curto-circuito no alimentador (§5.3.5.5.2):{' '}
          {curtoCircuito.conforme
            ? `conforme — o condutor de ${condutorFase.secaoMm2} mm² suporta a energia de curto-circuito com a Icc informada.`
            : curtoCircuito.motivo}
        </p>
      ) : (
        projeto.iccPresumidaA && <p className="texto-atencao">{curtoCircuito.motivo}</p>
      )}

      {drs.avisoIntempestivo && (
        <p className="texto-atencao">
          Um só DR de 30 mA para {calculo.dimensionados.length} circuitos: a fuga normal de todos soma nele, e a norma
          pede que nenhum DR veja mais de 50% de IΔn (15 mA) em funcionamento normal (§6.3.3.2.6). A fuga não é
          calculável aqui — considere dividir em grupos na etapa de <Link to={ROUTES.circuitos}>Circuitos</Link>.
        </p>
      )}
    </>
  )
}
