# Relatório pós-correção — Auditoria adversarial de 30/09/2026

**Projeto:** Calculadora de Instalações Elétricas Residenciais
**Norma de referência:** ABNT NBR 5410:2004 (versão corrigida 17.03.2008)
**Data:** 01/10/2026
**Referência:** [`2026-09-30-auditoria-adversarial.md`](2026-09-30-auditoria-adversarial.md)
**Destinatário:** equipe de desenvolvimento

---

## Resultado

**211 conformes → 240 conformes. 11 divergências → 0 divergências.**

```bash
node QA/scripts/verificar.mjs
```

Todos os 11 achados da auditoria adversarial (9 médios, 2 baixos) foram corrigidos. Nenhum dos
211 critérios anteriores regrediu — oito deles precisaram de ajuste porque seus próprios cenários
de teste dependiam de um comportamento que deixou de ser o padrão (ver seção 4). `npm run build`
e `npx oxlint` seguem limpos, sem avisos.

---

## 1 · Lado permissivo — corrigidos primeiro

### 1.1 Tabela C.2 sem a situação 3 (G34.5)
`TENSAO_CONTATO_LIMITE_V` em [`seccionamento.js`](../../frontend/src/calculations/seccionamento.js)
ganhou `situacao3: 12`. `tensaoContatoLimite` continua devolvendo 25 V (situação 2) quando há
banheiro — documentado agora o motivo: o volume 0 só admite SELV ≤12 V (§9.1.3.1.1), e as massas
de um sistema SELV não entram no "mesmo eletrodo" que essa função avalia (as regras de
`locaisEspeciais.js` já proíbem tomada/interruptor/luminária/aquecedor de rede no volume 0).

### 1.2 Altura do volume 1 medida do plano errado (G34.8)
Novo campo opcional `box.baseM` (altura do fundo da banheira/piso-boxe acima do piso do banheiro,
default 0) em `classificarVolume` — só desloca o teto do volume 1 (§9.1.2.1 b, medido do fundo da
banheira), nunca os tetos dos volumes 2 e 3 (medidos do piso). Exposto na UI como "Altura da base
acima do piso" em [`VolumesBanheiro.jsx`](../../frontend/src/pages/calculadora/VolumesBanheiro.jsx),
persistido em `geometriaBanheiro.boxAlturaBaseM` e sanitizado em `estado.js`.

---

## 2 · Geometria dos volumes do banheiro

### 2.1 Volume 0 sem teto de altura (G34.6)
`classificarVolume` agora identifica volume 0 só no fundo do box (`alturaM === baseM`, dentro da
projeção horizontal) — qualquer altura acima disso cai na coluna de ar que a própria norma já
atribui ao volume 1 (ou ao volume 2, pela simplificação da "tampa" já documentada).

### 2.2 Volume 1 estendido 0,6 m além de um box declarado (G34.7)
`classificarVolume` agora distingue os dois casos do §9.1.2.1 b): **com** box declarado
(`wM > 0 && hM > 0`), volume 1 é a própria projeção do box, volume 2 o anel até 0,6 m da borda,
volume 3 até 3,0 m; **sem** box declarado (chuveiro solto, Figura 18), mantidos os 0,6/1,2/3,6 m
de antes — essa folga é a alternativa da norma só para quando não há delimitação clara.

---

## 3 · Dados e lacunas de tabela

### 3.1 k fora da faixa normalizada (G34.3)
`obterK` devolve `null` para seções abaixo de 10 mm² (Tabela 30, NOTA 1). `verificarCurtoCircuito`
em [`curtoCircuito.js`](../../frontend/src/calculations/curtoCircuito.js) trata esse `null` como
"não verificado", com motivo explícito, em vez de computar com um k emprestado da faixa maior.

### 3.2 Tabela 45: só a sub-tabela errada (G34.4)
`TABELA_45_AGRUPAMENTO_ENTERRADO` trocada para a sub-tabela de condutores isolados/unipolares
(2→0,80, 3→0,70, 4→0,65, 5→0,60, 6→0,60) — a que combina com o condutor unipolar que o resto do
pipeline do método D já modela (`DIAMETRO_EXTERNO_CONDUTOR_MM`, taxa de ocupação do eletroduto).

### 3.3 Harmônica acima de 33% indistinguível (G34.2)
Quarto estado `'acima-33'` em `TAXAS_TERCEIRA_HARMONICA`, com `avisoNeutroSuperior: true`.
`dimensionarProtecaoGeral` propaga esse aviso; a UI (`SecaoProtecaoGeral.jsx`) mostra uma nota
citando §6.2.6.2.5 e o Anexo F quando o usuário declara essa faixa — sem calcular uma seção de
neutro maior que a ferramenta não tem como derivar com segurança.

### 3.4 Tabela 48 com linha fabricada (G34.1)
Removida a linha `{ secaoFase: 25, secaoNeutro: 25 }` de `TABELA_48_NEUTRO_REDUZIDO` — inerte (o
early-return de `obterSecaoNeutroReduzida` já intercepta ≤25 mm²), mas não existe na tabela
impressa, que começa em 35 mm².

---

## 4 · Previsão de carga

