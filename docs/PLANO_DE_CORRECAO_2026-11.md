# Plano de correção — auditoria do zero (novembro/2026)

Este plano junta tudo o que as duas rodadas da auditoria independente de 24/11/2026 encontraram:
motor de cálculo, todas as telas, conteúdo do site e memorial em PDF. Também define o novo
modelo do relatório final.

- **Relatório da 1ª rodada (motor):** `QA/relatorios/2026-11-24-auditoria-do-zero.md`
- **Testes independentes:** `QA/auditoria-independente/testes.mjs` (56 testes; 45 passam, 11
  falham e cada falha é um achado deste plano)
- **Fontes primárias usadas:** ABNT NBR 5410:2004 (PDF do exemplar licenciado, 217 páginas);
  Creder, *Instalações Elétricas*, 16ª ed.; NDU-001 da Energisa. Nenhum valor veio de memória nem
  dos arquivos de referência do projeto.

> **Status (24/11/2026): fases 0 a 7 executadas.** Critério adotado por decisão do usuário: *se está
> escrito na norma, a ferramenta tem; se não está, não tem*. Por isso a fase 4 (distribuidoras) virou
> remoção: fator de demanda, piso de 10 mm², linha de disjuntor e simulação de consumo saíram (R1–R3
> ficam sem objeto). O agrupamento passou a ser por cômodo quando o usuário não informa grupo
> (§6.2.5.8). O memorial foi refeito conforme a seção 4. Resultado: harness com 351 conformes e 0
> divergências; 59 testes independentes OK; lint e build limpos; Playwright com 107 testes passando em
> Chromium, Firefox e WebKit (1 pulado de propósito: PWA offline no WebKit). Achados novos durante a
> execução e já corrigidos: TT sem DR em todos os circuitos; iluminação de 1,5 mm² reprovada no I²t
> (agora a seção mínima por curto-circuito entra na escolha); eletroduto do ramal TN-C-S contando um PE
> à parte do PEN; aviso de fuga somada (§6.3.3.2.6) valendo para qualquer DR com mais de um circuito.

**Legenda.**

- **Gravidade:** 🔴 crítico (pode deixar pessoas sem proteção exigida ou levar à compra errada);
  🟠 alto (verificação exigida que não acontece, ou afirmação falsa sobre segurança); 🟡 médio
  (superdimensionamento, explicação errada ou incoerência); ⚪ baixo (detalhe).
- **Esforço:** P = até 2 h · M = meio dia · G = 1 dia ou mais.
- **Teste:** identificador em `QA/auditoria-independente/testes.mjs`. "UI" = só verificável na
  interface.

---

## 1. Todos os achados

### 1.1 Segurança e proteção

