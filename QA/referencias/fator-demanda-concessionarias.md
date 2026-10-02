# Fator de demanda por distribuidora — extração literal dos PDFs oficiais

Rascunho de trabalho, ainda não integrado ao motor de cálculo. Cada tabela abaixo foi copiada do
texto extraído (`pdftotext -layout`) do PDF oficial baixado do site da própria distribuidora em
29/09/2026, com o número de linha do `.txt` de origem entre colchetes, para conferência. Nenhum
valor veio de memória, resumo ou site de terceiro.

**Estado dos PDFs oficiais (29/09/2026):**

| Distribuidora | Norma | Baixado | Onde |
|---|---|---|---|
| Cemig (MG) | ND-5.1 | Sim | `distribuidoras/cemig.pdf` |
| Celesc (SC) | N-321.0001, rev. dez/2025 | Sim | `distribuidoras/celesc.pdf` |
| CPFL (Paulista/Piratininga/Santa Cruz) | DIST-13-2026-RE-NOR | Sim | `distribuidoras/cpfl.pdf` |
| Enel (SP/RJ/CE) | Especificação Técnica 0017, v.02 06/03/2025 | Sim | `distribuidoras/enel.pdf` |
| Equatorial (PA/MA/PI/AL/GO/AP/RS-CEEE) | NT.00001.EQTL, rev. 09, 22/05/2025 | Sim | `distribuidoras/equatorial.pdf` |
| Light (RJ) | RECON-BT 2026 | Sim | `distribuidoras/light.pdf` |
| Neoenergia (Coelba/Celpe/Cosern/Elektro/Brasília) | DIS-NOR-030, rev. 07, 17/04/2026 | Sim | `distribuidoras/neoenergia.pdf` |
| EDP São Paulo | PT.DT.PDN.03.14.020, v.06, 23/03/2022 | Sim | `distribuidoras/edp_sp.pdf` |
| EDP Espírito Santo | PT.DT.PDN.00061, v.12, 06/04/2023 | Sim | `distribuidoras/edp_es.pdf` |
| **Copel (PR)** | NTC 901100 | **Não** — site com bloqueio (WAF/Akamai, HTTP 403/503 mesmo na página inicial) a partir desta rede. Precisa do PDF baixado manualmente. | — |
| **Energisa (MT/MS/TO/PB/SE/MG/RO/AC e outros)** | NDU-001 | **Não** — mesmo bloqueio (HTTP 403 no domínio inteiro). Precisa do PDF baixado manualmente. | — |

---

## Equatorial (grupo: Pará, Maranhão, Piauí, Alagoas, Goiás, Amapá, CEEE-RS)

NT.00001.EQTL, revisão 09, homologada em 22/05/2025. `distribuidoras/equatorial.txt`.

### Categoria de atendimento por carga instalada (§6.2, muito dependente do estado) [linhas 735-847]

- **Monofásica** (127 V no AP/PA/RS; 220 V no MA/GO/PI/AL/RS): até 10 kW (127 V) ou até 12 kW (220 V) de carga instalada [747-748].
- **Bifásica** (220/127 V): de 10 a 15 kW [767-768].
- **Trifásica** (220/127 V no AP/PA/RS; 380/220 V no MA/GO/PI/AL/RS): até 75 kW [792-797].
- Área rural com transformador exclusivo: monofásico até 25 kVA (127/220 V) [829-831].

Note: os limites por estado dentro do mesmo grupo Equatorial já não são uniformes — a tensão nominal
varia por estado (127 V ou 220 V para o monofásico), e o limite de carga também.

### Tabela 3 — Potência de aparelhos eletrodomésticos (típica, não fator de demanda) [1464-1557]

Lista de potências típicas de eletrodomésticos (chuveiro, ar-condicionado por BTU, etc.) — mesmo
papel que os "presets" já existentes na ferramenta (`presets.js`), não é fator de demanda.

### Tabela 4 — Fatores de demanda de aparelhos de aquecimento e eletrodomésticos em geral [1568-1647]

Por **número de aparelhos** (não por área), duas colunas: potência individual até 3,5 kW / acima de 3,5 kW.

