# Catálogo de casos de teste

Casos de referência com valores esperados calculados à mão a partir da norma
(ver [`valores-normativos.md`](valores-normativos.md)). Os automatizados estão em
[`QA/scripts/verificar.mjs`](../scripts/verificar.mjs); os manuais são roteiros de UAT.

**Como usar:** ao corrigir um achado, o caso correspondente deve passar de FAIL para PASS
**sem quebrar nenhum outro**. Os casos marcados como *regressão* já passam hoje — se algum
deles falhar depois de uma alteração, a correção introduziu um defeito novo.

---

## 1. Residência monofásica de referência (127 V)

Caso base usado na maioria das verificações automatizadas.

| Cômodo | Tipo | Área | Perímetro | TUE |
|---|---|---|---|---|
| Sala | social | 20 m² | 18 m | — |
| Dormitório | social | 12 m² | 14 m | — |
| Cozinha | serviço | 12 m² | 14 m | — |
| Área de serviço | serviço | 6 m² | 10 m | — |
| Banheiro | banheiro | 4 m² | 8 m | Chuveiro 5500 W, F-N, resistivo |

### Previsão de carga esperada

Total de pontos TUG nos ambientes da lista de 600 VA (§9.5.2.2.2 a) — cozinha (4) + área de
serviço (3) + banheiro (1) = **8 pontos, acima de 6** → `calcularLimite600VA` reduz o limite de 3
para **2** pontos a 600 VA em cada um desses ambientes (o restante do projeto, ver seção 3 abaixo).

| Cômodo | Iluminação | TUG (qtd) | TUG (VA) | TUE |
|---|---|---|---|---|
| Sala | 100 + ⌊14/4⌋×60 = **280 VA** | ⌈18/5⌉ = **4** | 4 × 100 = **400 VA** | — |
| Dormitório | 100 + ⌊6/4⌋×60 = **160 VA** | ⌈14/5⌉ = **3** | 3 × 100 = **300 VA** | — |
| Cozinha | 100 + ⌊6/4⌋×60 = **160 VA** | ⌈14/3,5⌉ = **4** | 2×600 + 2×100 = **1400 VA** | — |
| Área de serviço | **100 VA** | ⌈10/3,5⌉ = **3** | 2×600 + 1×100 = **1300 VA** | — |
| Banheiro | **100 VA** | **1** | **600 VA** (só 1 ponto — limite de 2 ou 3 não muda o resultado) | 5500 VA |

Totais: iluminação **800 VA** · TUG **4000 VA** · TUE **5500 VA**.

### Divisão de circuitos esperada
- 1 circuito de iluminação (800 VA < teto de 1500 VA)
- Circuito(s) de TUG **exclusivos** para Cozinha + Área de serviço (§9.5.3.2) — 2700 VA, divide em 2 (Cozinha 1400 VA + Área de serviço 1300 VA — juntas passariam do teto de 2000 VA)
- Circuito(s) de TUG geral para Sala + Dormitório + **Banheiro** (§9.5.3.2 não lista banheiro) — 1300 VA
- 1 circuito dedicado para o Chuveiro (§9.5.3.1, corrente > 10 A)

---

## 2. Iluminação — fronteiras do §9.5.2.1.2

| Área | Esperado | Observação |
|---|---|---|
| 4 m² | 100 VA | faixa fixa |
| 6 m² | 100 VA | limite exato da faixa fixa |
| 6,01 m² | 100 VA | ⌊0,01/4⌋ = 0 incrementos |
| 10 m² | 160 VA | exatamente 1 incremento |
| 12 m² | 160 VA | 6 m² adicionais = 1 incremento inteiro |
| 14 m² | 220 VA | exatamente 2 incrementos |
| 15 m² | 220 VA | 9 m² adicionais = 2 incrementos inteiros |
| 20,15 m² | 280 VA | exemplo clássico da norma |
| 25 m² | 340 VA | 19 m² adicionais = 4 incrementos |

---

## 3. Pontos de tomada — fronteiras do §9.5.2.2.1

| Tipo | Perímetro | Esperado | Regra |
|---|---|---|---|
| social | 10 m | 2 | 5 m ou fração |
| social | 10,1 m | 3 | fração conta |
| social | 15 m | 3 | exato |
| social | 16 m | 4 | fração conta |
| serviço | 7 m | 2 | 3,5 m ou fração |
| serviço | 8 m | 3 | fração conta |
| serviço | 14 m | 4 | exato |
| serviço | 15 m | 5 | fração conta |
| banheiro | qualquer | 1 | 1 junto ao lavatório |
| varanda | qualquer | 1 | pelo menos 1 |

### Potências (§9.5.2.2.2)

| Cenário | Esperado |
|---|---|
| Área de serviço, 5 pontos | 3×600 + 2×100 = 2000 VA |
| Cozinha, 3 pontos | 3×600 = 1800 VA |
| Banheiro, 1 ponto | 600 VA |
| Sala, 4 pontos | 4×100 = 400 VA |
| Conjunto de ambientes > 6 pontos (alternativa permissiva) | 2×600 + resto×100 por ambiente |