| # | Grav. | Achado | Onde | Teste |
|---|---|---|---|---|
| S1 | 🔴 | Piscina sem DR no modo padrão. A opção de piscina só existe no tipo "Outro", e `exigenciaDR` não lê `piscina`. Mesmo assim, a tela afirma "No volume 2, todos os circuitos já estão sob DR de 30 mA" (§9.2.3.1.2 b, §9.2.4.3.3 b). | `exigenciaDR.js`; `ComodoCard.jsx:111`; `SecaoComplementares.jsx:186`; `locaisEspeciais.js:235` | H4, `piscina.mjs` |
| S2 | 🔴 | No modo de DR padrão, o quadro e o unifilar mostram "DR —" sobre **todos** os circuitos, e a **lista de materiais sai sem DR**, embora o cálculo tenha dimensionado 1 DR de 63 A para 5 circuitos. Confirmado no site publicado. | `quadro.js:56-67`; `DiagramaUnifilar.jsx`; `materiais.js:134`; `projeto.js:327-331` | L1, L2, `quadro-dr.mjs` |
| S3 | 🟠 | O unifilar desenha sob o "DR geral" circuitos que não têm DR (o ar-condicionado da casa-modelo). | `quadro.js`; `DiagramaUnifilar.jsx` | L3 |
| S4 | 🟠 | Tomadas de varanda não exigem DR por padrão; o §5.1.3.2.2 c) cobre tomadas que "possam vir a alimentar equipamentos no exterior". | `exigenciaDR.js` | H3 |
| S5 | 🟠 | Na conferência de instalação existente, o seccionamento sempre supõe DR de 30 mA, mesmo em circuito sem DR. Isso pode aprovar indevidamente. | `projeto.js:412`; `Dimensionamento.jsx:90` | UI |
| S6 | 🟠 | O modelo típico "chuveiro" (e torneira e boiler) não marca "aquecedor de água" e deixa a conexão como "tomada". Assim, a regra do §9.5.2.3 (ligação direta, sem tomada) nunca dispara sozinha. | `presets.js`; `ComodoCard.jsx:284-297` | UI |
| S7 | 🟡 | Os textos "esta instalação já tem DR em todo circuito" e "DR exigido para tomadas em geral" são falsos no modo padrão; o §5.1.3.2.2 não lista "tomadas em geral". | `locaisEspeciais.js:111`; `SecaoProtecaoGeral.jsx:280-283`; `protecaoGeral.js:34` | UI |
| S8 | 🟡 | O DPS "neutro–PE" sai na lista de materiais e no quadro mesmo em TN-C-S, em que a própria ferramenta indica o esquema de conexão 1 (só fase–PE/PEN). | `materiais.js:139-142`; `quadro.js:29` | UI |
| S9 | ⚪ | O DR geral fica sem corrente nominal quando o disjuntor geral passa de 100 A, porque a lista de DR termina em 100 A. | `protecaoGeral.js:37-45` | — |

### 1.2 Verificações que não acontecem

| # | Grav. | Achado | Onde | Teste |
|---|---|---|---|---|
| V1 | 🟠 | I²t ≤ k²S² nunca é verificado abaixo de 10 mm² (5 de 6 circuitos da casa-modelo). A leitura da Nota 1 da Tabela 30 é questionável, e o próprio código usa k = 115 no PE de 2,5 mm². **Decisão do grupo.** | `constantes.js:403`; `curtoCircuito.js:78`; `veredito.js:91` | G2, G3, G4 |
| V2 | 🟡 | O veredito diz "Tudo o que a ferramenta verifica está conforme" mesmo com o curto-circuito não verificado na maioria dos circuitos; isso só aparece escondido em "limitações". | `CardVeredito.jsx`; `veredito.js` | UI |
| V3 | 🟡 | A linha "Capacidade de interrupção" mostra sempre "especificar" e não marca "não conforme" quando a Icn da linha escolhida fica abaixo da Icc. O veredito já detecta isso. | `SecaoComplementares.jsx:111-133` | UI |
| V4 | 🟡 | O seletor "Tipo do DR" (AC/A/B) não tem efeito: o motor não lê o campo, e a lista de materiais diz sempre "tipo A". | `InstalacaoDocumento.jsx:80`; `SecaoMateriais.jsx:111` | UI |
| V5 | 🟡 | O neutro reduzido tem duas declarações em lugares diferentes. Marcar a caixa principal, cujo texto já cita as condições a) e b), não reduz nada até o usuário confirmar de novo em outro bloco. | `Instalacao.jsx:436-447`; `InstalacaoDocumento.jsx:102-107` | UI |

### 1.3 Dimensionamento padrão

| # | Grav. | Achado | Onde | Teste |
|---|---|---|---|---|
| D1 | 🟡 | Sem agrupamento informado, todos os circuitos são tratados como se estivessem no mesmo eletroduto. Casa-modelo: chuveiro de 5,5 kW sai com **10 mm²**, quando o esperado é 4 mm²; as tomadas saem com 4 mm² em vez de 2,5 mm². A explicação fica só num bloco recolhido. **Decisão do grupo.** | `condutores.js:322`; `Dimensionamento.jsx:551-553, 587` | K1 |
| D2 | ⚪ | Garagem ou área externa de até 6 m² recebe 1 tomada por 5 m de perímetro em vez de 1 tomada (§9.5.2.2.1 e). | `previsaoDeCarga.js:34-49` | B4 |
| D3 | ⚪ | O texto do agrupamento mostra o número automático de circuitos mesmo quando o circuito está num grupo definido pelo usuário. | `Dimensionamento.jsx:412` | UI |

