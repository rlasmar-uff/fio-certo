// Termos usados na interface. Definições curtas, na linguagem da ferramenta — a definição formal
// de cada um está na NBR 5410 (seção indicada quando houver uma cláusula que a fixe).
export const GLOSSARIO = {
  Ib: { nome: 'Corrente de projeto', definicao: 'Corrente que o circuito vai conduzir em uso normal, calculada pela potência e pela tensão.' },
  In: { nome: 'Corrente nominal do disjuntor', definicao: 'Corrente para a qual o disjuntor foi fabricado; na escolha, precisa ficar entre Ib e Iz.' },
  Iz: {
    nome: 'Capacidade de condução de corrente',
    definicao: 'Corrente que o condutor suporta continuamente sem passar da temperatura da isolação, já corrigida pela temperatura e pelo agrupamento (§5.3.4.1).',
  },
  'I₂': { nome: 'Corrente de atuação garantida', definicao: 'Corrente que garante o disparo do disjuntor por sobrecarga; para disjuntores IEC 60898, 1,45 × In.' },
  FCT: { nome: 'Fator de correção de temperatura', definicao: 'Reduz a capacidade do condutor quando a temperatura ambiente difere da de referência (Tabela 40).' },
  FCA: { nome: 'Fator de correção de agrupamento', definicao: 'Reduz a capacidade do condutor quando vários circuitos passam juntos e se aquecem mutuamente (Tabelas 42 e 45).' },
  TUG: { nome: 'Tomada de uso geral', definicao: 'Tomada para aparelhos portáteis, sem equipamento definido; a quantidade mínima e a potência vêm do §9.5.2.2.' },
  TUE: { nome: 'Tomada de uso específico', definicao: 'Ponto para um equipamento determinado (chuveiro, forno, ar-condicionado), com potência conhecida e circuito próprio.' },
  'cosφ': { nome: 'Fator de potência', definicao: 'Relação entre potência ativa (W) e aparente (VA). Resistências têm cosφ = 1; motores, menos que 1.' },
  Icc: {
    nome: 'Corrente de curto-circuito presumida',
    definicao: 'Corrente que circularia num curto no ponto considerado. Na origem é informada; nos circuitos, calculada pela impedância (§5.3.5.1).',
  },
  Ikmin: { nome: 'Curto-circuito mínimo', definicao: 'Icc no ponto mais distante do circuito; o disjuntor ainda precisa atuar com ela (§6.3.4.3.2).' },
  Zs: { nome: 'Impedância do percurso da falta', definicao: 'Impedância de todo o laço da corrente de falta, da fonte até a massa e de volta (esquema TN).' },
  RA: { nome: 'Resistência de aterramento', definicao: 'Soma da resistência do eletrodo e dos condutores de proteção das massas (esquema TT).' },
  DR: {
    nome: 'Dispositivo diferencial-residual',
    definicao: 'Desliga o circuito quando parte da corrente escapa para a terra — por exemplo, por uma pessoa. O de 30 mA é o de alta sensibilidade (§5.1.3.2.2).',
  },
  'IΔn': { nome: 'Corrente diferencial nominal', definicao: 'Fuga para a terra que faz o DR atuar: 30 mA no de alta sensibilidade.' },
  DPS: { nome: 'Dispositivo de proteção contra surtos', definicao: 'Desvia para a terra as sobretensões de raios e manobras antes que cheguem aos aparelhos (§5.4, §6.3.5).' },
  PE: { nome: 'Condutor de proteção', definicao: 'O fio terra: liga as massas dos equipamentos ao aterramento. Verde-amarelo ou verde.' },
  PEN: { nome: 'Condutor neutro e de proteção', definicao: 'Um só condutor fazendo neutro e terra, no trecho TN-C do esquema TN-C-S. Nunca é seccionado.' },
  BEP: { nome: 'Barramento de equipotencialização principal', definicao: 'Ponto onde se ligam o aterramento, o PE e as canalizações metálicas da edificação (§6.4.2.1).' },
  QD: { nome: 'Quadro de distribuição', definicao: 'Quadro onde ficam o disjuntor geral, os DRs, o DPS e os disjuntores dos circuitos.' },
  ART: { nome: 'Anotação de Responsabilidade Técnica', definicao: 'Registro no conselho profissional que identifica o profissional responsável pelo projeto ou pela execução.' },
}
