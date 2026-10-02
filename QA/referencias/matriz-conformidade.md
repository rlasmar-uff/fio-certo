# Matriz de conformidade normativa

Rastreabilidade cláusula → implementação → verificação. Atualize a coluna **Status** a cada
correção; é este arquivo que responde "o que já está coberto?" sem reler o código.

**Legenda de status**
`OK` conforme · `PARCIAL` implementado com desvio ou lacuna · `DESVIO` implementado incorretamente ·
`AUSENTE` não implementado · `N/A` fora do escopo declarado

Última revisão: **2026-10-01** — auditoria adversarial de 30/09/2026 (G34): Tabela C.2 com a
situação 3 (12 V), geometria dos volumes do banheiro corrigida para box declarado (`box.baseM`,
altura do fundo da banheira), k não aplicado abaixo de 10 mm² (Tabela 30 NOTA 1), Tabela 45 trocada
para a sub-tabela de condutor unipolar, harmônica acima de 33% com aviso de neutro possivelmente
maior (`avisoNeutroSuperior`), linha fabricada removida da Tabela 48, alternativa dos 600 VA virou
opt-in (`aplicarAlternativa600VA`), varanda com tipo e regra próprios (`TIPOS_COMODO.varanda`,
§9.5.2.2.1 c, separada de `outro`/alínea e), e dupla digitação da Tabela 36 estendida para
A1/A2/D e para a Tabela 37 inteira (288 células reconferidas contra uma extração nova do PDF — ver
`QA/relatorios/2026-09-30-auditoria-adversarial.md` e `2026-10-01-pos-correcao-adversarial.md`).
Fase 4 (28/09): curto-circuito por circuito terminal, §6.2.6.1.2 c /
§5.3.5.1 (G23): Icc propagada por cadeia de impedância a partir da Icc já declarada no alimentador
(a norma permite "cálculo" como método de determinação), para circuitos fase-neutro; fase-fase
declarado explicitamente não coberto. Fase 3 (mesmo dia): locais especiais — banheiro/chuveiro,
§9.1 (G22): equipotencialização suplementar exigida quando há banheiro no projeto, confirmação de
que o DR geral (já 30 mA) satisfaz §5.1.3.2.2 a), e checklist informativo dos volumes 0-3/IP
mínimo. Fase 2 (2026-09-18): isolação EPR/XLPE (Tabela 37/G17), Tabela 40 nas 4 colunas ar/solo ×
PVC/EPR (G18), `k` e condutividade por isolação (G19), método D — eletroduto enterrado, Tabela 45,
temperatura do solo (G20), métodos A1/A2 — parede termicamente isolante (G21). Fase 1 (2026-09-17,
ver `QA/relatorios/2026-09-17-pos-correcao.md`): dimensionamento de eletroduto/G7, métodos de
instalação B1-B2-C/G8, curto-circuito opcional/G9, redução do neutro/G6.7-G6.9, busca exata de
balanceamento/G10, reatância por seção/G11, IDs de circuito estáveis/G12, divisão de circuitos por
First-Fit Decreasing/G13, cálculo vetorial completo da proteção geral e do neutro/G14, DPS
condicional/G15, número de condutores carregados da Tabela 46/G16. Auditoria inicial: 2026-09-16
(50 conformes, 23 divergências); auditoria adversarial: 2026-09-30 (211 conformes, 11
divergências). Estado atual: **240 conformes, 0 divergências**
(`node QA/scripts/verificar.mjs`).

O total caiu de 136 para 116 na Fase 1 sem perda de cobertura: o G2 foi consolidado de ~50
asserções por seção para 6 por coluna (um erro de transcrição numa coluna é **um** achado, não
doze — ver o critério de agregação na skill de QA), e o G16 acrescentou 7. A Fase 2 acrescentou os
21 critérios de G17-G21, a Fase 3 acrescentou os 4 de G22, e a Fase 4 acrescentou os 4 de G23. A Sprint 3 (28/09) acrescentou G9.5, G23.5-G23.6 (correção do curto-circuito) e os 9 de G24. A Sprint 4 acrescentou os 8 de G25; a Sprint 5, os 4 de G26 (veredito e listas de verificação); a Sprint 6, os 3 de G27 (arquivo, link e casa-modelo — não é cláusula da norma); a Sprint 7, os 5 de G28 (materiais, quadro e instalação existente); a Sprint 8, os 5 de G29 (piscina, sauna, consumo e especificação); a Sprint 9, os 4 de G30 (mais o G30.5, alimentador, depois) (percurso do eletroduto) e os 2 de G31 (planta: escala e detecção); a Sprint 10, o G27.4 (arquivo hostil); a fase de lacunas de cálculo (29/09), o G23.7 (curto fase-fase) e o G7.4 (eletroduto EPR); depois, o G23.8 (Icc fase-neutro informada) e o G28.6 (PE e seccionamento do existente). A versão pública desta matriz é a página Conformidade (`frontend/src/conteudo/conformidade.js`): ao mudar um status aqui, atualize lá.

---

## §9.5.2 — Previsão de carga