| Nº de aparelhos | FD (≤3,5 kW) | FD (>3,5 kW) |
|---|---|---|
| 1 | 0,80 | 0,80 |
| 3 | 0,75 | 0,65 |
| 5 | 0,70 | 0,55 |
| 7 | 0,66 | 0,50 |
| 9 | 0,62 | 0,45 |
| 11 | 0,59 | 0,43 |
| 12 | 0,45 | 0,32 |
| 14 | 0,43 | 0,32 |
| 16 | 0,41 | 0,32 |
| 18 | 0,40 | 0,32 |
| 20 | 0,39 | 0,28 |
| 22 | 0,38 | 0,28 |
| 24 | 0,37 | 0,28 |
| 26–30 | 0,36 | 0,28 |
| 31–40 | 0,35 | 0,28 |
| 41–50 | 0,35 | 0,28 |
| 51–60 | 0,34 | 0,26 |
| acima de 61 | 0,34 | 0,26 |

Linhas 1576, 1580, etc. (2, 4, 6, 10) não têm valor próprio impresso no texto extraído — a tabela
original parece intercalar linhas de dado com linhas em branco por número par; **isto precisa ser
conferido no PDF (visualmente), porque `pdftotext -layout` pode ter perdido uma coluna** — mesmo
tipo de desalinhamento já visto antes neste projeto com a NBR 5410. Não usar sem essa conferência.

Residência com **um único chuveiro/aquecedor**: FD = 0,80 (linha "1").

### Tabela 5 — Carga mínima e demanda para iluminação e tomadas, por tipo de edifício [1658-1707]

Linha relevante para residência: **"Residências e Edifícios de Apartamentos"** — carga mínima
30 W/m², fator de demanda 100% para os primeiros 10 kW, 35% para os 110 kW seguintes, 25% acima de
120 kW [1699-1703]. Não distingue casa individual de prédio de apartamentos — o mesmo fator vale
para os dois.

### Curto-circuito / capacidade de interrupção

Não encontrado nas seções lidas até agora (grep por "curto-circuito" e "interrupção" ainda não
feito neste documento — pendente).

---

---

## EDP São Paulo

PT.DT.PDN.03.14.020, versão 06, vigência desde 23/03/2022. `distribuidoras/edp_sp.txt`. **A norma
mais bem estruturada das lidas até agora** — fórmula fechada e uma tabela por tipo de carga.

### Fórmula (§6.5.2) [1549-1576]

`D = a + b + c + d + e + f + g + h + i` (kVA), onde cada letra é a demanda de uma categoria:
a) iluminação e tomadas; b) chuveiros/torneiras/aquecedores de passagem/ferro elétrico; c) boiler ou
sauna; d) secadora/forno elétrico/máquina de lavar louça-roupa/micro-ondas; e) fogão elétrico;
f) ar-condicionado; g) motores; h) equipamentos especiais; i) hidromassagem.

### Tabela 004 — nº mínimo de tomadas por área construída (residencial) [1983-2014]

Ponto de partida da carga instalada de tomadas: de ≤8 m² (1 tomada, 100 W, mais 600 W de cozinha)
até 220–250 m² (14 tomadas + cozinha). Acima de 250 m², o cliente declara.

### Tabela 005 — fator de demanda de iluminação e tomadas, residencial [2033-2057] — **limpa**

| Carga instalada (kW) | FD |
|---|---|
| ≤ 1 | 0,86 |
| 1–2 | 0,75 |
| 2–3 | 0,66 |
| 3–4 | 0,59 |
| 4–5 | 0,52 |
| 5–6 | 0,45 |
| 6–7 | 0,40 |
| 7–8 | 0,35 |
| 8–9 | 0,31 |
| 9–10 | 0,27 |
| > 10 | 0,24 |

### Tabela 007 — chuveiros/torneiras/aquecedores de passagem/ferro elétrico, por nº de aparelhos [2110-2134] — **limpa**

