# Auditoria normativa — Fio Certo (nov/2026)

**Parecer: categoria 3 — adequado para auxiliar o dimensionamento, com revisão profissional
obrigatória.** A conferência com Hélio Creder foi feita (seção abaixo) e não mudou o parecer: a
categoria 4 (validado dentro do escopo) continua não sustentável sem a validação com um projeto
real dimensionado por profissional habilitado.

## Método

1. Leitura de todos os módulos de `frontend/src/calculations/` (20 arquivos) e das páginas que os exibem.
2. Norma lida do `NBR-5410.pdf` (exemplar licenciado, ver aviso do README). Para as tabelas numéricas usei **extração por coordenadas** (pdfplumber: posição x,y de cada palavra), que não sofre do desalinhamento do `pdftotext -layout` — fonte independente da digitação de `constantes.js` e da dupla digitação do harness anterior.
3. Cada correção ou conferência virou critério do harness (`QA/scripts/verificar.mjs`, grupos G35–G44), com valor esperado de conta manual, do PDF, ou de implementação própria escrita no teste.
4. Reprodução dos dois problemas suspeitados e fuzzing de entradas inválidas (ver `RELATORIO_DE_CORRECOES.md`).

## Resultado por item do roteiro

### 3.1 Previsão de cargas — **conforme**
- Iluminação (§9.5.2.1.2): `100 + 60·⌊(A−6)/4⌋`, "4 m² inteiros" = piso. G37.1.
- Tomadas (§9.5.2.2.1): banheiro 1; cozinha/serviço 1 por 3,5 m **ou fração** (teto); sala/dormitório 1 por 5 m; varanda 1; demais por área (2,25/6 m²). G37.2.
- Potência (§9.5.2.2.2): 600 VA nos 3 primeiros pontos (2 com a alternativa "admite-se", só por opt-in) e 100 VA nos demais. G37.3–G37.4.
- **Limites encontrados:** não há fator de demanda (a NBR 5410 não fixa um; o alimentador usa a carga cheia — conservador). O fator de demanda de distribuidoras (9) é informativo. Aquecimento de água sem tomada (§9.5.2.3) é só texto.

### 3.2 Corrente — **conforme**
- `I = VA/V`, com V = fase-neutro (127/220) ou fase-fase (220/380, derivada de V·√3 e arredondada à tensão nominal). G38.1.
- Soma fasorial por fase e neutro (cargas indutivas, capacitivas, desequilibradas). G38.2–G38.3.
- **Rendimento η**: não existia; agora opcional (W/η/cosφ). G37.5.
- Observação: no fasor fase-fase a tensão é 127·√3 = 219,97 V, não 220 V — diferença de 0,014 %, a favor da segurança.

### 3.3 Condutores — **conforme**
- Tabelas 36 e 37: 288 células iguais ao PDF (G36.1); varredura de 4800 casos (Ib × método × isolação) com Iz do PDF (G39.5).
- Tabela 40: 60 valores iguais ao PDF (G36.2); Tabelas 42/45 (G36.3); Tabela 46 e fator 0,86 (§6.2.5.6.1; G40.2); Tabela 47 (G36.5).
- Os seis métodos (A1, A2, B1, B2, C, D) auditados um a um (G39.1). Alumínio e métodos E/F/G fora do escopo residencial (a própria norma restringe o alumínio a indústria/comércio).
- **Corrigido:** fator de agrupamento extrapolado onde a tabela não tem valor.
- **Não implementados:** Tabelas 43 (várias camadas) e 44 (cabos diretamente enterrados); condutores em paralelo.

### 3.4 Queda de tensão — **conforme após correção**
- Circuito terminal: ΔV = 2·L·I·(R·cosφ ± X·senφ), R a 70/90 °C; limite 4 % (§6.2.7.2). G38.4, G39.3.
- Alimentador: cálculo **fasorial por fase com o neutro real** (G35.1–G35.5). Orçamento acumulado de 5 % (§6.2.7.1 c) dividido entre alimentador e terminal.
- **Não implementado:** 7 % (transformador/gerador próprios) e o acréscimo de 0,005 %/m acima de 100 m (NOTA 3) — fora do escopo residencial.