| Cláusula | Prescrição | Status | Implementação | Verificação |
|---|---|---|---|---|
| §9.5.2.1.1 | Ponto de luz fixo no teto por cômodo | `N/A` | — | não é cálculo elétrico |
| §9.5.2.1.2 a) | ≤ 6 m² → 100 VA | `OK` | `calcularIluminacaoMinimaVA` | G1.1 |
| §9.5.2.1.2 b) | > 6 m² → 100 VA + 60 VA por 4 m² **inteiros** | `OK` | `Math.floor` (piso, não teto) | G1.1 |
| §9.5.2.2.1 a) | Banheiro: ≥ 1 ponto | `OK` | `TIPOS_COMODO.banheiro.tugFixa` | G1.4 |
| §9.5.2.2.1 b) | Cozinha/serviço: 1 por 3,5 m ou fração | `OK` | `tugPorMetroPerimetro: 3.5` | G1.3 |
| §9.5.2.2.1 b) | ≥ 2 tomadas acima da bancada da pia | `OK` | campo `tomadasBancada` no cômodo de serviço; vazio = não verificado, < 2 = não conforme (`verificacoesComplementares`) | G24.7 |
| §9.5.2.2.1 c) | Varanda: ≥ 1 ponto | `OK` | `TIPOS_COMODO.varanda` (`tugFixa: 1`) — tipo próprio desde 30/09/2026, separado de `outro` (que aplicava a regra da alínea e) à varanda) | G34.9 |
| §9.5.2.2.1 d) | Sala/dormitório: 1 por 5 m ou fração | `OK` | `tugPorMetroPerimetro: 5` | G1.2 |
| §9.5.2.2.1 e) | Demais cômodos: 3 faixas (2,25 / 6 m² / 5 m) | `OK` | `calcularQuantidadeTugMinima` trata `outro` como caso especial dependente de área | — |
| §9.5.2.2.2 a) | 600 VA até 3 pontos, 100 VA excedentes | `OK` | `potenciaTugPorPonto` | G1.5 |
| §9.5.2.2.2 a) | Alternativa: > 6 pontos no conjunto → 600 VA até 2 | `OK` | `calcularLimite600VA(comodos, aplicarAlternativa)` — opt-in explícito desde 30/09/2026 (`projeto.aplicarAlternativa600VA`, default `false`); a norma diz "admite-se", não "deve", e até então era aplicada automaticamente sem o usuário saber | G1.7, G34.10 |
| §9.5.2.2.2 b) | Demais cômodos: 100 VA por ponto | `OK` | `tugPotenciaBase: 100` | G1.6 |
| §9.5.2.3 | Aquecedor de água: conexão direta, sem tomada | `N/A` | — | regra de instalação |
| — | Fatores de demanda e simultaneidade | `N/A` | soma direta (sem redução) — conferido no PDF: §4.2.1.2.2 é sobre iluminação, não demanda; a NBR 5410 não tem uma tabela de fator de demanda para uso residencial geral (matéria de norma de distribuição da concessionária) | — |

## §9.5.3 / §9.5.4 — Divisão da instalação e proteção

| Cláusula | Prescrição | Status | Implementação | Verificação |
|---|---|---|---|---|
| §4.2.5.5 | Dividir a instalação em circuitos | `OK` | `gerarCircuitos` | G3.1 |
| §9.5.3.1 | Equipamento > 10 A em circuito independente | `OK` | circuito dedicado por TUE (mais conservador) | G3.4 |
| §9.5.3.2 | Cozinha/copa/área de serviço/lavanderia em circuito exclusivo | `OK` | separação `cargasServico` | G3.2 |
| §9.5.3.2 | Banheiro **não** pertence a esse grupo exclusivo | `OK` | banheiro em `cargasGeral` | G3.3 |
| §9.5.3.3 | Circuito comum iluminação+tomadas (condições) | `N/A` | sempre separa — conservador e conforme | — |
| §9.5.4 | Seccionamento simultâneo de todas as fases (multipolar) | `OK` | `polos: circuito.ehFaseFase ? 2 : 1` | G4.7 |

## §6.2.5 / §6.2.6 — Condutores

