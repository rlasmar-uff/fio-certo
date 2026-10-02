# Valores normativos de referência — ABNT NBR 5410:2004

Valores extraídos do `NBR-5410.pdf` mantido na raiz do projeto (versão corrigida 17.03.2008).
O que vem de fora da norma (catálogos, normas de produto, convenções) está listado em
[`fontes-externas.md`](fontes-externas.md).
Serve como fonte única de verdade para os testes em [`QA/scripts/verificar.mjs`](../scripts/verificar.mjs)
e para revisar qualquer valor do motor de cálculo.

**Por que este arquivo existe:** conferir valor a valor no PDF é lento e propenso a erro de
transcrição — foi exatamente assim que entrou um `111 A` onde a norma diz `110 A`. Com os
valores aqui, qualquer auditoria futura é uma comparação, não uma releitura da norma.

**Se precisar reextrair do PDF:**
```bash
pdftotext -layout NBR-5410.pdf saida.txt
grep -n "Tabela 36" saida.txt
```
A extração desalinha a coluna de seções nominais em relação às colunas de valores — confira
o alinhamento contando as linhas de dados, não confiando na coluna da esquerda.

---

## Índice

- [§9.5.2 — Previsão de carga](#952--previsão-de-carga)
- [§9.5.3 / §9.5.4 — Divisão da instalação e proteção](#953--954--divisão-da-instalação-e-proteção)
- [§6.2.6 / Tabela 47 — Seções mínimas](#626--tabela-47--seções-mínimas)
- [§6.2.5 / Tabela 36 — Capacidade de condução de corrente](#625--tabela-36--capacidade-de-condução-de-corrente)
- [§6.2.5.6 / Tabela 46 — Número de condutores carregados](#6256--tabela-46--número-de-condutores-carregados)
- [Tabelas 40, 41, 42 e 45 — Fatores de correção](#tabelas-40-41-42-e-45--fatores-de-correção)
- [Tabela 37 — Isolação EPR/XLPE](#tabela-37--capacidade-de-condução-de-corrente-isolação-eprxlpe-90-c)
- [§5.3.4 — Coordenação condutor/proteção](#534--coordenação-condutorproteção)
- [§6.2.7 — Quedas de tensão](#627--quedas-de-tensão)
- [§5.1.3.2.2 — DR de alta sensibilidade](#51322--dr-de-alta-sensibilidade)
- [Tabela 58 — Condutor de proteção](#tabela-58--condutor-de-proteção)
- [§6.2.11.1.6 — Taxa de ocupação do eletroduto](#621116--taxa-de-ocupação-do-eletroduto)
- [Tabela 33 — Métodos de instalação B1, B2 e C](#tabela-33--métodos-de-instalação-b1-b2-e-c-o-que-cada-um-realmente-é)
- [§6.2.6.2 / Tabela 48 — Redução do condutor neutro](#6262--tabela-48--redução-do-condutor-neutro)
- [§5.3.5 / Tabela 30 — Curto-circuito](#535--tabela-30--curto-circuito)
- [Reatância por seção (fonte externa)](#reatância-por-seção-fonte-externa--não-é-dado-da-nbr-5410)
- [§5.4.2 / §6.3.5.2.1 — DPS: exigência condicional e Classe I](#542--63521--dps-exigência-condicional-e-classe-i)
- [§6.2.6.2 — Cálculo vetorial completo](#6262--cálculo-vetorial-completo-corrente-de-fase-e-do-neutro)
- [§9.1 — Locais contendo banheira ou chuveiro](#91--locais-contendo-banheira-ou-chuveiro)
- [§5.3.5.1 — Curto-circuito por circuito terminal](#5351--curto-circuito-por-circuito-terminal-propagação-de-icc-por-impedância)

---

## §9.5.2 — Previsão de carga

Atenção à numeração: a subdivisão correta é **§9.5.2.1.2** (carga de iluminação),
**§9.5.2.2.1** (número de tomadas) e **§9.5.2.2.2** (potência das tomadas).
**§9.5.2.3 é "Aquecimento elétrico de água"** — não tem relação com potência de TUG.

### §9.5.2.1.1 — Pontos de iluminação
Pelo menos um ponto de luz fixo no teto por cômodo, comandado por interruptor.

### §9.5.2.1.2 — Carga de iluminação

> a) em cômodos ou dependências com área igual ou inferior a 6 m², deve ser prevista uma carga mínima de 100 VA;
> b) em cômodo ou dependências com área superior a 6 m², deve ser prevista uma carga mínima de 100 VA para os primeiros 6 m², **acrescida de 60 VA para cada aumento de 4 m² inteiros**.

**"4 m² inteiros" é piso (`floor`), não teto.** Só se conta o incremento completo.

| Área | Cálculo | Carga mínima |
|---|---|---|
| ≤ 6 m² | fixo | 100 VA |
| 10 m² | 100 + ⌊4/4⌋×60 | 160 VA |
| 12 m² | 100 + ⌊6/4⌋×60 | 160 VA |
| 14 m² | 100 + ⌊8/4⌋×60 | 220 VA |
| 15 m² | 100 + ⌊9/4⌋×60 | 220 VA |
| 20,15 m² | 100 + ⌊14,15/4⌋×60 | 280 VA |
| 25 m² | 100 + ⌊19/4⌋×60 | 340 VA |

> NOTA: os valores correspondem à potência destinada a iluminação **para efeito de dimensionamento
> dos circuitos**, e não necessariamente à potência nominal das lâmpadas.

### §9.5.2.2.1 — Número mínimo de pontos de tomada

| Local | Critério |
|---|---|
| Banheiros | pelo menos 1, próximo ao lavatório (atendido §9.1) |
| Cozinhas, copas, copas-cozinhas, áreas de serviço, cozinha-área de serviço, lavanderias e análogos | 1 para cada **3,5 m ou fração** de perímetro; **acima da bancada da pia, no mínimo 2 tomadas** |
| Varandas | pelo menos 1 |
| Salas e dormitórios | 1 para cada **5 m ou fração** de perímetro, espaçados uniformemente |
| Demais cômodos, área ≤ 2,25 m² | 1 (admite-se posicioná-lo fora do cômodo, até 0,80 m da porta) |
| Demais cômodos, 2,25 m² < área ≤ 6 m² | 1 |
| Demais cômodos, área > 6 m² | 1 para cada **5 m ou fração** de perímetro |

"Ou fração" é arredondamento **para cima** (`ceil`).

### §9.5.2.2.2 — Potência atribuível aos pontos de tomada

> a) em **banheiros, cozinhas, copas, copas-cozinhas, áreas de serviço, lavanderias e locais análogos**,
> no mínimo **600 VA por ponto até três pontos, e 100 VA nos excedentes**, considerando-se cada
> um desses ambientes separadamente. Quando o total de tomadas **no conjunto desses ambientes for
> superior a seis pontos**, admite-se 600 VA **até dois pontos** e 100 VA nos excedentes, sempre
> considerando cada ambiente separadamente;
> b) nos demais cômodos ou dependências, no mínimo **100 VA por ponto**.

Note que **banheiro entra na lista de 600 VA** (alínea a) — mas **não** entra na lista de circuitos
exclusivos do §9.5.3.2. São listas diferentes; confundi-las é erro comum.

---

## §9.5.3 / §9.5.4 — Divisão da instalação e proteção

| Cláusula | Prescrição |
|---|---|
| §9.5.3.1 | Todo ponto previsto para alimentar equipamento com **corrente nominal superior a 10 A** deve constituir circuito independente |
| §9.5.3.2 | Tomadas de **cozinhas, copas, copas-cozinhas, áreas de serviço, lavanderias e locais análogos** devem ser atendidas por circuitos **exclusivos** (banheiro não está nesta lista) |
| §9.5.3.3 | Em habitação, admite-se circuito comum iluminação + tomadas (exceto as do §9.5.3.2) se, **simultaneamente**: Ib ≤ 16 A; a iluminação não estiver toda num só circuito; e as tomadas não estiverem todas num só circuito |
| §9.5.4 | Todo circuito terminal deve ser protegido por dispositivo que assegure **seccionamento simultâneo de todos os condutores de fase** — ou seja, **dispositivo multipolar** quando o circuito tem mais de uma fase. Unipolares com alavancas acopladas **não** contam como multipolar |

A NBR 5410 **não** fixa teto de VA por circuito. Limites como 1500 VA (iluminação) e 2000 VA (TUG)
são convenção de projeto — legítimos, mas não devem ser citados como exigência normativa.

---

## §6.2.6 / Tabela 47 — Seções mínimas

**Condutores e cabos isolados, instalações fixas em geral:**

| Utilização do circuito | Seção mínima |
|---|---|
| Circuitos de iluminação | **1,5 mm² Cu** (16 mm² Al) |
| Circuitos de força (nota 2: **circuitos de tomadas são circuitos de força**) | **2,5 mm² Cu** (16 mm² Al) |
| Circuitos de sinalização e controle | 0,5 mm² Cu |

**Condutores nus:** força 10 mm² Cu · sinalização e controle 4 mm² Cu.

> Os **10 mm² são da linha de condutores nus**. Não existe na NBR 5410 um mínimo de 10 mm² para
> alimentador em cabo isolado — esse piso vem das normas de fornecimento das concessionárias
> (Enel, Light, CPFL etc.) e deve ser citado como tal.

### §6.2.6.1.2 — Os seis critérios obrigatórios da seção

A seção deve atender, **no mínimo, todos** os seguintes:

| | Critério | Referência |
|---|---|---|
| a) | Capacidade de condução ≥ corrente de projeto, **afetada dos fatores de correção aplicáveis** | §6.2.5 |
| b) | Proteção contra sobrecargas | §5.3.4, §6.3.4.2 |
| c) | Proteção contra curtos-circuitos e solicitações térmicas | §5.3.5, §6.3.4.3 |
| d) | Proteção contra choques por seccionamento automático (TN e IT) | §5.1.2.2.4 |
| e) | Limites de queda de tensão | §6.2.7 |
| f) | Seções mínimas | §6.2.6.1.1 |

---

## §6.2.5 / Tabela 36 — Capacidade de condução de corrente

Cobre · isolação **PVC** · condutor a **70 °C** · ambiente 30 °C (ar) e 20 °C (solo).

**Método B1** (condutores isolados em eletroduto embutido em alvenaria) — é o método que a
calculadora assume:

| Seção (mm²) | B1 — **2 cond. carregados** | B1 — 3 cond. carregados |
|---:|---:|---:|
| 1,5 | 17,5 | 15,5 |
| 2,5 | 24 | 21 |
| 4 | 32 | 28 |
| 6 | 41 | 36 |
| 10 | 57 | 50 |
| 16 | 76 | 68 |
| 25 | 101 | 89 |
| 35 | **125** | **110** |
| 50 | 151 | 134 |
| 70 | 192 | 171 |
| 95 | 232 | 207 |
| 120 | 269 | 239 |

Valores de referência cruzada da mesma linha de 35 mm² (para detectar deslize de coluna):
A1/2c=99 · A1/3c=89 · A2/2c=92 · A2/3c=83 · **B1/2c=125** · **B1/3c=110** · B2/2c=111 · B2/3c=99 · C/2c=138 · C/3c=119 · D/2c=125 · D/3c=103.

---

## §6.2.5.6 / Tabela 46 — Número de condutores carregados

**Qual coluna usar:** o número de condutores *carregados* (que conduzem corrente em serviço
normal), não o total de condutores no eletroduto. §6.2.5.6.2: o condutor de proteção (PE) **não**
é considerado; o condutor PEN conta como neutro.

Tabela 46, transcrita integralmente:

| Esquema de condutores vivos do circuito | Nº de condutores carregados a adotar |
|---|:---:|
| Monofásico a dois condutores | 2 |
| Monofásico a três condutores | 2 |
| Duas fases sem neutro | 2 |
| **Duas fases com neutro** | **3** |
| Trifásico sem neutro | 3 |
| Trifásico com neutro | 3 ou 4 (ver §6.2.5.6.1) |

Mapeamento para o que esta ferramenta gera:

| Situação na ferramenta | Esquema da Tabela 46 | Carregados |
|---|---|:---:|
| Circuito terminal fase-neutro | Monofásico a dois condutores | 2 |
| Circuito terminal fase-fase (TUE 220 V) | Duas fases sem neutro | 2 |
| Alimentador de instalação monofásica | Monofásico a dois condutores | 2 |
| Alimentador de instalação **bifásica** | **Duas fases com neutro** | **3** |
| Alimentador de instalação **trifásica** | **Trifásico com neutro** | **3** (ou 4) |

> **Armadilha.** O "bifásico" brasileiro são duas fases defasadas de **120°** tiradas de uma rede
> trifásica a quatro fios, **mais** o neutro → "duas fases com neutro" → **3** condutores
> carregados. Não confundir com "monofásico a três condutores" (rede *split-phase* a 180°, 2
> carregados), que é a linha de cima na tabela. Foi exatamente essa confusão que fez o
> alimentador bifásico **e** o trifásico serem dimensionados pela coluna de 2 condutores até
> 17/09/2026 — ~12% de ampacidade a mais do que a norma admite (B1 2,5 mm²: 24 A contra 21 A),
> o que superestima o Iz e pode subdimensionar o alimentador.

### §6.2.5.6.1 — Quando o neutro também é condutor carregado

Num circuito **trifásico com neutro** em que a taxa de 3ª harmônica e múltiplos passa de **15%**,
a corrente no neutro não é acompanhada de redução correspondente nas fases: o neutro passa a ser
computado como condutor carregado, e o circuito é considerado de **4 condutores carregados**.

Como as Tabelas 36-39 não têm coluna de 4 condutores, a norma manda aplicar o **fator 0,86** sobre
os valores válidos para **3** condutores carregados, independentemente do método de instalação —
sem prejuízo dos demais fatores (temperatura, resistividade do solo, agrupamento).

Nota 2 da cláusula admite alternativa: tratar os 4 condutores como dois circuitos de 2 condutores
cada e aplicar o fator de agrupamento de 2 circuitos sobre a coluna de **2** condutores. Nota 3: o
fator só é pertinente a circuitos trifásicos com neutro.

Correntes harmônicas nesses níveis aparecem tipicamente em circuitos que alimentam luminárias com
lâmpadas de descarga, incluindo fluorescentes (nota 1 do §6.2.6.2.3).

**Consequência de projeto, importante:** a taxa de 3ª harmônica governa dois critérios cujos lados
seguros são **opostos** — acima de 15% aplica-se o 0,86 (reduz a ampacidade), e até 15%, e só
então, o neutro pode ser reduzido pela Tabela 48 (§6.2.6.2.6). Por isso a declaração do usuário é
tri-estado (`não declarado` / `até 15%` / `acima de 15%`), e não um booleano: sem declaração,
nenhum dos dois age e ambos os critérios ficam como não verificados.

---

## Tabelas 40, 41, 42 e 45 — Fatores de correção

A ampacidade utilizável é **Iz = Iz(tabela) × FCT × FCA** (× o fator de resistividade do solo,
Tabela 41, só para o método D). O §5.3.4.1 define Iz explicitamente como "a capacidade de condução
de corrente dos condutores, **nas condições previstas para sua instalação**" — ou seja, o valor
corrigido, não o bruto da tabela.

### Tabela 40 — Fator de correção de temperatura (FCT), nas 4 colunas

A tabela impressa tem duas metades: linhas **não-subterrâneas** (referência 30 °C de ar) e linhas
**subterrâneas** (referência 20 °C de solo — método D), cada uma com coluna PVC e EPR/XLPE.
Conferida por um segundo agente, que reconstruiu a tabela por geometria de página (`pdftotext
-table`, não viu os valores antes) e, além disso, verificou que as 52 células numéricas batem
**exatamente** (2 casas decimais) com a forma fechada:

```
f = √( (θmax − θ) / (θmax − θref) )
```

com θmax = 70 °C (PVC) ou 90 °C (EPR/XLPE), e θref = 30 °C (ar) ou 20 °C (solo). Um erro de fase
de uma linha na transcrição quebraria TODAS as 52 células de uma vez — verificação muito mais forte
que qualquer âncora pontual (é o que o harness confere no G18.1).

| Temp. | Ar PVC | Ar EPR/XLPE | Solo PVC | Solo EPR/XLPE |
|---:|---:|---:|---:|---:|
| 10 °C | 1,22 | 1,15 | 1,10 | 1,07 |
| 15 °C | 1,17 | 1,12 | 1,05 | 1,04 |
| 20 °C | 1,12 | 1,08 | **1,00** (ref.) | **1,00** (ref.) |
| 25 °C | 1,06 | 1,04 | 0,95 | 0,96 |
| **30 °C** | **1,00** (ref.) | **1,00** (ref.) | 0,89 | 0,93 |
| 35 °C | 0,94 | 0,96 | 0,84 | 0,89 |
| 40 °C | 0,87 | 0,91 | 0,77 | 0,85 |
| 45 °C | 0,79 | 0,87 | 0,71 | 0,80 |
| 50 °C | 0,71 | 0,82 | 0,63 | 0,76 |
| 55 °C | 0,61 | 0,76 | 0,55 | 0,71 |
| 60 °C | 0,50 | 0,71 | 0,45 | 0,65 |
| 65 °C | — | 0,65 | — | 0,60 |
| 70 °C | — | 0,58 | — | 0,53 |
| 75 °C | — | 0,50 | — | 0,46 |
| 80 °C | — | 0,41 | — | 0,38 |

Os traços são ausência **real** (PVC não opera continuamente acima de ~70 °C no condutor, então a
norma não tabela FCT de PVC além de 60 °C ambiente) — a ferramenta nunca extrapola: fora da faixa,
o critério fica não verificado (`obterFatorTemperatura` devolve `null`, ver G18.2).

### Tabela 41 — Resistividade térmica do solo (só método D)

As Tabelas 36/37 para linhas subterrâneas assumem resistividade térmica do solo de **2,5 K·m/W**
(§6.2.5.4). Fora dessa referência:

| Resistividade (K·m/W) | 1 | 1,5 | 2 | 3 |
|---|---|---|---|---|
| Fator de correção | 1,18 | 1,10 | 1,05 | 0,96 |

Só 4 pontos tabelados — a norma remete à NBR 11301 para valores mais precisos. Sem declaração,
2,5 K·m/W (fator 1) é o default.

### Tabela 42, ref. 1 — Fator de agrupamento (FCA), métodos A1, A2, B1 e B2

Condutores agrupados em feixe ao ar livre, **embutidos, ou em conduto fechado** — vale para os
quatro métodos "em conduto fechado" (A1/A2/B1/B2 diferem só por parede isolante×normal e fios
soltos×cabo multipolar, não pelo tipo de agrupamento térmico):

| Nº de circuitos | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9–11 | 12–15 | 16–19 | ≥20 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FCA | 1,00 | 0,80 | 0,70 | 0,65 | 0,60 | 0,57 | 0,54 | 0,52 | 0,50 | 0,45 | 0,41 | 0,38 |

> O número consultado é a quantidade de **circuitos** (grupos de 2 ou 3 condutores), não de condutores.
> Nota 2 da tabela: se a distância horizontal entre cabos adjacentes for maior que o dobro do
> diâmetro externo, nenhum fator de redução é necessário.

**Impacto prático:** um quadro residencial com 3 circuitos saindo no mesmo eletroduto já aplica
FCA = 0,70. Um cabo de 2,5 mm² com Iz de tabela 24 A passa a ter Iz real de 16,8 A — abaixo do
disjuntor de 20 A que seria escolhido ignorando o fator.

### Tabela 45 — Fator de agrupamento para eletrodutos ENTERRADOS (só método D)

O método D é definido como cabo **em eletroduto** enterrado (§6.2.5.1.2, nota 4) — por isso usa a
Tabela 45 (linhas em eletrodutos enterrados), não a Tabela 44 (cabos diretamente enterrados, sem
eletroduto — fora do escopo desta ferramenta) nem a Tabela 42 (§6.2.5.5, nota 3).

| Nº de circuitos | Nulo | 0,25 m | 0,5 m | 1,0 m |
|---:|---:|---:|---:|---:|
| 2 | 0,85 | 0,90 | 0,95 | 0,95 |
| 3 | 0,75 | 0,85 | 0,90 | 0,95 |
| 4 | 0,70 | 0,80 | 0,85 | 0,90 |
| 5 | 0,65 | 0,80 | 0,85 | 0,90 |
| 6 | 0,60 | 0,80 | 0,80 | 0,80 |

Esta ferramenta não modela a distância física entre eletrodutos, então usa sempre a coluna **Nulo**
(a mais severa). Só tabelada até 6 circuitos; além disso, mantém o último valor (0,60) como piso —
mesmo critério já usado nas duas tabelas de agrupamento acima, nunca extrapola um valor pior sem
base normativa.

---

## Tabela 37 — Capacidade de condução de corrente, isolação EPR/XLPE, 90 °C

Mesmo formato de 12 colunas da Tabela 36 (2 e 3 condutores carregados × A1/A2/B1/B2/C/D), cobre,
mesmo ambiente de referência (30 °C ar / 20 °C solo). Transcrição conferida por um segundo agente
(reconstrução geométrica de página, método independente do zip por ordinal usado para a Tabela 36),
que bateu célula a célula sem ver os valores antes.

| Seção (mm²) | A1/2 | A1/3 | A2/2 | A2/3 | B1/2 | B1/3 | B2/2 | B2/3 | C/2 | C/3 | D/2 | D/3 |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1,5 | 19 | 17 | 18,5 | 16,5 | 23 | 20 | 22 | 19,5 | 24 | 22 | 26 | 22 |
| 2,5 | 26 | 23 | 25 | 22 | 31 | 28 | 30 | 26 | 33 | 30 | 34 | 29 |
| 4 | 35 | 31 | 33 | 30 | 42 | 37 | 40 | 35 | 45 | 40 | 44 | 37 |
| 6 | 45 | 40 | 42 | 38 | 54 | 48 | 51 | 44 | 58 | 52 | 56 | 46 |
| 10 | 61 | 54 | 57 | 51 | 75 | 66 | 69 | 60 | 80 | 71 | 73 | 61 |
| 16 | 81 | 73 | 76 | 68 | 100 | 88 | 91 | 80 | 107 | 96 | 95 | 79 |
| 25 | 106 | 95 | 99 | 89 | 133 | 117 | 119 | 105 | 138 | 119 | 121 | 101 |
| 35 | 131 | 117 | 121 | 109 | 164 | 144 | 146 | 128 | 171 | 147 | 146 | 122 |
| 50 | 158 | 141 | 145 | 130 | 198 | 175 | 175 | 154 | 209 | 179 | 173 | 144 |
| 70 | 200 | 179 | 183 | 164 | 253 | 222 | 221 | 194 | 269 | 229 | 213 | 178 |
| 95 | 241 | 216 | 220 | 197 | 306 | 269 | 265 | 233 | 328 | 278 | 252 | 211 |
| 120 | 278 | 249 | 253 | 227 | 354 | 312 | 305 | 268 | 382 | 322 | 287 | 240 |

**Invariante mais forte de verificação:** EPR (90 °C) tem SEMPRE mais ampacidade que PVC (70 °C) na
mesma seção/método/nº de condutores — 144 comparações. Um erro de fase de uma linha jogaria essa
razão para ~1,7 ou ~1,0 em algum ponto (G17.4 no harness).

## §5.3.5.5.2 / Tabela 30 — fator k por isolação

`k` da fórmula I²t≤k²S² também depende da isolação: **PVC** 115 (≤300 mm²) / 103 (>300 mm²);
**EPR/XLPE** 143 (a fonte extraída não registra quebra de faixa acima de 300 mm² para esta
isolação — não inventada).

## Condutividade do cobre por isolação (fonte externa — a NBR 5410 não tabela condutividade)

Usada na fórmula de queda de tensão, na temperatura de OPERAÇÃO do condutor (não a 20 °C de
catálogo): σ₇₀ = 46,8 (PVC) e σ₉₀ = 43,9 (EPR/XLPE), mesma convenção ρ₂₀=1/56, α=0,00393 já usada
para o PVC — trocar de convenção (ex. IEC 60228, ρ₂₀=0,017241) moveria também o resultado do PVC
existente em ~3,5% e não foi feito nesta fase. Efeito esperado: EPR/XLPE tem mais ampacidade **e**
mais queda de tensão que PVC na mesma seção/corrente — o condutor opera mais quente.

---

## §5.3.4 — Coordenação condutor/proteção

§5.3.4.1 — para que a proteção contra sobrecargas fique assegurada:

> a) **I_B ≤ I_n ≤ I_z**; e
> b) **I₂ ≤ 1,45 · I_z**

| Símbolo | Significado |
|---|---|
| I_B | corrente de projeto do circuito |
| I_z | capacidade de condução dos condutores **nas condições previstas para sua instalação** (§6.2.5) |
| I_n | corrente nominal do dispositivo de proteção |
| I₂ | corrente convencional de atuação (disjuntores) ou de fusão (fusíveis) |

Para disjuntores conforme IEC 60898, I₂ = 1,45 · I_n, o que faz a condição b) decorrer de a).
Se o projeto passar a admitir fusíveis ou disjuntores industriais, b) precisa ser verificada
explicitamente.

---

## §6.2.7 — Quedas de tensão

### §6.2.7.1 — Limite total, em qualquer ponto de utilização

Medido **a partir da origem indicada**, sobre a tensão nominal:

| Situação | Limite |
|---|---|
| a) transformador MT/BT próprio | 7% |
| b) ponto de entrega nos terminais do transformador da distribuidora | 7% |
| c) **demais casos de ponto de entrega em tensão secundária** (caso residencial típico) | **5%** |
| d) grupo gerador próprio | 7% |

> NOTA 3: nos casos a), b) e d), quando as linhas principais tiverem comprimento superior a 100 m,
> as quedas podem ser aumentadas de 0,005% por metro excedente, limitado a +0,5%.

