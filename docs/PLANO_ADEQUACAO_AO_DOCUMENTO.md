# Plano de adequação do site ao compilado do Grupo de Pesquisa (semanas 3 a 8)

**Fonte seguida:** *Compilado dos relatórios das semanas 3 a 8 — Grupo de Pesquisa* (96 páginas, 19/09 a 30/10/2026).
Hierarquia do próprio documento: **NBR 5410:2004 (corrigida 17/03/2008) prevalece; Creder, 16ª ed., é referência
complementar.** As referências abaixo usam "S3 §5" = relatório da semana 3, seção 5; "Compilado p. 7" = página do arquivo.

Método: li as 96 páginas, comparei cada regra, tabela, campo de cadastro, validação e caso de teste com o código atual
(`frontend/src/calculations/`, páginas e estado) e **rodei os casos numéricos do documento no motor**.

## Status de execução (01/11/2026)

Os pacotes P0 a P8 foram executados com as respostas do grupo às cinco decisões:

| # | Resposta | Como ficou |
|---|---|---|
| Q1 | colocar as duas convenções | Instalação → "Resistência do condutor": temperatura de operação (padrão, cabo real), ρ = 1/58 (didática, sem reatância; a de 1/56 foi retirada a pedido). Os casos de referência usam 1/58. |
| Q2 | só cobre, se o documento diz só cobre | Todas as tabelas e módulos são só de cobre; E/F/G entram como consulta (Tabelas 38 e 39) em Dimensionamento. Alumínio não existe na ferramenta. |
| Q3 | remover os tetos de VA e "todo TUE em circuito próprio" | Removidos: o circuito é limitado pela corrente (padrão 16 A, 20 A no misto) e TUE só tem circuito próprio acima de 10 A. |
| Q4 | DR por circuito exigido, "todos" como opção | Padrão `exigidos` (§5.1.3.2.2); `geral` e `grupos` colocam DR em todos os circuitos. |
| Q5 | demanda de Creder como padrão | Perfil `creder` por parcelas é o padrão; continua rotulada "estimativa bibliográfica" até identificar distribuidora, documento, revisão e grupo de carga. |

**Verificação:** `node QA/scripts/verificar.mjs` → 350 conformes, 0 divergências (G46 reproduz os testes das semanas 3 a 8 e os casos 1 a 6);
`npm run lint` limpo; `npm run build` ok; `npm run e2e` → 110 passam em Chromium, Firefox e WebKit (1 ignorado, o teste de PWA offline no WebKit).

**Interface:** entradas em Instalação (fornecimento, convenção, impedância, dispositivos, PE, neutro, DPS, demanda), Cômodos (altura da iluminação,
exceção com motivo, TUE com tipo de potência, corrente, conexão, distância e motor), Circuitos (maneira da Tabela 33, fase manual, corrente
máxima, circuito misto, modo de DR, δ antes e depois), Dimensionamento (agrupamentos e eletroduto compartilhado, catálogo e áreas, ΔU em volts,
partida, impedância e pontos de carga por circuito, consulta E/F/G) e saídas em Resultado e Memorial (demanda por parcelas, DR por circuito,
Icn, DPS, Anexo F, PE, reserva); o mapa de rastreabilidade está em Conformidade.

**Limites declarados:** a ferramenta não verifica a energia passante abaixo de 10 mm² (Tabela 30, NOTA 1), a curva real do disjuntor, a seletividade
e o tipo de DR em relação às cargas. O k do PE fora do cabo vem da Tabela 53 da NBR 5410 (cobre: PVC 143, EPR/XLPE 176).

## 0. Uma correção minha, antes de tudo

Na auditoria anterior eu tratei a Tabela 42, referência 2 (método C), como sem valor acima de 11 circuitos. O documento
(S5 §3, p. 33) lê 0,70 até "≥ 20", e eu conferi a imagem da página 116 do PDF da norma: a célula 0,70 é **mesclada** de
"9 a 11" até "≥ 20". Eu estava errado; **já revertido** (302 critérios passando) e os documentos de auditoria foram
corrigidos. Só a Tabela 45 (eletrodutos enterrados) continua sem valor acima de 6 circuitos.