| Cláusula | Prescrição | Status | Implementação | Verificação |
|---|---|---|---|---|
| Tabela 36/37 | Ampacidade cobre, PVC e EPR/XLPE, métodos A1/A2/B1/B2/C/D | `OK` | seleção por circuito (`METODOS_INSTALACAO`) e por projeto (isolação); coluna escolhida pelo esquema de condutores vivos, não fixa | G2.1, G8.1-G8.3, G17, G21 |
| Tabela 36 | Integridade dos valores transcritos (12 colunas: A1/A2/B1/B2/C/D × 2 e 3 cond.) | `OK` | `TABELA_36_COBRE_PVC` em formato de tupla. Dupla digitação independente (`TABELA_36_REFERENCIA`) estendida em 30/09/2026 das 6 colunas B1/B2/C para as 12 (A1/A2/B1/B2/C/D) — as 144 células reconferidas contra uma extração nova e independente do PDF (páginas 109-110), lendo cada sequência de valores na ordem natural de impressão (a extração desalinha a coluna de rótulos das de valores) | G2.1, G34.11 |
| Tabela 37 | Isolação EPR/XLPE (90 °C), mesmos 6 métodos e mesmas 12 colunas da Tabela 36 | `OK` | `TABELA_37_COBRE_EPR`, mesmo formato de tupla. Até 30/09/2026, só tinha invariantes relacionais (EPR > PVC nas 144 células, razão 1,19-1,31) — pegam erro de fase, não célula trocada. Agora também tem dupla digitação independente nas 12 colunas (`TABELA_37_REFERENCIA`), mesma extração nova do PDF usada para a Tabela 36 | G17.1-G17.6, G2.7, G34.11 |
| §6.2.5.6 / Tabela 46 | Número de condutores carregados por esquema de condutores vivos | `OK` | `TABELA_46_CONDUTORES_CARREGADOS` + `esquemaDoAlimentador`/`esquemaDoCircuito`. **Corrigido em 2026-09-17:** o alimentador bifásico ("duas fases com neutro" = 3) e o trifásico (3) eram dimensionados pela coluna de 2 condutores carregados, ~12% acima do admitido — superestimava o Iz e podia subdimensionar o alimentador | G16.1-G16.4, G16.7 |
| §6.2.5.6.1 | 3ª harmônica > 15% → 4 condutores carregados → fator 0,86 sobre a coluna de 3 | `OK` | `TAXAS_TERCEIRA_HARMONICA` (4 estados desde 30/09/2026) + `FATOR_NEUTRO_CARREGADO`. Sem declaração, nem o 0,86 nem a redução do neutro agem — os lados seguros dos critérios são opostos, por isso não é booleano | G16.5, G16.6 |
| §6.2.6.2.5 | 3ª harmônica > 33% → neutro pode precisar ser MAIOR que a fase (Anexo F) | `PARCIAL` | estado `'acima-33'` dedicado em `TAXAS_TERCEIRA_HARMONICA` (`avisoNeutroSuperior: true`); `dimensionarProtecaoGeral` propaga o aviso e a UI mostra a nota — não calcula a seção maior (exigiria o conteúdo harmônico real das correntes de fase, Anexo F, que a ferramenta não coleta) | G34.2 |
| §6.2.5.6.2 | PE não é condutor carregado; PEN conta como neutro | `OK` | nenhum esquema da Tabela 46 conta o PE | G16.7 |
| §6.2.5.1.2 / Tabela 33 | Métodos A1, A2 (parede termicamente isolante) e D (eletroduto enterrado) | `OK` | **corrigido em 2026-09-18** (antes `PARCIAL`, colunas transcritas mas não selecionáveis): `METODOS_INSTALACAO` agora expõe A1/A2/D, com `referenciaAgrupamento` (Tabela 42 ref.1 para A1/A2, Tabela 45 para D) e `enterrado` (D lê a coluna de solo da Tabela 40) como dados, não `if`s espalhados | G20, G21 |
| Tabelas 38–39 | Métodos E, F e G (bandeja, leito, condutores espaçados) | `N/A` | instalação industrial, fora do uso residencial | — |
| §6.2.3.7 / §6.2.3.8 | Condutor de alumínio | `N/A` | **a norma não admite alumínio em habitação**: §6.2.3.8.1 só o libera em estabelecimentos industriais (≥16 mm², subestação/fonte própria, manutenção BA5) e §6.2.3.8.2 em comerciais (≥50 mm², locais exclusivamente BD1, BA5). Não é escolha de escopo desta ferramenta, é prescrição | — |
| Tabela 40 | Fator de correção de temperatura, 4 colunas (ar/solo × PVC/EPR) | `OK` | `obterFatorTemperatura(temperatura, {isolacao, enterrado})`, todas as faixas tabeladas (10-60°C PVC, 10-80°C EPR/XLPE, nos 2 ambientes). Fora da faixa, devolve `null` — nunca extrapola. As 52 células numéricas conferidas contra a forma fechada f=√((θmax−θ)/(θmax−θref)) | G4.4, G4.5, G18 |
| Tabela 41 | Fator de correção por resistividade térmica do solo (só método D) | `OK` | `obterFatorResistividadeSolo`, os 4 pontos tabelados (a norma remete à NBR 11301 para mais precisão) | G20.4 |
| Tabela 42, ref. 1 | Fator de correção de agrupamento (conduto fechado — métodos A1/A2/B1/B2) | `OK` | `obterFatorAgrupamento(n, metodo)`, referência resolvida por `METODOS_INSTALACAO[metodo].referenciaAgrupamento` | G4.4, G4.5, G8.4, G21.2 |
| Tabela 42, ref. 2 | Fator de correção de agrupamento (camada única sobre parede — método C) | `OK` | `obterFatorAgrupamento(n, 'C')` → `TABELA_FCA_METODO_C` | G8.4 |
| Tabela 45 | Fator de agrupamento para eletrodutos enterrados (método D) | `OK` | `TABELA_45_AGRUPAMENTO_ENTERRADO`, sempre pela coluna de espaçamento "nulo" (mais severa) — a ferramenta não modela distância entre eletrodutos. **Corrigido em 30/09/2026:** usava a sub-tabela de cabo multipolar; trocada para a de condutor isolado/unipolar (mais severa), que combina com o condutor unipolar modelado no resto do método D (`DIAMETRO_EXTERNO_CONDUTOR_MM`, taxa de ocupação) | G20.1, G20.2, G34.4 |
| Tabela 42, refs. 3-5 / Tabelas 43-44 | Camada única no teto, bandeja perfurada/leito (E/F), multicamada, cabos diretamente enterrados sem eletroduto | `N/A` | fora do escopo residencial escolhido (métodos C-teto, E/F/G, e a variante do método D sem eletroduto) | — |
| §6.2.6.1.1 / T.47 | Seção mínima iluminação 1,5 mm² | `OK` | `SECAO_MINIMA_MM2.iluminacao` | G4.1 |
| §6.2.6.1.1 / T.47 | Seção mínima força/tomadas 2,5 mm² | `OK` | `SECAO_MINIMA_MM2.tug/tue` | G4.2 |
| §6.2.6.1.1 / T.47 | Seção mínima do alimentador (cabo isolado) = 2,5 mm² | `OK` | `SECAO_MINIMA_MM2.geral`; piso prático de 10 mm² (concessionária, não NBR) aplicado à parte via `PISO_PRATICO_ALIMENTADOR_MM2` | G4.3 |
| §6.2.6.1.2 a) | Ampacidade **corrigida** ≥ corrente de projeto | `OK` | `avaliarTrilhaSecao` usa `ampacidadeCorrigida = tabela × FCT × FCA` | G4.4, G4.5 |
| §6.2.6.1.2 b) | Proteção contra sobrecargas | `OK` | Ib ≤ In ≤ Iz corrigido | G4.4 |
| §6.2.6.1.2 c) | Curto-circuito e solicitação térmica | `OK` (fase-neutro) / `OK` com modelo declarado (fase-fase, 29/09) | alimentador: `verificarCurtoCircuito` (I²t≤k²S², Tabela 30) quando o usuário informa a Icc presumida. Circuitos terminais fase-neutro: **corrigido em 2026-09-28** — Icc propagada por cadeia de impedância a partir da Icc do alimentador (`propagarIccTerminal`, §5.3.5.1 permite "cálculo"), reaproveitando `verificarCurtoCircuito`. Circuitos fase-fase (29/09): laço entre duas fases (`propagarIccFaseFase`), fonte Uo/Icc por fase com a Icc informada tomada como a trifásica; I²t com max(Icc entre fases, Icc fase-neutro) no quadro, Ikmin com a entre fases na ponta; a capacidade de interrupção dos circuitos usa a maior delas. Sem Icc declarada, todos continuam não verificados (regra inalterada) | G4.8, G9.1-G9.5, G23.1-G23.8 |
| §6.2.6.1.2 d) | Seccionamento automático | `OK` (TN, TT) / `N/A` (IT) | **implementado em 2026-09-28** (`seccionamento.js`): com o esquema declarado, TN por Zs·Ia ≤ Uo e TT por RA·IΔn ≤ UL — ver §5.1.2.2.4 abaixo. Sem esquema, continua não verificado com aviso; o motor de circuitos isolado (`dimensionarCircuitos`) continua devolvendo `false`, porque não conhece o esquema | G4.9, G25.1-G25.8 |
| §5.1.2.2.4.2 d) / Tabela 25 | TN: Zs·Ia ≤ Uo | `OK` | Zs = fonte (reativa, da Icc) + fase + volta pelo PEN (TN-C-S, até o quadro) ou PE (TN-S) + PE do circuito, no ponto mais distante. Atende pelo DR 30 mA (§6.3.3.2.8) ou pelo disjuntor com Ia = limite superior da faixa magnética (< 0,1 s, dentro de toda a Tabela 25 residencial). Alimentador: só disjuntor; sem disparo instantâneo garantido fica não verificado (até 5 s admitidos, §5.1.2.2.4.1 c) | G25.1-G25.4 |
| §5.1.2.2.4.3 b) / Anexo C | TT: RA·IΔn ≤ UL | `OK` | UL 50 V (situação 1) ou 25 V com banheiro (situação 2 no mesmo eletrodo, adotar o menor); RA medida é opcional — sem ela, mostra o limite | G25.5 |
| §6.2.6.1.2 e) | Limites de queda de tensão | `OK` | ver §6.2.7 | G5.x |
| §6.2.6.1.2 f) | Seções mínimas | `OK` | filtro por `secaoMinimaNormativa` | G4.1, G4.2 |
| §6.2.6.2.2/.4 | Neutro monofásico/bifásico = fase, sem exceção | `OK` | `dimensionarCondutorNeutroGeral` nunca reduz fora de trifásico | G6.7, G6.9 |
| §6.2.6.2.6 / Tabela 48 | Redução do neutro (trifásico, fase > 25 mm², 3 condições declaradas) | `OK` | opt-in explícito (`neutroReduzidoDeclarado`) para 2 das 3 condições — nunca automático, são julgamentos sobre o uso que só o usuário pode fazer. A 3ª (harmônica ≤ 15%) virou campo próprio (`terceiraHarmonica`), porque também governa o fator 0,86 do §6.2.5.6.1 com o lado seguro oposto. `TABELA_48_NEUTRO_REDUZIDO` tinha uma linha fabricada (25→25 mm², inerte mas inexistente na tabela impressa, que começa em 35 mm²) — removida em 30/09/2026 | G6.8, G6.9, G16.6, G34.1 |
| §6.2.6.2 | Corrente real do condutor neutro verificada contra a ampacidade do condutor adotado | `OK` | `calcularCorrentesVetoriais` (soma vetorial de P/Q por fase, prova por KCL) + `verificacaoNeutro` em `dimensionarProtecaoGeral` — roda sempre, não só com o neutro reduzido (a hipótese de que o neutro nunca excede a maior fase é falsa em geral, G14.5) | G14.1-G14.7 |
| §6.2.6.2 | Corrente de entrada/disjuntor geral por soma vetorial (P/Q por circuito), não soma escalar de VA | `OK` | `correntePorFaseA` (de `calcularCorrentesVetoriais`) substitui a soma escalar antiga | G14.1-G14.4 |