### §6.2.7.2 — Limite do trecho terminal

> Em nenhum caso a queda de tensão nos circuitos terminais pode ser superior a **4%**.

**Os dois limites são cumulativos, não independentes.** O 4% é o teto do trecho terminal; o 5%
é o teto do caminho inteiro a partir do ponto de entrega. Alimentador e circuito terminal
**dividem o mesmo orçamento de 5%** — não têm 4% cada um. Um alimentador de 3% deixa apenas 2%
para o terminal, mesmo que 4% fosse admissível isoladamente.

### §6.2.7.4 — Corrente a usar

> Para o cálculo da queda de tensão num circuito deve ser utilizada a **corrente de projeto** do circuito.

(Não a corrente do disjuntor.)

### Fórmulas

A norma fixa limites, não fórmula. As usuais:

| Sistema | Queda |
|---|---|
| Monofásico / fase-fase (2 condutores) | ΔV = 2 · L · I · (R·cosφ + X·senφ) |
| Trifásico equilibrado | ΔV = √3 · L · I · (R·cosφ + X·senφ), sobre V_ff |

A resistência deve ser tomada na **temperatura de operação do condutor** (70 °C para PVC — a mesma
da Tabela 36), não a 20 °C:

| Temperatura | ρ (Ω·mm²/m) | σ (m/Ω·mm²) |
|---|---|---|
| 20 °C | 0,01786 | 56 |
| **70 °C** | **0,02137** | **46,8** |