## 1. O que o site já faz como o documento manda (conferido com número)

| Item do documento | Resultado no site |
|---|---|
| Iluminação: 100 VA; +60 VA por 4 m² inteiros; 9,99 / 10 / 14 m² → 100 / 160 / 220 VA (S3 §3, §12) | Igual |
| Cozinha p = 14 / 14,01 m → 4 / 5 pontos; sala e dormitório ⌈p/5⌉; faixas de área dos demais cômodos (S3 §4) | Igual |
| TUG: 600·min(n,3) + 100·max(n−3,0); alternativa de 2 pontos só com mais de 6 pontos e por escolha (S3 §5) | Igual (opt-in, soma inclui banheiro) |
| Memorial demonstrativo: iluminação 740 VA, TUG 5000 VA, total 5740 VA (S3 §11) | **Igual** (rodei: 740 / 5000 / 5740) |
| Tabelas 36 e 37; erro do Creder 525 A → NBR 252 A (S4 §4.3) | Igual (288 células conferidas contra o PDF) |
| Fator K1: tabela 40, 1,00 nas temperaturas de referência, "—" sem valor (S5 §2) | Igual (60 valores) |
| Tabelas 42 (linha 1 e 2), 45 (as duas sub-tabelas), 46, 47, 48, 58, 30 (k = 115/143, nunca 135) | Iguais |
| Exemplos S4 §6 e S5 §8 (6 mm² falha com 24,969 A; 10 mm² / 6 mm² atendem), sem arredondar antes de comparar | Igual (comparação em precisão integral) |
| Limite do terminal = mín(4%; 5% − montante) (S6 §2.1) | Igual |
| Reprovar 4,004% mesmo exibindo 4,00% (S6 §8) | Igual |
| Coordenação Ib ≤ In ≤ Iz; In = 1,45 · In (NM 60898); igualdade aceita (S7 §2–3) | Igual |
| PE pela tabela 58 (16/25/35/50/95 → 16/16/16/25/50; 120 → 70) e neutro monofásico/bifásico = fase (S7 §4–5) | Igual |
| Taxas 53 / 31 / 40% e cálculo por área, não por diâmetro (S8 §2) | Igual |
| TT: R ≤ 1666,7 Ω com 30 mA e 50 V (S8 §4.1); DPS: Up 1,5/2,5 kV, Uc 139,7/242 V (S8 §5.2) | Igual |
| Casos 1 a 3 do documento (S8 §6): seção, disjuntor e Iz | **Iguais** (6 mm² / 32 A / 32,8 A; 2,5 mm² / 16 A / 16,8 A; 1,5 mm² / 10 A / 12,25 A) |

## 2. Diferenças encontradas

Gravidade: **A** impede reproduzir um número do documento; **B** função que o documento exige e o site não tem;
**C** apresentação, cadastro ou rastreabilidade.

### 2.1 Números que não batem com os casos do documento (rodados no motor)

| Caso do documento | Documento | Site hoje | Causa |
|---|---|---|---|
| Caso 1, chuveiro 6800 W, 15 m: queda | 1,211% | **1,501%** | resistividade (ver D26) |
| Caso 2, cozinha 2000 VA, 18 m: queda | 3,079% | **3,815%** | idem |
| Caso 3, iluminação 900 VA, 20 m: queda | 2,566% | **3,179%** | idem |
| S6 §6, 127 V, 20 A, 30 m, 6 mm²: queda | 2,812148% | **3,365%** | idem (documento usa ρ = 1/56) |
| Caso 5, eletroduto E1 (3×1,5 + 6×2,5 mm²) | ΣA = 81,0 mm²; DN 20; 38,35% | 81,92 mm²; DN 20; 38,78% | áreas dos cabos (D43) |
| Caso 5, E2 (6×6 mm²) | 99,6 mm²; DN 25 | 101,89 mm²; DN 25 | idem |
| S8 §7, 7×4 mm² | 92,4 mm²; DN 25 | 92,42 mm²; DN 25 | igual |

