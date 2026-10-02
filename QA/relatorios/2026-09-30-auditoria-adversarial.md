# Auditoria adversarial — NBR 5410

**Projeto:** Calculadora de Instalações Elétricas Residenciais
**Norma:** ABNT NBR 5410:2004 (versão corrigida 17.03.2008)
**Data:** 30/09/2026
**Premissa:** releitura do zero, sem crédito para nada. Cada tabela reconferida contra o PDF, cada
cláusula relida no texto, nenhum valor aceito por já estar no `valores-normativos.md`.
**Destinatário:** equipe de desenvolvimento

---

## Sumário

O harness passava 211/0. Depois desta auditoria: **211/11**. Nenhum dos 211 regrediu — os 11 são
divergências novas, encontradas relendo a norma contra o código, e já estão codificadas no grupo
`G34` de [`QA/scripts/verificar.mjs`](../scripts/verificar.mjs).

Nenhuma é crítica. **Duas apontam para o lado permissivo** (G34.5, G34.8) e são as que eu trataria
primeiro; as demais superdimensionam, mascaram uma ausência, ou são dado fabricado.

O que mudou desde 16/09 é real: os quatro subdimensionamentos e o erro de transcrição da auditoria
inicial foram corrigidos, e as tabelas grandes agora estão certas célula a célula. O que segue é o
que sobrou depois de procurar com má vontade.

### Conferido e correto

Registrado porque a lista de achados abaixo não faz sentido sem ela. Reconferido contra o PDF nesta
auditoria, sem usar o arquivo de referência como fonte:

| Item | Veredito |
|---|---|
| Tabela 36 (cobre/PVC) — **144 células, 12 colunas** | correto, incluindo A1/A2/D |
| Tabela 37 (cobre/EPR-XLPE) — 144 células | correto |
| Tabela 40 (FCT) — 4 colunas ar/solo × PVC/EPR | correto, incluindo os `null` reais |
| Tabela 41 (resistividade do solo) | correto |
| Tabela 42 ref. 1 e ref. 2 (FCA) | correto |
| Tabela 46 (condutores carregados) + fator 0,86 | correto, **inclusive a armadilha do "bifásico" brasileiro** (duas fases com neutro = 3 carregados) |
| Tabela 47 (seções mínimas) e a origem dos 10 mm² | correto, e corretamente atribuído a concessionária |
| Tabela 48 (valores) | correto de 35 mm² para cima |
| Tabela 52 (aterramento enterrado) — 2,5 / 16 / 50 mm² | correto |
| Tabela 30 (fator k) — 115 / 103 / 143 | correto |
| Tabela 25 (tempos de seccionamento TN) | correto |
| Tabela C.1 (situações) | correto |
| §6.2.11.1.6 a) — 53% / 31% / 40% | correto |
| §6.2.11.1.6 b) e §6.2.11.1.7 — 15/30 m, −3 m por curva, máx. 270° | correto |
| §9.1.4.1 / 9.1.4.3 / 9.1.4.4 — regras de equipamento por volume | correto |
| §9.4.4.3.2 — tomada proibida em qualquer volume da sauna | correto |
| §9.5.2.1.2 — `floor` em "4 m² inteiros" | correto |
| §9.5.2.2.1 b) e d) — `ceil` em "ou fração" | correto |
| §6.2.7 — orçamento acumulado 5% / 4% | correto |
| Queda de tensão — ρ na temperatura de operação, fator √3, reatância por seção | correto |

---

## Achados

### 1 · Lado permissivo (tratar primeiro)