ρ₇₀ = ρ₂₀ · [1 + 0,00393 · (70 − 20)]. Usar 20 °C subestima a queda em ~20%.

---

## §5.1.3.2.2 — DR de alta sensibilidade

Obrigatório DR com I∆n ≤ **30 mA**, qualquer que seja o esquema de aterramento, em:

> a) circuitos que sirvam a pontos de utilização em locais contendo **banheira ou chuveiro** (§9.1);
> b) circuitos que alimentem tomadas em **áreas externas**;
> c) circuitos de tomadas em áreas internas que possam alimentar equipamentos no exterior;
> d) em habitação, circuitos que sirvam pontos em **cozinhas, copas-cozinhas, lavanderias, áreas de
> serviço, garagens e demais dependências internas molhadas** em uso normal ou sujeitas a lavagens;
> e) em edificações não-residenciais, circuitos de tomadas nos mesmos locais.

> NOTA 1: para tomadas, a exigência se aplica às de corrente nominal **até 32 A**.
> NOTA 3: admite-se excluir, na alínea d), pontos que alimentem luminárias a **altura ≥ 2,50 m**.

A exigência é **por circuito**. Um DR geral único a montante de tudo cobre os casos exigidos, mas
faz qualquer fuga desarmar a instalação inteira — a norma permite (e a prática recomenda) dividir
por grupos de circuitos. Ver [§9.1](#91--locais-contendo-banheira-ou-chuveiro) para a alínea a).

---

## Tabela 58 — Condutor de proteção

| Seção dos condutores de fase S (mm²) | Seção mínima do PE (mm²) |
|---|---|
| S ≤ 16 | S |
| 16 < S ≤ 35 | 16 |
| S > 35 | S/2 |

> Válida apenas se o PE for do **mesmo metal** que as fases. Quando a aplicação conduzir a seções
> não padronizadas, adotar a seção padronizada mais próxima.

**§6.4.3.1.4** — PE que não faça parte do mesmo cabo nem esteja no mesmo conduto fechado que as
fases: mínimo 2,5 mm² Cu com proteção mecânica, ou 4 mm² Cu sem proteção mecânica.

**§6.4.3.1.5** — um PE pode ser comum a vários circuitos, desde que instalado no mesmo conduto e
dimensionado pela **maior** seção de fase entre eles.

---

## §6.2.11.1.6 — Taxa de ocupação do eletroduto

Texto da norma (a) é a regra usada; (b) e §6.2.11.1.7 são do mesmo bloco, não implementados):