## §5.3.4 / §5.3.5 — Proteção contra sobrecorrentes

| Cláusula | Prescrição | Status | Implementação | Verificação |
|---|---|---|---|---|
| §5.3.4.1 a) | I_B ≤ I_n ≤ I_z | `OK` | válido com Iz corrigido (FCT × FCA) | G4.4, G4.5 |
| §5.3.4.1 b) | I₂ ≤ 1,45 · I_z | `PARCIAL` | decorre de a) para disjuntores IEC 60898, mas não é verificado explicitamente | — |
| §5.3.5.1 | Determinação da Icc presumida "por cálculo ou por medição" | `OK` | fundamenta a propagação de Icc por impedância aos circuitos terminais fase-neutro — ver §6.2.6.1.2 c) | G23.4 |
| §5.3.5 | Proteção contra curtos-circuitos | `OK` | ver §6.2.6.1.2 c) — alimentador e circuitos terminais (fase-neutro e fase-fase) com Icc opcional | G4.8, G9.1-G9.5, G23.1-G23.8 |
| §5.3.5.5.2 / Tabela 30 | I²t ≤ k²S² | `OK` | `verificarCurtoCircuito`, `k` por isolação via `obterK` (cobre: PVC=115 ≤300 mm² / 103 acima, EPR/XLPE=143). **Corrigido em 30/09/2026:** `obterK` devolve `null` abaixo de 10 mm² (Tabela 30, NOTA 1 — "ainda não estão normalizados"), e o curto-circuito fica "não verificado" nessa faixa em vez de usar k=115 fora do regime válido | G9.3, G9.4, G19.1, G34.3 |
| §5.3.5.5.1 | Capacidade de interrupção ≥ Icc presumida no ponto | `OK` | com Icc declarada: Icn mínima do geral (Icc da origem) e dos terminais (Icc no quadro) | G24.9 |
| §6.3.4.3.2 a) | Ia ≤ Ikmin (Icc no ponto mais distante) | `PARCIAL` | aprovado só se Ikmin ≥ limite superior da faixa magnética (disparo instantâneo garantido); abaixo, não verificado — sem curva de fabricante | G9.5, G23.6 |
| §6.3.4.3.2 b) | I²t com a Icc máxima no ponto de instalação do disjuntor | `OK` | **corrigido em 2026-09-28**: terminais usavam a Icc da ponta do circuito (permissivo) | G23.5 |
| §5.3.4.1 b) | I₂ ≤ 1,45·Iz | `OK` | I₂ = 1,45·In (IEC 60898, fonte externa) — explícito por circuito e no alimentador | G24.8 |
| §6.5.4.7 / Tabela 59 | Espaço de reserva no quadro | `OK` | `calcularReservaQuadro`; a potência de reserva no alimentador não é somada (a norma não dá VA) | G24.1 |
| §6.5.1.2.1 NOTA | Motor > 3,7 kW em partida direta → consultar a distribuidora | `OK` | aviso para TUE indutiva acima do limite | G24.6 |