#### 1.1 — Tabela C.2 transcrita sem a situação 3 (12 V)
**`G34.5` · Anexo C, Tabela C.2 / Tabela C.1 NOTA 2 · MÉDIO**
[`seccionamento.js:8`](../../frontend/src/calculations/seccionamento.js#L8)

```js
export const TENSAO_CONTATO_LIMITE_V = { situacao1: 50, situacao2: 25 }
```

A Tabela C.2 tem **três** colunas: situação 1 → 50 V, situação 2 → 25 V, **situação 3 → 12 V**. A
NOTA 2 da Tabela C.1 é explícita: *"Um exemplo da situação 3, que corresponde aos casos de corpo
imerso, é o do **volume zero de banheiros e piscinas**"*.

O próprio comentário de `tensaoContatoLimite` cita a regra certa — "massas em situações distintas no
mesmo eletrodo: adota-se o menor UL" — e então para em 25 V. Toda casa com banheiro tem um volume 0.

Impacto direto em `verificarSeccionamentoTT`: R_A ≤ UL / I∆n. Com 25 V e 30 mA, R_A ≤ 833 Ω. Com
12 V, R_A ≤ 400 Ω. **O limite de resistência de aterramento sai o dobro do que deveria.**

Contra-argumento honesto: no volume 0 só se admite SELV ≤ 12 V (§9.1.3.1.1), então não há massa em
tensão de rede ali. É defensável. Mas aí a decisão precisa estar escrita, e o valor de 12 V precisa
existir na constante que se declara transcrição da Tabela C.2.

#### 1.2 — Altura do volume 1 medida do plano errado
**`G34.8` · §9.1.2.1 b), c), d) · MÉDIO**
[`locaisEspeciais.js:43`](../../frontend/src/calculations/locaisEspeciais.js#L43)

A norma usa planos de referência **diferentes** para cada volume:

| Volume | Plano | Medido a partir de |
|---|---|---|
| 1 | 2,25 m | **fundo da banheira / piso do boxe / superfície onde a pessoa se posta** |
| 2 | 3 m | piso |
| 3 | 2,25 m | piso |

`classificarVolume` recebe uma única `alturaM` por ponto e compara com 2,25 e 3 sem saber a que
plano cada uma se refere. Numa banheira elevada ~0,5 m, o volume 1 vai até 2,75 m acima do piso: um
ponto a 2,5 m é classificado **volume 2** quando a norma diz **volume 1**.

Volume 2 admite luminária classe II; volume 1 admite **somente aquecedor de água**. A ferramenta
aprova uma luminária onde a norma proíbe.

---

### 2 · Geometria dos volumes do banheiro

#### 2.1 — Volume 0 sem teto de altura
**`G34.6` · §9.1.2.1 a) · MÉDIO**

```js
if (d === 0) return 0
```

Volume 0 é *"o volume interior da banheira, do piso-boxe ou do rebaixo do boxe (local inundável em
uso normal)"*. É um volume fechado, não uma coluna infinita.

Verificado: ponto sobre um piso-boxe 0,9×0,9 a **2,9 m** de altura → a ferramenta devolve volume 0.
A 10 m também. Acima de 2,25 m a norma já está no volume 2.

Consequência prática: luminária de teto sobre o box é reprovada como se exigisse SELV 12 V. Falso
positivo — e falso positivo em ferramenta de conformidade custa confiança, que é o ativo todo.

#### 2.2 — Volume 1 estendido 0,6 m além de um box declarado
**`G34.7` · §9.1.2.1 b) · MÉDIO**

O §9.1.2.1 b) delimita o volume 1 pela *"superfície vertical que circunscreve a banheira, o
piso-boxe, o rebaixo do boxe **ou, na falta de uma clara delimitação do boxe**, por uma superfície
vertical situada 0,6 m ao redor do chuveiro ou ducha"*.

Os 0,6 m são **a alternativa para quando não há box**. O código aplica sempre. O comentário assume
isso explicitamente ("não precisa de um caso especial para chuveiro sem piso-boxe") — mas a
unificação apaga um condicional da norma.

Como o volume 1 já sai 0,6 m maior, os volumes 2 e 3 saem junto:

| | Norma (box 0,9×0,9 declarado) | Ferramenta |
|---|---|---|
| Volume 1 | projeção do box | até 0,6 m da borda |
| Volume 2 | até 0,6 m da borda | 0,6 – 1,2 m |
| Volume 3 | até 0,6 + 2,40 = **3,0 m** | 1,2 – **3,6 m** |

Conservador em toda a faixa, mas é 0,6 m de volume inventado em cada fronteira.

#### 2.3 — NOTA 2 do §9.1.2.1 não modelada
**BAIXO (sem critério — depende de dado que a ferramenta não coleta)**

*"O espaço situado sob a banheira é considerado volume 1, se aberto, e considerado volume 3, se for
fechado e acessível apenas através de tampa que só possa ser removida com o uso de ferramenta."*

Hoje, ponto sob a banheira cai em volume 0 (mais restritivo que ambos). Conservador, mas é uma regra
distinta que não existe no modelo.

#### 2.4 — Faixa de IP sem a qualificação da norma
**BAIXO**

`VOLUMES_BANHEIRO` traz volume 2 = `IPX3–IPX5` e volume 3 = `IPX1–IPX5`. O §9.1.4.1 qualifica o
limite superior dos dois: *"(em banheiros públicos)"*. Numa calculadora residencial, mostrar a faixa
inteira sem dizer que o topo é para banheiro público induz a superespecificar.