> a) a taxa de ocupação do eletroduto, dada pelo quociente entre a soma das áreas das seções
> transversais dos condutores previstos, calculadas com base no **diâmetro externo**, e a área
> útil da seção transversal do eletroduto, não deve ser superior a:
>
> **53%** no caso de um condutor; **31%** no caso de dois condutores; **40%** no caso de três ou
> mais condutores.
>
> b) os trechos contínuos de tubulação, sem interposição de caixas ou equipamentos, não devem
> exceder 15 m (linhas internas) ou 30 m (linhas externas), reduzidos em 3 m por curva de 90°.

§6.2.11.1.7 (mesmo bloco, também não implementado): no máximo 3 curvas de 90° (ou equivalente até
270°) entre caixas/extremidades.

> **Condutores previstos = TODOS os condutores físicos do trecho** (fase, neutro, terra/PE) — ao
> contrário da Tabela 36/ampacidade, aqui não existe a distinção "carregado vs. não carregado": um
> PE ocupa espaço no eletroduto tanto quanto uma fase, mesmo não conduzindo corrente em uso normal.

### Diâmetro externo do condutor (fonte externa à NBR 5410)

A norma define a TAXA de ocupação, mas não o diâmetro comercial do cabo — isso é dado de produto,
não de instalação. Valores de catálogo (Corfio, cabo flexível BWF 750 V, cobre, isolação PVC,
conforme **ABNT NBR NM 247-3** — o mesmo tipo de cabo já assumido na Tabela 36/§6.2.5):

| Seção (mm²) | 1,5 | 2,5 | 4 | 6 | 10 | 16 | 25 | 35 | 50 | 70 | 95 | 120 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Ø externo (mm) | 2,95 | 3,55 | 4,05 | 4,65 | 6,00 | 7,00 | 8,60 | 10,15 | 11,80 | 13,50 | 15,70 | 17,20 |

Varia alguns décimos de mm entre fabricantes — o suficiente para, em casos de ocupação bem no
limite, mudar a bitola de eletroduto recomendada em um degrau. Confira com o cabo realmente
comprado quando a ocupação calculada ficar perto de 40%.

**EPR/XLPE (29/09/2026).** Cabo unipolar flexível HEPR 90°C 0,6/1 kV, página do produto da Corfio
(`corfio.com.br/pt/produto/cabo-flexivel-1kv-hepr`), coluna "Diâmetro externo nominal (mm)":

| Seção (mm²) | 1,5 | 2,5 | 4 | 6 | 10 | 16 | 25 | 35 | 50 | 70 | 95 | 120 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Ø externo (mm) | 4,95 | 5,35 | 5,85 | 6,45 | 7,60 | 8,60 | 10,40 | 11,95 | 13,60 | 15,50 | 17,50 | 19,20 |

Conferência: em todas as 12 linhas, externo = Ø do condutor + 2 × isolação + 2 × cobertura +
0,2 mm (isolação 0,7 mm até 16 mm²; 0,9 em 25-35; 1,0 em 50; 1,1 em 70-95; 1,2 em 120). A tabela
impressa do catálogo antigo continuava ambígua; esta, da página do produto, não. Os sites de
outros fabricantes consultados (Cobrecom, SIL, Megatron) não publicam a tabela em texto, então
não houve segunda fonte. Seção acima de 120 mm² continua recusando calcular.

### Eletroduto de PVC rígido roscável — diâmetro interno útil (fonte externa à NBR 5410)

Também não é dado da 5410: dimensão de **produto** do eletroduto, regida pela norma específica
dele (ABNT NBR 15465, antiga NBR 6150), não pela 5410. Valores típicos de catálogo/equivalência
comercial:

| Referência | 3/8" | 1/2" | 3/4" | 1" | 1.1/4" | 1.1/2" | 2" | 2.1/2" | 3" | 4" |
|---|---|---|---|---|---|---|---|---|---|---|
| Nominal (mm) | 16 | 20 | 25 | 32 | 40 | 50 | 60 | 75 | 85 | 110 |
| Ø interno (mm) | 12,8 | 16,4 | 21,3 | 27,5 | 36,1 | 41,4 | 52,8 | 67,1 | 79,6 | 103,1 |

**Impacto prático:** um circuito de chuveiro monofásico de 10 mm² (fase+neutro+PE, todos 10 mm²)
ocupa 84,8 mm² de área — 40,15% de um eletroduto de 1/2" (limite 40%), então **não** cabe nele por
uma margem mínima; sobe para 3/4" (23,8% de ocupação). Um alimentador trifásico de 10 mm² (3
fases+neutro+PE = 5 condutores) ocupa 39,67% de um eletroduto de 3/4" — cabe, mas por muito pouco.
Isso é o tipo de caso em que a variação entre fabricantes de cabo/eletroduto pode mudar o resultado.

**Isso é um cálculo diferente do fator de agrupamento (FCA, Tabela 42) desta mesma seção**: o FCA
mede quantos *circuitos* se aquecem entre si (afeta a ampacidade); a taxa de ocupação mede se os
*condutores de um mesmo circuito* cabem fisicamente dentro do eletroduto do próprio trecho (não
afeta ampacidade nem queda — é só instalação/manutenibilidade). Implementado em
`frontend/src/calculations/eletroduto.js`.

---

## Tabela 33 — Métodos de instalação A1, A2, B1, B2, C e D (o que cada um realmente é)

Conferido na tabela ilustrada (imagem renderizada da página, não texto corrido — essa tabela tem
figuras, não é extraível por `pdftotext`) e no §6.2.5.1.2 (lista textual dos métodos de
referência). **A distinção B1×B2 não é embutido×aparente** — os dois existem das duas formas; o
que diferencia é fios soltos vs. cabo multipolar. A1 está para B1, e A2 para B2, exatamente na
mesma relação, só que embutidos em parede termicamente isolante em vez de alvenaria comum:

| Item da Tabela 33 | Descrição literal da norma | Método |
|---|---|---|
| 1 | Condutores isolados ou cabos unipolares em eletroduto embutido em **parede termicamente isolante** | A1 |
| 2 | Cabo multipolar em eletroduto embutido em **parede termicamente isolante** | A2 |
| 3 | Condutores isolados ou cabos unipolares em eletroduto **aparente** de seção circular sobre parede | B1 |
| 7 | Condutores isolados ou cabos unipolares em eletroduto de seção circular **embutido em alvenaria** | B1 |
| 4 | Cabo multipolar em eletroduto **aparente** de seção circular sobre parede | B2 |
| 8 | Cabo multipolar em eletroduto de seção circular **embutido em alvenaria** | B2 |
| 11 | Cabos unipolares ou cabo multipolar sobre parede (sem eletroduto) | C |
| 11A | Cabos unipolares ou cabo multipolar fixado diretamente no teto (sem eletroduto) | C |
| — | Cabo multipolar em eletroduto **enterrado no solo**, a 0,7 m de profundidade (§6.2.5.1.2, nota 4) | D |

Ou seja: **A1/B1** = fios soltos (ou cabos unipolares) dentro de um eletroduto, em parede isolante
(A1) ou alvenaria comum (B1), embutido ou aparente — B1 é o jeito mais comum de instalação
residencial brasileira; A1 é a mesma situação em drywall/wood frame/steel frame, construção
residencial cada vez mais comum. **A2/B2** = idem, com cabo multipolar (vários condutores dentro de
uma capa só). **C** = cabo fixado direto na parede/teto, sem eletroduto nenhum. **D** = cabo
multipolar em eletroduto enterrado — o ramal de entrada enterrado; único método cuja ampacidade é
referida à temperatura do SOLO (20 °C), não do ar (30 °C), e cujo agrupamento usa a Tabela 45, não
a 42.

Fora do escopo desta ferramenta (instalação industrial, não residencial): E/F/G
(bandeja/leito/suporte).

## Tabela 36 — colunas B1, B2 e C nas duas contagens de condutores carregados