### 4.1 Alternativa permissiva aplicada em silêncio (G34.10)
`calcularLimite600VA(comodos, aplicarAlternativa = false)` — a regra dos 2 pontos (§9.5.2.2.2 a,
"admite-se") só entra em ação com a declaração explícita do usuário. Novo campo
`projeto.aplicarAlternativa600VA` (default `false`), setter `setAplicarAlternativa600VA`, e um
checkbox em [`Comodos.jsx`](../../frontend/src/pages/calculadora/Comodos.jsx) — só exibido quando
o total de pontos nos ambientes de 600 VA passa de 6 (`contarPontos600VA`, nova função exportada).
`calcularPrevisaoDeCarga` e `gerarCircuitos` propagam o novo parâmetro; todos os pontos de chamada
(`materiais.js`, `veredito.js`, `ComodoCard.jsx`, `TabelasResumo.jsx`, `projeto.js`) foram
atualizados.

**Efeito colateral esperado:** como o padrão deixou de reduzir automaticamente, qualquer projeto
com mais de 6 pontos em ambientes de 600 VA agora mostra uma carga prevista **maior** por padrão
(a leitura conservadora). Oito testes pré-existentes usavam cenários que dependiam do antigo
comportamento automático e precisaram de ajuste — ver seção 5.

### 4.2 Varanda com a regra errada (G34.9)
Novo tipo `varanda` (`tugFixa: 1`) em `TIPOS_COMODO`, separado de `outro` — aplica a regra própria
do §9.5.2.2.1 c) ("pelo menos um ponto de tomada", sem perímetro nem faixa de área) em vez da
regra dos "demais cômodos" (§9.5.2.2.1 e), que continua em `outro`. Select de cômodo, `estado.js`
e `useProgresso.js` herdam o novo tipo automaticamente (enumeram `TIPOS_COMODO` genericamente).

---

## 5 · Cobertura do próprio harness

### 5.1 Dupla digitação estendida para A1/A2/D e Tabela 37 (G34.11)
`TABELA_36_REFERENCIA` ganhou as 6 colunas que faltavam (A1/A2/D, 2 e 3 condutores); nova
`TABELA_37_REFERENCIA` cobre as 12 colunas da Tabela 37 (EPR/XLPE), até então sem nenhuma dupla
digitação. As 288 células (12 seções × 12 colunas × 2 tabelas) foram reconferidas numa extração
**nova e independente** do PDF (`pdftotext -layout`, páginas 109-110) — não copiada do código.

A extração confirmou um artefato conhecido da ferramenta (não da norma): a coluna de seções
nominais sai desalinhada das colunas de valores. A conferência correta não foi "qual rótulo fica
ao lado de qual número", e sim ler cada sequência de valores na ordem natural em que é impressa e
casar a 10/12-upla inteira contra a tabela em uso — método mais robusto que âncoras pontuais.
**Resultado: as 288 células já estavam corretas** (nenhum valor mudou); o que faltava era só a
guarda que detectaria uma regressão futura.

`ANCORAS_COLUNA` passou de 6 para 12 entradas (A1/A2/B1/B2/C/D × 2/3 condutores) e agora também
gera verificações para a Tabela 37 (`G2.7-*`), além das já existentes para a Tabela 36 (`G2.1-*`).

---

## 6 · Ajustes em testes pré-existentes (sem mudança de comportamento do produto)

A correção 4.1 (opt-in dos 600 VA) muda o **padrão** de "reduz automaticamente acima de 6 pontos"
para "nunca reduz sem declaração explícita" — mais conservador, mas quebra qualquer cenário de
teste que dependesse do comportamento antigo como padrão. Oito critérios precisaram de ajuste,
todos reconferidos à mão antes de atualizar:

| Critério | Ajuste |
|---|---|
| `G1.7` | Passou a testar os dois lados: sem declarar (limite=3) e com `aplicarAlternativa=true` (limite=2) |
| `G3.5` | Cômodo de teste reduzido de perímetro 30 m para 16 m — perímetro 30 m sozinho já excede o teto de 2000 VA/circuito na leitura base, que é um limite conhecido e documentado ("um cômodo nunca é dividido", `FUTURO.md`), não o que este critério testa |
| `G9.3` | Seção do condutor de teste trocada de 2,5 mm² para 10 mm² — 2,5 mm² agora cai na faixa não normalizada de k (G34.3/3.1 acima) |
| `G20.1` | Comparação D vs B1 movida de 3 para 6 circuitos — em 3 circuitos as duas tabelas agora coincidem (0,70) após a correção 3.2 |
| `G23.5` | Cenário trocado de TUG de cozinha (2,5 mm²) para TUE de chuveiro (dimensiona a 25 mm²) — precisa de um circuito que chegue a "verificado" no curto-circuito para testar quadro-vs-ponta |
| `G28.4`, `G28.6` | Verdito esperado de `existenteIgual`/`comPe4` ajustado de `true` para `null` (parcial) — correto, porque o item de curto-circuito agora fica genuinamente "não verificado" para 2,5/4 mm²; adicionada checagem de que nenhum outro item falha |
| `G32.*` (fixture) | `casaModelo()` do grupo G32 passou a declarar `aplicarAlternativa600VA: true` explicitamente — esse grupo testa tabelas de fator de demanda por distribuidora, não a alternativa dos 600 VA, e preservar a carga de 5,46 kW evita recalcular à mão oito tabelas de FD não relacionadas ao achado |

Nenhum desses ajustes esconde uma divergência: cada um foi confirmado, antes da edição, como
consequência direta e esperada de uma das 12 correções acima, não como um sintoma novo.

---

## 7 · Verificação

```
node QA/scripts/verificar.mjs       # 240 conformes · 0 divergências, exit 0
cd frontend && npx oxlint           # limpo
cd frontend && npm run build        # build OK (único aviso pré-existente: tamanho de chunk)
```

---

### Ressalva

Auditoria de conformidade do motor de cálculo. Não substitui validação por profissional
habilitado, e a ferramenta declara corretamente que não substitui projeto com ART.