## §6.2.7 — Queda de tensão

| Cláusula | Prescrição | Status | Implementação | Verificação |
|---|---|---|---|---|
| §6.2.7.1 c) | Total ≤ 5% a partir do ponto de entrega | `OK` | orçamento cumulativo — `calcularProjetoCompleto` dimensiona o alimentador primeiro e passa o restante ao terminal | G5.4 |
| §6.2.7.2 | Circuito terminal ≤ 4% | `OK` | `LIMITE_QUEDA_TERMINAL_PERCENTUAL`, como teto do orçamento remanescente | G5.3 |
| §6.2.7.4 | Usar a corrente de projeto | `OK` | `correnteProjetoA` | G5.2 |
| — | Resistência na temperatura de operação do condutor (70 °C PVC / 90 °C EPR/XLPE) | `OK` | `ISOLACOES.pvc.condutividade = 46.8`, `ISOLACOES.epr.condutividade = 43.9` (mesma convenção ρ₂₀=1/56 do PVC, só mudando a temperatura) | G5.1, G19.2 |
| — | Reatância indutiva por seção | `PARCIAL` | não é dado da NBR 5410 (o texto completo não usa essa palavra) — valores de catálogo externo (Cordeiro, Tabela 8), substituindo a constante única anterior | G11.1-G11.4 |
| — | Fórmula trifásica no alimentador | `OK` | `circuitoTrifasico` reduz o fator de 2 para 1 (equivalente a √3·L·I/V_ff) quando `numeroFases === 3` | G6.2 |
| — | Critério não verificado quando falta comprimento | `OK` | `comprimentoInformado`/`naoVerificado` distinguem "não preenchido" de "preenchido como 0" | G5.5 |

## §6.2.11 — Instalação de eletrodutos

| Cláusula | Prescrição | Status | Implementação | Verificação |
|---|---|---|---|---|
| §6.2.11.1.6 a) | Taxa de ocupação do eletroduto ≤ 53%/31%/40% (1/2/3+ condutores) | `OK` | `dimensionarEletroduto` (`eletroduto.js`) — conta TODOS os condutores físicos (fase, neutro, PE), não só os carregados | G7.1, G7.2, G7.4 |
| §6.2.11.1.6 a) | Diâmetro externo do condutor e diâmetro interno do eletroduto | `OK` (catálogo) | valores de catálogo (fonte externa à NBR 5410, que não tabela dimensão de produto): PVC 450/750 V e, desde 29/09, EPR/XLPE como cabo HEPR 0,6/1 kV (página do produto Corfio, transcrição conferida pela soma das espessuras); acima de 120 mm² recusa calcular — ver `valores-normativos.md` | G7.2, G7.3, G7.4 |
| §6.2.11.1.6 b) | Trecho contínuo sem caixas ≤ 15 m/30 m, reduzido 3 m por curva de 90°; NOTA: +1 tamanho de eletroduto por 6 m ou fração de excesso | `OK` | **Sprint 9** (`percurso.js`): trechos opcionais por circuito na etapa de Dimensionamento; fora do limite = não conforme, com a alternativa da NOTA calculada. O alimentador (medidor → quadro) tem o seu | G30.1, G30.3, G30.4, G30.5 |
| §6.2.11.1.7 | Máximo 3 curvas de 90° (ou 270°) entre caixas | `OK` | idem | G30.2 |

## §5.1.3 / §6.3.6 — Dispositivo diferencial-residual