### 1.4 Distribuidoras e demanda (informativo)

| # | Grav. | Achado | Onde | Teste |
|---|---|---|---|---|
| R1 | 🟡 | Equatorial: a tabela é por faixas ("100% para os primeiros 10 kW, 35% para os 110 kW seguintes"), mas o código aplica um fator único à carga inteira. Para 12 kW: 4,2 kW em vez de 10,7 kW. | `distribuidoras.js` (equatorial) | M1 |
| R2 | 🟡 | CPFL, EDP SP, Neoenergia, Cemig e Light usam fator único. A Energisa, com os **mesmos** percentuais da CPFL, manda somar por faixa (Nota III). É preciso conferir no PDF de cada uma se a regra é fator único ou soma; os PDFs não estão neste computador. | `distribuidoras.js` | — |
| R3 | ⚪ | Copel ainda pendente: o servidor de normas estava fora do ar. | — | — |

### 1.5 Textos e explicações erradas ou desatualizadas

| # | Grav. | Onde | Hoje | Correto |
|---|---|---|---|---|
| T1 | 🟠 | `Instalacao.jsx:316-350` (Tabela 15) | AQ1 "—"; AQ2 "≤ 25 dias"; AQ3 "> 25 dias — redes aéreas" | AQ1 ≤ 25 dias/ano; AQ2 > 25 dias/ano, riscos vindos da rede (instalações alimentadas por rede aérea); AQ3 exposição direta dos componentes (partes no exterior) |
| T2 | 🟡 | `constantes.js:107` (A1, exibido em Dimensionamento) | "drywall, wood frame, steel frame — §6.2.5.1.2, nota 1" | A nota não cita isso. A Nota 5 da Tabela 33 classifica a parede de gesso acartonado como **espaço de construção** (maneiras 21 a 25 → B1/B2) |
| T3 | 🟡 | `Circuitos.jsx:23` | "circuito exclusivo... para todo equipamento de uso específico" | Só acima de 10 A (§9.5.3.1); o motor agrupa os de até 10 A |
| T4 | 🟡 | `Circuitos.jsx:48, 63` | circuito misto "§9.5.3.1" | §9.5.3.3 |
| T5 | 🟡 | `Circuitos.jsx:41` | "Um DR de 30 mA para cada circuito que a norma exige" | Um DR único para todos os circuitos em que a norma exige |
| T6 | 🟡 | `Circuitos.jsx:235-262` | Balanceamento explicado como "vai para a fase menos carregada" | O motor usa busca exata (`resolverAtribuicaoExata`); a justificativa precisa refletir isso |
| T7 | 🟡 | `SecaoProtecaoGeral.jsx:88` | "Un ≈ 175 V" | **Uc** ≥ 1,1·Uo (Tabela 49) |
| T8 | 🟡 | `Dimensionamento.jsx:193, 421`; `Comparar.jsx:163`; `Instalacao.jsx:55` | "5% totais" fixo | Usar o limite real (5 % ou 7 % conforme §6.2.7.1, mais o acréscimo da nota 3) |
| T9 | 🟡 | `Dimensionamento.jsx:333-335` | "pelo disjuntor e pelo DR" quando só o disjuntor atua | Citar o DR só quando `sobDR` |
| T10 | 🟡 | `locaisEspeciais.js:5-7` | Volume 1 "0,6 m ao redor"; IP "IPX3–IPX5", "IPX1–IPX5" | Com box: projeção do box. IP residencial: IPX3 (vol. 2) e IPX1 (vol. 3); IPX5 só em banheiro público (§9.1.4.1) |
| T11 | 🟡 | `conteudo/conformidade.js` | Piscina e I²t como "Calculado e verificado"; "9 distribuidoras" | Mover para "com limite declarado" até corrigir; 10 distribuidoras |
| T12 | 🟡 | `Sobre.jsx:26-30` | "Sem fator de demanda"; "sem preços, marcas ou regras de distribuidora" | Há perfil do Creder e 10 distribuidoras (informativos) e marcas citadas (DX-E/DX 6000/DX-H, Tigre) |
| T13 | ⚪ | `constantes.js:139-145` (método D) | "cabo multipolar em eletroduto enterrado" | O cálculo usa a sub-tabela de unipolares (Tab. 45); alinhar texto e cálculo |
| T14 | ⚪ | `SecaoComplementares.jsx:135-137`, `Dimensionamento.jsx:312` | "I₂ ≤ 1,45·Iz" sempre | Mostrar "I₂ ≤ Iz" com sobrecarga prolongada e a relação real com "outro dispositivo" |
| T15 | ⚪ | `SecaoComplementares.jsx:236` | Iimp/In do neutro-PE do esquema 3 sempre visível | Só quando o esquema 3 se aplica |
| T16 | ⚪ | `glossario.js` (TUE) | "circuito próprio" | Circuito próprio só acima de 10 A |
| T17 | ⚪ | `constantes.js:604` | Comentário diz que a Tab. 45 repete o último fator | O código devolve `null` acima de 6 circuitos (está certo); corrigir o comentário |
| T18 | ⚪ | `condutorProtecao.js:33` | Pendência "k da Tabela 53 para EPR/XLPE não consta" | Consta (176); remover a mensagem morta |
| T19 | ⚪ | `casaModelo.js:33` | Varanda cadastrada como "Outro" | Tipo "Varanda" |
| T20 | ⚪ | `Instalacao.jsx:69` | 127 V "mais comum no Brasil"; 220 V "parte do RJ, PR, SC..." | Texto neutro: "confira na conta de luz ou com a distribuidora" |