### 2.2 Previsão de carga e circuitos (semana 3)

| # | Gr. | Documento exige | Site hoje |
|---|---|---|---|
| D1 | B | Iluminação: campos **separados** para o mínimo e para a carga real; usar a **maior** (S3 §3.2) | O valor manual substitui o mínimo, mesmo menor (só gera problema no veredito) |
| D2 | A | Área nula ou negativa é **rejeitada** na entrada; não é válido calcular (S3 §3; §12.2) | O motor devolve 100 VA; só o veredito acusa |
| D3 | C | Exceções de localização (ponto na parede, tomada de hotel, varanda): **registrar o motivo** (S3 §3.1, §4.2) | Não existe |
| D4 | C | Guardar separado nº de pontos e nº de tomadas por ponto (S3 §4.1) | Só "pontos" e "tomadas na bancada" |
| D5 | B | Halls de serviço, salas de manutenção e de equipamentos: ao menos 1 ponto e 1000 VA nos circuitos (4.2.1.2.3 b) (S3 §4.3) | Tipo de cômodo inexistente |
| D6 | C | Registrar **condição de elegibilidade e opção adotada** da alternativa de 600 VA no memorial (S3 §5.1) | Opção existe, mas o memorial não a registra |
| D7 | B | TUE: indicar se a potência é **absorvida ou de saída**; corrente nominal; conexão direta ou tomada; equipamento indefinido (hipótese registrada); distância ≤ 1,5 m (S3 §6, §12) | Só "rendimento (opcional)" |
| D8 | A | Circuito independente só se I > 10 A; "**não converter em toda TUE exige circuito independente**" (S3 §6.2, §12) | Todo equipamento recebe circuito próprio |
| D9 | B | Circuito misto (iluminação + tomadas) em modo configurável, com as 3 condições de 9.5.3.3 (S3 §7.1–7.2) | Sempre separados; sem modo misto |
| D10 | A | **Não existe** limite universal de VA por circuito; depende de I_B, tensão, condutores e proteção (S3 §7.2) | Tetos de 1500 VA (iluminação) e 2000 VA (tomadas), "convenção de projeto" |
| D11 | B | Demanda: perfil de Creder **por parcelas** (D(X), tabela 3.20), exigindo distribuidora, documento, revisão; 100% para cargas específicas; testes 0/1000/4240/10000 VA → 0/800/2920/5070 e 10100 → 5094 (S3 §8–9) | Não existe o perfil de Creder (só a demanda informativa de 9 distribuidoras) |
| D12 | B | Balanceamento: indicador δ e média; exibir **antes e depois**; **ajuste pelo projetista**; comparar cenários (S3 §10) | Otimização exata, sem δ e sem ajuste manual |
| D13 | C | Memorial com demanda por faixa (D_geral 3633; D_total 9133 VA) (S3 §11.2) | Depende de D11 |
| D14 | C | Cadastro: distribuidora e perfil/versão no projeto; unidade e tipo de potência, tensão e corrente do equipamento; função, pontos atendidos e independência do circuito; resultado com mínimos × adotados, hipóteses, pendências e **itens de referência** (S3 §12) | Parcial |
| D15 | C | Validações: pontos fracionários rejeitados; **tensão incompatível com a ligação** do equipamento; exigir FP e rendimento quando necessários, sem valor silencioso (S3 §12.2) | Sem campo de tensão do equipamento; FP/η com valores padrão |
| D16 | C | Mapa de rastreabilidade: tema → item da NBR (página impressa e do PDF) → seção do Creder (S3 §13) | A página Conformidade cita cláusula, sem página nem Creder |

### 2.3 Condutores e capacidade (semanas 4 e 5)