| Nº aparelhos | FD | Nº aparelhos | FD |
|---|---|---|---|
| 1 | 1,00 | 10 | 0,40 |
| 2 | 0,90 | 11 | 0,36 |
| 3 | 0,84 | 12 | 0,32 |
| 4 | 0,76 | 13 | 0,30 |
| 5 | 0,68 | 14–15 | 0,29 |
| 6 | 0,61 | 16–20 | 0,28 |
| 7 | 0,55 | 21–25 | 0,27 |
| 8 | 0,49 | > 25 | 0,26 |
| 9 | 0,44 | | |

Conta todos os aparelhos juntos (chuveiro + torneira + ferro), não separado por tipo.

### Tabela 008 — boiler/sauna, por nº de aparelhos [2136-2146] — **limpa**

1: 1,00 · 2: 0,76 · 3: 0,62 · acima de 3: 0,62.

### Tabela 009 — secadora/forno/máq. lavar louça-roupa/micro-ondas [2159-2172] — **limpa**

1: 1,00 · 2 a 4: 0,70 · 5 a 6: 0,60 · 7 a 8: 0,50 · acima de 8: 0,50.

### Tabela 013 — motores [2257-2263] — **limpa**

O maior motor: FD 1,00. Os demais: FD 0,50 cada (se os maiores tiverem potência igual, só um conta
como "maior").

### Tabela 015 — hidromassagem [2282-2292] — **limpa**

1: 1,00 · 2: 0,56 · 3: 0,47 · 4 ou mais: 0,39.

### Não usar sem conferência visual no PDF (colunas desalinhadas pela extração)

- **Tabela 010** (fogões elétricos) [2178-2192]: números de aparelhos e FDs saíram em colunas
  trocadas — mesmo tipo de desalinhamento de coluna já visto antes neste projeto (NBR 5410,
  Tabela 42).
- **Tabela 011** (potência/corrente de ar-condicionado por BTU) [2194-2219] e **Tabela 012** (FD do
  ar-condicionado comercial): desalinhadas. Para uso residencial, a nota da §6.5.2.f já diz FD = 1,00
  sempre, então a Tabela 012 não seria necessária para residência mesmo — só a 011 (se algum dia
  quisermos a potência típica por BTU, mas `presets.js` já cobre isso de outra fonte).
- **Tabela 001/002** (categoria de atendimento / padrão de entrada): a extração misturou a tabela com
  texto de outras seções (ex. linha 1855, 1902). Fora do escopo desta rodada (ver nota de projeto).

### Curto-circuito / capacidade de interrupção

Não encontrado (grep por "curto-circuito", "capacidade de interrupção", "Icc", "kA" só achou uma
menção genérica a "sobrecargas e/ou curto-circuitos", sem número).

---

---

## EDP Espírito Santo

PT.DT.PDN.00061, versão 12, vigência desde 06/04/2023. `distribuidoras/edp_es.txt`.

**Achado relevante: não aplica fator de demanda para residência individual.** O §5.4 ("Cálculo da
Carga Instalada") manda somar a carga instalada diretamente (100%), sem tabela de redução — a
mesma estrutura de eletrodomésticos mínimos da EDP SP (chuveiro 5.400 W etc., §5.4.2 [1424-1445]),
mas sem a etapa de "fator de demanda" que a EDP SP tem. A "Tabela 6 – Carga mínima e Fatores de
Utilização" [2468-2512] só cobre "Outros tipos de instalação" (auditório, banco, escola, hospital,
loja...) — **residência não está entre as linhas da tabela**, ao contrário do que acontece na
Equatorial e na EDP SP (onde "Residências" é uma linha da mesma tabela). Mesmo grupo econômico da
EDP SP, política diferente — não presumir que distribuidoras do mesmo grupo tratam demanda igual.

### Curto-circuito / capacidade de interrupção

Não encontrado.

---

---

## Cemig (MG)

ND-5.1, vice-presidência de Distribuição. `distribuidoras/cemig.txt`. Revisão/data exatas não
lidas ainda (a folha de capa é DocuSign, sem data de vigência destacada no texto — conferir).

### Quando a demanda calculada vale (§8.2.1) [2740-2745]