### 1.6 Memorial (relatório em PDF)

| # | Grav. | Achado |
|---|---|---|
| M1 | 🟠 | Blocos `<details>` saem **fechados** no PDF: a memória de cálculo do alimentador ("Ver como cada valor foi calculado"), as hipóteses da demanda e dois "Por que assim?". Confirmado no site. |
| M2 | 🟠 | Não há memória de cálculo por circuito: a explicação passo a passo e a trilha de seções só existem na tela de Dimensionamento. |
| M3 | 🟠 | Não há os dados de entrada (comprimentos, maneira de instalar, temperatura, agrupamento, Icc, fornecimento): o documento não é reproduzível nem auditável. |
| M4 | 🟡 | Sem premissas explícitas (ρ, agrupamento suposto, reatância da fonte, k, demanda), sem matriz de conformidade por cláusula e sem identificação (cliente, endereço, responsável, ART, revisão, versão da ferramenta). |
| M5 | 🟡 | Sem paginação, sumário, cabeçalho/rodapé ou numeração de seções; tabelas longas não repetem o cabeçalho; o unifilar não tem página própria. |
| M6 | ⚪ | A seção "Demanda estimada (Creder)" aparece com tabela vazia quando o perfil é "sem redução". |

### 1.7 Outros

| # | Grav. | Achado |
|---|---|---|
| O1 | ⚪ | Link compartilhado: a descompressão não limita o tamanho da saída. Um link de 100 kB pode inflar para centenas de MB e travar a aba de quem abrir. Limitar a saída a cerca de 2 MB. |

---

## 2. Decisões que dependem do grupo (antes de começar)

1. **k abaixo de 10 mm² (V1).**
   - *Recomendação:* usar k = 115 (PVC) e 143 (EPR/XLPE) em todas as seções até 300 mm², como a
     Tabela 30 dá e como a Tabela 55 já é usada no PE. Mostrar a Nota 1 como ressalva.
   - *Alternativa:* manter "não verificado", mas tirar isso das limitações escondidas e colocar
     como pendência visível em cada circuito.
   - Levar ao professor.
2. **Agrupamento padrão (D1).**
   - *Recomendação:* padrão = cada circuito sozinho (FCA 1,0) **no percurso**, com um aviso
     obrigatório na tela de Dimensionamento ("informe quais circuitos dividem eletroduto"), e
     mostrar ao lado a seção que sairia com todos agrupados.
   - *Alternativa conservadora:* manter o padrão atual, mas com o aviso em destaque, não
     recolhido.
