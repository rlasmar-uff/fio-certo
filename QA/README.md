# QA — Conformidade NBR 5410

Material de verificação do motor de cálculo (`frontend/src/calculations/`) contra a
ABNT NBR 5410:2004.

## Rodar

```bash
node QA/scripts/verificar.mjs              # tudo
node QA/scripts/verificar.mjs --grupo G4   # um grupo (G1..G34)
node QA/scripts/verificar.mjs --verboso    # inclui o que passou
```

Zero dependências — só precisa do node. Sai com código 1 se houver falha, então serve para CI.

**Estado atual (01/10/2026): 240 conformes · 0 divergências.** Linha de base original
(16/09/2026): 50 conformes · 23 divergências. Se o total de divergências voltar a subir, algo
regrediu — acompanhe esse número, não o de conformes (ele muda de tamanho a cada expansão de
cobertura, inclusive para baixo quando asserções redundantes são consolidadas, sem perda real de
cobertura — ver nota de agregação abaixo).

Histórico resumido (ver `relatorios/` para o detalhamento de cada rodada):

| Data | Evento | Resultado |
|---|---|---|
| 16/09/2026 | Auditoria inicial | 50 conformes · 23 divergências |
| 17/09 – 29/09/2026 | Correção da auditoria inicial + expansões sucessivas (G7–G33: eletroduto, métodos de instalação, curto-circuito, balanceamento exato, Tabela 46/37/40/45, locais especiais, veredito, materiais, distribuidoras, planta) | 211 conformes · 0 divergências |
| 30/09/2026 | Auditoria adversarial (G34) — releitura do zero contra o PDF | 211 conformes · 11 divergências |
| 01/10/2026 | Correção da auditoria adversarial | **240 conformes · 0 divergências** |

O total de conformes já caiu uma vez (136→116) sem perda de cobertura, quando o G2 foi consolidado
de ~50 asserções por seção para 6 por coluna: doze células erradas na mesma coluna são **um**
achado, não doze (regra de agregação, ver a skill `qa-nbr5410`). Por isso o número que importa é o
de **divergências**, não o de conformes.

## Estrutura

```
QA/
├── scripts/verificar.mjs        harness executável
├── referencias/
│   ├── valores-normativos.md    tabelas e cláusulas extraídas do NBR-5410.pdf
│   ├── fontes-externas.md       catálogos, normas de produto e convenções (o que não é da NBR 5410)
│   ├── fator-demanda-concessionarias.md  extração literal dos PDFs de fator de demanda por distribuidora
│   ├── casos-de-teste.md        casos com valores esperados + roteiros de UAT manual
│   └── matriz-conformidade.md   rastreabilidade cláusula → código → teste
└── relatorios/
    ├── 2026-09-16-auditoria-inicial.md
    ├── 2026-09-17-pos-correcao.md
    ├── 2026-09-30-auditoria-adversarial.md
    └── 2026-10-01-pos-correcao-adversarial.md
```

Com Claude Code, a skill `qa-nbr5410` (em `.claude/skills/`) usa este material automaticamente
quando o assunto é testar, auditar ou corrigir o motor de cálculo.

## Ao corrigir um achado

1. Rode o harness e anote o total de divergências.
2. Corrija.
3. Rode de novo — o critério visado passa a PASS e nenhum dos que passavam pode quebrar. Se a
   correção mudar um comportamento que **outros** critérios dependiam como padrão implícito (ex.:
   trocar um automatismo por opt-in), ajuste esses critérios também — eles não "regrediram", só
   passaram a testar um cenário que deixou de ser o default (ver seção 6 de
   `relatorios/2026-10-01-pos-correcao-adversarial.md` para um exemplo completo).
4. Atualize o status em `referencias/matriz-conformidade.md`.
5. Cite o identificador do critério no commit (ex.: `G5.4`, `G34.5`).

## Prioridade

Todos os achados da auditoria inicial (16/09) e da auditoria adversarial (30/09) foram corrigidos.
Itens deliberadamente fora do escopo (curto-circuito/seccionamento automático em certas faixas,
PE fora do conduto, DR por grupo de circuitos por padrão, SELV no volume 0) ficam documentados no
`FUTURO.md` e marcados `PARCIAL`/`AUSENTE`/`N/A` com a justificativa na matriz de conformidade.