Conferida direto na tabela impressa (renderização de imagem — a extração por texto corrido
desalinha essa tabela, é o mesmo cuidado que já pegou o erro do 35 mm²/111 A na auditoria
original). Cobre, PVC, 70 °C. **Qual das duas colunas se aplica depende do esquema de condutores
vivos** — ver [§6.2.5.6 / Tabela 46](#6256--tabela-46--número-de-condutores-carregados):

| Seção (mm²) | B1 / 2c | B1 / 3c | B2 / 2c | B2 / 3c | C / 2c | C / 3c |
|---:|---:|---:|---:|---:|---:|---:|
| 1,5 | 17,5 | 15,5 | 16,5 | 15 | 19,5 | 17,5 |
| 2,5 | 24 | 21 | 23 | 20 | 27 | 24 |
| 4 | 32 | 28 | 30 | 27 | 36 | 32 |
| 6 | 41 | 36 | 38 | 34 | 46 | 41 |
| 10 | 57 | 50 | 52 | 46 | 63 | 57 |
| 16 | 76 | 68 | 69 | 62 | 85 | 76 |
| 25 | 101 | 89 | 90 | 80 | 112 | 96 |
| 35 | 125 | 110 | 111 | 99 | 138 | 119 |
| 50 | 151 | 134 | 133 | 118 | 168 | 144 |
| 70 | 192 | 171 | 168 | 149 | 213 | 184 |
| 95 | 232 | 207 | 201 | 179 | 258 | 223 |
| 120 | 269 | 239 | 232 | 206 | 299 | 259 |

Duas invariantes que servem de detector de deslize de coluna:

- **B2 < B1 < C** em toda a tabela, nas duas contagens: cabo multipolar dissipa pior que fios
  soltos (mais massa isolante junta); sem eletroduto (C), a dissipação é a melhor das três.
- **3c < 2c** em todo método e toda seção — é isso que torna a escolha de coluna uma questão de
  segurança, e não de preferência: usar a coluna de 2 onde cabem 3 superestima o Iz.

As colunas A1, A2 e D também estão transcritas em `TABELA_36_COBRE_PVC` (`constantes.js`) e
cobertas pelas invariantes estruturais do G2, mas ainda **não são selecionáveis** na ferramenta:
habilitá-las exige os fatores de correção próprios de cada uma (Tabela 40 coluna de solo e
Tabelas 44/45 de agrupamento enterrado, para o método D).

## Tabela 42, referência 2 — fator de agrupamento do método C

Enquanto B1/B2 usam a referência 1 (já documentada acima — "em feixe... embutidos... em conduto
fechado"), o método C (sem eletroduto) usa a **referência 2**: "camada única sobre parede, piso,
ou em bandeja não perfurada ou prateleira" — dissipa mais calor, por isso o fator é menos severo
que a referência 1 para o mesmo número de circuitos:

| Nº de circuitos | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | ≥9 |
|---|---|---|---|---|---|---|---|---|---|
| FCA (ref. 2, método C) | 1,00 | 0,85 | 0,79 | 0,75 | 0,73 | 0,72 | 0,72 | 0,71 | 0,70 |

(Comparar com a referência 1: em 3 circuitos, ref.1=0,70 vs ref.2=0,79 — diferença real, não
cosmética.) Referência 3 (camada única no teto) e as referências 4/5 (métodos E/F, bandeja) não
são usadas por esta ferramenta — fora do escopo dos métodos de instalação suportados.

## §6.2.6.2 / Tabela 48 — Redução do condutor neutro

Texto integral conferido no PDF:

> §6.2.6.2.2 — O condutor neutro de um circuito **monofásico** deve ter a mesma seção do condutor
> de fase. [Sem exceção — nunca reduz.]
>
> §6.2.6.2.4 — A seção do condutor neutro de um circuito com **duas fases e neutro** não deve ser
> inferior à seção dos condutores de fase [...] [Sem exceção prática residencial — nunca reduz.]
>
> §6.2.6.2.6 — Num circuito **trifásico com neutro** e cujos condutores de fase tenham seção
> **superior a 25 mm²**, a seção do neutro pode ser inferior à das fases, sem ser inferior aos
> valores da Tabela 48, quando as TRÊS condições seguintes forem SIMULTANEAMENTE atendidas:
> a) o circuito for presumivelmente equilibrado, em serviço normal;
> b) a corrente das fases não contiver taxa de 3ª harmônica e múltiplos superior a 15%; e
> c) o condutor neutro for protegido contra sobrecorrentes conforme 5.3.2.2.

Ou seja: só o **alimentador trifásico** desta ferramenta pode reduzir o neutro, e só quando a fase
passa de 25 mm² — nunca um circuito terminal (sempre monofásico ou fase-fase sem neutro aqui).

| Seção da fase (mm²) | Seção reduzida do neutro (mm²) |
|---|---|
| ≤ 25 | = fase (Tabela 48 nem começa) |
| 35 | 25 |
| 50 | 25 |
| 70 | 35 |
| 95 | 50 |
| 120 | 70 |
| 150 | 70 |
| 185 | 95 |
| 240 | 120 |
| 300 | 150 |
| 400 | 185 |

**Não confundir com a Tabela 58** (seção do condutor de PROTEÇÃO/terra) — são tabelas diferentes,
para condutores diferentes, com regras de redução diferentes. A Tabela 58 já era aplicada
corretamente antes desta mudança; a Tabela 48 (neutro) é a que estava faltando.

## §5.3.5.1 — Curto-circuito por circuito terminal (propagação de Icc por impedância)

Implementado em `frontend/src/calculations/curtoCircuito.js` (`propagarIccTerminal`), consumido por
`projeto.js` (`calcularProjetoCompleto`).

> §5.3.5.1 — "As correntes de curto-circuito presumidas devem ser determinadas em todos os pontos
> da instalação julgados necessários. Essa determinação pode ser efetuada por **cálculo ou por
> medição**."

Esta é a cláusula que decide a abordagem: a norma autoriza explicitamente **calcular** a Icc num
ponto a jusante, então a ferramenta deriva a Icc de cada circuito terminal a partir da Icc já
declarada no alimentador (opt-in, mesma `iccPresumidaA` do §5.3.5 do alimentador), encadeando a
impedância do trecho — sem exigir uma nova declaração do usuário por circuito.

**Modelo (engenharia elétrica geral, fonte externa — não é conteúdo tabelado da NBR 5410, mesma
categoria já registrada para o cálculo vetorial do neutro):**

- Impedância de um trecho: laço de 2 condutores (ida e volta), **sempre**, mesmo para o alimentador
  trifásico — um curto-circuito fase-neutro só percorre 1 fase + o neutro, nunca as 3 fases (regime
  físico diferente da queda de tensão em operação normal balanceada, onde o neutro não retorna
  corrente). `r = 2×comprimento×(1/(condutividade×secaoMm2))`, `x = 2×comprimento×reatânciaPorMetro`
  — reaproveita a mesma condutividade (`ISOLACOES`) e a mesma tabela de reatância
  (`obterReatanciaOhmMetro`) já usadas em `quedaDeTensao.js`.
- Usa a seção de FASE para os dois condutores do laço, mesmo se o neutro estiver reduzido pela
  Tabela 48 — simplificação deliberadamente conservadora: um neutro mais fino teria impedância REAL
  maior (Icc real menor); assumir a seção de fase nos dois condutores subestima a impedância e
  superestima a Icc, no sentido seguro para I²t≤k²S² (mais Icc assumida → mais difícil de passar).
- Impedância da fonte (rede/transformador a montante do ponto de entrega):
  `Xfonte = tensaoFaseNeutro / iccPresumidaA`, tratada como **puramente reativa** — convenção usual
  de estudo de curto-circuito em BT (impedância de rede dominada pela reatância).
- R's e X's são somados **separadamente** ao longo da cadeia (fonte → alimentador → terminal), não
  as magnitudes de cada trecho — somar magnitudes diretamente superestimaria a impedância total
  (desigualdade triangular) e subestimaria a Icc, permissivo demais para este critério.
- `Icc_terminal = tensão do circuito terminal / |Z_total|`.

**Escopo: só circuitos ligados fase-neutro.** Um circuito fase-fase (`ehFaseFase: true`) tem um
laço de falta fisicamente diferente (2 condutores de FASE, não fase+neutro) referido a outra tensão
de base — propagar a Icc corretamente exigiria converter entre tipos de falta, que é estudo de
curto-circuito de verdade, fora do escopo desta ferramenta. Esses circuitos sempre devolvem
`verificado: false` com o motivo explícito, nunca a fórmula fase-neutro fora do regime em que vale.

A curva do disjuntor usada na verificação (`verificarCurtoCircuito`, já existente) é a mesma
declarada para o disjuntor geral (`curvaDisjuntorGeral`) — simplificação documentada: a ferramenta
não coleta uma curva por circuito terminal.

## §5.3.5 / Tabela 30 — Curto-circuito

Fórmula (§5.3.5.5.2), confirmada no PDF:

> ∫i²dt ≤ k²·S² ... Para curtos-circuitos de qualquer duração em que a assimetria da corrente não
> seja significativa, e para curtos-circuitos assimétricos de duração 0,1 s ≤ t ≤ 5 s, pode-se
> escrever: **I²·t ≤ k²·S²**, onde I é a corrente de curto-circuito presumida simétrica (valor
> eficaz) e t a duração do curto-circuito.