3. **Varanda com DR por padrão (S4).** *Recomendação:* sim. É o caso típico do §5.1.3.2.2 c), e
   o usuário pode desmarcar.
4. **Modo de DR padrão.** Depois de S2 corrigido, o modo "exigidos" pode continuar padrão. Uma
   alternativa mais simples para quem está aprendendo é "um DR por grupo".

---

## 3. Fases de correção

Cada item fecha com um critério verificável. A regra geral é a mesma da skill do projeto:
corrigir, rodar `npm test` (harness) **e** `QA/auditoria-independente/testes.mjs`, e nenhum teste
que passava pode quebrar.

### Fase 0 — Preparação (P, antes de tudo)

- [ ] Incorporar os 56 testes independentes ao harness (`QA/scripts/verificar.mjs`, novo grupo
  G47). A parte que lê o PDF fica opcional: roda só se `NBR_TXT` estiver definido, porque o PDF
  não vai para o repositório.
- [ ] Registrar no harness os 11 testes que hoje falham, como critérios "conhecidos", para cada
  correção virar PASS.
- **Pronto quando:** `npm test` mostra G47 com as 11 falhas esperadas.

### Fase 1 — Segurança (🔴/🟠 de proteção) · prazo sugerido: 1º

- [ ] **S1 Piscina (M).**
  - `exigenciaDR` exige DR em todo circuito de cômodo com `piscina: true`.
  - A opção de piscina passa a aparecer também no tipo "Área externa".
  - O texto de `SecaoComplementares.jsx:186` passa a ser calculado a partir de `sobDR`.
  - *Pronto:* H4 e `piscina.mjs` passam (`sobDR=true` nos 3 circuitos).
- [ ] **S2/S3 Quadro, unifilar e materiais (M).**
  - No modo "exigidos", `montarQuadro` usa `drs.grupos` (como no modo "grupos").
  - Os circuitos sem DR ficam ligados direto ao barramento.
  - *Pronto:* L1, L2 e L3 passam; captura do unifilar com o DR de 63 A e o ar-condicionado fora
    do DR.
- [ ] **S4 Varanda (P).** `tomadasAlimentamExterior` vem marcado por padrão no tipo Varanda.
  *Pronto:* H3 passa.
- [ ] **S5 Existente (P).** `seccionar` passa `sensibilidadeDrMA` só se `circuito.sobDR`; o texto
  da linha 90 acompanha.
- [ ] **S6 Chuveiro (P).** Os modelos típicos de aquecimento de água marcam
  `aquecedorAgua: true, conexao: 'direta'`. *Pronto:* escolher "Chuveiro" e trocar para "Tomada"
  gera o problema do §9.5.2.3 no veredito.
- [ ] **S7 e S8 Textos de DR e DPS (P).**
  - Corrigir os textos de DR.
  - Na lista de materiais e no quadro, o DPS segue o esquema de conexão (1 → só fase–PE/PEN;
    2/3 → com neutro–PE).
- [ ] **T1 Tabela 15 (P).** Reescrever a tabela explicativa conforme a norma.

### Fase 2 — Verificações e veredito (🟠/🟡)

- [ ] **V1 (M, depois da decisão 1).** Ajustar `obterK`, `curtoCircuito.js` e
  `LIMITACOES_FERRAMENTA`. *Pronto:* G2, G3 e G4 passam (ou, na alternativa, a pendência aparece
  por circuito).
- [ ] **V2 (P).** Veredito "ok" só se todas as verificações que o projeto tem dados para fazer
  foram feitas. Caso contrário, "conforme no que foi verificado", com a lista do que não foi.
- [ ] **V3 (P).** Status de capacidade de interrupção: conforme, não conforme ou especificar.
- [ ] **V4 (P).** O tipo do DR vai para a lista de materiais.
  - Avisar se for "AC" e houver carga com eletrônica de potência (ar inverter, cooktop de
    indução), por causa do §6.3.3.2.2/.3.
  - Ou então remover o seletor.
