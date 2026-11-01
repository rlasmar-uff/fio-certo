# Relatório de correções — auditoria independente (nov/2026)

Cada item tem o número do critério do harness (`QA/scripts/verificar.mjs`) que o cobre. Os valores
esperados desses critérios vêm de conta manual, da extração do PDF por coordenadas ou de uma
implementação própria escrita no teste — nunca do motor.

| # | Gravidade | Problema | Arquivo / função | Critérios |
|---|---|---|---|---|
| 1 | Crítico | Queda do alimentador subestimada (equilibrado, cosφ = 1, sem neutro) | `protecaoGeral.js`, `quedaDeTensao.js` | G35.1–G35.5 |
| 2 | Crítico | Icc fase-neutro com neutro reduzido usava a seção da fase | `curtoCircuito.js`, `protecaoGeral.js`, `projeto.js` | G35.6–G35.10 |
| 3 | Alto | Veredito "conforme" com iluminação/tomadas abaixo do mínimo da norma | `veredito.js` | G37.6, G37.7 |
| 4 | Alto | Veredito "conforme" num projeto sem nenhum cômodo | `veredito.js` | G44.1 |
| 5 | Alto | Reserva do quadro ignorada no cálculo do alimentador (Tabela 59, NOTA) | `projeto.js`, `veredito.js`, `Instalacao.jsx` | G42.7 |
| 6 | Alto | Dados inválidos favoreciam o projeto (cosφ > 1, potência negativa, quantidade ≤ 0, equipamento sem potência sumia em silêncio) | `previsaoDeCarga.js`, `circuitos.js`, `veredito.js` | G37.5, G44.2–G44.4 |
| 7 | Alto | Fator de agrupamento extrapolado onde a norma não tem valor (Tabela 42 ref. 2 acima de 11; Tabela 45 acima de 6) | `constantes.js`, `condutores.js`, `protecaoGeral.js` | G36.3, G39.6, G20.2 |
| 8 | Médio | Ponto exatamente em 0,60 m / 3,0 m caía no volume seguinte do banheiro (erro de ponto flutuante) | `locaisEspeciais.js` | G43.1 |
| 9 | Médio | Cômodo com tipo desconhecido derrubava o cálculo com exceção | `previsaoDeCarga.js` | G44.2 |
| 10 | Médio | Rendimento η de motores/compressores não era considerado | `previsaoDeCarga.js`, `circuitos.js`, `ComodoCard.jsx` | G37.5 |
| 11 | Médio | "Conforme" não dizia o que a ferramenta nunca verifica | `veredito.js`, `CardVeredito.jsx` | e2e `auditoria.spec.js` |
| 12 | Médio | Sem Icc fase-neutro, o laço parte da trifásica — premissa não declarada | `veredito.js` | pendência no veredito |
| 13 | Baixo | Comentário do código chamava de conservador algo que é permissivo para Ikmin | `curtoCircuito.js` | — |
| 14 | Alto | Diâmetro externo do cabo PVC menor que o do livro em 6 seções (até −8,7% de área) → eletroduto subdimensionado em alguns casos | `constantes.js` | G45.3, G42.1 |
| 15 | Médio | Eletroduto de 16 mm (Di 12,8) sem fonte | `constantes.js` | G45.4 |

## 1. Queda de tensão do alimentador — CRÍTICO (confirmado)

- **Antes:** `cosPhi: 1`, `tipoCarga: 'resistiva'`, fator "trifásico equilibrado" e a maior corrente de fase, qualquer que fosse a carga. Fator de potência não chegava ao alimentador; o neutro nunca entrava.
- **Caso:** 7620 VA, cosφ 0,8 indutivo, só na fase A (60 A), 50 m, 25 mm² PVC, 127/220 V. Antes: **2,02 %**. Correto (KVL por fase, V_carga = V − Z_f·I − Z_n·ΣI): **3,55 %**. Subestimava 43 %.
- **Depois:** `calcularQuedaAlimentadorFasorial` (fasorial por fase, neutro com a seção real de cada candidata, pior fase). A seção do alimentador é escolhida com ela. Carga equilibrada continua dando o mesmo (1,78 %).
- **Limite que permanece:** chamada isolada de `dimensionarProtecaoGeral` sem os fasores usa a fórmula antiga; o projeto completo sempre passa os fasores.

## 2. Icc fase-neutro com neutro reduzido — CRÍTICO (confirmado)

- **Antes:** o retorno do laço tinha sempre a seção da fase. O comentário dizia "conservador"; só é para I²t (Icc máxima). Para Ia ≤ Ikmin é **permissivo**.
- **Caso:** 127 V, Icc 3000 A, 50/25 mm², 30 m. Antes 2298,9 A; correto **2032,8 A** (R = 0,038462; X = 0,049233; Z = 0,062474 Ω). A 90 m: antes 1284 A (> 1250 A, aprovava); correto **966 A** → não verificado.
- **Depois:** `iccQuadroMinA` (retorno pelo neutro real) para Ikmin; `iccQuadroA` (retorno na fase) permanece só como Icc máxima para I²t. `projeto.js` passa o neutro real no trecho do ramal. Curto fase-fase intocado.