Só se aplica a unidades **trifásicas 127/220 V com carga instalada entre 16,1 kW e 75,0 kW**. Fora
dessa faixa, o padrão de entrada é dimensionado pela carga instalada direta (Tabelas 1-4, por
faixa). Além disso, o critério é **opcional** — "é do consumidor a responsabilidade da escolha do
critério a ser adotado" [2747-2750]. Não é uma redução automática e obrigatória como na EDP SP.

### Fórmula (§8.2.3) [2752-2784]

`D = a + b + c + d + e + f` (kVA): a) iluminação/tomadas (Tabelas 10-11); b) eletrodomésticos e
aquecimento, por 5 subgrupos aplicados separadamente (b1 chuveiro/torneira/cafeteira; b2
aquecedor de água; b3 forno/fogão/grill; b4 lavar/secar roupa, lavar louça, ferro; b5 demais);
c) ar-condicionado (Tabela 13, central = 100%); d) motores (Tabelas 14-15); e) solda; f) raios-X.

### Tabela 10 — iluminação e tomadas, residencial, por carga instalada [3442-3459] — **limpa**

| CI (kW) | FD |
|---|---|
| ≤ 1 | 0,86 |
| 1–2 | 0,81 |
| 2–3 | 0,76 |
| 3–4 | 0,72 |
| 4–5 | 0,68 |
| 5–6 | 0,64 |
| 6–7 | 0,60 |
| 7–8 | 0,57 |
| 8–9 | 0,54 |
| 9–10 | 0,52 |
| > 10 | 0,45 |

Curva parecida com a da EDP SP, valores diferentes — **não são a mesma tabela**, mesmo com a
mesma primeira linha (0,86 até 1 kW é coincidência, o resto diverge).

### Tabela 13 — aparelhos eletrodomésticos/aquecimento/refrigeração/ar-condicionado, por nº de aparelhos [3548-3569]

Usada nos grupos b1-b5 e no ar-condicionado (item c). 1 aparelho: 100%. 2: 92%. 3: 84%. 4: 76%.
5: 70%. 6: 65%. 7: 60%. 8: 57%. 9: 54%. 10: 52%. **A partir de 11 aparelhos a extração desalinhou
as duas colunas da tabela** (o texto pula de "11" direto para uma coluna com "43", sem ligação
clara) — precisa de conferência visual no PDF antes de usar acima de 10 aparelhos.

### Tabela 12 — fornos e fogões elétricos, por nº de aparelhos e potência [3508-3542]

Mesmo problema: as linhas 1-3 não têm valor junto (a tabela parece ter perdido linhas), só a partir
da linha "4" aparecem os dois números (0,80/1,00). **Não usar sem conferência visual.**

### Capacidade de interrupção mínima do disjuntor geral (§7.3.1.5 f) [2321-2323] — **achado direto, sem tabela de fator de demanda**

A Cemig **exige um Icn mínimo** no disjuntor do padrão de entrada, independente da Icc real do
ponto: **4,5 kA a 230 V ou 5 kA a 127 V** para disjuntores mono/bi/tripolares até 125 A; **10 kA a
220/230 V** para bi/tripolares a partir de 125 A. Isto não é a Icc presumida (não serve para
seccionamento nem Ikmin) — é um **piso normativo de Icn** que o disjuntor precisa ter de qualquer
forma, útil para nunca recomendar um Icn comercial abaixo disso quando o usuário estiver na área da
Cemig.

---

---

## Celesc (SC)

N-321.0001, aprovada pela RES. DCL nº 143/2025 de 12/11/2025. `distribuidoras/celesc.txt`.

**Achado relevante: sem fator de demanda para residência individual.** "Fator de Demanda" só
aparece como definição de glossário (§4.18 [668-671]); não há, entre as 20+ tabelas do documento,
nenhuma tabela de fator de demanda para iluminação/tomadas nem para chuveiro por quantidade — só
a Tabela 04 (demanda de motores) reduz carga. O padrão de entrada residencial é dimensionado
diretamente pela carga instalada nas Tabelas 01/02 (por faixa de tensão, sem redução). Terceira
distribuidora (depois de EDP ES) sem fator de demanda para casa.

