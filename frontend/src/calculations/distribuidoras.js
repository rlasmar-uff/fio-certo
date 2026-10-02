// N18 — fator de demanda por distribuidora (fonte externa à NBR 5410, ver PLANO.md decisão 6
// revista em 29/09/2026, e a extração literal de cada PDF oficial em
// QA/referencias/fator-demanda-concessionarias.md, com o número de linha de origem de cada valor).
//
// Escopo desta versão: só ILUMINAÇÃO E TOMADAS (§9.5.2). É a única categoria de carga que mapeia
// direto para o que a ferramenta já soma por cômodo (`previsaoDeCarga.js`), sem precisar separar
// chuveiro/ar-condicionado/motor dentro dos equipamentos de uso específico cadastrados — o modelo
// de dados de hoje não marca cada TUE com essa categoria. Chuveiro, ar-condicionado e motor ficam
// de fora por ora (`FUTURO.md`).
//
// Informativo, nunca substitui o dimensionamento por NBR 5410 (soma total das cargas, sem redução)
// que a ferramenta já faz: é esse, não a demanda da distribuidora, que dimensiona o alimentador e o
// disjuntor geral. A demanda da distribuidora aparece só para comparação, com a fonte citada.
//
// Cada tabela abaixo é a de fator de demanda de iluminação/tomadas RESIDENCIAL de uma distribuidora,
// por faixa de carga instalada (kW), em degraus cumulativos (`ateKw`: até esse valor, inclusive).
export const DISTRIBUIDORAS = {
  cpfl: {
    nome: 'CPFL (Paulista, Piratininga, Santa Cruz)',
    documento: 'DIST-13-2026-RE-NOR, versão 46.0, publicação 19/03/2026, Tabela 3',
    tabelaIluminacaoTomadas: [
      { ateKw: 1, fd: 0.86 },
      { ateKw: 2, fd: 0.75 },
      { ateKw: 3, fd: 0.66 },
      { ateKw: 4, fd: 0.59 },
      { ateKw: 5, fd: 0.52 },
      { ateKw: 6, fd: 0.45 },
      { ateKw: 7, fd: 0.4 },
      { ateKw: 8, fd: 0.35 },
      { ateKw: 9, fd: 0.31 },
      { ateKw: 10, fd: 0.27 },
      { ateKw: Infinity, fd: 0.24 },
    ],
  },
  edpSp: {
    nome: 'EDP São Paulo',
    documento: 'PT.DT.PDN.03.14.020, versão 06, vigência 23/03/2022, Tabela 005',
    // Mesma curva da CPFL/Neoenergia — ver a nota de "família comum" em fator-demanda-concessionarias.md.
    tabelaIluminacaoTomadas: [
      { ateKw: 1, fd: 0.86 },
      { ateKw: 2, fd: 0.75 },
      { ateKw: 3, fd: 0.66 },
      { ateKw: 4, fd: 0.59 },
      { ateKw: 5, fd: 0.52 },
      { ateKw: 6, fd: 0.45 },
      { ateKw: 7, fd: 0.4 },
      { ateKw: 8, fd: 0.35 },
      { ateKw: 9, fd: 0.31 },
      { ateKw: 10, fd: 0.27 },
      { ateKw: Infinity, fd: 0.24 },
    ],
  },
  neoenergia: {
    nome: 'Neoenergia (Coelba, Celpe, Cosern, Elektro, Neoenergia Brasília)',
    documento: 'DIS-NOR-030, revisão 07, aprovada 17/04/2026, Tabela 6',
    // Idêntica à CPFL e à EDP SP, conferida linha a linha.
    tabelaIluminacaoTomadas: [
      { ateKw: 1, fd: 0.86 },
      { ateKw: 2, fd: 0.75 },
      { ateKw: 3, fd: 0.66 },
      { ateKw: 4, fd: 0.59 },
      { ateKw: 5, fd: 0.52 },
      { ateKw: 6, fd: 0.45 },
      { ateKw: 7, fd: 0.4 },
      { ateKw: 8, fd: 0.35 },
      { ateKw: 9, fd: 0.31 },
      { ateKw: 10, fd: 0.27 },
      { ateKw: Infinity, fd: 0.24 },
    ],
  },
  cemig: {
    nome: 'Cemig (MG)',
    documento: 'ND-5.1, Tabela 10',
    tabelaIluminacaoTomadas: [
      { ateKw: 1, fd: 0.86 },
      { ateKw: 2, fd: 0.81 },
      { ateKw: 3, fd: 0.76 },
      { ateKw: 4, fd: 0.72 },
      { ateKw: 5, fd: 0.68 },
      { ateKw: 6, fd: 0.64 },
      { ateKw: 7, fd: 0.6 },
      { ateKw: 8, fd: 0.57 },
      { ateKw: 9, fd: 0.54 },
      { ateKw: 10, fd: 0.52 },
      { ateKw: Infinity, fd: 0.45 },
    ],
    // §7.3.1.5 f): piso de Icn do disjuntor do padrão de entrada, independente da Icc real do
    // ponto — nunca recomendar abaixo disso na área da Cemig. Mono/bi/tripolar até 125 A: 5 kA a
    // 127 V (4,5 kA a 230 V); a partir de 125 A (bi/tripolar): 10 kA a 220/230 V.
    icnMinimoGeralKA: (correnteA) => (correnteA >= 125 ? 10 : 5),
  },
  light: {
    nome: 'Light (RJ)',
    documento: 'RECON-BT 2026, item 3.1.2.2, Tabela 6.3',
    // A extração do PDF não deu o valor de forma inequívoca acima de 9 unidades de carga (a última
    // faixa saiu ambígua entre 24% e 27%) — a tabela para aqui; acima disso fica "não conferido".
    tabelaIluminacaoTomadas: [
      { ateKw: 1, fd: 0.8 },
      { ateKw: 2, fd: 0.75 },
      { ateKw: 3, fd: 0.65 },
      { ateKw: 4, fd: 0.6 },
      { ateKw: 5, fd: 0.5 },
      { ateKw: 6, fd: 0.45 },
      { ateKw: 7, fd: 0.4 },
      { ateKw: 8, fd: 0.35 },
      { ateKw: 9, fd: 0.3 },
    ],
  },
  equatorial: {
    nome: 'Equatorial (Pará, Maranhão, Piauí, Alagoas, Goiás, Amapá, CEEE-RS)',
    documento: 'NT.00001.EQTL, revisão 09, homologada 22/05/2025, Tabela 5',
    // Não distingue casa de edifício de apartamentos — mesma linha ("Residências e Edifícios de
    // Apartamentos") para as duas.
    tabelaIluminacaoTomadas: [
      { ateKw: 10, fd: 1.0 },
      { ateKw: 120, fd: 0.35 },
      { ateKw: Infinity, fd: 0.25 },
    ],
  },
  celesc: {
    nome: 'Celesc (SC)',
    documento: 'N-321.0001, aprovada 12/11/2025',
    // Não há tabela de fator de demanda para instalação residencial individual no documento — o
    // padrão de entrada é dimensionado pela carga instalada direta (Tabelas 01/02).
    semReducaoResidencial: true,
  },
  edpEs: {
    nome: 'EDP Espírito Santo',
    documento: 'PT.DT.PDN.00061, versão 12, vigência 06/04/2023',
    // Mesmo achado da Celesc: o §5.4 soma a carga instalada direta, sem tabela de redução para
    // residência (a "Tabela 6 – Fatores de Utilização" do documento só cobre outros tipos de
    // instalação — auditório, banco, escola etc. — residência não é uma linha dela).
    semReducaoResidencial: true,
  },
  enel: {
    nome: 'Enel (São Paulo, Rio de Janeiro, Ceará)',
    documento: 'Especificação Técnica nº 0017, versão 02, 06/03/2025',
    // Não traz tabela própria — remete à ABNT NBR 10676 nas referências, que a ferramenta não tem
    // na edição citada (2011); a cópia de 1999 disponível não tem tabela de fator de demanda (ver
    // fator-demanda-concessionarias.md). Sem tabela para calcular.
    semTabelaPropria: true,
  },
}