| # | Gr. | Documento exige | Site hoje |
|---|---|---|---|
| D17 | B | Enquadrar a **maneira de instalar (tabela 33)** e derivar o método A1–G (S4 §2, §5.1; teste "maneira 7 → B1, não A1") | O usuário escolhe o método direto |
| D18 | B | Métodos **E, F, G** (tabelas 38/39, trifólio, plano justaposto, horizontal, vertical) e **alumínio** com verificação de admissibilidade; testes: Cu EPR G 2,5 mm² → 41/35 A; 50 mm² Al → 104 A; Al 35 mm² comercial → rejeitar (S4 §3.1, §5, §7) | Fora do escopo por decisão anterior |
| D19 | C | Resultado separa "atende ao critério térmico" de "dimensionamento completo aprovado" (S4 §5.1, S5 §7.1) | Mostra fatores e Iz, mas não separa os dois estados |
| D20 | B | **K2**: Tabela 42 colunas B–E (teto 0,95; bandeja perfurada; leito), **Tabela 43** (camadas), **Tabela 44** (diretamente enterrados; 3 circuitos → 0,65), regra **F = 1/√n** (grupo não semelhante; n = 4 → 0,50), exclusão de circuito ≤ 30% da capacidade, menor temperatura do grupo (S5 §3–5.3) | Só linha 1 e 2 da Tab. 42 e Tab. 45 |
| D21 | A | K2 conta os circuitos **do mesmo eletroduto**, definidos pelo projeto (casos 1 a 3 e E1/E2) (S8 §6) | K2 usa o **total de circuitos da casa** por padrão |
| D22 | C | Para a Tab. 45 e valores sem enquadramento: sinalizar e exigir outro procedimento (S5 §7.1) | Feito (null) |

### 2.4 Queda de tensão (semana 6)

| # | Gr. | Documento exige | Site hoje |
|---|---|---|---|
| D23 | B | Limite total por situação: 7% (transformador da unidade; transformador da distribuidora com entrega no secundário; gerador próprio) e 5% (demais), com o acréscimo de 0,005 pp/m acima de 100 m, teto 0,5 pp, **só nos casos de 7%** (150 m → 7,25%; 250 m → 7,5%; caso de 5% fica 5%) (S6 §2) | Só o caso de 5% |
| D24 | A | **Convenção de resistividade**: ρ = 1/56 (exemplos), 1/58 (tabelas 3.18/3.19 e S8), 1/32 (Al); real: r do fabricante na temperatura de operação; "r já corrigido não corrige de novo" (S6 §3) | Fixa σ(70 °C) = 46,8 e σ(90 °C) = 43,9; sem escolha |
| D25 | B | **Modo por impedância**: r e x em Ω/km informados (teste 380 V, 32 A, 50 m, cosφ 0,8: 5,0105 V; 1,3185%); a rotina escolhe um modo, nunca os dois (S6 §7.1) | Só modo por resistividade, com reatância de tabela |
| D26 | B | Circuito radial com **vários trechos e derivações**: ΣLI = 250 A·m → 3,571428 V; não aplicar a corrente total a todos os trechos (S6 §5.2, §6.2) | Circuito de um trecho só |
| D27 | B | **Partida de motor** (10%, 6.5.1.3.3): usar corrente de partida, não a de regime (S6 §2.3, §7.2) | Só aviso "consultar distribuidora" acima de 3,7 kW |
| D28 | C | Mostrar ΔU admissível em volts (127 V, 4% → 5,08 V); ida e retorno com resistências diferentes (S6 §4.2, §8) | Não exibe em volts; ida = retorno |

### 2.5 Proteção, PE e neutro (semana 7)

