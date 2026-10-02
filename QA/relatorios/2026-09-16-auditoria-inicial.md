# Relatório de auditoria de conformidade — NBR 5410

**Projeto:** Calculadora de Instalações Elétricas Residenciais
**Norma de referência:** ABNT NBR 5410:2004 (versão corrigida 17.03.2008)
**Data:** 16/09/2026
**Escopo auditado:** `frontend/src/calculations/` (motor de cálculo) e a camada de apresentação que o consome
**Destinatário:** equipe de desenvolvimento, para correção

---

## Sumário executivo

O motor cobre as quatro etapas previstas no `ESCOPO.md` de ponta a ponta e acerta vários pontos
onde implementações semelhantes costumam errar — em particular a distinção entre a lista de
ambientes de 600 VA (§9.5.2.2.2) e a lista de circuitos exclusivos (§9.5.3.2), que são diferentes.

Três conclusões estruturais:

1. **O escopo declarado da v1 não foi atingido.** O `ESCOPO.md` lista "fatores de correção
   (tabelas 40-45)" e "limites de 7%/5%/4% conforme o trecho" como entregas da v1. Nenhum dos dois
   está implementado.
2. **Quatro defeitos subdimensionam o resultado** — o sentido perigoso do erro. Os demais desvios
   são conservadores (superdimensionam), o que é aceitável como simplificação declarada.
3. **Não há nenhum teste automatizado.** É o que permitiu que um erro de transcrição de tabela
   (111 A onde a norma diz 110 A) permanecesse invisível. Esta auditoria entrega um harness
   executável que trava esses valores.

**Resultado da verificação automatizada:** 50 critérios conformes, 23 divergências
(5 críticas, 7 altas, 10 médias, 1 baixa).

Reproduzir com:
```bash
node QA/scripts/verificar.mjs
```

---

## Método

- Cada valor e cada citação foram conferidos contra o `NBR-5410.pdf` do próprio repositório
  (texto extraído com `pdftotext -layout`), não contra memória ou fontes secundárias. Os trechos
  relevantes estão consolidados em [`QA/referencias/valores-normativos.md`](../referencias/valores-normativos.md).
- Os números apresentados como evidência vêm da **execução real do motor de cálculo**, não de
  leitura do código.
- A rastreabilidade cláusula → implementação → teste está em
  [`QA/referencias/matriz-conformidade.md`](../referencias/matriz-conformidade.md).

Identificadores como `G4.5` referem-se aos critérios do harness — use-os nas mensagens de commit
para ligar correção a verificação.

---

## 1 · Defeitos que subdimensionam

Prioridade máxima: produzem resultado menos seguro que o exigido pela norma.

### 1.1 Fatores de correção não aplicados — Iz usa o valor bruto da tabela
**Severidade: CRÍTICA · `G4.5` · §5.3.4.1 a) + §6.2.6.1.2 a)**
**Local:** [`condutores.js:31`](../../frontend/src/calculations/condutores.js#L31)

`avaliarTrilhaSecao` compara `linha.ampacidade >= correnteNominalDisjuntorA`, usando a ampacidade
bruta da Tabela 36. Mas o §5.3.4.1 define I_z como "a capacidade de condução de corrente dos
condutores, **nas condições previstas para sua instalação** (ver 6.2.5)", e o §6.2.6.1.2 a) exige
a ampacidade "**afetada dos fatores de correção aplicáveis**". O valor corrigido é o critério
normativo — o bruto não é.

Verificado com FCA = 0,70 (Tabela 42 ref. 1, três circuitos em conduto fechado — a situação normal
de um quadro residencial no método B1 que a ferramenta assume):

| Circuito | In | Iz tabela | Iz × 0,70 | Resultado |
|---|---|---|---|---|
| TUG Cozinha/Área de serviço 1 | 16 A | 21 A | 14,7 A | In > Iz |
| TUG Cozinha/Área de serviço 2 | 16 A | 21 A | 14,7 A | In > Iz |
| TUG Salas/Dormitórios | 16 A | 21 A | 14,7 A | In > Iz |
| Chuveiro | 50 A | 50 A | 35,0 A | In > Iz |

Condutor desprotegido contra sobrecarga em 4 dos 4 circuitos com carga relevante.

**Correção:** aceitar número de circuitos agrupados e temperatura ambiente como entrada e aplicar
`Iz = Iz_tabela × FCT × FCA` antes da comparação. Tabelas 40 e 42 já estão transcritas em
`QA/referencias/valores-normativos.md`. Enquanto não houver entrada do usuário, adotar FCA
correspondente ao número de circuitos que a própria ferramenta gerou é melhor que assumir 1.

---

### 1.2 Queda de tensão acumulada nunca é verificada
**Severidade: CRÍTICA · `G5.4` · §6.2.7.1 c)**
**Local:** [`constantes.js:127`](../../frontend/src/calculations/constantes.js#L127), [`protecaoGeral.js:81`](../../frontend/src/calculations/protecaoGeral.js#L81)

Existe uma constante única de 4% aplicada isoladamente ao alimentador e ao circuito terminal. A
norma tem **dois limites cumulativos**: §6.2.7.2 limita o trecho terminal a 4%, e §6.2.7.1 c)
limita a queda **total no ponto de utilização** a 5% a partir do ponto de entrega. O alimentador
não tem orçamento próprio de 4% — ele consome o mesmo 5%.