---

## 4. Coordenação da proteção — §5.3.4.1

Cenário padrão: 3 circuitos no mesmo eletroduto → **FCA = 0,70** (Tabela 42, ref. 1).

| Circuito | Ib | In | Iz tabela (B1/2c) | Iz × 0,70 | Verdito |
|---|---|---|---|---|---|
| Iluminação 800 VA / 127 V | 6,3 A | 10 A | 17,5 A (1,5 mm²) | 12,3 A | conforme |
| TUG 1900 VA / 127 V | 15,0 A | 16 A | 24 A (2,5 mm²) | 16,8 A | conforme (margem mínima) |
| TUG 2000 VA / 127 V | 15,7 A | 16 A | 24 A (2,5 mm²) | 16,8 A | conforme |
| Chuveiro 5500 VA / 127 V | 43,3 A | 50 A | 57 A (10 mm²) | 39,9 A | **não conforme** → subir para 16 mm² |

Com **FCA ignorado** (comportamento atual), o chuveiro fica em 10 mm² com Iz aparente de 50 A —
o condutor real suporta 39,9 A sob um disjuntor de 50 A.

### Casos de fronteira do disjuntor
| Ib | In esperado |
|---|---|
| 9,9 A | 10 A |
| 10,0 A | 10 A (In ≥ Ib, igualdade vale) |
| 10,1 A | 16 A |
| 101 A | deve existir opção acima de 100 A |

---

## 5. Queda de tensão — §6.2.7

Cobre, 2,5 mm², 127 V, cosφ = 1, circuito monofásico.

| Comprimento | Corrente | ΔV% a 20 °C (atual) | ΔV% a 70 °C (correto) |
|---|---|---|---|
| 10 m | 10 A | 1,12% | 1,35% |
| 20 m | 10 A | 2,25% | 2,69% |
| 28 m | 16 A | 5,04% | 6,03% |
| 20 m | 20 A | 4,50% | 5,38% |

### Orçamento acumulado (§6.2.7.1 c + §6.2.7.2)

| Trecho | ΔV% | Acumulado | Situação |
|---|---|---|---|
| Alimentador 20 m, 70,9 A, 25 mm² | 1,59% | 1,59% | dentro |
| Terminal 28 m, 16 A, 2,5 mm² | 5,04% | 6,63% | **excede os 5% do §6.2.7.1 c)** |

O terminal sozinho já viola o §6.2.7.2 (4%); mesmo que não violasse, a soma precisa caber em 5%.

**Caso de aceitação:** alimentador 3% + terminal 3% = 6%. Cada trecho passa isoladamente contra
4%, mas o conjunto viola o limite total. A ferramenta precisa reprovar.

---

## 6. Balanceamento de fases e alimentador

### Carga fase-fase em sistema trifásico 127/220 V

Chuveiro 5500 VA ligado fase-fase:
- Corrente real em **cada uma** das duas fases: I = 5500 / 220 = **25,00 A**
- Contribuição correta por fase (em VA sobre 127 V): 5500 / √3 = **3175,4 VA** → 25,00 A
- Contribuição do modelo atual (S/2): 2750 VA → 21,65 A (**−15,5%**)

### Queda no alimentador trifásico
Entrada 47,2 A, 30 m, 10 mm², 127/220 V:
- Fórmula trifásica correta: **1,99%**
- Fórmula monofásica aplicada hoje: **3,99%**

### Condutor de proteção (Tabela 58)
| Fase | PE esperado |
|---|---|
| 1,5 mm² | 1,5 mm² |
| 2,5 mm² | 2,5 mm² |
| 16 mm² | 16 mm² |
| 25 mm² | 16 mm² |
| 35 mm² | 16 mm² |
| 50 mm² | 25 mm² |
| 70 mm² | 35 mm² |

---

## 7. Dimensionamento de eletroduto — §6.2.11.1.6

Diâmetro de cabo e de eletroduto: valores de catálogo, fonte externa à NBR 5410 (ver
[`valores-normativos.md`](valores-normativos.md)). Taxa de ocupação máxima: 53%/31%/40% (1/2/3+
condutores) — todo circuito desta ferramenta cai em "3 ou mais" (fase(s) + neutro/2ª fase + PE).

