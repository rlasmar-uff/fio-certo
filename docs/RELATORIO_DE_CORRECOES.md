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
| 7 | Alto | Fator de agrupamento extrapolado onde a norma não tem valor (Tabela 45 acima de 6 circuitos). Correção posterior: a célula 0,70 da Tabela 42 ref. 2 é mesclada (9 a ≥ 20 circuitos); a primeira versão deste item a tratava como vazia acima de 11, o que estava errado e foi revertido | `constantes.js`, `condutores.js`, `protecaoGeral.js` | G36.3, G39.6, G20.2 |
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

Tabela 45 (eletrodutos enterrados) só vai até 6 circuitos; o código repetia o último valor, permissivo. Agora devolve `null` e o circuito fica "não verificado". **Erro corrigido depois:** a primeira versão também tratava a Tabela 42 ref. 2 (método C) como sem valor acima de 11 circuitos. Conferida a imagem da página 116 do PDF, a célula 0,70 é mesclada e vale de "9 a 11" até "≥ 20"; o relatório da semana 5 do grupo de pesquisa a lê assim. Revertido (G36.3).

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

## Adequação ao compilado do Grupo de Pesquisa (semanas 3 a 8) — G46

Plano e decisões em `docs/PLANO_ADEQUACAO_AO_DOCUMENTO.md`. Resumo do que mudou no motor e no que o usuário vê:

- **Queda de tensão:** convenções de resistividade (operação, 1/56, 1/58), modo por impedância (r, x em Ω/km), limites 5% e 7% com o acréscimo de 0,005 pp/m (teto de 0,5 pp, só nos casos de 7%), circuito radial com vários pontos de carga (comprimento equivalente), ΔU em volts e partida de motor (≤ 10%).
- **Previsão e circuitos:** rejeita área e perímetro inválidos, maior entre mínimo e real, sala de manutenção (1000 VA), exceções com motivo, TUE por potência absorvida ou de saída com η, corrente e tensão (potência indefinida), circuito próprio só acima de 10 A, circuito misto validado, corrente máxima por circuito no lugar dos tetos de VA, dispersão δ e ajuste manual de fases.
- **Condutores:** Tabela 33 (maneira → método), seções até 240 mm², K2 por grupo (Tabelas 42 a 45, F = 1/√n, exclusão ≤ 30%), "critério térmico" separado de "dimensionamento completo".
- **Proteção:** disjuntores de 4 a 125 A por linha com Icn, I₂/In por tipo de dispositivo, sobrecarga prolongada, PE por cálculo e mínimos da 6.4.3.1.4, neutro (equilíbrio e proteção declarados à parte) e Anexo F.
- **Eletrodutos:** catálogo (roscável e soldável) com as áreas da tabela 3.22 do Creder, editáveis; quantidade máxima por eletroduto; eletroduto compartilhado com a regra da 6.2.10.2.
- **DR e DPS:** DR por circuito exigido (padrão), classe AQ, esquema de conexão 1/2/3 e Iimp neutro-PE.
- **Demanda:** perfil de Creder por parcelas como padrão, rotulado como estimativa bibliográfica.

**Critérios existentes alterados (nenhum afrouxado, todos com conta refeita):** G8.3, G16.x, G27.2, G35.10, G36.1/36.3, G37.5, G39.6 e G42.1 acompanharam as novas séries de disjuntores e de seções, o modo de DR padrão e a nova área dos cabos. Nenhum critério foi removido; `verificar.mjs` passou de 302 para **350**.

**e2e:** `rendimento` agora escolhe "potência de saída" antes de informar η; `M9` troca o método por maneira de instalar (11 → C); três rótulos novos foram renomeados para não colidirem com rótulos existentes. Novo `e2e/documento.spec.js` (5 roteiros).