Verificado: alimentador 20 m / 70,9 A / 25 mm² → 1,59%; terminal 28 m / 16 A / 2,5 mm² → 5,04%.
Total **6,63%**, acima do limite de 5%, com ambos os trechos avaliados isoladamente pela ferramenta.

Caso mais sutil, que também precisa reprovar: alimentador 3% + terminal 3% = 6%. Cada trecho passa
contra o limite de 4%; o conjunto viola o §6.2.7.1.

**Correção:** substituir a constante única por um orçamento acumulado — a queda do alimentador
reduz o teto disponível para cada circuito terminal, respeitando o menor entre (5% − queda do
alimentador) e 4%.

---

### 1.3 Resistência tomada a 20 °C em vez da temperatura de operação
**Severidade: ALTA · `G5.1` · §6.2.7 / Tabela 36**
**Local:** [`constantes.js:130`](../../frontend/src/calculations/constantes.js#L130), [`quedaDeTensao.js:16`](../../frontend/src/calculations/quedaDeTensao.js#L16)

`CONDUTIVIDADE_COBRE = 56` corresponde a ρ = 0,01786 Ω·mm²/m, o cobre a **20 °C**. A Tabela 36 é
definida para condutor a **70 °C**, onde ρ = 0,02137. A queda é calculada com uma resistência
~20% menor que a real em regime.

Verificado: circuito 2,5 mm² / 28 m / 16 A → a ferramenta reporta **5,04%**; o valor em regime é
**6,03%**. Um circuito reprovado aparece como marginal, e um marginal aparece como aprovado.

**Correção:** adotar σ ≈ 46,8 (ρ₇₀ = ρ₂₀ · [1 + 0,00393 · 50]) ou, melhor, tornar a temperatura de
operação explícita para acompanhar futuras isolações EPR/XLPE (90 °C).

---

### 1.4 Balanceamento subestima cargas fase-fase em 15,5%
**Severidade: ALTA · `G6.1` · cálculo de corrente por fase**
**Local:** [`circuitos.js:156-157`](../../frontend/src/calculations/circuitos.js#L156-L157), [`protecaoGeral.js:16`](../../frontend/src/calculations/protecaoGeral.js#L16)

`balancearFases` contabiliza `potenciaVA / 2` em cada uma das duas fases de uma carga fase-fase.
A corrente real que percorre **cada** fase é I = S / V_ff; expressa em VA referidos à tensão
fase-neutro, isso equivale a **S/√3** por fase, não S/2.

Verificado (chuveiro 5500 VA em 220 V): corrente real por fase **25,00 A**; o modelo implica
**21,65 A**.

O impacto não fica no balanceamento: `calcularCorrenteEntrada` deriva a corrente de entrada de
`max(cargaPorFase)`, então o erro se propaga para **o disjuntor geral, o IDR e a seção do
alimentador** — exatamente onde subdimensionar é mais caro.

**Correção:** trocar `potenciaVA / 2` por `potenciaVA / Math.sqrt(3)` nas duas fases.

---

## 2 · Erro de dados

### 2.1 Ampacidade de 35 mm² incorreta
**Severidade: ALTA · `G2.1-35` · Tabela 36**
**Local:** [`constantes.js:83`](../../frontend/src/calculations/constantes.js#L83)

`{ secao: 35, ampacidade: 111 }`. O valor **não corresponde a nenhuma coluna do método B1**:
B1/2 condutores = 125 A, B1/3 condutores = 110 A. O 111 A é a coluna **B2/2 condutores** da mesma
linha — deslize de uma coluna na transcrição. As outras 11 linhas estão consistentes.

**Correção:** 110 A (se mantida a coluna de 3 condutores) ou 125 A (se adotada a de 2 — ver 3.1).

---

## 3 · Desvios conservadores

Superdimensionam. Não são risco de segurança, mas afastam o resultado do mínimo normativo e
encarecem o projeto — e, nos casos abaixo, o código documenta o oposto do que faz.

### 3.1 Tabela de ampacidade é de 3 condutores carregados, documentada como 2
**Severidade: MÉDIA · `G2.2` · Tabela 36**
**Local:** [`constantes.js:73`](../../frontend/src/calculations/constantes.js#L73)

O comentário declara "2 condutores carregados"; os 12 valores correspondem à coluna de **3
condutores carregados**. Todo circuito terminal que a ferramenta gera é fase-neutro ou fase-fase —
**2 condutores carregados** nos dois casos. A coluna correta seria 17,5 / 24 / 32 / 41 / 57 / 76 / 101 / 125 / 151 / 192 / 232 / 269.

**Correção:** adotar a coluna de 2 condutores carregados e corrigir o comentário; ou manter 3
condutores como margem deliberada e dizer isso explicitamente. O que não pode permanecer é o
comentário afirmando o contrário do dado.

### 3.2 Carga de iluminação arredonda 4 m² para cima
**Severidade: MÉDIA · `G1.1` · §9.5.2.1.2 b)**
**Local:** [`previsaoDeCarga.js:10`](../../frontend/src/calculations/previsaoDeCarga.js#L10)

A norma diz "acrescida de 60 VA para cada aumento de **4 m² inteiros**" — só incremento completo
conta, portanto piso. O código usa `Math.ceil`.

Verificado: 12 m² → 220 VA (norma: 160) · 15 m² → 280 VA (norma: 220) · 20,15 m² → 340 VA
(norma: 280) · 25 m² → 400 VA (norma: 340). Sempre +60 VA. O erro se propaga para os circuitos e
para o alimentador.

**Correção:** `Math.floor(areaAdicional / 4)`.

### 3.3 Queda no alimentador trifásico usa fórmula monofásica
**Severidade: MÉDIA · `G6.2` · §6.2.7**
**Local:** [`quedaDeTensao.js:21`](../../frontend/src/calculations/quedaDeTensao.js#L21)

`2 · L · I` é aplicado a todos os trechos. Para alimentador trifásico o correto é √3 · L · I sobre
V_ff. Verificado: reporta **3,99%** onde o valor correto é **1,99%** — errado por fator 2.

**Correção:** parametrizar a fórmula pelo tipo de circuito (monofásico/fase-fase = 2; trifásico = √3).

---

## 4 · Lacunas normativas

### 4.1 Três dos seis critérios do §6.2.6.1.2 não existem
**Severidade: ALTA · `G4.8`, `G4.9`**

O §6.2.6.1.2 lista seis critérios obrigatórios para a seção do condutor. Ausentes:

- **c)** proteção contra curto-circuito e solicitação térmica (§5.3.5) — nenhuma corrente de
  curto-circuito presumida é calculada, nenhuma verificação de S ≥ I_cc·√t / k
- **d)** proteção contra choques por seccionamento automático (§5.1.2.2.4) — sem impedância de
  percurso nem tempo de atuação
- **a)** parcialmente, conforme item 1.1

### 4.2 Disjuntor de circuito terminal não informa polos
**Severidade: MÉDIA · `G4.7` · §9.5.4**

O §9.5.4 exige dispositivo que assegure seccionamento simultâneo de todos os condutores de fase —
multipolar quando há mais de uma fase, e unipolares com alavancas acopladas explicitamente não
contam. Circuitos TUE fase-fase ocupam duas fases e o resultado apresenta apenas "25 A". Só o IDR
expõe `polos`.

### 4.3 Faixa de disjuntores termina em 100 A
**Severidade: MÉDIA · `G4.6`**
**Local:** [`constantes.js`](../../frontend/src/calculations/constantes.js) (`DISJUNTORES_PADRONIZADOS`)

Verificado: Ib = 101 A retorna `null` e o circuito inteiro vira erro. Uma instalação trifásica de
porte quebra sem diagnóstico acionável.

### 4.4 Seção mínima do alimentador atribuída à norma errada
**Severidade: MÉDIA · `G4.3` · §6.2.6.1.1 / Tabela 47**
**Local:** [`constantes.js:90-96`](../../frontend/src/calculations/constantes.js#L90-L96)

Na Tabela 47, os 10 mm² Cu são a linha de **condutores nus**. Para cabo isolado em instalação fixa
o mínimo é 2,5 mm² (força). O piso de 10 mm² no ramal de entrada é exigência das **normas de
fornecimento das concessionárias**, não da NBR 5410. O comentário cita §6.2.5, que trata de
capacidade de condução — a cláusula de seções mínimas é §6.2.6.1.1.

### 4.5 Condutor de proteção só no alimentador
**Severidade: ALTA · `G6.4` · §6.4.3.1**

A Tabela 58 está implementada corretamente, mas aplicada apenas ao alimentador. Os circuitos
terminais não recebem seção de PE.

### 4.6 Circuito sem comprimento é declarado conforme
**Severidade: ALTA · `G5.5` · §6.2.6.1.2 e)**
**Local:** [`condutores.js:129`](../../frontend/src/calculations/condutores.js#L129)

Comprimento ausente vira `0` e a queda resulta 0%, com `conforme: true`. Verificado: a ferramenta
emite dimensionamento aprovado sem ter verificado um critério obrigatório. Precisa distinguir
"conforme" de "não verificado".

### 4.7 Citações normativas incorretas
**Severidade: MÉDIA (rastreabilidade)**

Relevante porque o roadmap prevê memorial técnico exportável — um memorial que cita cláusula
errada é pior que um sem citação.

| Local | Cita | Correto |
|---|---|---|
| [`constantes.js:62`](../../frontend/src/calculations/constantes.js#L62), [`previsaoDeCarga.js:31`](../../frontend/src/calculations/previsaoDeCarga.js#L31) | §9.5.2.3 | **§9.5.2.2.2** — §9.5.2.3 é *"Aquecimento elétrico de água"* |
| [`previsaoDeCarga.js:14`](../../frontend/src/calculations/previsaoDeCarga.js#L14) | §9.5.2.2 | **§9.5.2.2.1** |
| [`previsaoDeCarga.js:3`](../../frontend/src/calculations/previsaoDeCarga.js#L3) | §9.5.2.1 | **§9.5.2.1.2** |
| [`constantes.js:90`](../../frontend/src/calculations/constantes.js#L90), [`protecaoGeral.js:50`](../../frontend/src/calculations/protecaoGeral.js#L50) | §6.2.5 | **§6.2.6.1.1 / Tabela 47** |
| [`circuitos.js:77`](../../frontend/src/calculations/circuitos.js#L77) | §9.5.3.1 como "todo TUE exige circuito próprio" | a norma exige **apenas acima de 10 A** |

### 4.8 Lacunas menores de previsão de carga
**Severidade: BAIXA**

- §9.5.2.2.2 a), regra dos 6 pontos: quando o conjunto de ambientes passa de 6 tomadas, a norma
  admite 600 VA até **dois** pontos. O código fixa 3 (`G1.7`).
- §9.5.2.2.1 e): "demais cômodos" tem três faixas (≤2,25 m²; 2,25–6 m²; >6 m² com 1 ponto/5 m).
  O tipo `outro` é fixo em 1 ponto, rotulado "≤ 6 m²" — um escritório de 10 m² exige escolher
  "Sala/Dormitório" para obter a regra correta.
- §9.5.2.2.1 b): o mínimo de 2 tomadas acima da bancada da pia não é garantido.

---

## 5 · Engenharia e manutenibilidade

| Item | Observação |
|---|---|
| **Ausência total de testes** | Nenhum framework, nenhum arquivo de teste. O `ESCOPO.md` justifica a arquitetura de funções puras dizendo que "facilita testes" — a facilidade existe, os testes não. Endereçado por `QA/scripts/verificar.mjs` |
| **Código morto** | [`quedaDeTensao.js:25`](../../frontend/src/calculations/quedaDeTensao.js#L25) e [`:69`](../../frontend/src/calculations/quedaDeTensao.js#L69) (`avaliarQuedaDeTensao`, `avaliarQuedaDeTensaoCircuitos`) não são importados por nenhuma tela — ~45 linhas com uma **segunda implementação divergente** do critério de conformidade, incluindo `secaoSugerida` |
| **Recálculo duplicado** | `gerarCircuitos` é chamado independentemente em 5 páginas; combinado com a instabilidade de IDs já documentada no `FUTURO.md`, é risco de divergência entre telas |
| **Validação de entrada** | `min="0"` é apenas dica de HTML (não há form nem submit). Cômodo sem área produz 100 VA silenciosamente. O estado vem do `localStorage` sem validação de esquema |
| **README** | Ainda é o boilerplate do Vite |
| **Lint** | Passa, com 2 avisos menores |

---

## 6 · Conformidades confirmadas

Registradas porque são pontos onde é comum errar — e para que uma refatoração não as desfaça.

- **§9.5.3.2 vs §9.5.2.2.2** — banheiro corretamente **fora** dos circuitos exclusivos de
  cozinha/área de serviço, mas **dentro** da regra de 600 VA. São listas diferentes na norma e o
  código acertou as duas (`G3.2`, `G3.3`).
- §9.5.2.2.1 b) e d) — 3,5 m e 5 m com arredondamento para cima ("ou fração") (`G1.3`, `G1.2`).
- §9.5.2.2.2 — 600 VA nos três primeiros pontos, 100 VA nos excedentes (`G1.5`, `G1.6`).
- §9.5.3.1 — circuito dedicado para equipamento acima de 10 A (`G3.4`).
- §4.2.5.5 / §9.5.3.2 — separação iluminação × TUG e circuito exclusivo de serviço (`G3.1`).
- §6.2.6.1.1 / Tabela 47 — seções mínimas de 1,5 e 2,5 mm² (`G4.1`, `G4.2`).
- §6.2.7.4 — queda calculada com a corrente de projeto, não a do disjuntor (`G5.2`).
- Tabela 58 — PE correto em todas as faixas (`G6.3`).
- §5.1.3.2.2 — DR de 30 mA, com In ≥ disjuntor geral (`G6.5`, `G6.6`).
- Seção escolhida por ampacidade **e** queda simultaneamente, com trilha auditável por seção —
  conceitualmente correto e acima do que a maioria das ferramentas do gênero faz.
- A interface declara as simplificações adotadas em vez de escondê-las.

---

## 7 · Plano de correção sugerido

| Ordem | Item | Referência | Esforço |
|---|---|---|---|
| 1 | Corrigir ampacidade de 35 mm² | 2.1 | trivial |
| 2 | Resistência a 70 °C | 1.3 | trivial |
| 3 | Fase-fase: S/√3 | 1.4 | trivial |
| 4 | Iluminação: `floor` | 3.2 | trivial |
| 5 | Citações normativas e origem dos 10 mm² | 4.7, 4.4 | baixo |
| 6 | Orçamento acumulado de queda de tensão | 1.2 | médio |
| 7 | Fatores de correção (Tabelas 40 e 42) | 1.1 | médio |
| 8 | Comprimento ausente → "não verificado" | 4.6 | baixo |
| 9 | Polos do disjuntor; faixa acima de 100 A | 4.2, 4.3 | baixo |
| 10 | PE nos circuitos terminais | 4.5 | baixo |
| 11 | Remover código morto | seção 5 | trivial |
| 12 | Curto-circuito e seccionamento automático | 4.1 | alto — avaliar escopo |

Itens 1 a 7 são os que eu trataria como bloqueadores antes de o resultado ser apresentado como
memorial de cálculo.

Após cada correção, `node QA/scripts/verificar.mjs` deve mostrar o critério correspondente passando
de FAIL para PASS, **sem regressão nos 50 que já passam**.

---

## Anexos

- [`QA/referencias/valores-normativos.md`](../referencias/valores-normativos.md) — valores extraídos da norma
- [`QA/referencias/casos-de-teste.md`](../referencias/casos-de-teste.md) — casos com valores esperados
- [`QA/referencias/matriz-conformidade.md`](../referencias/matriz-conformidade.md) — rastreabilidade cláusula → código → teste
- [`QA/scripts/verificar.mjs`](../scripts/verificar.mjs) — harness executável

---

### Ressalva

Esta auditoria cobre conformidade do motor de cálculo com a NBR 5410 e qualidade de implementação.
Não substitui a validação por profissional habilitado, e a própria ferramenta declara corretamente
que não substitui projeto elétrico com ART.
