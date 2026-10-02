# Relatório pós-correção — Auditoria NBR 5410 de 16/09/2026

**Projeto:** Calculadora de Instalações Elétricas Residenciais
**Norma de referência:** ABNT NBR 5410:2004 (versão corrigida 17.03.2008)
**Data:** 17/09/2026
**Referência:** [`2026-09-16-auditoria-inicial.md`](2026-09-16-auditoria-inicial.md)
**Destinatário:** equipe de desenvolvimento

---

## Resultado

**50 conformes → 73 conformes. 23 divergências → 0 divergências.**

```bash
node QA/scripts/verificar.mjs
```

Todos os 23 achados da auditoria inicial (5 críticos, 7 altos, 10 médios, 1 baixo) foram
corrigidos ou tiveram a lacuna explicitamente declarada no resultado (nunca deixada invisível).
`frontend/npm run build` e `npm run lint` seguem limpos (só os 2 avisos pré-existentes,
não relacionados). A matriz de conformidade (`QA/referencias/matriz-conformidade.md`) e o
`ESCOPO.md` foram atualizados para refletir o estado real.

---

## 1 · Defeitos que subdimensionavam — corrigidos

### 1.1 Fatores de correção (G4.5)
`avaliarTrilhaSecao` agora compara contra `ampacidadeCorrigida = Iz_tabela × FCT × FCA`
(`constantes.js`: `obterFatorTemperatura`/Tabela 40, `obterFatorAgrupamento`/Tabela 42 ref. 1). Por
padrão, temperatura = 30°C e nº de circuitos agrupados = total de circuitos gerados pela
ferramenta; um campo avançado em Condutores.jsx permite ajustar os dois. A trilha exibe Iz tabela
e Iz corrigido lado a lado.

### 1.2 Queda de tensão acumulada (G5.4)
Novo orquestrador `frontend/src/calculations/projeto.js` (`calcularProjetoCompleto`) dimensiona o
alimentador primeiro e calcula o orçamento remanescente para os circuitos terminais:
`Math.min(4, 5 − quedaDoAlimentador)` (§6.2.7.2 + §6.2.7.1 c). As 4 páginas que precisavam do
dimensionamento completo (Condutores, QuedaDeTensao, ProtecaoGeral, Resultado) passaram a usar
esse orquestrador único em vez de recalcular cada uma por conta própria.

### 1.3 Resistência a 70°C (G5.1)
`CONDUTIVIDADE_COBRE` (56, cobre a 20°C) renomeada para `CONDUTIVIDADE_COBRE_70C = 46.8`
(temperatura de operação da Tabela 36 para PVC), usada em `calcularQuedaPercentual`.

### 1.4 Fase-fase S/√3 (G6.1)
`balancearFases` (`circuitos.js`) agora soma `potenciaVA / Math.sqrt(3)` em cada uma das duas
fases de um circuito fase-fase (antes: `/2`). Isso corrige, em cascata, a corrente de entrada, o
disjuntor geral, o IDR e a seção do alimentador.

---

## 2 · Erro de dados — corrigido

### 2.1 e 3.1 juntos: Tabela 36, coluna e transcrição (G2.1, G2.2)
`TABELA_AMPACIDADE_MM2` trocada para a coluna B1/2 condutores carregados (17.5, 24, 32, 41, 57,
76, 101, **125**, 151, 192, 232, 269) — resolve o erro de transcrição do 35 mm² (111→125 A) e o
comentário que divergia do dado, na mesma mudança (todo circuito gerado é F-N ou F-F, sempre 2
condutores carregados).

---

## 3 · Desvios conservadores — corrigidos

### 3.2 Iluminação, floor não ceil (G1.1)
`calcularIluminacaoMinimaVA` usa `Math.floor` — "4 m² inteiros" é piso, não teto.

### 3.3 Queda trifásica no alimentador (G6.2)
`calcularQuedaPercentual` ganhou o parâmetro `circuitoTrifasico`: quando verdadeiro (alimentador
de instalação trifásica), o fator "ida e volta" cai de 2 para 1 — equivalente a √3·L·I/V_ff
referido à tensão fase-neutro já usada para a corrente de entrada.

---

## 4 · Lacunas normativas

### 4.1 Curto-circuito e seccionamento automático (G4.8, G4.9) — declarados, não calculados
Decisão de escopo (alinhada com o usuário): dependem da corrente de curto-circuito presumida na
origem, dado que um usuário residencial não tem. `dimensionarCircuito` retorna
`curtoCircuitoVerificado: false`, `seccionamentoAutomaticoVerificado: false` e um aviso explícito
(`AVISO_CURTO_CIRCUITO`), exibido de forma visível em Condutores.jsx e Resultado.jsx — não mais
uma lacuna silenciosa.

