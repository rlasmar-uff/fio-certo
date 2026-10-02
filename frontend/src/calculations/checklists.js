// Listas de verificação da NBR 5410 que não são cálculo: prática de execução, comissionamento e
// entrega. Cada item cita a cláusula; os itens condicionais só entram quando se aplicam ao projeto
// (esquema de aterramento, banheiro, circuitos em duas tensões, DR). Texto conferido no PDF.

export const ADVERTENCIA_QUADRO = [
  '1. Quando um disjuntor ou fusível atua, desligando algum circuito ou a instalação inteira, a causa pode ser uma sobrecarga ou um curto-circuito. Desligamentos freqüentes são sinal de sobrecarga. Por isso, NUNCA troque seus disjuntores ou fusíveis por outros de maior corrente (maior amperagem) simplesmente. Como regra, a troca de um disjuntor ou fusível por outro de maior corrente requer, antes, a troca dos fios e cabos elétricos, por outros de maior seção (bitola).',
  '2. Da mesma forma, NUNCA desative ou remova a chave automática de proteção contra choques elétricos (dispositivo DR), mesmo em caso de desligamentos sem causa aparente. Se os desligamentos forem freqüentes e, principalmente, se as tentativas de religar a chave não tiverem êxito, isso significa, muito provavelmente, que a instalação elétrica apresenta anomalias internas, que só podem ser identificadas e corrigidas por profissionais qualificados. A DESATIVAÇÃO OU REMOÇÃO DA CHAVE SIGNIFICA A ELIMINAÇÃO DE MEDIDA PROTETORA CONTRA CHOQUES ELÉTRICOS E RISCO DE VIDA PARA OS USUÁRIOS DA INSTALAÇÃO.',
]

const INSPECAO_VISUAL = [
  'medidas de proteção contra choques elétricos (5.1)',
  'medidas de proteção contra efeitos térmicos (5.2)',
  'seleção e instalação das linhas elétricas (6.2)',
  'seleção, ajuste e localização dos dispositivos de proteção (6.3)',
  'presença, adequação e localização dos dispositivos de seccionamento e comando (5.6 e 6.3)',
  'adequação às influências externas (5.2.2, 6.1.3.2, 6.2.4, seção 9 e anexo C)',
  'identificação dos componentes (6.1.5)',
  'presença das instruções, sinalizações e advertências requeridas',
  'execução das conexões (6.2.8)',
  'acessibilidade (4.1.10 e 6.1.4)',
]

const item = (texto, clausula) => ({ texto, clausula })