### 3.5 Neutro e harmônicas — **parcial**
- Regras de §6.2.6.2.2 a .6 e Tabela 48 conferidas (G36.4, G40.1, G40.3); verificação da corrente real do neutro (G40.4). Sem declaração, o neutro **não** reduz e a ferramenta pede a taxa de 3ª harmônica (pendência).
- **Limite:** acima de 33 % de 3ª harmônica o neutro pode precisar ser **maior** que a fase (Anexo F) — a ferramenta só avisa. Harmônicas de outras ordens não são modeladas.

### 3.6 Condutor de proteção e aterramento — **parcial**
- Tabela 58 (G36.4), equipotencialização principal (G42.6), PEN ≥ 10 mm² (G44.6), seccionamento TN e TT (G41.4, G41.5).
- **Informativo/não verificável pela ferramenta:** continuidade do PE, resistência de aterramento sem medição, esquema IT, equipotencialização suplementar em campo.

### 3.7 Disjuntores e sobrecorrente — **conforme**
- Ib ≤ In ≤ Iz com Iz corrigido (G39.5). I₂ ≤ 1,45·Iz vale porque I₂ = 1,45·In nos disjuntores IEC 60898 — **fonte externa** à NBR 5410 (declarado).
- Curvas B/C/D: só o limite superior da faixa magnética (G41.2). **Não implementado:** curva tempo-corrente real de fabricante; seletividade.

### 3.8 Curto-circuito — **conforme após correção**
- I²t ≤ k²S² nos limites exatos (G41.1); Icc fase-neutro com o neutro real (G35.6–G35.10); fase-fase (G35.9); Ikmin (G41.2).
- Fonte modelada como reatância pura (convenção de engenharia, não da NBR 5410).
- **Limite estrutural:** abaixo de 10 mm² o fator k não é normalizado (Tabela 30 NOTA 1) — o I²t desses circuitos é sempre "não verificado". Isso agora está explícito em "O que esta ferramenta não verifica".
- **Premissa:** sem a Icc fase-neutro informada, o laço parte da trifásica (pendência no veredito).

### 3.9 DR e DPS — **parcial**
- DR 30 mA em todos os circuitos (mais rigoroso que o mínimo da §5.1.3.2.2), In ≥ In do disjuntor geral, seletividade com DR tipo S (G42.2).
- DPS: Up (Tab. 31), Uc (Tab. 49), In/Iimp, condutor DPS-PE, comprimento ≤ 0,5 m (G42.3); exigência normativa só com alimentação aérea **e** região de alto índice de descargas (§5.4.2.1.1; G42.4). Critérios da NBR 5419 não são calculados.
- **Não implementado:** tipo de DR (AC/A/B) versus cargas, coordenação de DPS em cascata.

### 3.10 Eletrodutos — **conforme**
Taxa de ocupação 53/31/40 % sobre o **diâmetro externo real** do cabo (catálogo; a norma não o tabela) — G42.1. Percurso (≤ 15/30 m, curvas): critérios G30 do harness anterior, não reauditados.

### 3.11 Locais especiais — **parcial**
Volumes 0–3 do banheiro (§9.1.2.1), regras por volume (§9.1.4) e fronteiras exatas (G43). **Corrigido:** erro de ponto flutuante nas fronteiras. Piscina (§9.2) e sauna (§9.4): conferi os números do checklist contra o texto (volumes 2 m/1,5 m/2,5 m; IPX8/5/2-4; SELV 12 V) — sem verificação geométrica. **Não implementado:** cabine pré-fabricada a 0,60 m (§9.1.4.3.3), áreas externas e locais molhados genéricos.

### 3.12 Alimentador e padrão de entrada — **conforme após correção**
Seção por ampacidade + queda fasorial, piso prático de 10 mm² (concessionária, **separado** do mínimo normativo de 2,5 mm²), neutro, PE, reserva da Tabela 59 (corrigido). Padrão de entrada de cada distribuidora é informativo e nunca generalizado.

## Conferência com Hélio Creder, *Instalações Elétricas*, 16ª ed. (LTC)