Tabela 30, cobre: **PVC k = 115** até 300 mm² (a única faixa que esta ferramenta alcança, maior
seção considerada 120 mm²), 103 acima disso; **EPR/XLPE k = 143** (ver a seção "§5.3.5.5.2 / Tabela
30 — fator k por isolação", acima, para a tabela completa e a fonte).

**Icc (I) não é um dado da NBR 5410** — é a corrente de curto-circuito presumida NO PONTO, que
depende da rede real (potência do transformador da concessionária, distância, impedância do
ramal). Só um laudo/estudo da concessionária, ou um profissional com acesso a esses dados, tem
esse número — por isso é um campo opcional, nunca obrigatório nem estimado por padrão.

**Tempo de atuação (t):** também não vem da NBR 5410 — vem da curva tempo×corrente do disjuntor
específico (dado de fabricante, regido pela IEC 60898, não pela 5410). Nesta ferramenta, só é
possível aproximar quando a Icc informada está na faixa de disparo **instantâneo** (magnético) do
disjuntor — ali o tempo de atuação é rápido e previsível o bastante (~10 ms, meio ciclo de 60 Hz)
para usar como aproximação de triagem:

| Curva (IEC 60898) | Multiplicador de disparo instantâneo | Uso típico |
|---|---|---|
| B | 3× a 5× In | cargas resistivas puras, picos de partida baixos |
| C | 5× a 10× In | uso geral residencial — a mais comum no Brasil |
| D | 10× a 20× In | motores/transformadores com pico de partida alto |

Abaixo do limiar de disparo instantâneo, a atuação cai na faixa térmica/tempo-corrente do
disjuntor — aí só a curva completa do fabricante (que esta ferramenta não tem) permite calcular o
tempo real, e o resultado fica **não verificável com os dados disponíveis**, em vez de aplicar os
10 ms fora da faixa em que essa aproximação vale.

**O limiar é o limite SUPERIOR da faixa** (B 5×, C 10×, D 20× In) — corrigido em 28/09/2026. Na
IEC 60898 (fonte externa) o limite inferior é o ponto de **não** atuação instantânea e o superior
o de atuação garantida em < 0,1 s; entre os dois o disjuntor pode levar segundos. Até 28/09 a
ferramenta usava o limite inferior, o que aprovava com 10 ms correntes que talvez só disparassem na
região térmica (G9.5).

### §6.3.4.3.2 — as duas pontas do trecho (confirmado no PDF)

> Para aplicação das prescrições de 5.3.5 a curtos-circuitos de duração no máximo igual a 5 s, os
> disjuntores devem atender às duas condições a seguir: a) Ia ≤ Ikmin; b) Ib ≥ Ik. [...] Ikmin é a
> corrente de curto-circuito mínima presumida; [...] Ik é a corrente de curto-circuito **máxima
> presumida no ponto de instalação do disjuntor**.

Consequência para esta ferramenta: a energia I²t de um circuito terminal é verificada com a Icc
**no quadro** (onde o disjuntor está), e o disparo instantâneo garantido com a Icc **na ponta** do
circuito (Ikmin). Até 28/09 o I²t usava a Icc da ponta — a menor do trecho, permissivo. Caso
reproduzido antes da correção: 127 V, Icc 6 kA na origem, ramal 5 m/10 mm², TUG 2,5 mm² de 25 m,
16 A C → ponta 282 A "conforme"; no quadro 4 096 A → I²t = 1,68·10⁵ > k²S² = 8,27·10⁴, não conforme
(G23.5).

Implementado em `frontend/src/calculations/curtoCircuito.js`.

## Reatância por seção (fonte externa — não é dado da NBR 5410)

O texto completo do `NBR-5410.pdf` **não contém a palavra "reatância" em lugar nenhum** (busca de
texto completo, não amostragem) — não existe uma tabela de reatância na norma. O valor precisa vir
de fonte externa, mesma lógica já usada para diâmetro de cabo/eletroduto (acima) e para as curvas
IEC 60898 do disjuntor.

Fonte: catálogo técnico do fabricante **Cordeiro** (`COR_005_CatalogoTecnico_Digital_PT.pdf`,
público em `cordeiro.com.br`), **Tabela 8 — "Resistências elétricas e reatâncias indutivas de fios
e cabos isolados em PVC, HEPR e XLPE em CONDUTOS FECHADOS"** — bate com o cenário desta ferramenta
(métodos B1/B2, cabos em eletroduto):

| Seção (mm²) | 1,5 | 2,5 | 4 | 6 | 10 | 16 | 25 | 35 | 50 | 70 | 95 | 120 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Reatância (Ω/km) | 0,16 | 0,15 | 0,14 | 0,13 | 0,13 | 0,12 | 0,12 | 0,11 | 0,11 | 0,10 | 0,10 | 0,10 |

O mesmo catálogo também tabela "ao ar livre" (Tabela 9/10, cenário do método C — cabo direto na
parede/teto) com uma coluna `S = de` (espaçamento igual ao diâmetro do cabo, cabos encostados) —
os valores são praticamente idênticos seção a seção (diferença ≤ 0,01 Ω/km) aos de conduto
fechado, fisicamente esperado já que a reatância depende principalmente do espaçamento entre
condutores, parecido nos dois casos. Por isso esta ferramenta usa **só a Tabela 8** (cobre exatamente
as seções já usadas em `TABELA_AMPACIDADE_MM2`, sem buracos) para os três métodos B1/B2/C, em vez
de manter duas tabelas quase idênticas.

O próprio catálogo nota (seção "Cálculo reatâncias indutivas"): *"a reatância para seções pequenas
(< 50 mm²) pode desprezar-se em geral"* — confirma que a constante fixa usada antes desta tabela
existir (~0,08 Ω/km) nunca foi um valor absurdo, só impreciso nas duas pontas da faixa: subestimava
em seções pequenas (real ~0,15-0,16 Ω/km) e superestimava um pouco nas grandes (real ~0,10 Ω/km).

Implementado em `frontend/src/calculations/constantes.js` (`TABELA_REATANCIA_OHM_KM_POR_MM2`,
`obterReatanciaOhmMetro`), consumido por `quedaDeTensao.js`.

## §5.4.2 / §6.3.5.2.1 — DPS: exigência condicional e Classe I

**A NBR 5410:2004 não usa a nomenclatura "Classe I/II/III" para DPS** — confirmado por busca no
texto completo do PDF: "classe I ou II" só aparece na classificação de isolação de EQUIPAMENTO
(ex.: "aquecedores de água elétricos classe I ou II", §9.1.4.4.2), sem relação com DPS. A
classificação Classe I/II/III (≈ Type 1/2/3, IEC 61643) é terminologia de MERCADO/produto — mas as
duas cláusulas normativas por trás dela são objetivas e estão na norma:

> §5.4.2.1.1 — Deve ser provida proteção contra sobretensões transitórias [...] nos seguintes
> casos: a) quando a instalação for alimentada por linha total ou parcialmente aérea, ou incluir
> ela própria linha aérea, e se situar em região sob condições de influências externas **AQ2**
> (mais de 25 dias de trovoadas por ano); b) quando a instalação se situar em região sob condições
> de influências externas **AQ3** (ver Tabela 15).
>
> §5.4.2.1.2 — A proteção [...] deve ser provida: a) por dispositivos de proteção contra surtos
> (DPSs), conforme 6.3.5.2; ou b) por outros meios [...] de atenuação equivalente.

Ou seja: proteção contra surtos só é **exigência normativa** condicionada a (alimentação aérea E
alto índice de descargas) OU região AQ3 (Tabela 15) — fora dessas condições, é recomendação de boa
prática, não uma exigência que a norma imponha sempre. Esta ferramenta não embute a Tabela 15
completa (mapeamento geográfico de todo o Brasil) — usa autodeclaração do usuário, mesma lógica já
usada para a Tabela 48/Icc.

> §6.3.5.2.1 — [...] a) quando o objetivo for a proteção contra sobretensões de origem atmosférica
> transmitidas pela linha externa de alimentação, bem como a proteção contra sobretensões de
> manobra, os DPS devem ser instalados junto ao ponto de entrada [...] ou no quadro de distribuição
> principal [...]; ou b) quando o objetivo for a proteção contra sobretensões provocadas por
> **descargas atmosféricas diretas sobre a edificação ou em suas proximidades**, os DPS devem ser
> instalados no ponto de entrada da linha na edificação.

A alínea b) — proteção contra descarga DIRETA (edificação isolada, alta, ou com para-raios/SPDA
próprio) — é o que o mercado chama de DPS Classe I, usado **junto** com a Classe II (alínea a), não
no lugar dela. §6.3.5.2.4 lista os critérios de seleção do DPS (IEC 61643-1): nível de proteção,
máxima tensão de operação contínua, suportabilidade a sobretensões temporárias, corrente nominal
de descarga e/ou de impulso, suportabilidade à corrente de curto-circuito — nenhum desses valores
específicos de produto está implementado (fora de escopo, a definir em projeto).

Implementado em `frontend/src/calculations/protecaoGeral.js` (`recomendarDPS`) — 3 declarações
opcionais do usuário (`alimentacaoAerea`, `regiaoAltoIndiceDescargas`, `exposicaoDescargaDireta`).

## §6.2.6.2 — Cálculo vetorial completo (corrente de fase e do neutro)

A norma não prescreve COMO calcular a corrente de cada fase/do neutro num sistema com cargas
mistas — isso é teoria de circuitos elétricos (trifásico a 4 fios, estrela), não conteúdo
normativo específico da NBR 5410. Documentado aqui porque sustenta a verificação real da corrente
do neutro (§6.2.6.2, que antes só derivava a seção do neutro por tabela, nunca calculada/verificada
contra uma corrente real).

**Modelo:** fonte trifásica a 4 fios (estrela), tensões de fase V_A=V∠0°, V_B=V∠-120°, V_C=V∠+120°.
Por circuito, com P = potênciaVA×cosφ e Q = potênciaVA×senφ (sinal +1 indutiva, -1 capacitiva):