- [ ] **V5 (P).** Juntar as três condições do neutro reduzido num único bloco, com três caixas.

### Fase 3 — Dimensionamento padrão (🟡)

- [ ] **D1 (M, depois da decisão 2).** Mudar o padrão de agrupamento ou destacar a suposição.
  - Mostrar a seção "sem agrupamento" lado a lado.
  - *Pronto:* K1 passa (ou o aviso aparece fora de bloco recolhido).
- [ ] **D2 (P).** Aplicar a faixa de ≤ 6 m² ao tipo "Área externa/garagem". *Pronto:* B4 passa.
- [ ] **D3 (P).** Mostrar o número e a forma do grupo real do circuito.

### Fase 4 — Distribuidoras (🟡)

- [ ] **R1 (P).** Equatorial com `tabelaCumulativa`. *Pronto:* M1 passa.
- [ ] **R2 (M).** Conferir no PDF de cada distribuidora se a tabela de iluminação/tomadas é por
  faixa ou fator único, e registrar a linha do PDF em `fator-demanda-concessionarias.md`.
- [ ] **R3 (P).** Copel, quando o PDF for obtido.

### Fase 5 — Textos e explicações (🟡/⚪)

- [ ] T2 a T20, um commit por grupo de telas.
- **Pronto:** releitura de cada tela contra a tabela 1.5 e captura do antes e depois.

### Fase 6 — Novo relatório final (memorial PDF) · ver seção 4

- [ ] Componente próprio `pages/relatorio/` (não reaproveitar as seções de tela, que têm
  `<details>`, links "resolver em" e botões).
- [ ] CSS de impressão A4 com `@page`, cabeçalho e rodapé, "página X de Y", cabeçalho de tabela
  repetido e quebras de página controladas.
- [ ] Seções conforme o modelo: capa, sumário, dados de entrada, premissas, previsão de carga com
  a regra aplicada, circuitos e fases, uma ficha por circuito, alimentador, proteções,
  aterramento, locais especiais, unifilar em página própria, materiais, matriz de conformidade,
  pendências, checklists, referências e campo de assinatura e ART.
- [ ] Campos novos no projeto: cliente, endereço, responsável técnico, registro (CREA/CFT), nº da
  ART, revisão. Todos opcionais; sem eles a capa mostra "não informado".
- **Pronto:**
  - teste Playwright que gera o PDF da casa-modelo e confere que todas as seções existem, que
    nenhum `<details>` fica fechado e que o PDF tem número de página;
  - revisão visual pelo grupo.

### Fase 7 — Validação final

- [ ] `npm test` 0 divergências; `testes.mjs` 56/56; lint, build e e2e no CI.
- [ ] UAT com 2 ou 3 colegas (roteiro em `QA/referencias/casos-de-teste.md`).
- [ ] Comparação com um projeto real assinado por profissional (pendência antiga do
  `PENDENCIAS.md`).

### Ordem e prazo

A entrega da disciplina é em 08/12.

| Semana | O quê |
|---|---|
| 25 a 28/11 | Fase 0, Fase 1 e decisões 1 a 4 com o professor |
| 29/11 a 03/12 | Fases 2 a 5 |
| 01 a 06/12 | Fase 6 (relatório), em paralelo |
| 06 e 07/12 | Fase 7, publicação e congelamento para a entrega |

---

## 4. Modelo do novo relatório final (memorial técnico)

Protótipo visual com os números reais da casa-modelo: `docs/modelo-relatorio/modelo-memorial.html`.
Abra no navegador e use Imprimir → Salvar como PDF para ver o resultado em A4.

### 4.1 Princípios

- **Reproduzível:** todo dado de entrada aparece, e qualquer pessoa refaz a conta com o
  documento na mão.
- **Rastreável:** cada número tem a fórmula, os valores substituídos e a cláusula ou tabela de
  origem.
