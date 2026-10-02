# Relatório técnico: Fio Certo, calculadora de instalações elétricas residenciais

**Disciplina:** TEE00192 — Circuitos Elétricos de Corrente Alternada · **Período:** 01/09 a 08/12/2026
**Equipe:** [preencher — nomes e grupos] · **Professor:** [confirmar]
**Site:** [preencher após o deploy] · **Repositório:** [preencher]

> Rascunho gerado a partir do código, do harness de QA e da página Conformidade em 29/09/2026.
> Os números da seção 5 vêm do motor de cálculo rodando a casa-modelo, não de conta manual.
> Revise o texto, complete os campos entre colchetes e ajuste ao modelo exigido pela disciplina.

---

## 1. Objetivo

O guia do projeto de extensão pede um site gratuito de apoio ao dimensionamento de instalações residenciais monofásicas, bifásicas e trifásicas, com a documentação necessária para mantê-lo. O Fio Certo cumpre esse papel. É uma calculadora que roda inteira no navegador e sai da previsão de carga até o quadro de distribuição, com cada resultado ligado à cláusula da ABNT NBR 5410:2004 (versão corrigida de 2008) que o fundamenta. Quando falta dado para verificar uma regra, ela diz isso explicitamente, em vez de aprovar por omissão.

Não substitui projeto assinado por profissional habilitado (ART), e isso aparece na tela inicial, no resultado e no memorial.

## 2. Fundamentação: onde entram os circuitos de corrente alternada

A ferramenta aplica os conteúdos da disciplina em cada etapa:

| Conceito de CA | Onde é usado |
|---|---|
| Potência aparente, ativa e fator de potência: S = P / cos φ | Cada equipamento tem tipo de carga (resistiva, indutiva ou capacitiva) e cos φ. O ar-condicionado de 1000 W com cos φ = 0,85 vira 1176 VA, e é a potência aparente que define a corrente. |
| Corrente de projeto: I_B = S / V | Tensão fase-neutro ou fase-fase, conforme a ligação do circuito. |
| Fasores e soma vetorial | A corrente de cada fase e a do **neutro** são somadas como fasores (P e Q por circuito, fases a 120°), e não como soma escalar de VA. A soma escalar superestima a fase e não dá a corrente do neutro. Pela lei dos nós, I_A + I_B + I_C + I_N = 0, e um circuito fase-fase se cancela sozinho no neutro. |
| Queda de tensão com R e X | ΔV = k · L · I · (R cos φ + X sen φ), com k = 2 no monofásico e 1 no trifásico equilibrado. R é a resistência na temperatura de operação do condutor (70 °C no PVC, 90 °C no EPR); X é a reatância por seção. |
| Impedância e curto-circuito | A fonte é modelada como reatância pura, X = U₀ / Icc, a partir da Icc informada na origem. Para achar a Icc em cada ponto e a impedância do laço de falta (Zs), R e X de cada trecho são somados separadamente. Isso atende a §5.3.5.1, que admite determinar a Icc "por cálculo". |

## 3. Metodologia

### 3.1 Fluxo da calculadora

O cálculo segue 5 etapas, ordenadas para que nenhuma etapa mude números de uma anterior:

1. **Instalação:** tipo, tensão, esquema de aterramento, ramal de entrada, Icc e curva.
2. **Cômodos:** previsão de carga pelo §9.5.2, que dá a iluminação mínima e a quantidade e potência das tomadas. Os cômodos podem ser medidos na planta, em imagem ou PDF.
3. **Circuitos:** divisão (§9.5.3), comprimento, método de instalação e grupo de DR de cada circuito.
4. **Dimensionamento:** seção e disjuntor de cada circuito, queda de tensão, eletroduto e percurso. É também onde se confere uma instalação existente.
5. **Proteção e resultado:** veredito, proteção geral, verificações complementares, unifilar, quadro, lista de materiais e listas de verificação. O memorial sai para impressão ou PDF.