### Capacidade de interrupção mínima do disjuntor (Especificação 20, Tabela 20.1) [4923-4945]

Exige disjuntor conforme **NBR IEC 60947-2** (Icn 4,5 kA em 1/2 polos até 63/90A, 10 kA nas faixas
maiores) **ou NBR NM 60898** (Icn 3 kA). **A tabela saiu com as colunas de corrente por número de
polos desalinhadas na extração** [4933-4944] — dá para afirmar o piso geral (3 a 10 kA conforme a
norma de produto e a faixa), mas a correspondência exata corrente→kA precisa de conferência visual
no PDF antes de virar regra automática.

---

---

## CPFL (Paulista/Piratininga/Santa Cruz)

DIST-13-2026-RE-NOR, versão 46.0, publicação 19/03/2026. `distribuidoras/cpfl.txt`. Mesma fórmula
`D = a+b+c+d+e+f+g+h+i` e quase os mesmos valores da EDP SP (mesma origem histórica provável).

### Tabela 3 — iluminação e tomadas, residencial, por carga instalada [3919-3935] — **limpa, idêntica à Tabela 005 da EDP SP**

0–1 kW: 0,86 · 1–2: 0,75 · 2–3: 0,66 · 3–4: 0,59 · 4–5: 0,52 · 5–6: 0,45 · 6–7: 0,40 · 7–8: 0,35 ·
8–9: 0,31 · 9–10: 0,27 · >10: 0,24.

### Tabela 4 — chuveiro/torneira/aquecedor de passagem/ferro, por nº de aparelhos [3948-3981] — **limpa** (a linha "1" saiu colada ao rodapé "Cópia Não Controlada", mas o valor 1,00 é claro pelo padrão de toda tabela análoga já visto)

1: 1,00 · 2: 1,00 · 3: 0,84 · 4: 0,76 · 5: 0,70 · 6: 0,65 · 7: 0,60 · 8: 0,57 · 9: 0,54 · 10: 0,52 ·
11: 0,49 · 12: 0,48 · 13: 0,46 · 14: 0,45 · 15: 0,44 · 16: 0,43 · 17: 0,42 · 18: 0,41 · 19–20: 0,40 ·
21–23: 0,39 · 24–25: 0,38 · acima de 25: 0,38.

### Tabela 5 — boiler [3985-3995] — **limpa**: 1: 1,00 · 2: 0,72 · 3: 0,62 · acima de 3: 0,62.

### Tabela 6 — secadora/forno/lavar louça/micro-ondas [3997-4010] — **limpa**: 1: 1,00 · 2 a 4: 0,70 ·
5 a 6: 0,60 · 7 a 8: 0,50 · acima de 8: 0,50.

### Tabela 9 — ar-condicionado por quantidade [4059-4081] — **limpa**: 1 a 10: 1,00 · 11–20: 0,90 ·
21–30: 0,82 · 31–40: 0,80 · 41–50: 0,77 · 51–100: 0,75 · acima de 100: 0,75. Nota: central sempre
1,00. Para 1-10 aparelhos (o caso residencial normal), o fator é sempre 1,00 — igual à EDP SP.

### Tabela 7 (fogões) — **não usar sem conferência visual** [4023-4041], colunas desalinhadas.

### Capacidade de interrupção mínima do disjuntor [1372-1383]

Exige, por faixa de corrente nominal do disjuntor geral: 32-63 A conforme NBR NM 60898/IEC 60947
(valor não veio limpo na extração); 80-100 A: 10 kA a 220/127 V ou 5 kA a 380/220 V; 125-200 A:
acima de 10 kA (220/127 V) ou 10 kA (380/220 V); acima disso, 12 kA nos dois níveis. **A tabela
saiu com linhas deslocadas — a correspondência exata precisa de conferência visual**, mas o padrão
geral (mais corrente → mais kA exigido, maior a 220/127 V que a 380/220 V na mesma faixa) é
plausível e consistente com o que outras distribuidoras exigem.

---

---

## Enel (SP, RJ, CE — "Conexão Individual")