| Cláusula | Prescrição | Status | Implementação | Verificação |
|---|---|---|---|---|
| §5.1.3.2.2 | DR de alta sensibilidade ≤ 30 mA | `OK` | `IDR_SENSIBILIDADE_ALTA_MA` | G6.5 |
| §5.1.3.2.2 a–e | Aplicação **por circuito** nos locais listados | `OK` | **corrigido em 2026-09-17:** estava marcado `PARCIAL` por engano. A **Nota 5** da própria cláusula diz que "a proteção dos circuitos pode ser realizada individualmente, por ponto de utilização ou por circuito ou por grupo de circuitos" — um DR geral único cobrindo todos os circuitos atende à exigência. O que falta é *identificar quais circuitos a exigem* e permitir separá-los por continuidade de serviço: melhoria de engenharia, não lacuna normativa | G6.5 |
| §5.3.4.1 | I_n do DR ≥ I_n do disjuntor | `OK` | `dimensionarIDR` | G6.6 |
| §6.3.6.3.2 | Seletividade entre DRs | `OK` | DR a montante só como tipo S de 100 ou 300 mA (≥ 3×30 mA) | G25.6 |
| §6.3.3.2.6 | Divisão dos circuitos para evitar disparo intempestivo | `PARCIAL` | modo "DR por grupo" (um de 30 mA por grupo, In ≥ min(ΣIn, In geral) — critério da ferramenta); com DR único, aviso explícito — a fuga normal não é calculável | G25.6, G25.7 |

## §6.4 — Condutor de proteção e aterramento

| Cláusula | Prescrição | Status | Implementação | Verificação |
|---|---|---|---|---|
| Tabela 58 | Seção mínima do PE em função da fase | `OK` | `calcularSecaoTerra` | G6.3 |
| §6.4.3.1 | PE em **todo** circuito | `OK` | alimentador e cada circuito terminal recebem `secaoTerraMm2` | G6.4 |
| §6.4.3.1.4 | PE fora do conduto: mín. 2,5 / 4 mm² | `PARCIAL` | item de conferência na UI (a ferramenta não sabe o trajeto físico do PE); também é o piso da equipotencialização suplementar | — |
| §4.2.2.2 | Esquema de aterramento (TN-S / TN-C-S / TT) | `OK` | declaração do usuário (`esquemaAterramento`), base de §6.4.3.4.1 e do seccionamento (Sprint 4) | G24.4 |
| §6.4.3.4.1 | PEN ≥ 10 mm² (cobre) | `OK` | só com TN-C-S declarado: confere o neutro do alimentador | G24.4 |
| §6.4.1.2.1 / Tabela 52 | Condutor de aterramento enterrado: 2,5 / 16 / 50 mm² | `OK` | maior entre o PE do alimentador (§6.4.3.1) e a Tabela 52 pela condição declarada | G24.5 |
| §6.4.4.1.1 | Equipotencialização principal ≥ ½ maior PE, 6-25 mm² | `OK` | `calcularEquipotencializacaoPrincipal` | G24.2 |
| §6.4.4.1.2 | Equipotencialização suplementar (massa-massa / massa-elemento) | `PARCIAL` | banheiro: ½ do maior PE dos equipamentos do cômodo, piso 2,5/4 mm²; massa-massa só como regra textual | — |

## §5.4 — Proteção contra sobretensões

| Cláusula | Prescrição | Status | Implementação | Verificação |
|---|---|---|---|---|
| §5.4.2.1.1 | Exigência normativa condicional (alimentação aérea + região AQ2, ou região AQ3/Tabela 15) | `OK` | opt-in explícito (`alimentacaoAerea`, `regiaoAltoIndiceDescargas`); sem declaração, DPS continua recomendação de boa prática, não exigência. **Correção de 2026-09-17:** a descrição anterior dizia que a "Tabela 15 completa" era um mapa geográfico do Brasil não embutido — é falso. A Tabela 15 tem **3 linhas** (AQ1 desprezíveis, AQ2 indiretas, AQ3 diretas, com o corte de 25 dias de trovoada/ano) e nenhum dado geográfico. O que a NBR 5410 não traz é o mapa isocerâunico, que é matéria de outra fonte (NBR 5419/INPE) | G15.1-G15.3 |
| §6.3.5.2.1 b) | Classe I (mercado/IEC 61643) por exposição a descarga direta | `OK` | opt-in explícito (`exposicaoDescargaDireta`) — independente da exigência geral do §5.4.2.1.1 | G15.4, G15.5 |
| — | Uc ≥ 1,1 · U | `OK` | `recomendarTensaoDps` (175 V / 275 V) | — |
| §6.3.5.2.4 / Tabelas 31 e 49 | Seleção do DPS: Up ≤ cat. II, Uc ≥ 1,1·Uo, In ≥ 5 kA, Iimp ≥ 12,5 kA | `OK` | `especificarDPS` — a norma dá mínimos numéricos (corrigido: antes dizia "dados de produto"); suportabilidade a curto-circuito e coordenação em cascata ficam de fora | G24.3 |
| §6.3.5.2.9 | Condutor DPS-PE ≥ 4 / 16 mm²; ligações ≤ 0,5 m | `OK` | `especificarDPS` | G24.3 |

## Cap. 7, §6.5.4.10 e demais itens de execução — listas de verificação (Sprint 5)

Não são cálculo: entram como lista de verificação no Resultado e no Memorial (`checklists.js`).
`OK` = a cláusula aparece na lista, com o texto conferido no PDF; a execução é conferida em obra.