export function montarChecklists(projeto, calculo) {
  const esquema = calculo.seccionamento.esquema
  const possuiBanheiro = calculo.locaisEspeciais.possuiBanheiro
  const duasTensoes = calculo.dimensionados.some((circuito) => circuito.ehFaseFase)
  const drs = calculo.protecaoGeral.drs
  const seccTnCalculado =
    (esquema === 'TN-S' || esquema === 'TN-C-S') && calculo.dimensionados.every((circuito) => circuito.seccionamento?.verificado)

  const comissionamento = [
    item('Inspeção visual antes dos ensaios, com a instalação desenergizada, cobrindo no mínimo: ' + INSPECAO_VISUAL.join('; ') + '.', '§7.2.1, §7.2.3'),
    item('Continuidade dos condutores de proteção e das equipotencializações principal e suplementares — fonte de 4 V a 24 V, corrente de ensaio ≥ 0,2 A.', '§7.3.2'),
    item('Resistência de isolamento entre condutores vivos dois a dois e entre cada vivo e a terra, com os equipamentos desconectados: 500 V cc e ≥ 0,5 MΩ (circuitos até 500 V); SELV 250 V cc e ≥ 0,25 MΩ. Com eletrônicos no circuito, medir só entre a terra e os demais condutores interligados; DPS incompatíveis com a tensão de ensaio podem ser desconectados.', '§7.3.3, Tab. 60, §6.3.5.2.7'),
  ]
  if (esquema === 'TT') {
    comissionamento.push(item(`Medir a resistência de aterramento das massas (RA ≤ ${calculo.seccionamento.tt.raMaximaOhm.toFixed(0)} Ω) e ensaiar os DR.`, '§7.3.5.2'))
  } else if (esquema) {
    comissionamento.push(
      item(
        seccTnCalculado
          ? 'Seccionamento automático: a medição de Zs pode ser dispensada, porque o cálculo está disponível (neste memorial) — desde que se confira em obra o comprimento e a seção dos condutores. Ensaiar os DR.'
          : 'Seccionamento automático: medir a impedância do percurso da falta (Zs) — o cálculo não ficou completo neste projeto — e ensaiar os DR.',
        '§7.3.5.1',
      ),
    )
  } else {
    comissionamento.push(item('Seccionamento automático: definir o esquema de aterramento e verificar conforme §7.3.5 (TN: Zs; TT: RA), e ensaiar os DR.', '§7.3.5'))
  }
  comissionamento.push(
    item('Ensaio de funcionamento do quadro e dos dispositivos de proteção (inclusive o botão de teste dos DR).', '§7.3.7'),
    item('Em qualquer não conformidade, corrigir e repetir o ensaio e todos os anteriores que ele possa ter influenciado.', '§7.3.1.2'),
  )

  const quadro = [
    item('Afixar a advertência obrigatória (texto abaixo), de modo que não seja facilmente removível.', '§6.5.4.10, §6.5.4.11'),
    item(`Espaço de reserva para ao menos ${calculo.complementares.reservaQuadro.reservaMinima} circuito(s).`, '§6.5.4.7, Tab. 59'),
    item('Nenhum dispositivo unipolar no neutro de circuito polifásico; em circuito monofásico, só se houver DR a montante.', '§6.3.2.2'),
    item('O condutor de proteção nunca é seccionado.', '§5.6.2.2'),
    item(
      'DPS a jusante de DR: o DR precisa ter imunidade a surto ≥ 3 kA (8/20 µs) — o tipo S atende.' +
        (esquema === 'TT' ? ' No TT, DPS a montante do DR deve usar o esquema de conexão 3.' : ''),
      '§6.3.5.2.6 b',
    ),
    item('Reapertar as conexões em até 90 dias após a entrada em operação e depois em intervalos regulares.', '§8.3.2.2 NOTA'),
  ]
  if (drs.modo === 'geral' && drs.avisoIntempestivo) {
    quadro.push(item('Com um só DR, conferir que a fuga normal da instalação fica abaixo de 50% de IΔn (15 mA); se não, dividir em grupos.', '§6.3.3.2.6'))
  }

  const condutores = [
    item('Neutro em azul-claro.', '§6.1.5.3.1'),
    item('Condutor de proteção em verde-amarelo ou verde (cores exclusivas dessa função).', '§6.1.5.3.2'),
    item('Todas as tomadas fixas com contato de aterramento (PE), conforme ABNT NBR 6147 e NBR 14136.', '§6.5.3.1'),
  ]
  if (esquema === 'TN-C-S') condutores.push(item('PEN em azul-claro com anilhas verde-amarelo nos pontos visíveis ou acessíveis.', '§6.1.5.3.3'))
  if (duasTensoes) condutores.push(item('Tomadas de tensão mais elevada marcadas com a tensão (placa ou adesivo no espelho).', '§6.5.3.2'))

  const aterramento = [
    item('Eletrodo de aterramento: de preferência as armaduras do concreto das fundações; ou fitas/barras/cabos imersos no concreto; ou malha enterrada; no mínimo, anel enterrado no perímetro da edificação.', '§6.4.1.1.1'),
    item('Proibido usar canalização metálica de água ou de outras utilidades como eletrodo.', '§6.4.1.1.4'),
    item('Eletrodo acessível junto a cada ponto de entrada de condutores e utilidades.', '§6.4.1.1.5'),
    item(
      'BEP junto ao ponto de entrada da alimentação, reunindo: armaduras e estruturas metálicas; tubulações metálicas (água, gás, esgoto, ar-condicionado); condutos, blindagens e PE das linhas que entram/saem; interligações de outros eletrodos' +
        (esquema === 'TT' ? '' : '; o neutro da alimentação') +
        '; o PE principal da instalação. Condutores desconectáveis só com ferramenta.',
      '§6.4.2.1.1, §6.4.2.1.3, §6.4.2.1.4',
    ),
    item('Etiqueta "Conexão de segurança — Não remova" nas conexões das armaduras e tubulações (e no BEP, se acessível), não facilmente removível.', '§6.4.2.1.5'),
  ]

  const grupos = [
    { titulo: 'Comissionamento (verificação final)', itens: comissionamento },
    { titulo: 'Quadro de distribuição', itens: quadro },
    { titulo: 'Condutores e tomadas', itens: condutores },
    { titulo: 'Aterramento e equipotencialização principal', itens: aterramento },
  ]
  if (possuiBanheiro) {
    // Com pontos marcados na planta (VolumesBanheiro.jsx), o checklist genérico dá lugar à
    // verificação real, ponto a ponto — ver `verificarPontosBanheiro` (locaisEspeciais.js).
    const pontosPorComodo = calculo.locaisEspeciais.pontosPorComodo ?? []
    grupos.push({
      titulo: 'Banheiro',
      itens: [
        ...(pontosPorComodo.length === 0
          ? [
              item('Nenhum dispositivo de proteção, seccionamento ou comando (inclui tomada) nos volumes 0, 1 e 2.', '§9.1.4.3.1'),
              item('Tomada só no volume 3, com transformador de separação, SELV ou DR ≤ 30 mA.', '§9.1.4.3.2'),
              item('Volume 0 só com SELV ≤ 12 V.', '§9.1.3.1.1'),
            ]
          : pontosPorComodo.flatMap((comodo) =>
              comodo.pontos.map((ponto) =>
                item(
                  `${comodo.comodoNome} — ${ponto.nome}: ${ponto.volume === null ? 'fora dos volumes' : `volume ${ponto.volume}`}` +
                    (ponto.motivo ? ` — ${ponto.motivo}.` : ' — conforme.'),
                  ponto.clausula,
                ),
              ),
            )),
        item('Equipotencialização suplementar ligando massas e elementos condutivos dos volumes 0 a 3.', '§9.1.3.1.2'),
      ],
    })
  }
  const { piscina, sauna } = calculo.locaisEspeciais
  if (piscina) {
    grupos.push({
      titulo: 'Piscina',
      itens: [
        ...piscina.volumes.map((v) => item(`Volume ${v.volume} (${v.descricao}): ${v.ipMinimo}; ${v.regra}.`, v.volume === 2 ? '§9.2.4.1, §9.2.4.3.3' : '§9.2.4.1, §9.2.3.1.1')),
        item('Fonte de SELV ou de separação elétrica fora dos volumes 0, 1 e 2.', '§9.2.3.1.1 b), §9.2.3.1.2'),
        item('Nos volumes 0, 1 e 2, linhas sem revestimento metálico acessível.', '§9.2.4.2.2'),
        item('Equipotencialização suplementar reunindo os elementos condutivos e os PE das massas dos volumes 0, 1 e 2.', '§9.2.3.1.4'),
        item('Luminárias subaquáticas conforme a IEC 60598-2-18.', '§9.2.4.4.1'),
      ],
    })
  }
  if (sauna) {
    grupos.push({
      titulo: 'Sauna',
      itens: sauna.regras.map((regra) => item(regra.texto, regra.clausula)),
    })
  }
  grupos.push({
    titulo: 'Uso e manutenção',
    itens: [
      item('Avaliar se uma queda ou falta de tensão (e a volta dela) pode causar perigo às pessoas ou dano à instalação e aos equipamentos. Se sim, prever proteção — por exemplo, relé ou disparador de subtensão, ou contator com contato auxiliar de autoalimentação.', '§5.5.1, §5.5.2'),
    ],
  })
  return grupos
}
