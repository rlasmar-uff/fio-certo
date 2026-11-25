# Auditoria independente (24/11/2026)

Testes escritos do zero contra o texto da ABNT NBR 5410:2004, sem usar o harness do projeto
(`QA/scripts/verificar.mjs`) nem os arquivos de referência de `QA/referencias/`. Cada valor esperado
foi calculado à mão a partir da norma. O relatório da 1ª rodada está em
`QA/relatorios/2026-11-24-auditoria-do-zero.md`; a lista completa de achados (motor, telas, conteúdo e
memorial) e o plano de correção estão em `docs/PLANO_DE_CORRECAO_2026-11.md`.

O texto da norma **não** fica no repositório (o PDF é licenciado para uso exclusivo). Para rodar,
extraia o texto do seu exemplar primeiro:

```powershell
node QA/auditoria-independente/extrair.mjs frontend/node_modules/pdfjs-dist/legacy/build/pdf.mjs <caminho do NBR-5410.pdf> <pasta temporária>/nbr.txt
node QA/auditoria-independente/testes.mjs . <pasta temporária>/nbr.txt
```

| Arquivo | O que faz |
|---|---|
| `extrair.mjs` | Extrai o texto do PDF com pdf.js, preservando a posição das colunas, com número de linha |
| `testes.mjs` | 59 testes, todos passando depois da correção (na 1ª rodada eram 56, com 11 falhas, cada uma um achado do plano): Tabelas 36 a 39 célula a célula contra o PDF, previsão de carga, divisão de circuitos, condutores, queda, neutro, PE, curto-circuito, DR, banheiro, eletroduto, quadro/materiais, DPS |
| `piscina.mjs` | Prova ponta a ponta do achado S1 (piscina sem DR no modo padrão) |
| `quadro-dr.mjs` | Prova do achado S2 (quadro, unifilar e lista de materiais sem o DR no modo padrão) |
| `sondar.mjs` | Imprime o resultado da casa-modelo, circuito a circuito |

Os números de linha citados nos testes (ex.: "linhas 8245-8253") se referem ao `nbr.txt` gerado
por `extrair.mjs` a partir do exemplar de 22/01/2010 (217 páginas).