### 3.2 Critérios aplicados, em resumo

- A seção é a menor que atende **ao mesmo tempo** a corrente (I_B ≤ I_n ≤ I_z, com I_z já corrigido por temperatura e agrupamento, §5.3.4.1) e a queda de tensão (4% no circuito, 5% no total a partir da entrega, §6.2.7), respeitando as seções mínimas da Tabela 47.
- A capacidade de condução vem das Tabelas 36 e 37 (PVC e EPR/XLPE; métodos A1, A2, B1, B2, C e D), com os fatores das Tabelas 40, 41, 42 e 45.
- Com a Icc informada, verifica-se o curto-circuito: I²t ≤ k²S² com a Icc no quadro, Ia ≤ Ikmin com a Icc na ponta do circuito, e a capacidade de interrupção.
- Com o esquema de aterramento declarado, verifica-se o seccionamento automático: Zs·Ia ≤ U₀ no TN e RA·IΔn ≤ UL no TT.
- DR de 30 mA, único ou por grupo, com seletividade quando há DR a montante.
- DPS especificado pela norma (Up, Uc, In, esquema de conexão).
- PE, PEN, condutor de aterramento, equipotencialização, reserva do quadro, tomadas da bancada e locais especiais (banheiro, piscina, sauna).

### 3.3 Verificação do próprio software

Um erro de dimensionamento não trava a aplicação: produz um número plausível e errado. Por isso o motor tem um **harness de conformidade** (`QA/scripts/verificar.mjs`) com **211 critérios**, cada um ligado a uma cláusula e com a evidência numérica. Os valores de tabela foram transcritos e conferidos no texto da norma, contando linhas quando a extração do PDF desalinhava colunas; nenhum foi tirado de memória.

- A auditoria inicial (16/09) achou 23 divergências. Hoje são **0**.
- Os testes de navegador (Playwright, 28 testes em Chrome, Firefox e Safari/WebKit) cobrem:
  - o fluxo completo;
  - os roteiros de uso M1–M9 (exceto o M8, que é manual);
  - importar e exportar projetos e o link compartilhado;
  - a planta;
  - o funcionamento offline;
  - uma auditoria automática de acessibilidade em 13 telas.
- A publicação no GitHub Pages só acontece se harness, lint, build e testes passarem (GitHub Actions).

Dois defeitos permissivos foram achados e corrigidos na releitura do §6.3.4.3.2:
- o I²t dos circuitos usava a Icc da ponta, que é a menor, em vez da do quadro;
- o disparo instantâneo usava o limite inferior da faixa magnética.

Os dois aprovavam casos que a norma reprova.

## 4. Funcionalidades entregues

- Vários projetos salvos no navegador, exportação e importação em arquivo, link de compartilhamento (sem servidor) e casa-modelo de demonstração.
- Veredito geral: vermelho para não conforme, âmbar para falta de dado, verde para tudo verificado. Cada item aponta a etapa que resolve.
- Diagrama unifilar e vista do quadro com a numeração dos circuitos (C1…Cn) e a reserva.
- Lista de materiais:
  - cabos por função, seção e cor (§6.1.5.3), com a folga informada pelo usuário;
  - eletrodutos, disjuntores com a Icn padronizada, DR tipo A e DPS classe II;
  - sem marca e sem preço.
- Conferência de instalação existente, percurso do eletroduto entre caixas, simulador de consumo e comparação de cenários (PVC × EPR, método, temperatura).
- Memorial técnico para imprimir ou salvar em PDF, com as listas de verificação do capítulo 7 e a advertência obrigatória do quadro (§6.5.4.10).
- Funciona offline depois da primeira visita (PWA) e se adapta ao celular.

## 5. Resultado de exemplo: casa-modelo

Casa de 2 quartos, bifásica 127/220 V, esquema TN-C-S, ramal de 20 m e Icc de 5 kA na origem. Esses valores são ilustrativos. Circuitos de iluminação com 15 m, de TUG com 18 m e de TUE com 12 m.

