# Casos de teste numéricos — auditoria independente (nov/2026)

Todos executáveis: `node QA/scripts/verificar.mjs --grupo G35 --verboso` (e G36…G44). "Fio Certo"
abaixo é o resultado do motor **depois** das correções; onde houve erro, o valor anterior está
indicado. Constantes usadas nas contas: cobre a 70 °C σ = 46,8 S·m/mm²; a 90 °C σ = 43,9;
reatâncias por seção da tabela de catálogo (0,12 Ω/km a 25 mm², 0,13 a 6 mm², 0,11 a 50 mm²).

## C1 — Queda do alimentador, carga numa fase só (G35.1) — erro encontrado

- **Dados:** trifásico 127/220 V, 25 mm² PVC, 50 m, neutro 25 mm². Fase A: 7620 VA, cosφ 0,8 indutivo.
- **Fórmula:** V_carga = V − (Z_f + Z_n)·I_A (só A carrega, ΣI = I_A).
- **Substituição:** Z = 50/(46,8·25) + j50·0,12/1000 = 0,042735 + j0,006 Ω; I_A = 60 ∠−36,87° = 48 − j36 A; ΔV = (0,08547 + j0,012)(48 − j36) = 4,5346 − j2,5009 V; |V_carga| = 122,4906 V.
- **Esperado:** (127 − 122,4906)/127 = **3,5507 %**.
- **Fio Certo:** antes 2,0190 % (−43 %) · depois **3,5504 %**. Diferença 0,0003 pontos percentuais. **Corrigido.**

## C2 — Carga equilibrada (G35.2)

3 × 7620 VA, cosφ 0,8: ΔV = Z·I = 2,2673 − j1,2505 V; |V_carga| = 124,7388 V → **1,782 %**. Fio Certo 1,7803 %. Neutro reduzido não altera. **Conforme.**

## C3 — Desequilibrada, fatores de potência diferentes, neutro 16 mm² (G35.3)

A 9 kVA cosφ 0,9 ind., B 3 kVA cosφ 1, C 1 kVA cosφ 0,7 cap.; 35 m; fase 35 mm². Referência independente (KVL complexa no próprio teste): 2,94150 %; motor 2,94150 %. Com neutro 35 mm²: 2,05715 %. **Conforme** — neutro mais fino piora a queda, como previsto.

## C4 — Icc fase-neutro, neutro reduzido (G35.6) — erro encontrado

- **Dados:** 127 V, Icc da fonte 3000 A, fase 50 mm², neutro 25 mm², L = 30 m.
- **Substituição:** X_fonte = 127/3000 = 0,042333; R = 30/46,8·(1/50 + 1/25) = 0,038462; X = 0,042333 + 30·(0,11 + 0,12)/1000 = 0,049233; Z = √(0,038462² + 0,049233²) = 0,062474 Ω.
- **Esperado:** 127/0,062474 = **2032,8 A**. Antes 2298,9 A (+13 %). **Corrigido.**

## C5 — Fronteira de atuação do disjuntor (G35.7) — erro encontrado

Mesmo alimentador a 90 m, disjuntor 125 A curva C (instantâneo garantido: 10·In = 1250 A). Antes: Icc 1284 A → "verificado, conforme". Correto: **966 A < 1250 A → não verificado**. **Corrigido.**

## C6 — Iluminação nas fronteiras (G37.1)

f(A) = 100 + 60·⌊(A−6)/4⌋: 5,99 → 100 · 6 → 100 · 9,99 → 100 · **10 → 160** · 13,99 → 160 · **14 → 220** · 20 → 280 · 30 → 460 · 100 → 1480. Fio Certo: todos iguais.

## C7 — Tomadas (G37.2, G37.3)

Sala de 10 m de perímetro → 2 pontos; **10,01 m → 3**. Cozinha 7 m → 2; **7,01 m → 3**. Cozinha de 4 pontos: 3 × 600 + 100 = **1900 VA**; banheiro 600 VA; sala de 3 pontos 300 VA. Duas cozinhas de 4 pontos (8 > 6): leitura base 3800 VA; alternativa permissiva (opt-in) 2 × (2·600 + 2·100) = 2800 VA. Fio Certo: iguais.

## C8 — Potência aparente com rendimento (G37.5)

- 1000 W, cosφ 0,85 → 1176,47 VA.
- Motor 736 W, η 0,8, cosφ 0,85: 736/0,8 = 920 W; 920/0,85 = **1082,35 VA** (antes: 865,9 VA, −20 %).
- cosφ 1,5 → antes 666,7 VA; agora 1000 VA e a entrada é acusada como inválida.

## C9 — Seção do condutor por método (G39.1)

Ib = 2540/127 = 20 A, In = 20 A, 5 m. Menor seção com Iz ≥ 20 A (tabela do PDF): PVC → A1 4 mm² (2,5 = 19,5 ✗), A2 4 mm² (18,5 ✗), B1/B2/C/D 2,5 mm² (24/23/27/29); EPR → 2,5 mm² nos seis métodos. Fio Certo: iguais, com Iz igual ao do PDF.