Especificação Técnica nº 0017, versão 02, 06/03/2025. `distribuidoras/enel.txt`. **Não tem tabela
própria de fator de demanda para residência** — o documento é sobre o padrão de entrada físico
(postes, caixas, disjuntores) e remete, nas Referências (§4), à **ABNT NBR 10676:2011** para o
cálculo de carga/demanda (ver seção NBR 10676 abaixo). Só uma linha de glossário cita "fator de
demanda" (definição), sem tabela.

### Capacidade de interrupção do disjuntor geral

Não achei um valor numérico de kA na leitura feita (linhas 3820+ e 7900+ falam de exigir
"capacidade de interrupção compatível", sem publicar um kA fixo como Cemig/Celesc/CPFL) — pendente
de segunda leitura mais completa se este item for necessário depois.

---

## Light (RJ)

RECON-BT 2026. `distribuidoras/light.txt`. **Tabelas próprias, diferentes da família NBR 10676.**

### Tabela (residencial, iluminação/tomadas) [3345-3351] — números por posição de tabela (P1..P10), não claramente uma tabela de "carga instalada (kW)": 1: 80% · 2: 75% · 3: 65% · 4: 60% · 5: 50% · 6: 45% · 7: 40% · 8: 35% · 9: 30% · 10: 24-27% (a extração ficou ambígua entre 24 e 27 no último degrau — **conferir visualmente**).

Diferente da família NBR 10676 (que começa em 86% e não em 80%) — **confirma que distribuidoras
diferentes realmente aplicam curvas diferentes**, não é só formatação.

### Tabela 6.4 — aquecimento (chuveiro/torneira/aquecedor), por nº total de aparelhos [3362-3392] — **limpa, curva suave, bem diferente da família NBR 10676**

1: 100% · 2: 75% · 3: 70% · 4: 66% · 5: 62% · 6: 59% · 7: 56% · 8: 53% · 9: 51% · 10: 49% · ... ·
25 ou mais: 30%. (A família NBR 10676 tem 2 aparelhos ainda em 100% e cai mais devagar no início,
mais rápido depois — são curvas genuinamente diferentes, não arredondamento.)

### Tabela 6.5 — ar-condicionado, uso residencial, por quantidade [3403-3419] — **limpa**

1 a 4: 100% · 5 a 10: 70% · 11-20: 60% · 21-30: 55% · 31-40: 53% · 41-50: 52% · acima de 50: 50%.
Diferente da família NBR 10676 (que dava 100% até 10 aparelhos): a Light já reduz a partir do 5º.

### Capacidade de interrupção do disjuntor geral [9404-9408]

Exige Icn **compatível com a maior Icc trifásica simétrica calculada no ponto** — não publica um
valor de referência fixo (ao contrário de Cemig/Celesc/CPFL). A "Tabela 10.1" citada na nota é, na
verdade, a tabela do fator k do condutor de proteção (mesma da NBR 5410), não uma tabela de Icc por
local — não há aqui um dado de Icc utilizável.

---

## Neoenergia (Coelba/Celpe/Cosern/Elektro/Neoenergia Brasília)

DIS-NOR-030, revisão 07, aprovada 17/04/2026. `distribuidoras/neoenergia.txt`. Mesma fórmula
`D=a+b+c+...+i` [2509] e **tabelas idênticas, número por número, às da CPFL/EDP SP** — Tabela 7
(chuveiros) conferida linha a linha contra a Tabela 4 da CPFL: valores iguais, mesma frase de
exemplo ("4 chuveiros + 2 torneiras + 1 ferro..."). Cita NBR 10676 no texto (§7, referências, e
§9 de um item específico) [3073-3074, 3165]. Mais uma confirmação da família NBR 10676.

---

## NBR 10676:2011 — a possível origem comum

**Achado central desta rodada.** Cinco das nove distribuidoras com PDF baixado (CPFL, EDP SP, Enel,
Equatorial, Neoenergia) citam **ABNT NBR 10676:2011 — "Fornecimento de energia a edificações
individuais em tensão secundária – Rede de distribuição aérea"** nas suas referências normativas, e
pelo menos três delas (CPFL, EDP SP, Neoenergia) têm tabelas de fator de demanda **numericamente
idênticas** entre si (mesmos valores, mesma tabela de chuveiro, até o mesmo exemplo didático na
nota de rodapé) — o que sugere fortemente que todas as três só reproduzem as tabelas da NBR 10676
dentro do próprio documento, em vez de cada uma calcular a sua.