Exemplar em `docs/` (PDF com camada de texto; **não versionado** — protegido por direitos autorais, está no
`.gitignore`). O livro é referência complementar: onde diverge da NBR 5410:2004, **prevalece a norma**.
Citei tabelas e capítulos do livro (a paginação do PDF difere da impressa). Nada foi transcrito além de
números de tabela.

| Tema | Livro | Resultado da conferência |
|---|---|---|
| Capacidade de condução, cobre PVC | Tab. 3.6 | **144/144 células iguais** à NBR (Tab. 36) e ao código |
| Capacidade de condução, cobre EPR/XLPE | Tab. 3.7 | **142/144 iguais**. 2 erros de impressão do livro: 4 mm² B1/3 condutores = 57 A (NBR e código: **37 A**; 57 A seria maior que os 42 A de dois condutores) e 95 mm² D/2 = 525 A (NBR e código: **252 A**). G45.1 |
| Fatores de temperatura | Tab. 3.10 | Valores iguais à NBR (Tab. 40) |
| Resistividade do solo | Tab. 3.11 | 1,18 / 1,10 / 1,05 / 0,96 — iguais (Tab. 41) |
| Agrupamento enterrado | Tab. 3.14 | **Igual à Tabela 45** (as duas sub-tabelas). A Tab. 3.13 (cabos diretamente enterrados = Tab. 44) **não está implementada** |
| Agrupamento em feixe (Tab. 42) | Tab. 3.12 | A tabela é imagem no PDF: **não conferi no livro**; a Tab. 42 foi conferida contra o PDF da NBR (G36.3) |
| Neutro reduzido / PE | Tab. 3.15, 3.17 | Iguais às Tabelas 48 e 58 |
| Seções mínimas | Tab. 3.2 | Igual à Tab. 47 |
| Iluminação mínima (100 VA + 60 VA/4 m² inteiros) | §3.3.2 | Igual à NBR e ao código |
| Tomadas: quantidade e potência | §3.3.3 | Iguais, **com uma divergência**: o livro pede "pelo menos um ponto de tomada acima de cada bancada"; a NBR 5410:2004 (§9.5.2.2.1 b) pede **no mínimo duas**. O código segue a norma |
| Rendimento | §3.3.1 | **Confirma** o tratamento adotado: quando a potência informada é a de saída, devem ser considerados o rendimento e o fator de potência (campo η, G37.5) |
| Divisão de circuitos | §3.4 | Iguais (> 10 A independente; iluminação separada de tomadas; neutro próprio por circuito — esta última não é verificada pela ferramenta) |
| Queda de tensão | §3.7, Tab. 3.16, 3.18, 3.19 | Mesma fórmula, mas o livro usa ρ = 1/58 (20 °C), cosφ = 1, sem reatância e circuito equilibrado. O código usa a resistência a 70 °C (σ = 46,8): **24% mais queda que o livro** para a mesma potência e distância, a favor da segurança (G45.2). O livro limita a 5% para todos os usos e, nos casos B/C, diz que os circuitos terminais ficam limitados ao valor do caso A; a norma (§6.2.7.2) limita o circuito terminal a **4%**, que é o que o código usa |
| Trifásico | Tab. 3.18/3.19, observação | O livro usa atalhos de tabela (distância × 0,866, ou potência ÷ 3) que superestimam a queda de carga equilibrada; o código usa cálculo fasorial exato (G35) |
| Fator de demanda | Tab. 3.20 | O livro aplica fator de demanda por faixas de potência. O código dimensiona com a carga cheia (conservador); a demanda de distribuidoras é só informativa. **Divergência de método, a favor da segurança** |
| Eletrodutos: taxa de ocupação | §3.10.2 | 53 / 31 / 40% — iguais |
| Eletrodutos: diâmetros internos | Tab. 10.4 (Tigre) | **8/8 iguais** (20 a 85 mm). O de 16 mm do código (Di 12,8) **não tem fonte** no livro: removido (G45.4) |
| Eletrodutos: cabo | Tab. 3.22/3.23, coluna "Total" | O livro tem área maior que o catálogo em 2,5/4/50/70/95/120 mm² (até +8,7% em 120 mm²). **Corrigido**: vale o maior dos dois (G45.3) |
| Eletrodutos: tabela de escolha | Tab. 3.23 | Em 96 de 120 combinações (3 a 12 cabos iguais) o código escolhe o mesmo DN do livro, em 8 escolhe maior e em 16 escolhe **um degrau menor**. Nesses 16, mesmo com as áreas do livro, a ocupação fica entre 35,9% e 39,8% — **dentro dos 40%** da §6.2.11.1.6 a). O livro mantém margem maior de enfiação; o código segue o critério da norma |
| Curto-circuito: Ikmin | §4.5.2, nota 3 | Mesmo critério: Ia ≤ Ikmin, com Ikmin no ponto mais distante |
| Capacidade de interrupção | §4.5.2 b) | Mesmo critério |
| Icc a jusante | §4.5.3, exemplo (a) | Livro: 7,43 kA (fórmula simplificada com cosφ_ko = 0,5). Método do motor: 7,52 kA (+1,2%) (G45.5) |
| Tempos de seccionamento | Tab. 5.3 | Iguais à NBR (Tab. 25); o código usa Ia = disparo instantâneo (< 0,1 s), dentro de todos |

