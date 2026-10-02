---
name: qa-nbr5410
description: >-
  Auditoria de QA e conformidade normativa do motor de cálculo elétrico deste projeto contra a
  ABNT NBR 5410. Use sempre que o pedido envolver testar, auditar, validar ou revisar qualquer
  coisa em frontend/src/calculations/ — previsão de carga, divisão de circuitos, dimensionamento
  de condutores, ampacidade, queda de tensão, disjuntores, DR/IDR, DPS, condutor de proteção ou
  balanceamento de fases. Use também quando a pessoa pedir para conferir se um valor "bate com a
  norma", corrigir um achado da auditoria, adicionar caso de teste, rodar regressão antes de
  entregar, ou perguntar o que a NBR 5410 exige em alguma cláusula. Vale mesmo quando ela não
  disser "QA" ou "NBR" — pedidos como "isso está certo?", "confere esse cálculo", "revisa o
  dimensionamento" ou "pode subir isso?" sobre o motor de cálculo caem aqui.
---

# QA — Conformidade NBR 5410

Auditoria do motor de cálculo da Calculadora de Instalações Elétricas Residenciais contra a
ABNT NBR 5410:2004.

O que torna este domínio diferente de QA comum: **um erro aqui não quebra a aplicação, ele produz
um número plausível e errado**. Um cabo subdimensionado não lança exceção — ele aquece na parede
de alguém. Por isso todo critério aqui é ancorado numa cláusula da norma, e a direção do erro
importa tanto quanto a magnitude.

## Regra que organiza tudo o mais

**Nunca afirme o que a norma exige a partir de memória.** Os valores conferidos estão em
`QA/referencias/valores-normativos.md`; o PDF da norma está em `NBR-5410.pdf`, na raiz. Se um
valor não estiver no arquivo de referência, extraia do PDF e **acrescente ao arquivo** antes de
usá-lo — é assim que a base cresce e para de custar caro.

```bash
pdftotext -layout NBR-5410.pdf /tmp/nbr.txt && grep -n "Tabela 42" /tmp/nbr.txt
```

Atenção: a extração desalinha a coluna de seções nominais em relação às colunas de valores.
Confira o alinhamento contando linhas de dados — foi um deslize de coluna que colocou 111 A onde
a norma diz 110 A.

## Arquivos

| Arquivo | Quando abrir |
|---|---|
| `QA/scripts/verificar.mjs` | harness executável — ponto de partida de qualquer tarefa |
| `QA/referencias/valores-normativos.md` | conferir o que a norma exige (tabelas, cláusulas, fórmulas) |
| `QA/referencias/matriz-conformidade.md` | saber o que já está coberto e qual o status de cada cláusula |
| `QA/referencias/casos-de-teste.md` | valores esperados calculados à mão; roteiros de UAT manual |
| `QA/relatorios/` | auditorias anteriores |

## Comandos

```bash
node QA/scripts/verificar.mjs              # tudo
node QA/scripts/verificar.mjs --grupo G4   # só um grupo (G1..G34 — a lista cresce; veja o topo de verificar.mjs)
node QA/scripts/verificar.mjs --verboso    # inclui os critérios que passaram
```

Sai com código 1 se houver qualquer FAIL. Zero dependências — não instale nada para rodá-lo.

Grupos principais (não é a lista completa — cada expansão de cobertura acrescenta grupos novos; o
cabeçalho de cada `grupo(...)` em `verificar.mjs` é a fonte de verdade, não esta lista):
**G1** previsão de carga · **G2** integridade das Tabelas 36/37 · **G3** divisão de circuitos ·
**G4** condutores e coordenação da proteção · **G5** queda de tensão · **G6** alimentador,
proteção geral e aterramento · **G22** locais especiais (banheiro/chuveiro) · **G32** fator de
demanda por distribuidora · **G33** volumes do banheiro pela planta · **G34** achados de auditorias
adversariais (cresce a cada rodada — ver `QA/relatorios/`).

**FAIL não é bug do harness.** Cada falha é uma divergência conhecida entre o código e a norma,
com cláusula e evidência numérica. **Não confie num número fixo de "linha de base" escrito aqui ou
em qualquer lugar além do resultado do próprio comando** — este arquivo já ficou meses desatualizado
dizendo "G1..G6, 50 conformes, 23 divergências" enquanto o projeto crescia para G1..G34 e 240
conformes. O que importa sempre é: **0 divergências é o estado esperado**; qualquer FAIL é uma
regressão ou um achado novo, nunca "normal". Depois de rodar, se quiser contexto histórico, leia
`QA/README.md` (mantém a tabela de datas) — e, ao terminar uma auditoria ou correção, atualize
`QA/README.md` e esta seção também, para o próximo uso da skill não repetir o mesmo apodrecimento.