**Isso muda a arquitetura recomendada:** em vez de manter 9+ tabelas por distribuidora (com o risco
de erro de transcrição de cada uma), o caminho mais seguro e mais barato de manter é obter a **NBR
10676:2011 em si** — um único documento ABNT, com a mesma disciplina já usada para a NBR 5410 (não
afirmar valor de memória, extrair e conferir do PDF licenciado) — e usá-la como fonte primária do
fator de demanda "família 10676", com cada distribuidora entrando só para dizer **se** ela adota
essa família (a maioria) ou tem política própria (Cemig, Light — números diferentes; Celesc, EDP ES
— não reduzem carga residencial nenhuma).

**Atualização (29/09/2026): o usuário tinha uma cópia, mas é a edição errada.** É a **NBR
10676/1999** (não a 2011 citada pelas distribuidoras), 34 páginas, Anexo A com só 3 tabelas
(Tabela 1: categoria de atendimento por carga/demanda; Tabela 2: dispositivo de partida de motor;
Tabela 3: materiais do padrão) — **nenhuma tabela de fator de demanda de iluminação/chuveiro**. O
próprio texto da edição de 1999 diz isso explicitamente (§4.5.3): *"o critério de cálculo para
estimativa da demanda provável das unidades consumidoras é estabelecido pelas concessionárias"*
— ou seja, mesmo em 1999 a NBR 10676 delegava o cálculo a cada distribuidora, sem tabela própria.

Isso explica a hipótese de outro jeito: a edição de **2011** parece ter sido a primeira a trazer
tabelas de fator de demanda padronizadas (dado que 5 distribuidoras a citam, e 3 delas têm tabelas
idênticas), mas **isso não pôde ser confirmado nesta rodada** — a cópia de 1999 não tem essas
tabelas, e a de 2011 não foi obtida. **Decisão adotada:** usar o PDF de cada distribuidora como
fonte primária das tabelas dela (já verificado e citado, ver seções acima), sem afirmar que vêm da
NBR 10676 — só registrar, onde três ou mais distribuidoras têm a tabela idêntica, que isso sugere
uma origem comum não confirmada nesta rodada. A cópia de 1999 fica só como referência histórica
(`distribuidoras/nbr10676.txt`), não como fonte de valor nenhum usado no motor.

---

## Síntese e recomendação (29/09/2026)

| # | Distribuidora | Família | Reduz carga residencial? | Icn mínimo do geral publicado? |
|---|---|---|---|---|
| 1 | CPFL | NBR 10676 (idêntica) | Sim | Faixas por corrente, 5-12 kA (desalinhado, conferir) |
| 2 | EDP SP | NBR 10676 (idêntica) | Sim | Não encontrado |
| 3 | Neoenergia | NBR 10676 (idêntica) | Sim | Não encontrado nesta leitura |
| 4 | Equatorial | Parecida, não idêntica | Sim | Não encontrado |
| 5 | Enel | Remete à NBR 10676, sem tabela própria | — | Não encontrado nesta leitura |
| 6 | Cemig | Própria, parecida na forma | Sim, só 16,1-75 kW e opcional | **4,5-10 kA por faixa (limpo)** |
| 7 | Light | Própria, claramente diferente | Sim | Sem valor fixo (exige igualar à Icc do ponto) |
| 8 | Celesc | — | **Não** | 3-10 kA conforme norma de produto (desalinhado) |
| 9 | EDP ES | — | **Não** | Não encontrado |
| 10 | Copel | não obtido | — | — |
| 11 | Energisa | não obtido | — | — |

**Recomendação:** eu pausaria a extração aqui, sem escrever código ainda, e voltaria para você com
estes achados antes de decidir o desenho (ver conversa). Continuar mecanicamente as 9 tabelas sem
resolver a pergunta da NBR 10676 arriscaria depois ter que redigitar tudo.