**Previsão de carga (§9.5.2)**

| Cômodo | Área (m²) | Iluminação (VA) | TUG (pontos / VA) | TUE (VA) |
|---|---|---|---|---|
| Sala | 18 | 280 | 4 / 400 | — |
| Quarto 1 | 12 | 160 | 3 / 300 | 1176 (ar-condicionado, 1000 W, cos φ 0,85) |
| Quarto 2 | 10 | 160 | 3 / 300 | — |
| Cozinha | 10 | 160 | 4 / 1400 | — |
| Área de serviço | 5 | 100 | 3 / 1300 | — |
| Banheiro | 4 | 100 | 1 / 600 | 5500 (chuveiro) |
| Varanda | 6 | 100 | 1 / 100 | — |
| **Total** | | **1060** | **4400** | **6676** → **12 136 VA** |

**Circuitos**

| Nº | Circuito | I_B (A) | I_n (A) | Seção (mm²) | Queda (%) | Fases |
|---|---|---|---|---|---|---|
| C1 | Iluminação | 8,35 | 10 | 2,5 | 1,69 | F1 |
| C2 | TUG salas/dormitórios/banheiro | 13,39 | 16 | 4 | 2,03 | F1 |
| C3 | TUG cozinha | 11,02 | 16 | 4 | 1,67 | F2 |
| C4 | TUG área de serviço | 10,24 | 16 | 4 | 1,55 | F2 |
| C5 | Ar-condicionado | 5,35 | 10 | 2,5 | 0,43 | F1+F2 |
| C6 | Chuveiro | 25,00 | 25 | 10 | 0,58 | F1+F2 |

**Proteção e alimentador**

- Correntes de fase, por soma vetorial: 50,27 A e 48,59 A. Neutro: 21,50 A.
- Disjuntor geral: 63 A.
- Alimentador: 16 mm² nas fases e no PEN, com queda de 2,11%. Sobram 2,89% para os circuitos.
- Icc calculada no quadro: 2,07 kA fase-neutro e 2,85 kA entre fases (a dos bipolares do ar-condicionado e do chuveiro).
- Um DR de 40 A e 30 mA para cada um dos 3 grupos.
- Equipotencialização principal de 10 mm² e reserva de 2 espaços no quadro.
- **Veredito: tudo o que a ferramenta verifica está conforme.**

**Leitura de engenharia.** As TUG saem com 4 mm², e não 2,5 mm², porque a ferramenta supõe, por padrão, os 6 circuitos agrupados no mesmo eletroduto. Com isso, o fator de agrupamento é 0,57 e a capacidade do 2,5 mm² cai de 24 A para 13,7 A, abaixo do disjuntor de 16 A. É uma premissa conservadora e ajustável. A comparação de cenários mostra outro efeito do orçamento cumulativo de queda: com EPR, o alimentador cai para 10 mm², consome mais dos 5%, e os circuitos engrossam.

## 6. Conformidade e limitações

A página Conformidade do site lista, cláusula por cláusula, o que é calculado e verificado, o que é verificado com limite declarado e o que fica de fora, com os testes de cada item. Em resumo, ficam de fora:

- Conversão entre tipos de falta. A norma não a traz: o valor de Icc informado é tomado como o trifásico, o maior, e o curto entre duas fases sai dele (√3/2 na origem).
- Ikmin abaixo do disparo instantâneo garantido. A partir daí depende da curva do fabricante.
- Fuga normal dos aparelhos no DR, que não é calculável. A ferramenta avisa e permite dividir o DR por grupos.
- Geometria real dos volumes do banheiro, da piscina e da sauna. Esses itens vão para listas de conferência.
- Cabo para 170 °C no volume 3 da sauna. A ferramenta avisa, mas só dimensiona PVC e EPR.
- Fator de demanda. A NBR 5410 não tem tabela residencial para isso, então as cargas são somadas.
- Ensaios em obra (continuidade, isolamento, DR). Entram como lista de verificação.
- Reconhecimento automático da planta. É experimental e só sugere retângulos, que o usuário confirma.