---

## Fluxos

### Verificar uma correção

1. Rode o harness e anote o total antes.
2. Aplique a correção.
3. Rode de novo: o critério visado deve passar de FAIL para PASS **e nenhum dos que passavam pode
   quebrar**. Uma correção que conserta um critério e quebra outro não está pronta.
4. Atualize o status da cláusula em `matriz-conformidade.md`.
5. Cite o identificador do critério no commit (`G5.4`, `G4.5`) — é o que liga correção a verificação.

Se a correção mudar um valor numérico, confira se `casos-de-teste.md` tem caso cobrindo a fronteira
alterada. Se não tiver, acrescente.

### Auditar código novo ou alterado

1. Identifique quais cláusulas o código toca e leia-as em `valores-normativos.md`.
2. Para cada uma, pergunte: o código implementa a regra, ou uma aproximação dela? Qual a direção do
   desvio?
3. **Execute o motor para obter evidência numérica** — não audite por leitura. Um script curto em
   `.mjs` importando de `frontend/src/calculations/` roda direto no node e vale mais que qualquer
   inspeção visual. Foi assim que os desvios de 15,5% e 20% apareceram.
4. Acrescente critério ao harness para cada achado, de modo que ele não volte silenciosamente.
5. Atualize a matriz.

### Investigar "esse número está certo?"

1. Localize a cláusula em `valores-normativos.md`.
2. Calcule o valor esperado à mão, mostrando a conta.
3. Execute o motor com a mesma entrada.
4. Compare e classifique: conforme · desvio conservador · desvio que subdimensiona · ausente.

A classificação importa mais que o número: desvio conservador é decisão de projeto defensável se
estiver declarada; desvio que subdimensiona é defeito, sempre.

### Auditoria completa

Rode o harness, depois percorra a matriz cláusula a cláusula procurando o que o harness **não**
cobre — ausências não falham sozinhas. Verifique também o alinhamento entre `ESCOPO.md` e o que
existe de fato; na auditoria inicial, dois itens declarados como entregas da v1 não estavam
implementados. Escreva o relatório em `QA/relatorios/AAAA-MM-DD-<assunto>.md` seguindo a estrutura
do relatório existente, e atualize a matriz.

---

## Como escrever um critério novo

```js
checar(
  'G5.4',                                    // identificador estável, usado nos commits
  '§6.2.7.1 c)',                             // cláusula que fundamenta — sem isso é opinião
  'Queda acumulada verificada contra o limite de 5%',
  !(ambosAprovados && quedaTotal > 5),       // condição
  `alimentador ${a}% + terminal ${b}% = ${t}% > 5%`,  // evidência com números reais
  'critico',                                 // critico | alto | medio | baixo
)
```

Quatro coisas fazem um critério útil:

- **Cláusula específica.** `§6.2.7.1 c)`, não `§6.2.7`. Quem for corrigir precisa achar o parágrafo.
- **Evidência com números.** "falhou" não orienta ninguém; "In=16 A vs Iz corrigido=14,7 A" diz
  exatamente o que mudar.
- **Um achado, um critério.** Quando doze seções de uma tabela usam a coluna errada, isso é um
  achado, não doze — agregue, senão o relatório afoga o sinal no volume.
- **Severidade pela direção do erro.** Subdimensionar é `critico` ou `alto`. Superdimensionar é
  `medio`. Divergência de documentação ou citação é `medio`. Alternativa permissiva da norma não
  oferecida é `baixo`.

Critérios de funcionalidade ausente (`G4.8`, `G4.9`) passam `false` fixo de propósito: mantêm a
lacuna visível no relatório em vez de deixá-la desaparecer por falta de teste.

---

## Armadilhas deste domínio

Erros que já aconteceram neste código ou que são fáceis de cometer ao mexer nele:

**Listas parecidas da norma que não são a mesma lista.** §9.5.2.2.2 (600 VA por ponto) inclui
banheiro; §9.5.3.2 (circuito exclusivo) não inclui. O código acerta os dois — não "conserte" isso.

**"Ou fração" é teto; "inteiros" é piso.** §9.5.2.2.1 usa "ou fração" (`ceil`) para contar tomadas.
§9.5.2.1.2 usa "4 m² inteiros" (`floor`) para carga de iluminação. Trocar um pelo outro é erro
silencioso.

**Condutores carregados ≠ condutores no eletroduto.** O neutro de um circuito monofásico é
carregado; o PE não é. Circuito fase-neutro e fase-fase têm ambos 2 condutores carregados.