## C10 — Fatores de correção (G39.2)

B1, PVC, 2,5 mm² = 24 A: 40 °C (0,87) → 20,88 ✓; 45 °C (0,79) → 18,96 ✗ → 4 mm² (25,28); 2 circuitos (0,80) → 19,2 ✗ → 4 mm²; 35 °C e 2 circuitos → 32·0,94·0,80 = 24,064 A. Fio Certo: iguais.

## C11 — Limite de 4 % (G39.3)

20 A, 127 V, cos φ 1: ΔV% = 2·L·I/(σ·S·V). 4 mm²: L = 23 m → 920/187,2 = 4,9145 V = **3,870 %** ✓; L = 24 m → **4,038 %** ✗ → 6 mm² (2,692 %). Fio Certo: 23 m → 4 mm²; 24 m → 6 mm².

## C12 — Harmônica > 15 % (G40.2)

3 × 15000 VA, 127 V: 118,1 A → disjuntor 125 A. Fator 0,86 sobre B1/3 condutores: 50 mm² = 134 × 0,86 = **115,24 A** < 125 → adota 70 mm² (171 × 0,86 = **147,06 A**). Fio Certo: iguais.

## C13 — Curto-circuito nos limites (G41)

- PVC 10 mm²: (115·10)² = 1.322.500 A²s; Icc de igualdade = √(1.322.500/0,01) = **11.500 A** (passa) e 11.501 A (reprova). EPR: (143·10)² → **14.300 A**.
- Curva C, In 32 A: limite instantâneo 320 A (B 160, D 640). 320 A verifica; 319,99 A não.
- TN: In 20 A curva C → Ia = 200 A → Zs ≤ 127/200 = **0,635 Ω**. TT: RA ≤ 50/0,03 = 1666,7 Ω (833,3 Ω com banheiro).

## C14 — Eletroduto por diâmetro externo (G42.1)

3 × 2,5 mm² (Ø 3,61, maior entre catálogo e Creder): 3·(π/4)·3,61² = 30,71 mm²; 1/2" (Di 16,4 → 211,2 mm²) = 14,54 % ≤ 40 % ✓ (o de 3/8" deixou de existir na lista: sem fonte). 3 × 25 mm² (Ø 8,6): 174,26 mm²; 3/4" = 48,9 % ✗; 1" = 29,3 % ✓. 2 × 25 mm²: 116,2 mm²; 3/4" = 32,6 % > 31 % ✗ → 1". Fio Certo: iguais.

## C15 — Volumes do banheiro (G43.1) — erro encontrado

Box 1×1 m: ponto a **0,60 m** da borda e 3 m de altura → volume 2. Antes: "fora de todos os volumes" (0,6000000000000001 > 0,6 e a altura de 3 m excede o limite do volume 3). Agora volume 2. Fronteiras conferidas: 2,25 / 2,2501 / 3 / 3,0001 m de altura; 0,6 / 0,6001 / 3,0 / 3,0001 m horizontais; banheira elevada (teto do volume 1 = 0,5 + 2,25 = 2,75 m).

## C16 — Reserva do quadro (G42.5, G42.7)

N = 1…6 → 2; 7…12 → 3; 13…30 → 4; 31 → ⌈4,65⌉ = 5; 100 → 15; 101 → 16. Com 2 reservas de 1000 VA a 127 V: +2000/127 = **+15,748 A** na fase. Fio Certo: +15,7480 A.

## C17 — Entradas inválidas (G44)

Sem cômodos → "faltam dados" (antes: "tudo conforme"). Área −10 / "abc", tipo "xyz", potência −1000 W, cosφ 1,5, η 1,2, quantidade −2 → problema apontado, sem exceção e sem reduzir a corrente. Potência −5000 W não abate a corrente das demais cargas.

## C18 — Conferência com o livro (G45)

- **Tab. 3.18 do Creder, 1 % a 127 V:** 4 mm² → Σ(P·ℓ) = 18.710 W·m. Com ℓ = 10 m, P = 1871 W, I = 14,73 A: o motor calcula ΔV% = 2·10·14,73/(46,8·4·127)·100 = **1,239 %** (= 58/46,8), contra 1,000 % do livro (ρ = 1/58 a 20 °C). Nas 9 seções da tabela a razão é a mesma. O motor é mais conservador, por usar 70 °C.
- **Tab. 3.7:** EPR 4 mm² B1: 2 condutores 42 A; 3 condutores 37 A (NBR); o livro imprime 57 A (erro). EPR D/2 95 mm²: 252 A (NBR); o livro imprime 525 A (erro).
- **Icc, exemplo (a) do §4.5.3:** Iko = 8,44 kA, 30 m, 2 × 95 mm² em paralelo. Z_fonte = 127/8440 = 0,015047 Ω (reativa); R = 30/(46,8·190) = 0,003374 Ω; X = 0,015047 + 0,0015 = 0,016547 Ω; Z = 0,016887 Ω; Ik = 127/0,016887 = **7,52 kA**. Livro: 7,43 kA (+1,2 % do motor).