- Fase-neutro na fase X (ângulo θx): `I = ((P·cosθx + Q·senθx)/V, (P·senθx − Q·cosθx)/V)`
  (derivação: S = V·I* ⟹ I = S*/V*, com 1/V* = V/|V|²).
- Fase-fase entre X e Y: tensão de referência por **subtração direta de componentes**
  (`Vxy = Vx − Vy`, nunca um atalho de ângulo fixo tipo "+30°" — esse atalho só vale para pares
  adjacentes na rotação A-B-C e erra o sinal do ângulo em 60° para o par A-C, que "anda para trás"
  na rotação). Mesma fórmula acima com `(θxy, |Vxy|)` no lugar de `(θx, V)`; soma o resultado no
  acumulador de X e a NEGATIVA no acumulador de Y (uma malha só, nunca passa pelo neutro).
- Corrente do neutro: `I_neutro = |acumulador A + acumulador B + acumulador C|` — prova por KCL na
  fonte (região fechada pelos 4 condutores A/B/C/N): `I_A+I_B+I_C+I_N=0` sempre, qualquer topologia
  de carga. Um circuito fase-fase contribui `+I` numa fase e `−I` noutra; a soma dessa contribuição
  nas 3 fases é sempre 0 (cancela sozinha), então só sobra a contribuição líquida dos circuitos
  fase-neutro — correto, já que fase-fase nunca usa o neutro.

**Resultados não intuitivos, conferidos numericamente antes de implementar** (V=127 V, cargas de
1000 VA de referência — replicados em `verificar.mjs`, grupo G14): 3 cargas resistivas iguais, uma
por fase (equilibrado) → corrente do neutro ≈ 0. Uma única carga sozinha numa fase → corrente do
neutro = exatamente a corrente dessa fase. Duas cargas iguais em 2 fases (3ª vazia) → corrente do
neutro = a MESMA magnitude de uma fase isolada, não o dobro nem ×√3 (`|Ia+Ib|² = Ia²+Ib²+2·Ia·Ib·cos120° = Ia²`
quando Ia=Ib, já que cos120°=-0,5).

**A hipótese "a corrente do neutro nunca excede a maior corrente de fase" é FALSA em geral** —
contraexemplo: fase A resistiva, fase B capacitiva (cosφ=0,7), fase C indutiva (cosφ=0,7), mesma
potência nas 3 → a corrente do neutro fica ~54% ACIMA da maior corrente de fase (fatores de potência
de sinal oposto em fases diferentes — cenário real, já que esta ferramenta permite classificar TUE
como capacitiva). Por isso a verificação da corrente do neutro contra a ampacidade do condutor
adotado roda **sempre**, não só quando o neutro é reduzido pela Tabela 48.

Implementado em `frontend/src/calculations/circuitos.js` (`calcularCorrentesVetoriais`), consumido
por `protecaoGeral.js` (`dimensionarProtecaoGeral`, campo `verificacaoNeutro`).

---

## §9.1 — Locais contendo banheira ou chuveiro

Seção majoritariamente geométrica/checklist (não tabular como as Tabelas 36-45) — o único fator
numérico reaproveitável no motor de cálculo é a sensibilidade do DR, que a ferramenta já satisfaz
por uma simplificação conservadora existente (IDR geral único, sempre 30 mA — ver
`IDR_SENSIBILIDADE_ALTA_MA`, `protecaoGeral.js`). Implementado em `frontend/src/calculations/locaisEspeciais.js`
(`avaliarRequisitosBanheiro`).

### §9.1.1 — Campo de aplicação
Aplica-se a locais contendo banheira, piso-boxe, boxe ou outro compartimento para banho. A
ferramenta presume que todo cômodo cadastrado com `tipo: 'banheiro'` (já usado desde a previsão de
carga, §9.5.2.2.2) contém banheira/chuveiro — simplificação conservadora, nunca um falso-negativo.

### §9.1.2.1 — Volumes 0 a 3 (geometria de referência)

| Volume | Definição | Grau de proteção mínimo (§9.1.4.1) |
|---|---|---|
| 0 | interior da banheira/piso-boxe/rebaixo do boxe (local inundável em uso normal) | IPX7 |
| 1 | volume 0 + superfície vertical 0,6 m ao redor do chuveiro/ducha (ou da banheira/boxe), até 2,25 m de altura | IPX4 |
| 2 | volume 1 + faixa adicional de 0,60 m, até 3 m de altura | IPX3–IPX5 (banheiros públicos) |
| 3 | volume 2 + faixa adicional de 2,40 m, até 2,25 m de altura | IPX1–IPX5 (banheiros públicos) |

Nota: dimensões medidas considerando paredes/divisórias fixas. Espaço sob banheira/piso-boxe:
volume 1 se aberto, volume 3 se fechado com tampa que só abre com ferramenta.

### §9.1.3.1.1 — SELV no volume 0
Só é admitido SELV (≤ **12 V** nominal) no volume 0, com isolação capaz de suportar ensaio de
500 V/1 min (ou barreira/invólucro IP2X/IPXXB), e a fonte de segurança instalada fora do volume 0.

### §9.1.3.1.2 — Equipotencialização suplementar
> "Deve ser realizada uma equipotencialização suplementar, reunindo todos os elementos condutivos
> dos volumes 0, 1, 2 e 3 e os condutores de proteção de todas as massas situadas nesses volumes."

Sem condição de dispensa no texto da norma — só as massas SELV do volume 0 ficam de fora (por
definição, nunca são aterradas). A ferramenta expõe isto como exigência sempre que há banheiro no
projeto (campo `equipotencializacaoSuplementarExigida`), sem verificar a execução física (é uma
ligação, não um cálculo).

### §9.1.4.3.1 / §9.1.4.3.2 — Proibições e tomada no volume 3
Nenhum dispositivo de proteção, seccionamento ou comando (inclui tomada) nos volumes 0, 1 e 2.
Tomada só no volume 3, com: (a) transformador de separação, OU (b) SELV, OU (c) DR com I∆n ≤ 30 mA.

### §9.1.4.4 — Classe de equipamento por volume
Volume 1: só aquecedor de água elétrico classe I ou II. Volume 2: luminária classe II + aquecedor
classe I ou II. Não se aplica a equipamentos SELV.

### §5.1.3.2.2 a) — DR ≤30mA para os circuitos do local (já satisfeito hoje)
A exigência ampla de DR ≤30mA para "circuitos que sirvam a pontos de utilização em locais contendo
banheira ou chuveiro" está em §5.1.3.2.2 a), não dentro do próprio §9.1 (que só menciona DR em dois
casos pontuais do volume 3: linha em eletroduto metálico embutido, e tomada). Como o IDR geral desta
ferramenta é único, a montante de TODOS os circuitos, e sempre 30 mA (`IDR_SENSIBILIDADE_ALTA_MA`),
essa exigência já é estruturalmente satisfeita — mais rigorosa que o mínimo normativo, que só exige
DR nos circuitos que efetivamente servem o local molhado. Campo `drAtendePorIdrGeral`.

### N19 (30/09/2026) — Verificação geométrica real, pela planta
Implementado em `VolumesBanheiro.jsx` + `locaisEspeciais.js` (`classificarVolume`,
`verificarPontosBanheiro`): o usuário marca a caixa do chuveiro/banheira (largura × profundidade,
em metros; 0×0 representa "sem piso-boxe", Figura 18) e cada ponto elétrico (posição x,y relativa
à caixa + altura), na planta (imagem/PDF, com a mesma escala de F9) ou direto em campos numéricos —
sem precisar de imagem nenhuma, então continua acessível por teclado.

A distância horizontal do ponto até a caixa usa a fórmula padrão de distância ponto-retângulo
(`dx`/`dy` "clampados" a 0 dentro de cada eixo da caixa); quando a caixa é 0×0, a mesma fórmula já
dá a distância até um ponto, sem precisar de um caso especial para a Figura 18. Classificação:

| Distância horizontal | Altura | Volume |
|---|---|---|
| = 0 (dentro da caixa) | qualquer | 0 |
| ≤ 0,6 m | ≤ 2,25 m | 1 |
| ≤ 0,6 m | 2,25–3 m | **2** (ver nota abaixo) |
| ≤ 1,2 m | ≤ 3 m | 2 |
| ≤ 1,2 m | > 3 m | fora |
| ≤ 3,6 m | ≤ 2,25 m | 3 |
| ≤ 3,6 m | > 2,25 m | fora |
| > 3,6 m | qualquer | fora |

**Simplificação conservadora, documentada:** a faixa de 0 a 0,6 m de distância, entre 2,25 e 3 m de
altura — diretamente acima do volume 1 — é classificada como volume 2. As Figuras 16-18 da norma
(imagens, não reproduzíveis por extração de texto) desenham essa faixa como uma "tampa" sobre o
volume 1; sem poder conferir a figura, adotou-se a leitura mais restritiva (fica dentro de um
volume protegido), nunca a mais permissiva (ficaria fora de qualquer volume).

Cada ponto tem um tipo (tomada, interruptor, luminária, aquecedor de água/chuveiro elétrico, outro
dispositivo) e a regra de conformidade aplicada é a do tipo, pelo volume calculado:

- **Tomada / interruptor / outro dispositivo** — proibido nos volumes 0, 1 e 2 (§9.1.4.3.1).
  Tomada no volume 3: conforme, citando que o DR ≤30mA desta ferramenta (sempre presente, §9.1.4.3.2
  c) já atende a condição. Interruptor/outro no volume 3 ou fora: conforme, sem condição adicional
  (a norma só condiciona a TOMADA no volume 3, não o interruptor).