// `cargaIluminacaoTomadasVA`: soma de `totais.iluminacaoVA + totais.tugVA`
// (`calcularPrevisaoDeCarga`, previsaoDeCarga.js) — a carga instalada de iluminação e tomadas de
// uso geral, já calculada pela ferramenta pelo §9.5.2. Retorna `null` sem distribuidora escolhida.
export function calcularDemandaConcessionaria(distribuidoraId, cargaIluminacaoTomadasVA) {
  const distribuidora = DISTRIBUIDORAS[distribuidoraId]
  if (!distribuidora) return null

  const cargaInstaladaKw = (cargaIluminacaoTomadasVA || 0) / 1000

  if (distribuidora.semTabelaPropria) {
    return { distribuidora, aplicavel: false, motivo: 'não publica tabela própria de fator de demanda', cargaInstaladaKw }
  }
  if (distribuidora.semReducaoResidencial) {
    return { distribuidora, aplicavel: true, cargaInstaladaKw, fatorDemanda: 1, demandaKw: cargaInstaladaKw, semReducao: true }
  }
  const faixa = distribuidora.tabelaIluminacaoTomadas.find((item) => cargaInstaladaKw <= item.ateKw)
  if (!faixa) {
    return { distribuidora, aplicavel: false, motivo: 'carga acima da faixa conferida desta tabela', cargaInstaladaKw }
  }
  return { distribuidora, aplicavel: true, cargaInstaladaKw, fatorDemanda: faixa.fd, demandaKw: cargaInstaladaKw * faixa.fd }
}
