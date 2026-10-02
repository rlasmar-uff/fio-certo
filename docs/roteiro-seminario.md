# Roteiro do seminário: Fio Certo (15 minutos)

Apresentação presencial com demonstração ao vivo. Antes de começar:
- abra o site com internet e depois desligue-a, para mostrar o modo offline;
- use uma janela anônima, para a lista de projetos começar vazia.

| Tempo | Bloco | O que dizer / mostrar |
|---|---|---|
| 0:00–1:30 | **Problema** | Dimensionar uma instalação residencial pede dezenas de cláusulas da NBR 5410, e um erro não aparece na hora: o cabo subdimensionado aquece dentro da parede. A proposta é uma ferramenta gratuita que mostre a regra aplicada e diga o que **não** conseguiu verificar. |
| 1:30–3:00 | **CA na prática** | Três exemplos da disciplina dentro da ferramenta: a potência aparente do ar-condicionado (1000 W / 0,85 = 1176 VA), a soma vetorial das fases e do neutro, e a queda de tensão com R cos φ + X sen φ. |
| 3:00–8:30 | **Demonstração** | Em "Ver exemplo", mostrar a casa-modelo: o veredito verde e o que cada número significa. Depois: (1) no Dimensionamento, abrir o chuveiro e mostrar a trilha de seções (por que 10 mm²); (2) mostrar o unifilar e o quadro com C1…C6; (3) informar no Dimensionamento uma instalação existente com 2,5 mm² e 20 A numa TUG, e o veredito fica **vermelho** apontando a etapa; (4) comparar cenários com PVC × EPR e explicar por que alguns circuitos engrossam (orçamento de 5%); (5) abrir o memorial e mostrar a impressão e o PDF. |
| 8:30–10:00 | **Planta** | Abrir a imagem de uma planta, marcar a escala, "Detectar cômodos (experimental)", aceitar as sugestões e ver os cômodos criados com área e perímetro. Deixar claro que é sugestão e que o usuário confirma. |
| 10:00–12:00 | **Como sabemos que está certo** | O harness com 211 critérios ligados a cláusulas (mostrar a saída `211 conformes · 0 divergências`). A auditoria inicial tinha 23 divergências. Contar o caso do curto-circuito, que aprovava o que a norma reprova, e como foi achado relendo o §6.3.4.3.2. Página Conformidade: o que não é verificado e por quê. |
| 12:00–13:30 | **Limites** | Não substitui projeto com ART. Tipo de falta da Icc informada (tomada como trifásica), geometria dos volumes, fator de demanda (a norma não traz tabela residencial). A transparência sobre esses limites é parte do produto. |
| 13:30–15:00 | **Fechamento** | Site no GitHub Pages, gratuito, sem cadastro, funciona offline. Link e QR code no último slide. Perguntas. |

## Plano B

- **Sem internet na sala:** o site abre do cache, se tiver sido aberto antes no mesmo navegador. Leve também um projeto exportado em arquivo (`Projetos → Exportar arquivo`) e importe se precisar.
- **Projetor com resolução baixa:** use o zoom do navegador em 125%. O unifilar tem rolagem própria.
- **Pergunta sobre um número:** abra a Nota "Por que assim?" ou a trilha de seções do circuito. Todo número tem a conta visível.

## Slides sugeridos (8)

1. Título, equipe e disciplina.
2. O problema, com a foto de um cabo aquecido ou um trecho da norma.
3. CA na prática: as 3 fórmulas.
4. As 5 etapas, em captura da tela.
5. A demonstração (slide só com o link, para voltar depois).
6. Harness: de 23 divergências para 211 critérios e 0 divergências.
7. O que não é verificado, a partir da página Conformidade.
8. Link, QR code e agradecimentos.