- **Luminária** — proibida nos volumes 0 e 1 (só é prevista a partir do volume 2, classe II,
  §9.1.4.4); conforme no volume 2 (com a ressalva de conferir a classe do equipamento) e sem
  restrição a partir do volume 3.
- **Aquecedor de água/chuveiro elétrico** — proibido só no volume 0; conforme nos volumes 1 e 2
  (classe I ou II, §9.1.4.4, com a mesma ressalva de conferir a classe) e sem restrição a partir do
  volume 3.

Um ponto sem altura declarada não é classificado — fica fora da lista (nem "conforme" nem "não
conforme"), em vez de assumir uma altura que ninguém informou.

Sem geometria marcada (`comodo.geometriaBanheiro` ausente), a ferramenta continua só com o
checklist informativo da tabela de volumes acima — o recurso é aditivo (G33.8 trava essa
regressão). Resultado integrado a `locaisEspeciais.pontosPorComodo`/`pontosNaoConformes`, ao
veredito (`calcularVeredito`), ao checklist do Memorial (`montarChecklists`) e à tela de Proteção
Geral.

## Sprint 3 (28/09/2026) — verificações complementares

Todas conferidas no PDF (`pdftotext -layout` e `-raw`); implementadas em
`frontend/src/calculations/complementares.js`, critérios G24.

### §4.2.2.2 — Esquemas de aterramento

TN-S (neutro e PE distintos), TN-C-S (funções combinadas num único condutor PEN em parte do
esquema), TN-C (combinadas em todo o esquema), TT (massas em eletrodo distinto do da alimentação) e
IT. Residencial: só TN-S, TN-C-S e TT são oferecidos; declaração do usuário.

### §5.3.4.1 b) — I₂ ≤ 1,45·Iz

> I2 é a corrente convencional de atuação, para disjuntores [...].

A norma não fixa I₂: para disjuntor IEC 60898 / NBR NM 60898 ela é 1,45·In (fonte externa, norma de
produto). Com isso a condição b) equivale a In ≤ Iz.

### §5.3.5.5.1 — Capacidade de interrupção

> A capacidade de interrupção do dispositivo deve ser no mínimo igual à corrente de curto-circuito
> presumida no ponto onde for instalado.

Disjuntor geral: Icc declarada na origem. Disjuntores dos circuitos: Icc no quadro (propagada pelo
alimentador). Sem comprimento do ramal, a Icc do quadro vale a da origem (lado seguro).

### §6.3.5.2.4 / Tabelas 31 e 49 / §6.3.5.2.9 — Especificação do DPS

- a) Up compatível com a **categoria II** da Tabela 31. Colunas da tabela, em ordem: IV, III, II, I.
  127/220 V → 4 / 2,5 / **1,5** / 0,8 kV; 220/380 V → 6 / 4 / **2,5** / 1,5 kV (bate com a Nota 1:
  "220/380 V, o nível de proteção Up do DPS não deve ser superior a 2,5 kV").
- b) Tabela 49, Uc mínimo: fase-neutro e fase-PE **1,1·Uo** em TT e TN-S; neutro-PE **Uo**. (Colunas
  lidas pelo número de valores de cada linha: a linha fase-neutro tem 3 valores — TT, TN-S, IT com
  neutro; TN-C não tem neutro separado.)
- d) In ≥ **5 kA** (8/20 µs) por modo; no esquema de conexão 3 (neutro-PE) ≥ 20 kA em redes
  trifásicas e 10 kA em monofásicas. Contra descarga direta, Iimp pela IEC 61312-1 ou, sem
  determinar, ≥ **12,5 kA** por modo.
- §6.3.5.2.9: DPS-PE ≥ **4 mm²** cobre (≥ **16 mm²** contra descarga direta); comprimento total das
  ligações de preferência ≤ **0,5 m**.

A tensão "Un ≈ 175 / 275 V" mostrada no Resultado é o Uc comercial típico, acima dos mínimos
normativos (139,7 V e 242 V).

### §6.4.1.2.1 / Tabela 52 — Condutor de aterramento enterrado (cobre)

| | Protegido contra danos mecânicos | Não protegido |
|---|---|---|
| Protegido contra corrosão | 2,5 mm² | 16 mm² |
| Não protegido contra corrosão | 50 mm² (solos ácidos ou alcalinos) | 50 mm² |

(A extração `-layout` perde a coluna de cobre; conferido com `-raw`.) A seção é dimensionada como
condutor de proteção (§6.4.3.1) — aqui o PE do alimentador — e nunca abaixo da tabela.

### §6.4.3.1.4 — PE fora do conduto

≥ 2,5 mm² cobre com proteção contra danos mecânicos; ≥ 4 mm² sem.

### §6.4.3.4.1 / §6.4.3.4.3 — Condutor PEN

PEN só em instalação fixa, seção ≥ **10 mm²** cobre / 16 mm² alumínio ("ditada por razões
mecânicas"). Depois de separado em N e PE, o neutro não pode ser religado a ponto aterrado nem ao PE.

### §6.4.4.1.1 / §6.4.4.1.2 — Equipotencialização

- Principal: ≥ metade do maior PE da instalação, mínimo **6 mm²** cobre, podendo ser limitada a
  **25 mm²**.
- Suplementar: massa × massa ≥ condutância do menor PE ligado a elas; massa × elemento condutivo ≥
  metade da condutância do PE da massa; em ambos, nunca abaixo de §6.4.3.1.4.

### §6.5.1.2.1 NOTA — Partida de motor

> Para partida direta de motores com potência acima de 3,7 kW (5 CV), em instalações alimentadas
> diretamente pela rede de distribuição pública em baixa tensão, deve ser consultada a empresa
> distribuidora local.

### §6.5.4.7 / Tabela 59 — Espaço de reserva

Até 6 circuitos → 2; 7 a 12 → 3; 13 a 30 → 4; N > 30 → 0,15·N (arredondado para cima). NOTA: "A
capacidade de reserva deve ser considerada no cálculo do alimentador" — sem valor em VA.

### §9.5.2.2.1 b) — Tomadas acima da bancada

> [...] acima da bancada da pia devem ser previstas no mínimo duas tomadas de corrente, no mesmo
> ponto ou em pontos distintos.

## Sprint 4 (28/09/2026) — seccionamento automático e DR por grupo

Conferido no PDF; implementado em `frontend/src/calculations/seccionamento.js`, critérios G25.

### §5.1.2.2.4.2 d) — Esquema TN

> [...] Considera-se a prescrição atendida se a seguinte condição for satisfeita: **Zs · Ia ≤ Uo**,
> onde Zs é a impedância do percurso da corrente de falta, composto da fonte, do condutor vivo, até o
> ponto de ocorrência da falta, e do condutor de proteção, do ponto de ocorrência da falta até a
> fonte; Ia é a corrente que assegura a atuação do dispositivo de proteção num tempo no máximo igual
> ao especificado na tabela 25, ou a 5 s, nos casos previstos na alínea c) de 5.1.2.2.4.1.

Tabela 25 (s): Uo 115/120/127 V → 0,8 (situação 1) / 0,35 (situação 2); 220, 254 e 277 V → 0,4 /
0,20; 400 V → 0,2 / 0,05. §5.1.2.2.4.1 c): até 5 s em circuitos de distribuição e em terminais só de
equipamentos fixos. §6.3.3.2.8: no TN-S e no trecho TN-S do TN-C-S o DR pode fazer o seccionamento
(Ia = IΔn). TN-C não admite DR (alínea f).

Modelo: Zs com a mesma fonte reativa da propagação de Icc (Uo/Icc) e volta pelo PEN (TN-C-S, o
neutro do alimentador até o quadro) ou PE (TN-S), mais o PE do circuito até o ponto mais distante.
Ia do disjuntor = limite superior da faixa magnética (C: 10×In, atuação < 0,1 s garantida pela IEC
60898), dentro de todos os tempos da Tabela 25 para Uo ≤ 277 V. Âncora G25.1: Zs = 0,556786 Ω.

### §5.1.2.2.4.3 b) e Anexo C — Esquema TT

> **RA · IΔn ≤ UL**, onde RA é a soma das resistências do eletrodo de aterramento e dos condutores de
> proteção das massas [...]. Quando, numa mesma instalação, houver massas em situações distintas [...]
> vinculadas ao mesmo eletrodo de aterramento, deve ser adotado o menor valor de UL.

Tabela C.2 (ca): UL = **50 V** (situação 1), **25 V** (situação 2), 12 V (situação 3). Tabela C.1
NOTA 1: volume 1 de banheiros é situação 2. Com DR de 30 mA: RA ≤ 1 667 Ω (50 V) ou 833 Ω (25 V).

### §6.3.3.2.6 e §6.3.6.3.2 — DR por grupo e seletividade

> Os dispositivos DR devem ser selecionados e os circuitos elétricos divididos de tal forma que as
> correntes de fuga à terra suscetíveis de circular durante o funcionamento normal das cargas
> alimentadas não possam provocar a atuação intempestiva do dispositivo. NOTA [...] nenhum circuito
> venha a apresentar corrente de fuga total, em condições normais, superior a 50% da corrente de
> disparo do dispositivo DR destinado a protegê-lo.

Seletividade (§6.3.6.3.2): montante com IΔn ≥ 3× a de jusante (IEC 61008/61009) e característica de
não atuação acima da de jusante — atendida com tipo S a montante (NOTA). §5.1.3.2.2 NOTA 5: a
proteção pode ser "por circuito ou por grupo de circuitos".

A norma não dá regra de corrente nominal do DR, só que ele seja protegido contra sobrecorrente
(§6.3.6.2.2). Critério desta ferramenta: In ≥ min(Σ In dos disjuntores do grupo, In do geral).