**Iz não é o valor da tabela.** §5.3.4.1 define Iz como a ampacidade "nas condições previstas para
sua instalação" — o valor já corrigido por temperatura e agrupamento. Comparar o disjuntor contra
o valor bruto é a não conformidade mais cara deste projeto.

**Os limites de queda de tensão são cumulativos.** §6.2.7.2 limita o trecho terminal a 4%;
§6.2.7.1 limita o caminho inteiro a 5% (caso residencial). Alimentador e terminal dividem o mesmo
orçamento — não têm 4% cada.

**Resistência a 20 °C subestima a queda.** A Tabela 36 é definida para o condutor a 70 °C; a queda
precisa usar a resistência nessa temperatura.

**Entrada ausente vira zero e o zero passa.** Comprimento não informado produz queda de 0%, que
aprova qualquer seção. Ao revisar validação, procure `Number(x) || 0` sobre campos que o usuário
pode não ter preenchido: silenciar a ausência é pior que falhar.

**Conservador não é o mesmo que correto.** Superdimensionar é aceitável como simplificação, desde
que declarada. Se o comentário do código diz uma coisa e o dado faz outra, é defeito de
documentação mesmo que o número seja seguro.

**Automatismo "inteligente" pode ser silêncio disfarçado.** Quando a norma diz "admite-se" (uma
alternativa permissiva, não uma exigência), aplicá-la automaticamente parece ajudar — mas reduz um
resultado sem o usuário saber que a ferramenta escolheu por ele. O padrão certo é opt-in explícito
(flag default `false`/conservador, declarado pelo usuário), o mesmo já usado para
`neutroReduzidoDeclarado`. Achado real: `calcularLimite600VA` reduzia 600→até 2 pontos (§9.5.2.2.2
a) sozinha acima de 6 pontos no projeto; virou `aplicarAlternativa600VA`, opt-in.

**Tabela com duas sub-tabelas lado a lado.** A Tabela 45 (agrupamento em eletroduto enterrado) tem
uma sub-tabela para cabo multipolar e outra, mais severa, para condutor isolado/unipolar — fácil
pegar a errada se não conferir qual geometria de condutor o resto do código já assume. Confira
sempre se uma tabela "simples" não é na verdade duas empilhadas na mesma página.

**Nota da norma que restringe o próprio valor que ela dá.** A Tabela 30 (fator k) vem com uma
NOTA dizendo que os valores "ainda não estão normalizados" para seções abaixo de 10 mm² — que é
a faixa de quase todo circuito terminal residencial (1,5/2,5/4/6 mm²). Uma tabela pode ser
transcrita perfeitamente certa e ainda assim ser inválida para o caso de uso mais comum da
ferramenta; leia as notas de rodapé, não só as células.

**Geometria com "na falta de" não é sempre aplicável.** §9.1.2.1 b) define o volume 1 do banheiro
pela superfície que circunscreve a banheira/box **ou, na falta de delimitação clara**, por 0,6 m
ao redor do chuveiro. A alternativa dos 0,6 m só vale no segundo caso — aplicá-la sempre (mesmo
quando o usuário declarou as dimensões do box) infla todos os volumes 0,6 m além do que a norma
define quando a geometria real é conhecida.

**Planos de referência diferentes dentro da mesma subseção.** Ainda em §9.1.2.1: o teto do volume
1 é medido do **fundo da banheira/piso do boxe**; os tetos dos volumes 2 e 3, do **piso do
banheiro**. Numa banheira ao nível do piso os dois coincidem (por isso o erro passou despercebido
por um tempo) — só aparece com uma banheira elevada. Ao modelar "altura", pergunte sempre "altura
em relação a quê" antes de comparar contra um limite da norma.

---

## Fora do alcance do harness

Precisam de UAT manual — roteiros em `casos-de-teste.md`, seção "Casos manuais (UAT na
interface)" (o número da seção muda a cada expansão — procure pelo título, não pelo número):

- Estado da interface: remover cômodo do meio da lista e conferir se os comprimentos continuam
  ligados aos circuitos certos (os IDs derivam da ordem de cadastro)
- Validação de campos: valores negativos, texto colado em campo numérico, campos vazios
- `localStorage` corrompido ou de versão anterior do esquema
- Troca de tipo de instalação com TUE fase-fase já cadastrado
- Conferência do resultado final contra um projeto real dimensionado por profissional

Ao encontrar defeito nesses, registre no relatório mesmo sem critério automatizado — e considere
se parte dele pode virar critério (a lógica costuma ser testável mesmo quando a interação não é).