---

### 3 · Dados e lacunas de tabela

#### 3.1 — Tabela 48 com uma linha que a norma não tem
**`G34.1` · §6.2.6.2.6 / Tabela 48 · BAIXO**
[`constantes.js:320`](../../frontend/src/calculations/constantes.js#L320)

```js
{ secaoFase: 25, secaoNeutro: 25 },   // não existe na Tabela 48
```

A Tabela 48 impressa começa em **35 mm²**. O §6.2.6.2.6 só autoriza neutro reduzido quando a fase é
*"superior a 25 mm²"* — uma linha em 25 contradiz a própria cláusula que a tabela serve.

A linha é inerte (o `early-return` de `obterSecaoNeutroReduzida` intercepta `<= 25`), então não há
efeito numérico. Mas é dado fabricado dentro de uma estrutura declarada como transcrição — e a
transcrição é exatamente o que este projeto já errou uma vez.

#### 3.2 — Tabela 45: só uma das duas sub-tabelas
**`G34.4` · Tabela 45 · MÉDIO**
[`constantes.js:522`](../../frontend/src/calculations/constantes.js#L522)

A Tabela 45 tem **duas** sub-tabelas:

| Nº circuitos (espaçamento nulo) | Cabos multipolares | Condutores isolados / unipolares |
|---|---|---|
| 2 | 0,85 | **0,80** |
| 3 | 0,75 | **0,70** |
| 4 | 0,70 | **0,65** |
| 5 | 0,65 | **0,60** |
| 6 | 0,60 | 0,60 |

Só a primeira foi transcrita. O rótulo do método D diz "cabo multipolar", o que torna a escolha
coerente **no papel** — mas o resto da ferramenta modela condutor unipolar: `DIAMETRO_EXTERNO_CONDUTOR_MM`
é cabo flexível unipolar, e a taxa de ocupação do eletroduto é calculada sobre ele. Selecionar D
combina fator de agrupamento de multipolar com geometria de unipolar, e o lado do agrupamento é o
menos severo.

#### 3.3 — k aplicado fora da faixa normalizada
**`G34.3` · Tabela 30, NOTA 1 · MÉDIO**
[`constantes.js:345`](../../frontend/src/calculations/constantes.js#L345)

A NOTA 1 da Tabela 30 é direta: *"Outros valores de k, para os casos mencionados abaixo, ainda não
estão normalizados: — condutores de pequena seção (**principalmente para seções inferiores a
10 mm²**)"*.

`obterK` devolve 115 para 1,5 / 2,5 / 4 / 6 mm² — ou seja, para **praticamente todo circuito terminal
residencial**. E `verificarCurtoCircuito` devolve `conforme: true|false` sem ressalva.

Isto destoa do resto do módulo, que é exemplar em recusar veredito fora do regime válido (fica
"não verificado" quando a Icc está abaixo do disparo instantâneo, e quando falta comprimento). O
mesmo rigor precisa valer aqui: abaixo de 10 mm², o resultado é triagem, não conformidade.

#### 3.4 — Harmônica acima de 33% indistinguível
**`G34.2` · §6.2.6.2.5 · MÉDIO**
[`constantes.js:236`](../../frontend/src/calculations/constantes.js#L236)

O tri-estado `nao-declarado | ate-15 | acima-15` foi uma boa decisão e o comentário que a justifica
está certo. Mas a norma tem **dois** limiares, não um:

- **15%** (§6.2.5.6.1) — o neutro vira condutor carregado, aplica-se 0,86
- **33%** (§6.2.6.2.5) — *"pode ser necessário um condutor neutro com seção **superior** à dos
  condutores de fase"*, dimensionado pelo Anexo F

"acima-15" trata 20% e 60% igual. O segundo caso pede neutro **maior** que a fase, e a ferramenta
não tem como nem dizer isso.

---

### 4 · Previsão de carga

#### 4.1 — Alternativa permissiva adotada em silêncio
**`G34.10` · §9.5.2.2.2 a) · MÉDIO**
[`previsaoDeCarga.js:63`](../../frontend/src/calculations/previsaoDeCarga.js#L63)

A regra base do §9.5.2.2.2 a) é 600 VA até **três** pontos. A redução para dois é introduzida por
**"admite-se"** — é faculdade, não prescrição.

`calcularLimite600VA` aplica automaticamente sempre que o conjunto passa de 6 pontos. Verificado
numa casa com cozinha + área de serviço + banheiro (8 pontos):

```
TUG calculada:              3300 VA
TUG pela leitura base:      4300 VA
                            1000 VA a menos, escolhidos pela ferramenta
```

As duas leituras são conformes. O problema não é o número — é que quem assina o projeto não é
informado de que a ferramenta optou pela que reduz a carga. Isso pertence à mesma família de decisões
que a ferramenta já expõe ao usuário (Tabela 48, Icc, harmônica): declaração opt-in, não default
silencioso.

#### 4.2 — Varanda com a regra dos "demais cômodos"
**`G34.9` · §9.5.2.2.1 c) vs e) · BAIXO**

A alínea c) é uma frase inteira: *"em varandas, deve ser previsto pelo menos um ponto de tomada"*.
Sem perímetro, sem área, sem fração. A regra de 1 ponto por 5 m é a alínea **e)**, dos demais cômodos.