**Não conferido com o livro:** Tab. 3.12 e as equações do §4.5.3 (imagens no PDF); DR e DPS (o livro
trata só em linhas gerais); harmônicas e Anexo F.

## Auditoria dos testes (itens 1–7 da seção 5)

Ver [INVENTARIO_DE_TESTES.md](INVENTARIO_DE_TESTES.md). Resumo:

- O harness tinha 240 critérios (agora 302). Heurística textual: uma parte compara apenas saídas do motor entre si ou testa forma (`null`, `> 0`) — estão listados lá.
- **Teste que usava a própria fórmula como referência:** G18.1 comparava a Tabela 40 com `√((θmax−θ)/(θmax−θref))`. Mantido, mas **superado** por G36.2 (60 valores do PDF).
- **Teste que consagrava comportamento permissivo:** G20.2 ("mantém o último valor tabelado") — atualizado.
- **Cobertura que faltava e foi criada:** fronteiras de área/perímetro/limites normativos; mudança de método, isolação, temperatura, agrupamento, tensão, seção e cosφ; carga desequilibrada; neutro reduzido; Icc mínima e máxima; entradas inválidas e ausentes; fuzzing.
- Unitários e de integração: `verificar.mjs` (motor + `calcularProjetoCompleto` + veredito). Ponta a ponta: Playwright (Chromium/Firefox/WebKit), 96 execuções (32 testes × 3 navegadores): 95 passam, 1 ignorado (PWA offline no WebKit, que o Playwright não consegue testar).

## Pendências (dependem de documentos, fabricantes ou profissional)

1. **Hélio Creder:** conferido (16ª ed.). Restam as partes que são imagem no PDF (Tab. 3.12, equações do §4.5.3), que exigem leitura visual, e DR/DPS/harmônicas, que o livro trata só em linhas gerais.
2. **Normas de produto** (IEC 60898/61008/61009, IEC 61643): o comportamento de I₂, as curvas B/C/D e o tipo de DR vêm delas, não da NBR 5410; conferir contra o catálogo do disjuntor/DR do fabricante escolhido.
3. **NBR 5419** (SPDA, probabilidade de descarga) para exigência real de DPS Classe I.
4. **Catálogo de cabos** (diâmetro externo e reatância): dados de fabricante, não da norma.
5. **Distribuidoras:** padrões de entrada e fator de demanda de cada uma; Copel e Energisa ainda pendentes (`PENDENCIAS.md`).
6. **Validação com projeto real** dimensionado por profissional habilitado.
7. **Tabelas 41, 43, 44:** a 41 foi lida manualmente (4 valores); 43 e 44 não implementadas.
8. **Páginas do PDF citadas** são as do arquivo PDF (Tabela 36 p. 109, 37 p. 110, 40 p. 114, 42 p. 116, 45 p. 118, 46 p. 120, 47 p. 121, 48 p. 123, 30 p. 76, 58 p. 158); a numeração impressa da norma difere.