- **Honesto:** o que não foi verificado aparece na mesma página do resultado, não só num anexo.
- **Legível no papel:** A4 retrato, unifilar em página paisagem, tipografia serifada para o texto
  e monoespaçada para fórmulas, semáforo de cores que também funciona em impressão
  preto-e-branco (ícone e texto, não só cor).

### 4.2 Estrutura

| Nº | Seção | Conteúdo |
|---|---|---|
| — | Capa | Título, projeto, endereço, cliente, responsável técnico e registro, nº da ART, data, revisão, versão do Fio Certo, quadro-resumo (carga, demanda, disjuntor geral, alimentador, nº de circuitos, veredito) |
| — | Sumário | Seções e páginas |
| 1 | Objeto e escopo | O que o documento cobre; aviso de que não substitui projeto e ART; norma e edição |
| 2 | Dados de entrada | Fornecimento, tensões, esquema de aterramento, Icc trifásica e fase-neutro, ramal, isolação, temperatura, distribuidora; tabela de cômodos (área, perímetro, tipo, luminárias, tomadas, equipamentos); tabela de circuitos (comprimento, maneira de instalar, método, agrupamento) |
| 3 | Premissas e convenções | Resistividade, reatância, agrupamento suposto, k, demanda, linha de disjuntores e Icn, curva; cada uma com a justificativa |
| 4 | Previsão de carga | Por cômodo, com a regra escrita e substituída (ex.: "Sala, 18 m²: 100 + 3 × 60 = 280 VA, §9.5.2.1.2 b"); tomadas por perímetro; totais |
| 5 | Divisão em circuitos e fases | Critérios do §9.5.3; tabela de circuitos; correntes por fase (fasorial) e δ |
| 6 | Memória de cálculo por circuito | Uma ficha por circuito: Ib = S/U; In; Tabela 36 (coluna, valor); FCT × FCA; Iz; trilha de seções; ΔU% = (2·L·Ib·(R·cosφ + X·senφ)/U)·100 com os números; PE (Tabela 58); eletroduto (taxa); Icc no quadro e na ponta; I²t; Zs·Ia ≤ Uo; DR (motivo e cláusula); resultado por critério |
| 7 | Alimentador e proteção geral | Mesma ficha, mais neutro (corrente real), queda fasorial, piso da concessionária, demanda informativa |
| 8 | Proteções complementares | DR (por grupo e motivo), DPS (esquema, Uc, Up, In), capacidade de interrupção, aterramento, PEN, equipotencialização |
| 9 | Locais especiais | Banheiro: volumes, pontos marcados e conformidade; piscina e sauna quando houver |
| 10 | Diagrama unifilar e quadro | Página paisagem; legenda; numeração igual à do quadro |
| 11 | Lista de materiais | Cabos por função e cor, eletrodutos, dispositivos com especificação e norma de produto, pontos |
| 12 | Matriz de conformidade | Cláusula × requisito × resultado (✔ conforme · ✖ não conforme · ◐ não verificado, com o motivo) |
| 13 | Pendências e limitações | O que falta informar e o que a ferramenta não verifica |
| 14 | Verificação final em obra | Checklists do Cap. 7 e do quadro (advertência obrigatória) |
| 15 | Referências | NBR 5410:2004 (versão corrigida 2008), normas de produto, Creder, norma da distribuidora |
| — | Assinatura | Local, data, responsável técnico, registro, ART |

### 4.3 Requisitos técnicos de impressão

- `@page { size: A4; margin: 20mm 18mm 22mm; }`, com cabeçalho (projeto e revisão) e rodapé
  ("Fio Certo vX · página N de M") em margin boxes (Chrome/Edge recentes). Fallback: rodapé fixo
  sem total.
- `thead { display: table-header-group }` para repetir o cabeçalho; `break-inside: avoid` em
  fichas e figuras; `break-before: page` em cada seção principal.
- Nenhum `<details>`, botão ou link de navegação no relatório; o que é explicação fica sempre
  aberto.
- Unifilar em `@page paisagem { size: A4 landscape }`, escalado para caber.
- Fontes embutidas no site (não depender do sistema), contraste AA e tamanho mínimo de 9 pt nas
  tabelas.