O tipo `outro` funde as duas sob o rótulo "Varanda / Outro". Verificado: varanda de 12 m² com 16 m de
perímetro → **4 pontos**, onde a norma pede 1.

Superdimensiona, então não é risco. Mas são duas alíneas distintas colapsadas num tipo só, e o
usuário que cadastrar uma varanda grande recebe três tomadas que ninguém exigiu.

---

### 5 · Cobertura do próprio harness

#### 5.1 — Dupla digitação só cobre metade da Tabela 36
**`G34.11` · MÉDIO**

`TABELA_36_REFERENCIA` (a segunda digitação independente, que é a defesa que pegou o erro de 111 A)
cobre **B1, B2 e C**. Mas `METODOS_INSTALACAO` já expõe **A1, A2 e D**.

- 6 das 12 colunas da Tabela 36 não têm a guarda
- as 12 colunas da Tabela 37 não têm guarda nenhuma — só invariantes relacionais (EPR > PVC, razão
  entre 1,19 e 1,31)

As invariantes relacionais são boas e pegam erro de fase, mas não pegam uma célula trocada por outra
plausível. **Conferi A1/A2/D e a Tabela 37 inteira à mão contra o PDF nesta auditoria: estão
corretos.** O que falta é o critério que impede a regressão.

#### 5.2 — Documentação desatualizada
**BAIXO — sem critério**

| Arquivo | Diz | É |
|---|---|---|
| `.claude/skills/qa-nbr5410/SKILL.md` | grupos `G1..G6`, linha de base "50 conformes, 23 divergências" | `G1..G34`, 211 conformes |
| `QA/README.md` | lista grupos até G31 | existem G32 e G33 |
| `QA/README.md` | "nenhum dos **50** que passavam pode quebrar" | 211 |
| `QA/referencias/matriz-conformidade.md` | revisão 28/09 | há trabalho de 29–30/09 |

A skill é o arquivo que orienta quem for mexer nisso daqui em diante. Estar três fases atrasada é o
tipo de coisa que faz a próxima pessoa confiar num número errado.

---

## Plano de correção

| # | Achado | Critério | Esforço |
|---|---|---|---|
| 1 | Situação 3 (12 V) na Tabela C.2 | `G34.5` | trivial |
| 2 | Altura do volume 1 no plano do box | `G34.8` | médio (pede a altura do box como entrada) |
| 3 | Teto de altura do volume 0 | `G34.6` | trivial |
| 4 | Volume 1 não estende 0,6 m com box declarado | `G34.7` | baixo |
| 5 | k marcado como fora de faixa abaixo de 10 mm² | `G34.3` | trivial |
| 6 | Sub-tabela de condutores isolados da Tabela 45 | `G34.4` | baixo |
| 7 | Limiar de 33% de harmônica | `G34.2` | baixo |
| 8 | Alternativa dos 2 pontos vira opt-in | `G34.10` | baixo |
| 9 | Remover linha de 25 mm² da Tabela 48 | `G34.1` | trivial |
| 10 | Varanda com regra própria | `G34.9` | baixo |
| 11 | Dupla digitação para A1/A2/D e Tabela 37 | `G34.11` | médio (digitação) |
| 12 | Atualizar SKILL.md, README, matriz | — | trivial |

Ordem por risco: **1, 2 e 3 primeiro** (os dois primeiros porque apontam para o lado permissivo; o
terceiro porque gera falso positivo visível). O resto é higiene normativa.

---

### Ressalva

Auditoria de conformidade do motor de cálculo. Não substitui validação por profissional habilitado,
e a ferramenta declara corretamente que não substitui projeto com ART.