## 7. Trabalhos futuros

- Validação com projetos reais assinados, o roteiro M8.

## 8. Referências

A lista completa, com o que cada fonte fornece e onde é usada no código, está em `QA/referencias/fontes-externas.md`.

**Norma principal**

1. ABNT. **NBR 5410:2004** — Instalações elétricas de baixa tensão. Versão corrigida de 17.03.2008. Rio de Janeiro: ABNT, 2004. Todas as tabelas e cláusulas usadas pela ferramenta; valores conferidos no texto da norma (`QA/referencias/valores-normativos.md`).

**Normas de produto**

2. ABNT. **NBR NM 60898:2004** — Disjuntores para proteção de sobrecorrentes para instalações domésticas e similares (IEC 60898:1995, MOD). Rio de Janeiro: ABNT, 2004. I₂ = 1,45·In, faixas de disparo das curvas B, C e D e capacidades de interrupção padronizadas.
3. ABNT. **NBR NM 247-3:2002** — Cabos isolados com policloreto de vinila (PVC) para tensões nominais até 450/750 V, inclusive — Parte 3: Condutores isolados (sem cobertura) para instalações fixas (IEC 60227-3, MOD). Rio de Janeiro: ABNT, 2002. Especificação do cabo PVC.
4. ABNT. **NBR 7286:2022** — Cabos de potência com isolação extrudada sólida de borracha etileno-propileno (EPR, HEPR ou EPR 105) para tensões de 1 kV a 35 kV — Requisitos de desempenho. Rio de Janeiro: ABNT, 2022. **NBR 7287:2022** — idem, para isolação de polietileno reticulado (XLPE). Especificação do cabo de 90 °C.
5. ABNT. **NBR 15465:2020** — Sistemas de eletrodutos plásticos para instalações elétricas de baixa tensão — Requisitos de desempenho. 3ª ed. Rio de Janeiro: ABNT, 2020. Dimensão do eletroduto de PVC rígido.
6. IEC. **61008** e **61009** — Dispositivos a corrente diferencial-residual (tipos AC, A e B).
7. IEC. **61643** — Dispositivos de proteção contra surtos (classes I e II).

**Dados de fabricante** (a NBR 5410 não tabela dimensões de produto nem reatância)

8. CORFIO. **Cabo Flexível BWF 750 V** — tabela dimensional. Disponível em: <https://www.corfio.com.br/pt/produto/cabo-flexivel-bwf-750v>. Acesso em: 29 set. 2026. Diâmetro externo do cabo PVC.
9. CORFIO. **Cabo Flexível HEPR 90°C 0,6/1 kV** — tabela dimensional. Disponível em: <https://www.corfio.com.br/pt/produto/cabo-flexivel-1kv-hepr>. Acesso em: 29 set. 2026. Diâmetro externo do cabo EPR/XLPE.
10. CORDEIRO. **Catálogo técnico** (COR_005_CatalogoTecnico_Digital_PT). Tabela 8 — Resistências elétricas e reatâncias indutivas de fios e cabos isolados em PVC, HEPR e XLPE em condutos fechados. Disponível em: <https://www.cordeiro.com.br>. Reatância por seção.

**Método de cálculo**

11. Componentes simétricas e impedância de rede reativa, convenções gerais de estudo de curto-circuito em baixa tensão (o método normalizado é o da IEC 60909-0, não consultada diretamente). Propagação da Icc e curto entre duas fases (Icc·√3/2 na origem).

**Software**

12. React 19, React Router 7 e Vite 8 — interface e build.
13. MOZILLA. **pdf.js** (`pdfjs-dist` 6.3), licença Apache 2.0 — leitura da planta em PDF no navegador.
14. Playwright 1.63 e oxlint — testes de navegador e análise estática.