### 4.2 Polos do disjuntor (G4.7)
`dimensionarCircuito` retorna `polos: circuito.ehFaseFase ? 2 : 1` — circuitos fase-fase (2 fases
ocupadas) agora declaram disjuntor bipolar.

### 4.3 Faixa de disjuntores (G4.6)
`DISJUNTORES_PADRONIZADOS` estendida com 125/150/175/200/225/250 A.

### 4.4 Seção mínima do alimentador (G4.3)
Separados o mínimo NORMATIVO (`SECAO_MINIMA_MM2.geral = 2.5`, §6.2.6.1.1, cabo isolado) do piso
PRÁTICO de concessionária (`PISO_PRATICO_ALIMENTADOR_MM2 = 10`, não é NBR 5410) — a UI cita os
dois separadamente. O piso nunca reduz a seção abaixo do que a corrente/queda exigem (bug
detectado e corrigido durante a implementação: `Math.max(seçãoNormativa, piso)`, nunca uma troca
cega pelo piso).

### 4.5 PE nos circuitos terminais (G6.4)
`dimensionarCircuito` aplica `calcularSecaoTerra` (Tabela 58, já correta) também aos circuitos
terminais — antes só o alimentador recebia.

### 4.6 Circuito sem comprimento (G5.5)
`comprimentoInformado`/`naoVerificado` distinguem "não preenchido" de "preenchido como 0" — a UI
mostra "não verificado" em vez de aprovar tacitamente.

### 4.7 Citações normativas (achado 4.7 original)
Corrigidas em `previsaoDeCarga.js`, `constantes.js` e `circuitos.js`: §9.5.2.1.2, §9.5.2.2.1,
§9.5.2.2.2 (não mais §9.5.2.3, que é aquecimento de água); comentário do circuito dedicado por TUE
agora diz corretamente que a norma exige isso só acima de 10 A (a ferramenta é mais conservadora).

### 4.8 Lacunas menores de previsão de carga
- **Regra dos 6 pontos (G1.7):** `calcularLimite600VA` soma as tomadas do conjunto de ambientes da
  lista de 600 VA (banheiro, cozinha, área de serviço) no projeto inteiro; acima de 6, o limite
  cai de 3 para 2 pontos a 600 VA em cada um. Aplicado automaticamente em
  `calcularPrevisaoDeCarga` e `gerarCircuitos`.
- **Tipo "outro" com 3 faixas:** `calcularQuantidadeTugMinima` trata `outro` como caso especial:
  ≤6 m² → 1 ponto; >6 m² → mesma regra de perímetro do tipo "social".
- **Bancada da pia:** não implementado — exigiria um campo novo (tomadas específicas da bancada),
  fica no `FUTURO.md`.

---

## 5 · Engenharia e manutenibilidade

- **Testes:** `frontend/package.json` ganhou `"test": "node ../QA/scripts/verificar.mjs"` — o
  harness agora é `npm test`, não um script solto.
- **Código morto removido:** `avaliarQuedaDeTensao`/`avaliarQuedaDeTensaoCircuitos`
  (`quedaDeTensao.js`) — não eram usados por nenhuma tela.
- **Recálculo duplicado resolvido:** `calcularProjetoCompleto` (`projeto.js`) é agora o único
  ponto de cálculo do projeto completo, usado pelas 4 páginas que precisam dele — consequência
  direta de corrigir o orçamento de queda acumulado (era preciso computar o alimentador antes dos
  terminais em todo lugar).

---

## O que ficou deliberadamente fora (ver FUTURO.md)

- Curto-circuito e seccionamento automático (§6.2.6.1.2 c/d) — declarados, não calculados
- Tabelas 37-39 (outras isolações/métodos de instalação) e demais referências das Tabelas 42-45
  (só a referência 1, aplicável ao método B1, foi implementada)
- Redução do neutro para fases grandes (§6.2.6.2) — sempre igual à fase, mais conservador
- DR por grupo de circuitos (§5.1.3.2.2 permite; hoje é um único DR geral)
- Mínimo de 2 tomadas sobre a bancada da pia
- Aterramento/equipotencialização além da seção do PE (§6.4, já fora de escopo da v1)

---

## Verificação

```bash
node QA/scripts/verificar.mjs        # 73 conformes, 0 divergências
cd frontend && npm run build && npm run lint   # limpo
```

Teste end-to-end manual (projeto trifásico misto: iluminação, TUG, ar-condicionado indutivo,
geladeira, chuveiro fase-fase 7500 W) confirmou o pipeline completo sem erros, com valores
plausíveis (FCA=0,54 para 7 circuitos agrupados corretamente refletido na ampacidade e na seção
adotada de cada circuito).

### Ressalva

Esta correção cobre os achados da auditoria de 16/09/2026. Não substitui a validação por
profissional habilitado, e a ferramenta continua declarando que não substitui projeto elétrico
com ART.