| Trecho | Condutores | Área ocupada | Eletroduto | Ocupação |
|---|---|---|---|---|
| Circuito de iluminação/TUG, 2,5 mm² (F+N+PE) | 3× 2,5 mm² | 29,7 mm² | 16 mm (3/8") | 23,1% |
| Circuito de chuveiro monofásico, 10 mm² (F+N+PE) | 3× 10 mm² | 84,8 mm² | **25 mm (3/4")** | 23,8% |
| Alimentador trifásico, 10 mm² (3F+N+PE) | 5× 10 mm² | 141,4 mm² | 25 mm (3/4") | 39,7% |
| Alimentador monofásico, fase 25 mm² / PE 16 mm² (F+N+PE) | 2× 25 + 1× 16 mm² | 154,7 mm² | 32 mm (1") | 26,0% |

**Caso de fronteira (importante):** o circuito de chuveiro de 10 mm² ocupa **40,15%** de um
eletroduto de 1/2" — passa do limite de 40% por uma margem mínima, então a ferramenta precisa
rejeitá-lo e recomendar 3/4" (23,8% de ocupação). Se a ferramenta aprovasse 1/2" aqui, o resultado
seria "conforme" mas os 3 condutores não caberiam de fato no eletroduto — ver G7.2 no harness.

**Distinção importante:** isso é independente do fator de agrupamento térmico (FCA, Tabela 42,
seção 4 acima) — a taxa de ocupação é sobre os condutores *dentro do mesmo eletroduto* (o trecho
individual de cada circuito, como esta ferramenta modela); o FCA é sobre quantos *circuitos*
distintos ficam próximos o bastante para se aquecerem entre si. As duas contas respondem
perguntas diferentes e não se substituem.

---

## 8. Métodos de instalação (A1/A2/B1/B2/C/D) e isolação (PVC/EPR) — §6.2.5, Tabelas 33/36/37/42/45

Prova de que o método muda o resultado de verdade (não é um seletor decorativo): circuito com
Ib = 65 A → disjuntor de 70 A.

| Método | Iz tabela (16 mm²) | Atende 70 A? | Seção final |
|---|---|---|---|
| B1 (fios em eletroduto) | 76 A | sim | **16 mm²** |
| B2 (cabo multipolar em eletroduto) | 69 A | não (69 < 70) | **25 mm²** (Iz=90 A) |
| C (cabo direto na parede) | 85 A | sim | **16 mm²** (folga maior que B1) |

Mesma entrada, três resultados diferentes — automatizado no harness como G8.3.

### A1 (parede termicamente isolante) vs. B1, Ib = 60 A → disjuntor de 63 A

| Método | Iz tabela (16 mm²) | Atende 63 A? | Seção final |
|---|---|---|---|
| A1 (fios em eletroduto embutido em parede isolante) | 61 A | não (61 < 63, por pouco) | **25 mm²** (Iz=80 A) |
| B1 (mesmo circuito, alvenaria comum) | 76 A | sim | **16 mm²** |

A1 dissipa pior que B1 (parede isolante em vez de alvenaria) — automatizado como G21.3.

### D (eletroduto enterrado) — temperatura de referência é a do SOLO, não a do ar

A 30 °C, o fator de temperatura do **ar** é 1,00 (é a própria referência da Tabela 40 para linhas
não-subterrâneas) mas o do **solo** é 0,89 — mesma temperatura numérica, coluna diferente. Um
circuito no método D declarado a 30 °C de solo tem Iz corrigido **11% menor** que um circuito B1
declarado a 30 °C de ar, com a mesma seção. O agrupamento também muda: a 3 circuitos, D usa a
Tabela 45 (0,75) em vez da Tabela 42 ref. 1 usada por A1/A2/B1/B2 (0,70) — tabelas diferentes, não
há relação de ordem esperada entre elas. Automatizado como G20.1-G20.3.

### Isolação — PVC (Tabela 36) vs. EPR/XLPE (Tabela 37), Ib = 88 A → disjuntor de 100 A

| Isolação | Iz tabela (16 mm²) | Atende 100 A? | Seção final |
|---|---|---|---|
| PVC (70 °C) | 76 A | não | **25 mm²** (Iz=101 A) |
| EPR/XLPE (90 °C) | 100 A | sim, exatamente no limite | **16 mm²** (Iz=100 A) |

EPR/XLPE tem mais ampacidade na mesma seção (opera 20 °C mais quente), mas também mais queda de
tensão para a mesma corrente/seção — os dois critérios puxam em direções opostas. Automatizado
como G19.2-G19.3.

### Agrupamento (Tabela 42/45) por método, 3 circuitos agrupados

| Método | Referência | FCA |
|---|---|---|
| A1 | 1 (mesma que B1) | 0,70 |
| A2 | 1 (mesma que B2) | 0,70 |
| B1 | 1 | 0,70 |
| B2 | 1 (mesma que B1) | 0,70 |
| C | 2 | 0,79 |
| D | Tabela 45, espaçamento "nulo" | 0,75 |

### Eletroduto (§6.2.11.1.6) por método

Método C não tem eletroduto (cabo fixado direto na parede) — o resultado precisa vir `null` com o
motivo, não uma tentativa de cálculo sem sentido. Método D **tem** eletroduto (é a própria
definição do método: cabo *em eletroduto* enterrado) — diferente de C, não deve vir `null`. A1, A2,
B1 e B2 continuam sendo dimensionados normalmente (ver seção 7). Automatizado como G20.5.

### Eletroduto com cabo EPR/XLPE (cabo HEPR 0,6/1 kV)

Diâmetros da página do produto Corfio (ver `valores-normativos.md`). À mão: 3 × 2,5 mm² =
3 × π/4 × 5,35² = 67,4 mm² → 31,9% em 1/2" (limite 40%). 3 × 10 mm² = 136,1 mm² → 64,4% em 1/2",
38,2% em 3/4" → 3/4". Automatizado como G7.4. Acima de 120 mm², recusa calcular (`erro`).

## 9. Neutro reduzido (Tabela 48, §6.2.6.2.6) e curto-circuito (§5.3.5)

### Redução do neutro

Só se aplica ao **alimentador trifásico** com fase > 25 mm², e só quando o usuário declara
explicitamente que as 3 condições da norma valem (a ferramenta nunca assume isso sozinha).

| Cenário | Fase | Neutro reduzido declarado? | Neutro final |
|---|---|---|---|
| Alimentador monofásico, fase 35 mm² | 35 mm² | sim (não deveria ter efeito) | **35 mm²** (nunca reduz monofásico) |
| Alimentador trifásico, fase 35 mm², sem declarar | 35 mm² | não | **35 mm²** (igual à fase, padrão) |
| Alimentador trifásico, fase 35 mm², declarado | 35 mm² | sim | **25 mm²** (Tabela 48) |

### Curto-circuito — I²t ≤ k²S² (Tabela 30, k=115 para cobre/PVC ≤300 mm²)

| Cenário | Icc | Resultado |
|---|---|---|
| Icc não informada | — | não verificado (como antes) |
| In=25 A, curva C (limiar=125 A), Icc=80 A | 80 A | não verificável (abaixo do disparo instantâneo — depende da curva térmica do fabricante) |
| Condutor 2,5 mm² (k²S²=82 656 A²s), Icc=6000 A, t≈10 ms | 6000 A | **não conforme** — I²t=360 000 A²s excede a capacidade do condutor |
| Condutor 25 mm² (k²S²=8 265 625 A²s), Icc=3000 A, t≈10 ms | 3000 A | **conforme** — I²t=90 000 A²s, folga confortável |

Os 4 cenários acima são exatamente os automatizados no harness (G9.1 a G9.4). Esta seção é sobre o
**alimentador**, com a Icc declarada diretamente pelo usuário; para os circuitos **terminais**, a
Icc é derivada por propagação de impedância a partir dessa mesma declaração — ver seção 16.

## 10. Reatância por seção (fonte externa — catálogo Cordeiro, Tabela 8)

| Seção | Reatância (Ω/km) | Queda com carga indutiva (cosφ=0,85, 15 m, 10 A) — antes (0,08 Ω/km fixo) | Depois (por seção) |
|---|---|---|---|
| 1,5 mm² | 0,16 | 2,871% | 2,880% |
| 120 mm² | 0,10 | (contribuição da reatância já era pequena nas duas versões, diferença desprezível) | — |

A diferença é pequena mas real e no sentido correto — a própria fonte nota que a reatância é
desprezível abaixo de 50 mm², o que explica por que a constante fixa antiga nunca deu um resultado
absurdo, só impreciso. Automatizado como G11.1-G11.4.

## 11. Divisão de circuitos — First-Fit Decreasing

Caso onde empacotar na ordem de cadastro precisa de mais circuitos que ordenar por VA decrescente
primeiro (First-Fit Decreasing) — mesmo teto de 2000 VA/circuito, mesmos 7 cômodos:

| Cômodos (VA) | Ordem de cadastro | First-Fit Decreasing |
|---|---|---|
| 1100, 800, 700, 300, 1600, 1900, 1200 | 5 circuitos (1900, 1000, 1600, 1900, 1200 VA) | **4 circuitos** (1900, 1900, 2000, 1800 VA) |

Automatizado como G13.1 (menos circuitos) e G13.2 (nunca excede o teto).

## 12. IDs de circuito estáveis

Ver M3 (seção 10) para o roteiro manual equivalente na interface. Caso automatizado (G12 no
harness): 3 cômodos (1400/100/600 VA de TUG) formam 2 circuitos — {1400+600}=2000 VA e {100}=100 VA.

| Ação | Circuito {1400+600} | Circuito {100} |
|---|---|---|
| Adicionar um 4º cômodo independente (1900 VA) | mantém o mesmo ID (composição não mudou) | pode ser absorvido pelo novo cômodo se houver espaço — o ID muda junto com a composição |
| Remover o cômodo de 600 VA | ID muda (composição virou {1400+100}) — o ID antigo nunca reaparece associado à composição nova | — |

## 13. Proteção geral — cálculo vetorial completo (§6.2.6.2)

V=127 V, cargas de referência de 1000 VA. Valores conferidos por script Node dedicado antes de
implementar (ver `valores-normativos.md` para a derivação completa) e automatizados como G14:

| Cenário | correntePorFaseA | correnteNeutroA |
|---|---|---|
| 3 cargas resistivas iguais, uma por fase (equilibrado) | [7,874; 7,874; 7,874] A | **≈0 A** |
| 1 carga sozinha na fase A | [7,874; 0; 0] A | **7,874 A** (= corrente da fase) |
| 2 cargas iguais em A e B, C vazia | [7,874; 7,874; 0] A | **7,874 A** (não 15,75, não 13,64) |
| Fase-fase A-C (1000 VA resistiva) + fase-neutro A (500 VA, cosφ=0,8 indutiva) | correntePorFaseA[A]=**8,468 A** (ângulo correto, subtração direta) vs 7,087 A (se usasse um atalho de ângulo fixo "+30°", errado para o par A-C) | — |
| Fase A resistiva / B capacitiva (cosφ=0,7) / C indutiva (cosφ=0,7), mesma potência | [7,874; 7,874; 7,874] A | **12,102 A — 54% acima da maior fase** |

O último cenário é o contraexemplo que derruba a hipótese "a corrente do neutro nunca excede a
maior corrente de fase" — por isso a verificação da corrente do neutro contra a ampacidade do
condutor roda sempre, não só quando o neutro é reduzido pela Tabela 48.

| Verificação do neutro reduzido | Ampacidade (25 mm², B1) | Corrente real declarada | Resultado |
|---|---|---|---|
| Dentro da capacidade | 101 A | 50 A | conforme |
| Acima da capacidade | 101 A | 150 A | **não conforme** — alerta |

## 14. DPS — exigência condicional (§5.4.2.1.1) e Classe I (§6.3.5.2.1 b)

| Alimentação aérea | Região de alto índice de descargas | Exposição a descarga direta | Exigência normativa | Classe |
|---|---|---|---|---|
| não | não | não | não (recomendação) | II |
| sim | não | não | não (as duas condições valem juntas) | II |
| sim | sim | não | **sim** | II |
| — | — | sim | não muda pela exposição sozinha | **I+II** |
| sim | sim | sim | **sim** | **I+II** |

Automatizado como G15.1-G15.5.

## 15. Locais especiais — banheiro/chuveiro (§9.1)

Projeto com 1 cômodo `tipo: 'banheiro'` (chuveiro de 5500 W, ramal de 10 m) — mesmo projeto usado
em G22 e no script `verificar-fase3.mjs` (scratchpad).

| Campo (`resultado.locaisEspeciais`) | Valor esperado | Cláusula |
|---|---|---|
| `possuiBanheiro` | `true` | §9.1.1 |
| `equipotencializacaoSuplementarExigida` | `true` | §9.1.3.1.2 |
| `drAtendePorIdrGeral` | `true` (o IDR geral já sai a 30 mA, `IDR_SENSIBILIDADE_ALTA_MA`) | §5.1.3.2.2 a) |
| `volumes` | 4 entradas (vol.0 IPX7, vol.1 IPX4, vol.2 IPX3–IPX5, vol.3 IPX1–IPX5) | §9.1.2.1 / §9.1.4.1 |

Mesmo projeto **sem** cômodo tipo banheiro → `locaisEspeciais = { possuiBanheiro: false }`, e o
restante do resultado (`protecaoGeral`, `dimensionados`) não muda — a detecção é aditiva, não
interfere em nenhum cálculo existente.

Automatizado como G22.1-G22.4.

## 15a. Volumes do banheiro pela planta (N19, §9.1.2.1)

Caixa do chuveiro/banheira de 0,9 × 0,9 m, canto superior esquerdo na origem (0,0). Pontos
elétricos com posição (x,y, em metros, relativa a esse canto) e altura:

| Ponto | x,y (m) | Distância até a caixa | Altura | Volume | Regra aplicada |
|---|---|---|---|---|---|
| Dentro da caixa | 0,4 / 0,4 | 0 (dentro) | 1,0 m | **0** | qualquer tipo: não conforme (§9.1.4.3.1) |
| Tomada comum | −0,3 / 0,4 | 0,3 m | 1,2 m | **1** | tomada: não conforme (§9.1.4.3.1) |
| Mesma posição, mais alto | −0,3 / 0,4 | 0,3 m | 2,5 m | **2** | "tampa" do volume 1 — simplificação conservadora (ver `valores-normativos.md`, §9.1.2.1) |
| Tomada mais afastada | −2,0 / 0,4 | 2,0 m | 1,2 m | **3** | tomada: conforme (DR ≤30mA já garantido, §9.1.4.3.2) |
| Fora de tudo | −4,0 / 0,4 | 4,0 m | 1,0 m | **fora** (`null`) | qualquer tipo: conforme, sem restrição desta subseção |

Caixa 0×0 (chuveiro sem piso-boxe, Figura 18): a mesma fórmula de distância vira um raio de 0,6 m
ao redor do ponto do chuveiro — ponto a 0,6 m no eixo ou a 0,6 m na diagonal (ex.: x=0,42/y=0,42,
distância ≈0,594 m) caem os dois no volume 1.

Automatizado como G33.1-G33.9 (inclui a integração com `locaisEspeciais`, o veredito e a
sanitização de `geometriaBanheiro` vinda de arquivo/link/armazenamento).

## 16. Curto-circuito por circuito terminal (§6.2.6.1.2 c / §5.3.5.1)

Icc propagada por cadeia de impedância a partir da Icc já declarada no alimentador — §5.3.5.1
permite explicitamente "cálculo" como método de determinação, não só medição.

**Caso âncora** (calculado à mão e pré-verificado contra o motor antes de fixar no harness, mesma
disciplina das fases anteriores): tensão fase-neutro 127 V, Icc do alimentador 1000 A (Xfonte =
127/1000 = 0,127 Ω, tratada como puramente reativa), alimentador 10 m / 10 mm² PVC (r=0,042735 Ω,
x=0,0026 Ω), circuito terminal 20 m / 2,5 mm² PVC (r=0,341880 Ω, x=0,006 Ω) → Z=√(0,384615² +
0,1356²) = 0,407794 Ω → **Icc no ponto terminal ≈ 311,4 A**.

| Cenário | Resultado esperado |
|---|---|
| Icc do alimentador não declarada | todo circuito terminal continua não verificado (regra inalterada) |
| Circuito terminal mais comprido (mesma seção/isolação) | Icc propagada **menor** (mais impedância a jusante) — monotonicidade |
| Circuito ligado fase-fase | verificado pelo laço entre duas fases: 127 V, Icc 1000 A → 866,0 A na origem (× √3/2) e 845,6 A após 10 m de 10 mm² PVC (R = 0,04274 Ω; X = 0,2566 Ω) — G23.7 |
| Circuito fase-neutro, Icc na ponta dentro da faixa de disparo instantâneo garantido | `verificarCurtoCircuito` roda de verdade: I²t≤k²S² com a Icc **no quadro** (§6.3.4.3.2 b) |
| 127 V, Icc 6 kA, ramal 5 m, TUG de cozinha 25 m | Icc no quadro ≈ 4,1 kA > Icc na ponta ≈ 0,4 kA; o I²t usa a do quadro (corrigido em 28/09) |
| Sem comprimento do circuito | Ikmin desconhecida → não verificado (§6.3.4.3.2 a) |
| In 25 A curva C, Icc 200 A (8×In) | não verificado — disparo instantâneo só garantido a partir de 10×In |

Automatizado como G9.5 e G23.1-G23.6.

## 16a. Verificações complementares (Sprint 3)

Projeto: monofásico 127 V, sala 20 m², cozinha 10 m² com 1 tomada na bancada e ar-condicionado
4 kW indutivo, banheiro com chuveiro 5,5 kW; ramal 10 m, Icc 5 kA, TN-C-S, aterramento "protegido
contra corrosão, sem proteção mecânica". Alimentador 35 mm² / PE 16 mm².

| Verificação | Esperado (à mão) |
|---|---|
| Reserva do quadro (Tab. 59) | 5 circuitos → 2; fronteiras 6→2, 7→3, 12→3, 13→4, 30→4, 31→5 (0,15·31=4,65↑) |
| Equipotencialização principal | ½·16 = 8 → 10 mm²; PE 2,5 → 6 (mínimo); PE 70 → 35 → 25 (limite) |
| DPS 127 V | Up ≤ 1,5 kV, Uc ≥ 139,7 V, In ≥ 5 kA, DPS-PE ≥ 4 mm² |
| DPS 220/380 V com descarga direta | Up ≤ 2,5 kV, Uc ≥ 242 V, Iimp ≥ 12,5 kA, DPS-PE ≥ 16 mm², In neutro-PE ≥ 20 kA |
| PEN (TN-C-S) | 35 mm² ≥ 10 → conforme; sem esquema declarado → não avaliado |
| Condutor de aterramento | max(PE 16; Tab. 52): 2,5→16, 16→16, 50→50 |
| Motor | ar-condicionado 4 kW indutivo → consultar a distribuidora; chuveiro resistivo não |
| Bancada | 1 → não conforme; 2 → conforme; vazio → não verificado |
| Capacidade de interrupção | geral ≥ 5 kA; circuitos ≥ Icc no quadro ≈ 4,21 kA |

Automatizado como G24.1-G24.9.

## 16b. Seccionamento automático e DR por grupo (Sprint 4)

| Cenário | Esperado (à mão) |
|---|---|
| TN-C-S, 127 V, Icc 5 kA, ramal 10 m (fase/PEN 10 mm²), TUG 30 m (2,5/PE 2,5), 10 A C | Zs = √(0,555556² + 0,037²) = 0,556786 Ω → If = 228 A ≥ 100 A (10×In): atende pelo disjuntor e pelo DR |
| Alimentador 35 mm² / PE 16 mm²: TN-S × TN-C-S | TN-S (volta pelo PE 16) dá Zs maior que TN-C-S (volta pelo PEN 35) |
| TN sem Icc | não verificado |
| Alimentador com Icc 300 A e geral de 125 A C | If < 1 250 A e sem DR → não verificado (não conforme seria afirmar o que a curva não mostra) |
| TT, RA 900 Ω, DR 30 mA | 27 V: conforme sem banheiro (UL 50), não conforme com banheiro (UL 25); sem RA → limite 833 Ω |
| DR por grupo com montante 300 mA S | cada DR 30 mA com In ≥ min(ΣIn, In geral); montante seletivo |
| DR único e mais de 1 circuito | aviso de disparo intempestivo (§6.3.3.2.6) |
| Sem esquema declarado | seccionamento não verificado em todo circuito |

Automatizado como G25.1-G25.8.

## 16c. Veredito e listas de verificação (Sprint 5)

| Cenário | Esperado |
|---|---|
| Sem esquema e sem Icc | veredito âmbar ("faltam dados"), com as duas pendências listadas; nunca "conforme" |
| Cozinha com 1 tomada na bancada | veredito vermelho, problema apontando a etapa Cômodos |
| TT com banheiro | lista pede medir RA ≤ 833 Ω e traz o grupo Banheiro; sem a cor do PEN |
| TN-C-S com Zs calculado em todos os circuitos | cor do PEN presente; medição de Zs dispensável (§7.3.5.1 NOTA 1) |
| Advertência do quadro | 2 itens, texto integral da §6.5.4.10 |

Automatizado como G26.1-G26.4. UAT: imprimir o memorial com o tema escuro — tem de sair claro, com os "como foi calculado" abertos.

## 16d. Projetos: arquivo, link e casa-modelo (Sprint 6)

| Cenário | Esperado |
|---|---|
| Exportar a casa-modelo em JSON e importar de volta | mesmo projeto, mesmo cálculo (G27.1) |
| Link gerado e aberto em outro navegador | mesmo projeto; entra como projeto novo, sem sobrescrever (G27.1, e2e) |
| Arquivo não-JSON, de outro formato ou de versão mais nova | recusado com mensagem (G27.2, e2e) |
| Campo com tipo errado (tensão "abc", `tue` não-lista, chave desconhecida) | volta ao padrão ou é descartado (G27.2) |
| "Ver exemplo" | casa-modelo com veredito verde: 0 problemas, 0 pendências (G27.3, e2e) |
| Projeto salvo em `fio-certo:projeto` (antes da Sprint 6) | vira "Meu projeto" na nova lista `fio-certo:v2:projetos` (e2e) |

UAT: abrir um link colado pela metade — deve mostrar "Link inválido", nunca uma tela em branco.

## 16e. Materiais, quadro e instalação existente (Sprint 7)

Casa-modelo (bifásica 127/220 V, TN-C-S, ramal 20 m; iluminação 15 m, TUG 18 m, TUE 12 m). Conta à mão dos cabos, sem folga:

| Função / seção | Origem | Metros |
|---|---|---|
| Fase 16 mm² | alimentador: 2 fases × 20 m | 40 |
| PEN 16 mm² | alimentador (TN-C-S: sem PE separado até o quadro) | 20 |
| Fase 2,5 mm² | iluminação 15 + ar-condicionado 2 × 12 | 39 |
| Neutro 2,5 mm² | iluminação (o ar é fase-fase, sem neutro) | 15 |
| PE 2,5 mm² | iluminação 15 + ar 12 | 27 |
| Fase / neutro / PE 4 mm² | 3 circuitos de TUG × 18 m | 54 cada |
| Fase 10 mm² / PE 10 mm² | chuveiro 2 × 12 / 12 | 24 / 12 |

Com 10% de folga: 39 m → 42,9 → **43 m** (para cima). Quadro: 2 DPS fase–PE + 1 neutro–PE (§6.3.5.2.3 a), reserva de 2 (Tabela 59, 6 circuitos), circuitos C1…C6 na ordem do trilho, 21 módulos.
Instalação existente: TUG da cozinha (Ib 11,0 A, Iz de 2,5 mm² = 13,7 A com FCA 0,57) com 2,5 mm² e 20 A → não atende (In > Iz e I₂ > 1,45·Iz); com os 4 mm² e 16 A dimensionados, atende. Automatizado como G28.1-G28.5.

## 16f. Piscina, sauna, consumo e especificação (Sprint 8)

| Cenário | Esperado |
|---|---|
| Cômodo tipo sauna | mínimo de 0 tomadas; não pede perímetro (G29.1, e2e) |
| Sauna com 1 tomada informada | veredito vermelho, "Tomada dentro da sauna", etapa Cômodos (G29.1) |
| Sauna com aquecedor | aviso de cabo para 170 °C no volume 3 e lista "Sauna" com o corte a 140 °C (G29.2) |
| Varanda marcada com piscina | IPX8 / IPX5 / IPX2 e lista "Piscina"; sem a marcação, nada (G29.3) |
| Chuveiro 5500 W, 0,5 h/dia, 30 dias, R$ 0,80/kWh | 5,5 × 0,5 × 30 = **82,5 kWh**; × 0,80 = **R$ 66,00** (G29.4, e2e) |
| Casa-modelo, Icn mínima 5 kA (geral) e 2,1 kA (circuitos) | 6 kA e 3 kA, os próximos padronizados da NBR NM 60898 (G29.5) |

UAT: em rede 220/380 V, escolher o preset "Chuveiro elétrico" — a ligação tem de ficar fase-neutro (220 V), nunca fase-fase (380 V).

## 16g. Percurso do eletroduto e planta (Sprint 9)

| Cenário | Esperado |
|---|---|
| Trecho interno de 15 m reto | conforme (limite 15 m) |
| 13 m com 1 curva de 90° | limite 15 − 3 = **12 m** → não conforme |
| Externo, 27 m com 1 curva | limite 30 − 3 = 27 m → conforme |
| 2 m com 4 curvas | não conforme (§6.2.11.1.7, máx. 3) |
| 24 m reto sem caixa possível | excesso 9 m → **2 tamanhos acima** (o exemplo da própria NOTA de §6.2.11.1.6 b) |
| Retângulo 80 × 60 px a 0,05 m/px | 4 × 3 m → 12 m², 14 m de perímetro |
| Planta sintética: 2 salas, parede interna com porta de 12 px | com o vão fechado (raio 7 px): 2 retângulos [12,12,88,97] e [102,12,87,97]; sem fechar: não separa |

Automatizado como G30.1-G30.4 e G31.1-G31.2; a planta também no e2e (`planta.spec.js`), de ponta a ponta até os cômodos criados.

## 17. Casos manuais (UAT na interface)

Não automatizáveis pelo harness — exigem navegar pela aplicação.

| # | Roteiro | Esperado |
|---|---|---|
| M1 | Avançar até o resultado **sem preencher nenhum comprimento** | A ferramenta não pode declarar conformidade de queda de tensão; deve sinalizar critério não verificado |
| M2 | Cadastrar cômodo sem área nem perímetro | Deve alertar em vez de assumir 100 VA silenciosamente |
| M3 | Cadastrar cômodos suficientes para formar 2+ circuitos de TUG, informar comprimentos, **remover um cômodo do meio da lista** | O circuito cuja composição de cômodos não mudou mantém o comprimento (ID derivado do conjunto de cômodos, não da posição — G12 no harness); o circuito cuja composição mudou perde o comprimento antigo (fica em branco, não é aplicado ao circuito errado) |
| M4 | Digitar área negativa ou colar texto no campo numérico | Deve rejeitar, não absorver como 0 |
| M5 | Criar TUE fase-fase em instalação trifásica | O resultado deve indicar disjuntor **bipolar** (§9.5.4) |
| M6 | Trocar a instalação de trifásica para monofásica com TUE fase-fase cadastrada | A ligação deve cair para fase-neutro e recalcular sem estado órfão |
| M7 | Recarregar a página com projeto salvo no localStorage | Estado restaurado sem quebrar; dados corrompidos devem ser descartados com segurança |
| M8 | Conferir o resultado final contra um projeto real dimensionado por profissional | Divergências devem ser explicáveis por uma simplificação declarada |
| M9 | Trocar o método de um circuito de B1 para C, depois marcar "reduzir o neutro" num alimentador trifásico com fase ≤ 25 mm² | Método deve recalcular a seção na hora; o checkbox de neutro deve continuar sem efeito (Tabela 48 não se aplica) e o eletroduto do circuito em C deve sumir da tela |

**Automatizados na Sprint 9** (`frontend/e2e/roteiros.spec.js`): M1, M2, M3, M4, M5, M6, M7 e M9. O M7 achou um defeito real: um projeto salvo sem data de alteração derrubava a página Projetos ("Invalid time value"); corrigido, e o carregamento agora confere id, nome e datas de cada registro. **M8 continua manual** — depende de um projeto real assinado (ver `PENDENCIAS.md`).

---

## 18. Cobertura ainda ausente

Sem caso de teste porque a funcionalidade não existe. (Métodos E/F/G e condutor de alumínio não
estão aqui de propósito: não são lacuna, são não residenciais — ver "fora de escopo do projeto" em
`ESCOPO.md`.)

- Seccionamento automático no esquema IT (§5.1.2.2.4.4) — não residencial
- Fuga à terra normal dos circuitos (§6.3.3.2.6) — não é calculável com os dados de projeto; só o aviso
- Fator de demanda — não é uma cláusula de uso residencial geral da NBR 5410 (ver ESCOPO.md)
- Percurso físico do eletroduto: comprimento de trechos e número de curvas (§6.2.11.1.6 b /
  §6.2.11.1.7) — a ferramenta calcula só a taxa de ocupação, não modela o percurso
- Tabela 15 completa (mapa de regiões brasileiras → influência externa AQ2/AQ3) — a exigência de
  DPS depende de autodeclaração do usuário (ver seção 14), não de um mapeamento geográfico embutido
- Harmônicos na corrente do neutro — o cálculo vetorial (seção 13) é só na frequência fundamental
  (60 Hz), consistente com o resto da ferramenta (3ª harmônica ≤15% é declaração, não cálculo)