| Cláusula | Requisito | Status | Implementação | Critério |
|---|---|---|---|---|
| §7.2.1 / §7.2.3 | Inspeção visual antes dos ensaios, itens a-j | `OK` | lista "Comissionamento" | — |
| §7.3.2 | Continuidade do PE: 4-24 V, ≥ 0,2 A | `OK` | idem | — |
| §7.3.3 / Tabela 60 | Isolamento: 500 V cc ≥ 0,5 MΩ; SELV 250 V ≥ 0,25 MΩ | `OK` | idem | — |
| §7.3.5.1 / §7.3.5.2 | TN: Zs medida (dispensável com cálculo); TT: medir RA; ensaiar DR | `OK` | item condicional ao esquema e ao cálculo completo | G26.3 |
| §6.5.4.10 / §6.5.4.11 | Advertência obrigatória no QD residencial | `OK` | texto integral em `ADVERTENCIA_QUADRO` | G26.4 |
| §6.1.5.3 | Cores: neutro azul-claro, PE verde-amarelo/verde, PEN azul-claro com anilhas | `OK` | PEN só no TN-C-S | G26.3 |
| §6.5.3.1 / §6.5.3.2 | Tomadas com PE (NBR 6147/14136); marcar a tensão mais alta | `OK` | marcação só com circuito fase-fase | — |
| §6.3.2.2 / §5.6.2.2 | Sem unipolar no neutro; PE nunca seccionado | `OK` | lista "Quadro" | — |
| §6.3.5.2.6 b) | DPS a jusante do DR: DR com imunidade ≥ 3 kA 8/20 | `OK` | idem | — |
| §6.4.1.1 / §6.4.2.1 | Eletrodo (fundação/malha/anel; nunca canalização de água), BEP a-i, etiqueta "Conexão de segurança — Não remova" | `OK` | lista "Aterramento" | — |
| §8.3.2.2 NOTA | Reaperto em até 90 dias | `OK` | lista "Quadro" | — |
| §5.5.1 | Quedas e faltas de tensão | `OK` | lista "Uso e manutenção" | — |

## Documentação da instalação e instalação existente (Sprint 7)

Derivado do dimensionamento, sem critério novo: `materiais.js`, `quadro.js`, `existente.js`.

| Cláusula | Requisito | Status | Implementação | Critério |
|---|---|---|---|---|
| §6.1.8.1 | Projeto com diagrama unifilar | `OK` | `DiagramaUnifilar` (SVG) gerado do resultado | — |
| §6.1.5.4 | Dispositivos identificados de modo a reconhecer o circuito protegido | `OK` | numeração C1…Cn na ordem do trilho, igual no unifilar, no quadro e na tabela | G28.3 |
| §6.1.5.3 | Cores por função na lista de materiais (fase: qualquer cor, exceto as reservadas e o amarelo puro) | `OK` | `FUNCOES_CONDUTOR` | G28.1 |
| §6.3.5.2.3 a) | DPS no quadro TN-S/TT: entre cada fase e PE e entre neutro e PE (conexão 2) | `OK` | `numeroFases + 1` DPS | G28.3 |
| §5.3.4.1 / §6.2.7 / §5.3.5.5.2 / Tabela 58 / §5.1.2.2.4 | Instalação existente (F8): seção, disjuntor e PE instalados conferidos pelos mesmos critérios | `OK` | seção mínima, Ib ≤ In ≤ Iz, I₂, queda, curto, PE pela Tabela 58 e seccionamento refeito com a seção, o PE e o disjuntor instalados (29/09). O seccionamento considera o DR de 30 mA do projeto | G28.4, G28.5, G28.6 |

## §9.1 — Locais contendo banheira ou chuveiro

