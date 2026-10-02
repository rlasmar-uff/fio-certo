# Fontes externas à NBR 5410

Tudo o que a ferramenta usa e que **não** sai do texto da NBR 5410:2004. Os valores da própria
norma estão em [`valores-normativos.md`](valores-normativos.md). Quando uma fonte mudar ou for
trocada, atualize esta lista, o comentário no código e as Referências de
[`docs/relatorio-tecnico.md`](../../docs/relatorio-tecnico.md).

## Dados de produto (catálogos de fabricante)

| Fonte | O que se usa | Onde no código | Consulta |
|---|---|---|---|
| Corfio — página do produto "Cabo Flexível BWF 750 V" (cobre, PVC 70 °C, conforme ABNT NBR NM 247-3), <https://www.corfio.com.br/pt/produto/cabo-flexivel-bwf-750v> | Diâmetro externo do cabo PVC, 1,5 a 120 mm² (eletroduto). Reconferido: os 12 valores batem com a página, e externo = condutor + 2·isolação em todos | `constantes.js` → `DIAMETRO_EXTERNO_CONDUTOR_MM.pvc` | antes da Sprint 1; reconferido em 29/09/2026 |
| Corfio — página do produto "Cabo Flexível HEPR 90°C 0,6/1 kV", <https://www.corfio.com.br/pt/produto/cabo-flexivel-1kv-hepr> | Diâmetro externo nominal do cabo EPR/XLPE, 1,5 a 120 mm² (eletroduto). Transcrição conferida: externo = condutor + 2·isolação + 2·cobertura + 0,2 mm nas 12 seções | `constantes.js` → `DIAMETRO_EXTERNO_CONDUTOR_MM.epr` | 29/09/2026 |
| Cordeiro — catálogo técnico `COR_005_CatalogoTecnico_Digital_PT.pdf` (cordeiro.com.br), Tabela 8 "Resistências elétricas e reatâncias indutivas de fios e cabos isolados em PVC, HEPR e XLPE em condutos fechados" | Reatância indutiva por seção (queda de tensão e impedância de curto) | `constantes.js` → `TABELA_REATANCIA_OHM_KM_POR_MM2` | antes da Sprint 1 |
| Eletroduto de PVC rígido roscável (ABNT NBR 15465, antiga NBR 6150) — valores típicos de catálogo | Diâmetro interno útil por referência comercial | `constantes.js` → `ELETRODUTOS_PVC_RIGIDO` | antes da Sprint 1 |

Consultados em 29/09/2026 sem tabela dimensional em texto, e por isso não usados: Cobrecom
(GTEPROM Flex HEPR), SIL (Silnax 0,6/1 kV HEPR), Megatron (cabo flexível HEPR).

## Normas de produto

| Norma | O que se usa | Onde no código |
|---|---|---|
| ABNT NBR NM 60898 / IEC 60898-1 — disjuntores para instalações domésticas | I₂ = 1,45·In; faixas de disparo instantâneo das curvas B, C e D; Icn padronizadas (1,5 a 25 kA) | `constantes.js` → `TABELA_MULTIPLICADOR_DISPARO_INSTANTANEO`; `materiais.js` → `ICN_PADRONIZADAS_KA` |
| ABNT NBR NM 247-3 — cabos isolados com PVC até 450/750 V | Especificação de compra do cabo PVC | `materiais.js` → `ESPECIFICACAO_CABO` |
| ABNT NBR 7286 (EPR) / NBR 7287 (XLPE) — cabos de potência 0,6/1 kV | Especificação de compra do cabo EPR/XLPE | `materiais.js` → `ESPECIFICACAO_CABO` |
| IEC 61008 / IEC 61009 — dispositivos DR | Tipos AC, A e B na especificação do DR | `seccionamento.js`, `SecaoMateriais.jsx` |
| IEC 61643 — DPS | Terminologia de classe (I/II) na especificação do DPS | `protecaoGeral.js`, `SecaoMateriais.jsx` |

Normas citadas pela própria NBR 5410 e repetidas nas listas de verificação (ABNT NBR 6147,
NBR 14136, IEC 60598-2-18) não entram em nenhum cálculo.

Título e ano de cada norma de produto (tabela acima) foram conferidos por busca externa em
30/09/2026 — não no texto comprado da norma, que é pago (mesma ressalva que já valia para
NBR 10676, em [`fator-demanda-concessionarias.md`](fator-demanda-concessionarias.md)). O que ficou
confirmado com razoável confiança (descrição batendo em 2+ fontes independentes — Target Normas,
ABPE, sites de revenda de normas): NM 60898 é de 2004 (equivalente a IEC 60898:1995, MOD — não
"IEC 60898-1", designação usada antes da norma internacional ser dividida em partes); NM 247-3 é
de 2002, e o título completo inclui "Parte 3: Condutores isolados (sem cobertura) para instalações
fixas"; NBR 7286/7287 têm edição revisada em 2022; NBR 15465 tem 3ª edição de 2020 (a 1ª é de 2007).
Algumas dessas fontes de revenda mencionam edições "canceladas" por uma revisão mais nova — não dá
para confirmar sem comprar o texto atual no Catálogo ABNT. Antes de entregar o relatório, vale essa
conferência final se o usuário tiver acesso.

## Convenções de engenharia (não tabeladas em norma nenhuma usada aqui)

| Convenção | Uso | Onde no código |
|---|---|---|
| Resistividade do cobre ρ₂₀ = 1/56 Ω·mm²/m e α = 0,00393 /°C, corrigida para 70 °C (PVC, σ = 46,8) e 90 °C (EPR/XLPE, σ = 43,9) | Queda de tensão e impedância de curto | `constantes.js` → `ISOLACOES` |
| Impedância da rede a montante puramente reativa, Xs = Uo/Icc por fase, com a Icc informada tomada como a trifásica (a maior no ponto de entrega) | Propagação da Icc até o quadro e os circuitos (§5.3.5.1 permite "por cálculo") | `curtoCircuito.js` |
| Curto entre duas fases: laço por 2 fases da fonte e do cabo, sob √3·Uo — na origem, Icc·√3/2 (componentes simétricas com Z₂ = Z₁). O método geral de cálculo de curto em redes trifásicas é o da IEC 60909-0, que não foi consultada diretamente | Curto-circuito dos circuitos fase-fase | `curtoCircuito.js` → `propagarIccFaseFase` |
| Soma fasorial das correntes (fases a 120°; I_A + I_B + I_C + I_N = 0) | Corrente de fase e do neutro do alimentador | `circuitos.js` |
| Piso prático de 10 mm² no alimentador (exigência típica das concessionárias, não da NBR 5410) | Mostrado ao lado da seção mínima normativa | `constantes.js`, `protecaoGeral.js` |

## Bibliotecas de software

| Biblioteca | Versão | Uso |
|---|---|---|
| React / React DOM | 19.3 | Interface |
| React Router | 7.18 | Rotas (HashRouter, GitHub Pages) |
| Vite | 8.3 | Build |
| pdf.js (`pdfjs-dist`, Mozilla, licença Apache 2.0) | 6.3.289 | Planta em PDF, só baixado quando um PDF é aberto |
| Playwright | 1.63 | Testes de navegador (desenvolvimento) |
| oxlint | 1.83 | Lint (desenvolvimento) |