| # | Gr. | Documento exige | Site hoje |
|---|---|---|---|
| D29 | A | Série comercial **4, 6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125 A**, por linha (DX-E sem 25 e 40 A; DX 6000; DX-H); In e Icn por linha; teste I_B = 21 A → 25 A e, na DX-E, 32 A (S7 §3) | Série 10 … 250 A com 70, 150, 175, 200, 225 e 250 A; sem 4 e 6 A; sem linhas |
| D30 | B | **Icn do dispositivo ≥ Icc presumida**; sem Icc, pendente (S7 §2) | Mostra o mínimo exigido, sem comparar com um dispositivo cadastrado |
| D31 | B | Relação I₂/In guardada **por tipo de dispositivo**; fusível gG (I₂ > 1,45·In) verificado à parte; sobrecarga prolongada I₂ ≤ Iz (S7 §2.1) | 1,45 como constante global |
| D32 | B | **PE por cálculo** S ≥ √(I²t)/k (2000 A, 0,02 s, k = 115 → 2,46 → 2,5 mm²) e adotar o maior dos dois métodos; **mínimos de 6.4.3.1.4** (PE fora do cabo: 2,5 mm² com proteção mecânica; 4 mm² sem); PE comum a vários circuitos; tabelas 53/55 (S7 §4) | Só a Tabela 58 |
| D33 | B | Tabelas de PE e neutro até **150, 185, 240 mm²** (S7 §5.1) | Escada de seções até 120 mm² |
| D34 | B | **Anexo F**: I_N = f_h · I_B (120 A, h₃ = 40% → f = 1,19 → 142,8 A; sem estimativa f = 1,73 → 207,6 A) e rotular "verificação complementar" (S7 §5.2) | Só aviso, sem calcular I_N |
| D35 | C | Declarar **equilíbrio** e **proteção do neutro** separadamente do checkbox único; faixa de h₃ obrigatória, sem padrão silencioso (S7 §5.3) | Um único "neutro reduzido declarado" |
| D36 | C | Regras de proteção e seccionamento do neutro (S7 §2.2) e restrições do PE (S7 §4.2) | Não exibidas |

### 2.6 Eletrodutos, DR e DPS (semana 8)

| # | Gr. | Documento exige | Site hoje |
|---|---|---|---|
| D37 | A | Catálogo de eletrodutos por **tipo/fabricante/classe**: PVC roscável DN 20–85 (Di 16,4 … 79,6) e **soldável** DN 16–50 (Di 14,0 … 47,8); site deve permitir trocar por catálogo do produto (S8 §3.1–3.2, §5.5) | Lista única (já sem DN 16); inclui DN 110 que o documento não traz; sem soldável |
| D38 | A | **Áreas externas dos cabos = tabela 3.22, coluna Total** (1,5 … 185 mm²), editáveis pelo catálogo (S8 §3.3) | Diâmetros próprios (Corfio/Creder, o maior); só até 120 mm² |
| D39 | B | Tabela de **quantidade máxima de condutores iguais** por DN (S8 §3.4) | Não existe |
| D40 | A | Eletroduto **compartilhado por vários circuitos** (E1, E2) com a regra de 6.2.10.2: seções em até 3 valores normalizados sucessivos, mesma temperatura e dispositivo de origem; **rejeitar 1,5 mm² com 6 mm²** (S8 §2, §6.6, §7) | Cada circuito tem eletroduto próprio; sem verificação de mistura |
| D41 | B | **DR obrigatório por circuito/ponto** (banheiro; externas; internas que alimentem o exterior; cozinha, lavanderia, garagem, molhadas; exclusão de luminária a ≥ 2,50 m; tomadas até 32 A); "área social seca: não exigido"; alerta de **chuveiro de resistência nua**; tipos AC/A/B; fuga ≤ 50% de IΔn; DR a montante do DPS suporta 3 kA (S8 §4) | DR de 30 mA em **todos** os circuitos; sem lógica de exigência, sem tipo, sem alerta |
| D42 | B | DPS: perguntar **alimentação aérea** e **classe AQ (AQ1/AQ2/AQ3)**; **esquema de conexão 1/2/3** (TT com DPS a montante do DR → esquema 3); In e Iimp por modo, inclusive neutro-PE (Iimp 25/50 kA); suportabilidade e corrente subsequente ≥ 100 A; local (≤ 10 m, caixa de medição); ligação ≤ 0,5 m, 4/16 mm²; In do dispositivo associado; indicador de estado; linhas externas de sinal (S8 §5) | Booleanos (aérea, região de alto índice, descarga direta); sem AQ3, sem esquema de conexão, sem Iimp neutro-PE |
| D43 | C | **Caso 6** (TT, rede aérea, AQ2, DR geral 300 mA, R = 80 Ω) como resultado esperado (S8 §6.7) | DR geral de 300 mA e AQ não modelados |