| Cláusula | Prescrição | Status | Implementação | Verificação |
|---|---|---|---|---|
| §9.1.3.1.2 | Equipotencialização suplementar exigida | `OK` | `avaliarRequisitosBanheiro` (`locaisEspeciais.js`), detecta `TIPOS_COMODO.banheiro` | G22.2 |
| §5.1.3.2.2 a) | DR ≤30mA para circuitos do local | `OK` | já satisfeito pelo IDR geral único, fixo em 30 mA (`IDR_SENSIBILIDADE_ALTA_MA`) — simplificação conservadora, mais rigorosa que o mínimo normativo | G22.3 |
| §9.1.2.1 / §9.1.4.1 | Volumes 0-3 e IP mínimo por volume | `OK` com geometria marcada / `PARCIAL` sem ela | N19 (30/09, geometria corrigida em 01/10): `classificarVolume` (`locaisEspeciais.js`) classifica cada ponto marcado em `VolumesBanheiro.jsx` pela distância à caixa do chuveiro/banheira e pela altura. Com box declarado, volume 1 é a própria projeção do box (não mais 0,6 m além dela, que só vale sem delimitação clara — §9.1.2.1 b); volume 0 só no fundo do box; `box.baseM` (altura do fundo acima do piso, opcional) desloca só o teto do volume 1, nunca os dos volumes 2/3. Sem marcação, continua o checklist informativo (`VOLUMES_BANHEIRO`) | G33.1-G33.3, G22.4, G34.6-G34.8 |
| §9.1.4.3.1/.2 | Proibição de dispositivo nos volumes 0-2; tomada só no volume 3 | `OK` com geometria marcada / `PARCIAL` sem ela | `verificarPontosBanheiro` aplica a regra por tipo de ponto (tomada/interruptor/outro proibidos nos volumes 0-2; tomada no volume 3 conforme, citando o DR ≤30mA já garantido) | G33.4, G33.7 |
| §9.1.4.4 | Classe de equipamento por volume (luminária a partir do vol. 2; aquecedor não no vol. 0) | `OK` com geometria marcada / `AUSENTE` sem ela | `verificarPontosBanheiro`, tipos "luminária" e "aquecedor" — não verifica a classe (I/II) do equipamento em si, só o volume | G33.5 |
| §9.1.3.1.1 | SELV ≤12V no volume 0 | `AUSENTE` | fora do escopo — não modela tensão/isolação de equipamentos específicos por volume | — |
| Anexo C, Tabela C.2 / C.1 NOTA 2 | Tensão de contato limite UL: 50/25/**12** V (situações 1/2/3); volume 0 de banheiro/piscina é situação 3 | `OK` (transcrição) / `PARCIAL` (uso) | `TENSAO_CONTATO_LIMITE_V` ganhou `situacao3: 12` em 30/09/2026 (faltava na transcrição). `tensaoContatoLimite` continua usando 25 V (situação 2) mesmo com banheiro: o volume 0 só admite SELV ≤12V (§9.1.3.1.1), e as massas de um sistema SELV não entram no "mesmo eletrodo" que essa função avalia — decisão agora documentada no código, não um esquecimento | G34.5 |

## §9.2 / §9.4 — Piscina e sauna (Sprint 8)

| Cláusula | Prescrição | Status | Implementação | Verificação |
|---|---|---|---|---|
| §9.2.2.1 / §9.2.4.1 | Volumes 0-2 da piscina e IP mínimo (IPX8 / IPX5 / IPX2-IPX5) | `PARCIAL` | `VOLUMES_PISCINA`, lista de verificação — sem geometria | G29.3 |
| §9.2.3.1.1 / §9.2.4.3 | Volumes 0 e 1 só SELV 12 V; tomadas no volume 2 só com DR ≤ 30 mA, SELV ou separação | `OK` | todo circuito sob DR de 30 mA; o resto na lista | G29.3 |
| §9.2.3.1.4 | Equipotencialização suplementar dos volumes 0-2 | `OK` | exigida quando há piscina marcada | G29.3 |
| §9.4.4.3.2 | Nenhuma tomada na sauna | `OK` | tipo "sauna" com mínimo 0; tomada informada = não conformidade | G29.1 |
| §9.4.4.1.4 | Cabos para 170 °C no volume 3 | `PARCIAL` | aviso: a ferramenta só dimensiona PVC/EPR | G29.2 |
| §9.4.4.1.1 / .3.1 / .3.3 | IP24, dispositivos fora, corte a 140 °C | `OK` | lista "Sauna" | G29.2 |
| §9.3 | Compartimentos condutivos | `N/A` | não se aplica a residência | — |

## Fator de demanda por distribuidora (N18, fase de lacunas, 29/09/2026)

**Não é conteúdo da NBR 5410** — fonte externa (norma de fornecimento de cada distribuidora),
informativa, nunca substitui o dimensionamento por NBR 5410 (que continua somando as cargas cheias
para o alimentador e o disjuntor geral). Ver `QA/referencias/fator-demanda-concessionarias.md` para
a extração literal de cada PDF oficial, com o número de linha de origem de cada valor.

| Item | Status | Implementação | Verificação |
|---|---|---|---|
| Demanda de iluminação/tomadas por distribuidora | `OK` (9 distribuidoras) | `calcularDemandaConcessionaria` (`distribuidoras.js`), com a carga já somada por `previsaoDeCarga.js`; 3 das 9 (CPFL, EDP SP, Neoenergia) têm a tabela idêntica entre si, conferida contra os 3 PDFs oficiais | G32.1-G32.3 |
| Distribuidoras sem redução residencial (Celesc, EDP ES) | `OK` | `semReducaoResidencial: true` — FD = 1 sempre, declarado, não um zero silencioso | G32.5 |
| Distribuidora sem tabela própria (Enel) | `OK` | `semTabelaPropria: true` — `aplicavel: false` com o motivo, nunca um valor chutado | G32.6 |
| Carga acima da faixa conferida de uma tabela (Light, acima de 9 kW) | `OK` | recusa calcular, não extrapola | G32.7 |
| Piso de Icn do disjuntor geral (Cemig) | `OK` | `icnMinimoGeralKA`, usado em `materiais.js` só para o disjuntor do tipo "geral"; nunca reduz o que já seria maior por outra via | G32.8 |
| Chuveiro, ar-condicionado, motor (demais termos da fórmula `D=a+b+c+...`) | `PARCIAL` | fora desta versão — exigiria categorizar o TUE cadastrado por tipo de uso (ver `FUTURO.md`) | — |
| Categoria de atendimento / padrão de entrada por faixa de carga | `PARCIAL` | fora desta versão — tabelas desalinhadas na extração e variam por estado dentro do mesmo grupo | — |
| Copel (PR), Energisa (vários estados) | ausente | sites bloquearam o download desta rede; falta o PDF, que só o usuário consegue baixar | — |

---

## Histórico de desvios entre escopo declarado e implementação (resolvido em 2026-09-17)

O `ESCOPO.md` chegou a listar como entregas da v1 itens que não estavam implementados. Já
corrigido — o `ESCOPO.md` atual reflete o que existe de fato:

| Declarado (antes) | Situação real (agora) |
|---|---|
| "capacidade de condução de corrente (tabelas 36-39)" | Tabela 36, métodos B1/B2/C (os três suportados) — `ESCOPO.md` já reflete isso |
| "+ fatores de correção (tabelas 40-45)" | Tabela 40 completa + Tabela 42 referências 1 e 2 (as aplicáveis a B1/B2/C) implementadas |
| "queda de tensão (§6.2.7 — limites de 7%/5%/4% conforme o trecho)" | 4% terminal cumulativo com 5% total (ponto de entrega em tensão secundária); 7% (transformador/gerador próprio) não modelado, e o `ESCOPO.md` já diz isso |
