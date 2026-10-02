# Fio Certo

Calculadora gratuita de dimensionamento de instalações elétricas residenciais, com base na **ABNT NBR 5410:2004** (versão corrigida 17.03.2008). Projeto de extensão universitária (TEE00192 — Circuitos Elétricos de Corrente Alternada).

[![Verificar e publicar](https://github.com/rlasmar-uff/fio-certo/actions/workflows/publicar.yml/badge.svg)](https://github.com/rlasmar-uff/fio-certo/actions/workflows/publicar.yml)

**Acesse:** https://rlasmar-uff.github.io/fio-certo/

> Ferramenta de apoio ao estudo e ao pré-dimensionamento. **Não substitui** o projeto elétrico nem a Anotação de Responsabilidade Técnica (ART) de um profissional habilitado.

## O que faz

Da previsão de carga ao quadro de distribuição, para instalações **monofásicas, bifásicas e trifásicas**:

- Previsão de carga por cômodo (iluminação, tomadas, equipamentos de uso específico)
- Divisão em circuitos e dimensionamento de condutores (ampacidade, agrupamento, queda de tensão, curto-circuito)
- Proteção geral e por circuito (disjuntor, DR, DPS) e dimensionamento do alimentador
- Locais especiais — banheiro/chuveiro (inclusive marcação dos volumes numa planta), piscina e sauna
- Lista de materiais, diagrama unifilar, quadro de distribuição e memorial técnico para impressão/PDF
- Cada resultado cita a cláusula da NBR 5410 aplicada — nunca um número sem explicar de onde veio

Detalhes completos do escopo em [ESCOPO.md](ESCOPO.md); o que ainda falta, em [FUTURO.md](FUTURO.md) e [PENDENCIAS.md](PENDENCIAS.md).

## Rodando localmente

Requer Node.js 24+.

```bash
cd frontend
npm install
npm run dev       # servidor de desenvolvimento
npm run build     # build de produção em frontend/dist
npm run lint      # oxlint
npm test          # harness de conformidade NBR 5410 (QA/scripts/verificar.mjs)
npm run e2e       # testes de ponta a ponta (Playwright)
```

## Estrutura do repositório

```
frontend/   app React + Vite (código-fonte, testes e2e)
QA/         harness de conformidade normativa, casos de teste, relatórios de auditoria
docs/       relatório técnico e roteiro do seminário da disciplina
```

## Stack técnico

React + Vite, roteamento 100% client-side (`HashRouter`, para funcionar em qualquer subcaminho do GitHub Pages) e toda a lógica de cálculo no navegador, sem backend. Publicação automática pelo GitHub Actions a cada push na `main` (lint, build, harness de QA e testes Playwright antes de publicar).

## Aviso

O exemplar da NBR 5410 usado como referência técnica (`NBR-5410.pdf`) é licenciado para uso exclusivo do comprador e **não** é redistribuído neste repositório — só os critérios técnicos (tabelas, fórmulas, limites) foram implementados no código.