### 2.7 Pontos do próprio documento que o grupo deve decidir

| Ponto | Onde | Observação |
|---|---|---|
| ρ = 1/56 (semana 6) × 1/58 (semana 8) | S6 §3.1; S8 §6.1 | O documento avisa que os casos "devem ser recalculados" com o valor que a semana 6 fixar. As duas semanas hoje divergem. |
| Empate do PE em 120 mm² (50 × 70) | S7 §5.1 | Já adotado 70 (o site faz o mesmo); fica "para revisão da semana 10". |
| Coluna de carga mínima por área da Tab. 3.20 | S3 §9.2 | O documento manda **não** usar. O site não usa. |
| Tab. 3.23 do Creder (DN por quantidade de cabos) | S8 §3.5 | O documento manda **não** importar. O site não importa (calcula). |
| Alumínio e E/F/G | S4 §3.1 | "O site residencial deve adotar cobre", mas os testes exigem as tabelas. Ver pergunta Q2. |

## 3. Plano de execução

Pacotes ordenados por dependência. Cada um termina com **critérios do harness** (o que o documento já traz como teste) e
mantém os 302 atuais passando. Esforço: P = pequeno (≤ 1 dia), M = médio (2 a 4 dias), G = grande (> 1 semana).

| Pacote | Conteúdo | Cobre | Esforço | Depende de |
|---|---|---|---|---|
| **P0 Fixtures** | Escrever no harness os casos e testes do documento como grupo G46 (S3 §12, S4 §7, S5 §9, S6 §8, S7 §7, S8 §7, casos 1–6), inicialmente falhando onde há diferença | todas as diferenças viram critério | P | — |
| **P1 Queda de tensão** | Escolha de convenção de ρ (1/56, 1/58, temperatura de operação) e de modo (resistividade × impedância r, x); limites 7%/5% e acréscimo 0,005 pp/m; circuito de vários trechos; ΔU em volts; partida de motor (10%) | D23–D28 | M | P0 |
| **P2 Previsão de carga e circuitos** | Rejeitar área ≤ 0; maior entre mínimo e real; tipo "hall/sala de manutenção/equipamentos" (1000 VA); exceções com motivo; tomadas por ponto; TUE com tipo de potência, corrente, conexão, indefinido; circuito independente só > 10 A; modo misto com as 3 condições; remover tetos de VA; demanda de Creder por parcelas; δ, antes/depois e ajuste manual de fases; registrar alternativa de 600 VA | D1–D16 | G | P0 |
| **P3 Capacidade de condução** | Seletor da tabela 33 → método; tabelas 43, 44, colunas B–E da 42; F = 1/√n; exclusão ≤ 30%; **K2 por eletroduto definido pelo projeto**; separar "térmico" de "completo"; (opcional, ver Q2) E/F/G e alumínio como módulo de consulta | D17–D22 | G | P0 |
| **P4 Proteção, PE e neutro** | Cadastro de disjuntores (série, linhas, Icn, I₂/In, fusível gG, sobrecarga prolongada); Icn × Icc; PE por cálculo e mínimos 6.4.3.1.4; seções 150–240; I_N pelo anexo F; declarações separadas de equilíbrio e proteção do neutro | D29–D36 | M | P3 |
| **P5 Eletrodutos** | Catálogo por tipo/fabricante/classe (roscável, soldável); áreas da Tab. 3.22 como padrão, editáveis; quantidade máxima; eletroduto compartilhado com a regra de 6.2.10.2 | D37–D40 | M | P3 |
| **P6 DR e DPS** | Exigência de DR por circuito/ponto; tipos; alertas; DPS com AQ, esquema 1/2/3, Iimp neutro-PE, posição e ligação; caso 6 | D41–D43 | M | P4 |
| **P7 Interface e rastreabilidade** | Campos do cadastro (S3 §12), memorial com demanda por faixa, hipóteses, pendências e itens de referência; mapa de rastreabilidade com páginas da NBR e seções do Creder | D13, D14, D16, D19 | M | P1–P6 |
| **P8 Fechamento** | Casos 1 a 6 passando; atualizar auditoria, matriz, casos de teste, relatório técnico e a entrega à faculdade | — | P | P1–P7 |