## 3–4. Veredito aprovando o que não devia — ALTO

- Iluminação ou tomadas informadas à mão abaixo do mínimo só apareciam como aviso no cartão do cômodo; o veredito dizia "conforme". Agora são **problema** (§9.5.2.1.2, §9.5.2.2.1).
- Projeto sem cômodo mostrava "tudo conforme". Agora é pendência "nenhum cômodo cadastrado".

## 5. Reserva do quadro — ALTO

A Tabela 59 diz na NOTA: "a capacidade de reserva deve ser considerada no cálculo do alimentador". A ferramenta calculava o espaço (2/3/4/0,15N circuitos) e o desprezava no alimentador. Agora há o campo opcional "Potência de cada circuito de reserva (VA)": declarado, as reservas entram como carga na fase menos carregada; não declarado, é **pendência** do veredito. A norma não fixa os VA — quem declara é o projetista.

## 6. Dados inválidos que favoreciam o projeto — ALTO

| Entrada | Antes | Agora |
|---|---|---|
| cosφ = 1,5 | VA = W/1,5 (**menor** corrente) | trata como 1 e acusa "fator de potência fora de (0, 1]" |
| potência negativa | **abatia** a carga total | vale 0 e acusa inválido |
| quantidade −2 | o circuito inteiro **sumia** | vale 1 e acusa inválido |
| potência em branco | circuito sumia sem aviso | pendência "equipamento fora do cálculo" |
| área negativa/texto, perímetro inválido | carga fantasma sem aviso | problema "área inválida" |

## 7. Fator de agrupamento fora da tabela — ALTO

Tabela 42 ref. 2 (camada única, método C) só tem valores até 11 circuitos (as colunas 12–15, 16–19 e ≥ 20 estão vazias para essa linha). Tabela 45 só vai até 6. O código repetia o último valor — **permissivo**, porque o fator real continua caindo. Agora devolve `null` e o circuito fica "não verificado" com mensagem explicando. O critério G20.2, que consagrava a repetição, foi atualizado (resultado incorreto corrigido; não foi afrouxado).

## 8–10. Médios

- **Volumes do banheiro:** `1,6 − 1 = 0,6000000000000001` jogava um ponto exatamente a 0,60 m no volume 3. Comparações agora têm tolerância de 1 nm.
- **Tipo de cômodo desconhecido** (arquivo/link adulterado) lançava exceção; agora cai em "demais cômodos" e o veredito acusa.
- **Rendimento η:** campo opcional para motor/compressor (potência de placa no eixo). Potência absorvida = W/η, VA = W/(η·cosφ). Ex.: 736 W, η 0,8, cosφ 0,85 → 1082,35 VA (antes 865,9).

## 11–13. Transparência

- O cartão de veredito (e o memorial, já aberto) lista **o que a ferramenta não verifica**: I²t abaixo de 10 mm² (Tabela 30 NOTA 1), curva real do disjuntor, seletividade, harmônicas altas/Anexo F, tipo de DR, padrões de distribuidora, reatância de catálogo.
- Nova pendência quando a Icc fase-neutro não é informada (Ikmin parte da trifásica).
- Comentário de `impedanciaLaco` corrigido.

## 14–15. Eletrodutos, a partir do Creder — ALTO / MÉDIO

- **Cabo:** o livro (Tab. 3.22/3.23, coluna "Total") tem área maior que o catálogo Corfio em 2,5, 4, 50, 70, 95 e 120 mm² (120 mm²: 254,5 × 232,4 mm², −8,7%). Com cabo mais fino o código escolhia eletroduto menor que o necessário em casos como 10 cabos de 95 mm² (DN 85 com 40,4% de ocupação pelas áreas do livro). Agora vale o maior dos dois diâmetros.
- **Eletroduto de 16 mm:** a linha de 3/8" (Di 12,8 mm) não consta nas Tabelas 10.4 e 10.5 do livro; o 16 mm soldável tem Di 14,0 e o menor rosqueável é o de 20 mm. Sem fonte, saiu. Resultado visível: 3 × 2,5 mm² passa de 3/8" para **1/2" (20 mm)**, igual à Tab. 3.23 do livro.
- **Erros do livro** (não do código): Tab. 3.7, 57 A e 525 A (G45.1). O código segue a NBR.

## Alteração em critérios existentes (nenhum foi afrouxado)

- **G20.2** — de "mantém o último valor" para "devolve null acima de 6 circuitos" (severidade de baixo para alto).
- **casa-modelo** — passou a trazer `iccFaseNeutroA` e `potenciaReservaPorCircuitoVA` para continuar sem pendência (G27.3 preservado).
- **G42.1** — esperado 3×2,5 mm² passou de 3/8" para 1/2" (efeito dos itens 14–15; conta manual refeita: 3·π/4·3,61² = 30,71 mm² em 211,2 mm² = 14,54%).
- Nenhum critério foi removido; `verificar.mjs` passou de 240 para **302**.
