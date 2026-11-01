// Mapa de rastreabilidade do compilado do Grupo de Pesquisa (semanas 3 a 8): tema → item da NBR 5410 → página do
// PDF da norma (página impressa = página do PDF − 8) → seção do Creder (16ª ed.). Cada linha tem o ponto do site
// onde o requisito aparece. Fonte: o próprio compilado (S3 §13 e os "mapas" de cada semana).
export const RASTREABILIDADE = [
  {
    titulo: 'Semana 3 — Previsão de cargas',
    colunas: ['Tema', 'NBR 5410', 'Creder', 'No site'],
    linhas: [
      ['Potência e equipamentos', '4.2.1.1 e 4.2.1.2; pp. 12–13; PDF 20–21', 'Cap. 2 e 3.3', 'Cômodos'],
      ['Iluminação residencial', '9.5.2.1; pp. 182–183; PDF 190–191', '3.3.2; PDF 89', 'Cômodos'],
      ['Quantidade de TUG', '9.5.2.2.1; p. 183; PDF 191', '3.3.3; PDF 90', 'Cômodos'],
      ['Potência de TUG', '9.5.2.2.2; p. 184; PDF 192', '3.3.3; PDF 90', 'Cômodos'],
      ['Uso específico', '4.2.1.2.3; p. 13; PDF 21', '3.3.4; PDF 90', 'Cômodos (TUE)'],
      ['Circuitos e aquecedores', '4.2.5; 9.5.2.3; 9.5.3; 9.5.4', '3.4; PDF 90–91', 'Circuitos'],
      ['Demanda residencial', '4.2.1.1.2; p. 12; PDF 20', '3.8; Tabela 3.20 e exemplo; PDF 132–134', 'Proteção e resultado'],
      ['Balanceamento', '4.2.5.6; p. 18; PDF 26', '3.4; PDF 90', 'Circuitos'],
    ],
  },
  {
    titulo: 'Semana 4 — Capacidade de condução (Tabelas 33 a 46)',
    colunas: ['Tabela NBR', 'Conteúdo', 'PDF', 'No site'],
    linhas: [
      ['33', 'Maneiras de instalar, método de referência e notas de enquadramento', '98–103', 'Circuitos; Instalação'],
      ['35', 'Temperaturas admissíveis conforme a isolação', '108', 'Instalação'],
      ['36', 'Cobre; PVC; métodos A1, A2, B1, B2, C e D', '109', 'Dimensionamento'],
      ['37', 'Cobre; EPR ou XLPE; métodos A1, A2, B1, B2, C e D', '110', 'Dimensionamento'],
      ['38', 'Cobre; PVC; métodos E, F e G', '111–112', 'Dimensionamento (consulta)'],
      ['39', 'Cobre; EPR ou XLPE; métodos E, F e G', '112–113', 'Dimensionamento (consulta)'],
      ['40 a 45', 'Correções por temperatura, solo e agrupamento', '114–118', 'Dimensionamento'],
      ['46', 'Quantidade de condutores carregados', '120', 'Dimensionamento'],
    ],
  },
  {
    titulo: 'Semana 5 — Fatores K1 e K2 e seções',
    colunas: ['Tema', 'NBR 5410', 'PDF', 'No site'],
    linhas: [
      ['Temperatura ambiente e K1', '6.2.5.3; tabela 40', '114', 'Dimensionamento'],
      ['Resistividade térmica do solo', '6.2.5.4; tabela 41', '115', 'Instalação'],
      ['Agrupamento e K2', '6.2.5.5; tabelas 42 a 45', '115–119', 'Dimensionamento (agrupamentos)'],
      ['Condutores carregados', '6.2.5.6; tabela 46', '119–120', 'Dimensionamento'],
      ['Trecho mais desfavorável', '6.2.5.8', '121', 'Dimensionamento'],
      ['Seções mínimas e critérios simultâneos', '6.2.6.1; tabela 47', '121', 'Dimensionamento'],
      ['Seção do neutro', '6.2.6.2', '122–123', 'Instalação; resultado'],
    ],
  },
  {
    titulo: 'Semana 6 — Queda de tensão',
    colunas: ['Conteúdo', 'Referência', 'PDF / local', 'No site'],
    linhas: [
      ['Limites totais, circuito terminal e partida', 'NBR 6.2.7.1 a 6.2.7.3', 'PDF p. 123', 'Instalação; dimensionamento'],
      ['Corrente a utilizar no cálculo', 'NBR 6.2.7.4', 'PDF p. 124', 'Dimensionamento'],
      ['Partida de motores', 'NBR 6.5.1.3.3', 'PDF p. 163', 'Cômodos (motor); dimensionamento'],
      ['Fórmulas e resistividades de referência', 'Creder', 'PDF p. 200; apêndice C, p. 451–452', 'Instalação (convenção de resistividade)'],
      ['Método por potência vezes distância', 'Creder, tabelas 3.18 e 3.19', 'PDF p. 130', 'Dimensionamento (pontos de carga)'],
    ],
  },
  {
    titulo: 'Semana 7 — Proteção contra sobrecorrentes, neutro e PE',
    colunas: ['Item NBR', 'Conteúdo', 'PDF', 'No site'],
    linhas: [
      ['5.3.1 e 5.3.2', 'Exigência de proteção contra sobrecorrentes; fases e neutro', '69–70', 'Dimensionamento'],
      ['5.3.3', 'Dispositivos admitidos: disjuntores, fusíveis e suas normas de produto', '70–71', 'Instalação (tipo do dispositivo)'],
      ['5.3.4.1', 'Coordenação entre condutor e dispositivo contra sobrecargas', '71–72', 'Dimensionamento'],
      ['5.3.5.5; tabela 30', 'Capacidade de interrupção, integral de Joule e valores de k', '75–76', 'Resultado'],
      ['6.3.2 e 6.3.4', 'Seccionamento do neutro e seleção dos dispositivos contra sobrecorrentes', '133–138', 'Resultado'],
      ['6.2.6.2; tabela 48', 'Condutor neutro e seção reduzida do neutro', '122–123', 'Instalação; resultado'],
      ['6.4.3; tabelas 53–58', 'Seções mínimas, tipos e continuidade do condutor de proteção', '155–160', 'Instalação (PE); resultado'],
      ['9.5.4', 'Seccionamento de todas as fases nos circuitos terminais de habitação', '192', 'Circuitos'],
      ['Anexo F', 'Neutro com taxa de terceira harmônica acima de 33%', '204–205', 'Instalação; resultado'],
    ],
  },
  {
    titulo: 'Semana 8 — Eletrodutos, DR e DPS',
    colunas: ['Item NBR', 'Conteúdo', 'PDF', 'No site'],
    linhas: [
      ['6.2.10', 'Condutores de mais de um circuito no mesmo conduto', '127–128', 'Dimensionamento (agrupamentos)'],
      ['6.2.11.1', 'Eletrodutos: taxa de ocupação, trechos, curvas e caixas', '128–129', 'Dimensionamento'],
      ['5.1.2.2.4.3', 'Esquema TT: uso de DR e condição RA × IΔn ≤ UL', '48', 'Instalação; resultado'],
      ['5.1.3.2', 'DR de alta sensibilidade: casos de uso obrigatório', '57–58', 'Circuitos; resultado'],
      ['6.3.3.2', 'Seleção e instalação de dispositivos DR', '133–134', 'Resultado'],
      ['9.1', 'Locais contendo banheira ou chuveiro', '178–182', 'Cômodos; planta do banheiro'],
      ['5.4.2; tabela 31', 'Quando usar DPS; suportabilidade a impulso dos componentes', '77–79', 'Instalação; resultado'],
      ['6.3.5.2; tabela 49', 'Localização, conexão, seleção e condutores do DPS', '138–144', 'Resultado'],
      ['Tabela 15', 'Classes AQ de descargas atmosféricas', '37', 'Instalação'],
      ['Anexo C', 'Tensão de contato limite UL', '196–197', 'Resultado'],
    ],
  },
]

export const REFERENCIAS_COMPILADO = [
  'ASSOCIAÇÃO BRASILEIRA DE NORMAS TÉCNICAS. ABNT NBR 5410:2004: instalações elétricas de baixa tensão. 2. ed. Rio de Janeiro: ABNT, 2004. Versão corrigida de 17 mar. 2008.',
  'CREDER, Hélio. Instalações elétricas. 16. ed. Atualização e revisão de Luiz Sebastião Costa. Rio de Janeiro: LTC, 2016.',
]