**Ordem recomendada:** P0 → P1 → P2 em paralelo com P3 → P4 e P5 → P6 → P7 → P8. P1 destrava a maior parte dos números dos casos
de referência; P3 (K2 por eletroduto) destrava os casos 1 a 3 e 5.

**Regra de execução:** cada pacote só fecha com (a) os testes do documento correspondentes passando, (b) os 302 critérios
anteriores passando (ou alterados com justificativa por escrito, como já fizemos), (c) `lint`, `build` e testes de
navegador verdes, (d) a rastreabilidade (item da norma, página, seção do Creder) no resultado.

## 4. Decisões que preciso de vocês (sem elas o plano trava)

| # | Pergunta | Recomendação |
|---|---|---|
| Q1 | Convenção padrão de resistividade: o documento usa **1/56** na semana 6 e **1/58** na semana 8. | Oferecer as duas como "modo didático" para reproduzir os casos, e manter a **temperatura de operação** como padrão do site (o documento diz preferir a resistência do cabo na temperatura de operação). Fixar uma só para os casos de referência. |
| Q2 | Alumínio e métodos E/F/G: "o site residencial deve adotar cobre", mas os testes do documento exigem os valores. | Entregar como **módulo de consulta** (tabelas 38/39, alumínio com bloqueio de admissibilidade), fora do fluxo de dimensionamento residencial. |
| Q3 | Remover os tetos de 1500/2000 VA por circuito (D10) e a regra "todo equipamento tem circuito próprio" (D8): reduz o conservadorismo que adotamos antes. | Seguir o documento (remover), porque ele pede isso expressamente. |
| Q4 | DR em **todos** os circuitos (mais rigoroso que a norma) × DR só onde a norma exige (D41). | Passar a **exigir por circuito** como o documento, mantendo um modo "DR em todos" opcional. |
| Q5 | Perfil de demanda de Creder: entra como método didático **selecionável**, ou como padrão? | Selecionável, nunca padrão, com os campos de distribuidora/documento/revisão obrigatórios (S3 §8.2). |

## 5. Revisão de excesso (ponytail-review) sobre o que o documento **não** pede

Escopo desta revisão: complexidade que o documento não exige ou contradiz. Não altera nada; só lista.

- `circuitos.js:L14-61: delete:` empacotamento First-Fit Decreasing por teto de VA (48 linhas) e as constantes `POTENCIA_MAXIMA_CIRCUITO_*`. O documento diz que não há limite universal de VA (D10). Substituir por um circuito por função, subdividido só quando I_B ultrapassa o disjuntor escolhido.
- `circuitos.js:L148-225: shrink:` busca exata por programação dinâmica do balanceamento (78 linhas). O documento chama o procedimento de heurística e pede δ, "antes e depois" e ajuste manual (D12). Já existe o guloso de reserva no mesmo arquivo: manter só ele.
- `constantes.js:DISJUNTORES_PADRONIZADOS: shrink:` série de 17 valores para a série de 13 do documento (D29); remove 70 e 150–250 A sem fonte.
- `constantes.js:ELETRODUTOS_PVC_RIGIDO:DN 110: delete:` linha que o documento não traz (D37).
- Testes G10.x e G13.x do harness: apagar junto com os dois itens acima (cobrem código que sai).
- Fora do documento e **mantidos** (não o contradizem): planta, consumo, comparação de cenários, PWA, lista de materiais, demanda das 9 distribuidoras.

`net: -125 lines possible` no código atual; o plano acrescenta funções, mas estes cortes devem entrar primeiro (P2), para não escrever teste e código novos em cima do que vai sair.
