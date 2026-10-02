# Plano de trabalho — Fio Certo até 08/12/2026

Documento de planejamento consolidado (28/09/2026). Junta quatro coisas:

1. o que ainda falta da **NBR 5410 para residências**;
2. as **funcionalidades novas** do `FUTURO.md`, menos o assistente de IA;
3. **outras melhorias** que ainda não estavam em lugar nenhum;
4. o **redesenho de UI/UX**.

Tudo vem organizado num cronograma de sprints até a entrega.

> **Nomenclatura.** Este plano usa **Sprint 1…10** para não colidir com as duas numerações de "Fase" que já existem. Uma é a do histórico do QA: Fases 1-4 desta rodada, já entregues. A outra é a das "Notas de priorização" do `FUTURO.md`.

---

## 0. Ponto de partida

- **Motor de cálculo:** o harness dá **145 conformes · 0 divergências** (`node QA/scripts/verificar.mjs`, grupos G1-G23). A cobertura inclui:
  - previsão de carga;
  - divisão de circuitos;
  - condutores: Tabelas 36/37, métodos A1/A2/B1/B2/C/D, fatores das Tabelas 40/41/42/45 e Tabela 46;
  - queda de tensão cumulativa;
  - eletroduto;
  - curto-circuito no alimentador e nos terminais fase-neutro;
  - proteção geral: IDR 30 mA, DPS condicional, neutro vetorial, Tabela 48, PE pela Tabela 58;
  - banheiro (§9.1).
- **Escopo limpo nesta revisão:** os métodos E/F/G e o condutor de alumínio saíram do backlog. Foram para "fora do escopo do projeto" em `ESCOPO.md`. Não são lacunas: são não residenciais, e a própria norma restringe o alumínio à indústria e ao comércio (§6.2.3.8).
- **Também não se aplicam a residência** (auditoria de 28/09), e ficam fora de vez:
  - esquema IT/DSI e Tabela 26 (salas cirúrgicas, continuidade crítica);
  - §9.3 (compartimentos condutivos);
  - §5.1.5 e Tabelas 27/28 (pessoas BA4/BA5);
  - §5.6.4/§5.6.5 (elevadores, esteiras);
  - §6.5.2 (baterias fixas);
  - equipotencialização funcional e DPS de sinal, na parte de cálculo;
  - queda de 7% com transformador próprio;
  - Tabela 61.
- **Dívidas conhecidas, mantidas como decisão técnica** (não entram no cronograma):
  - Icc em circuito **fase-fase**: exige estudo de tipos de falta;
  - diâmetro do cabo EPR/XLPE: catálogo ambíguo;
  - Tabelas 43/44;
  - convenção de resistividade IEC 60228.

### Regra de trabalho (vale para todo item de cálculo abaixo)

A disciplina de QA do projeto continua valendo:

- Todo número normativo é **reconferido no `NBR-5410.pdf`** antes de entrar no código.
- Os números da auditoria abaixo foram extraídos do PDF por um agente e **precisam ser reconferidos**, em especial:
  - tempos da Tabela 25;
  - Tabela 59;
  - §6.4.4.1.1;
  - mínimos do §6.3.5.2.4.
- Todo número novo vai para `QA/referencias/valores-normativos.md` e ganha critério no harness (G24 em diante).
- O valor esperado é conferido rodando o motor, antes de ser fixado.
- **Nunca chutar dado:** sem entrada, o resultado é "não verificado".
- Documentação por último: `matriz-conformidade.md`, `casos-de-teste.md`, `QA/README.md`, `ESCOPO.md`, `FUTURO.md`.

---

## 1. O que falta da NBR 5410 para residências

Legenda: **C** = computável (vira cálculo) · **L** = só checklist (prática de instalação, vira lista de verificação na UI ou no memorial).
Esforço: P (≤1 dia) · M (2-4 dias) · G (>1 semana).

### 1.1 Cálculo — prioridade alta

| # | Cláusula | Requisito | Tipo | Esforço | Dados novos | Observação |
|---|---|---|---|---|---|---|
| N1 | §4.2.2.2 | **Esquema de aterramento** (TN-S / TN-C-S / TT) | C | P | 1 select | Pré-requisito de N2, N3 e N9. Hoje a ferramenta não coleta esse dado |
| N2 | §5.1.2.2.4.2 d, Tab. 25, §5.1.4.4 | **Seccionamento automático TN:** Zs·Ia ≤ Uo | C | M | Icc (já opcional) | Reaproveita `impedanciaLaco`/`propagarIccTerminal` e entra com o PE no laço (seção da Tab. 58). Ia vem da curva do disjuntor, ou é IΔn quando o DR faz o seccionamento (§6.3.3.2.8). Sem Icc: não verificado. Fecha o G4.9 |
| N3 | §5.1.2.2.4.3 b, Anexo C | **Seccionamento automático TT:** RA·IΔn ≤ UL | C | P | RA medida (opcional) | Mostra o **limite** de RA (com 30 mA: ≈1667 Ω na situação 1). Não inventa RA: a norma não fixa resistência de aterramento |
| N4 | §5.3.5.5.1 | **Capacidade de interrupção** do disjuntor ≥ Icc presumida no ponto | C | P | Icn (opcional) | Hoje não é verificada em lugar nenhum. Com a Icc declarada, mostra "Icn mínima = X kA" para o geral e para cada terminal |
| N5 | §6.4.4.1.1 / §6.4.4.1.2 | **Seção da equipotencialização:** principal ≥ ½ do maior PE (mín. 6 mm², limite 25 mm²); suplementar pela regra massa-massa/massa-elemento | C | P | nenhum | Só depende do PE que já é calculado. Complementa o G22 (banheiro) |
| N6 | §6.5.4.7, Tab. 59 | **Espaço de reserva no QD:** até 6 circ. → 2; 7-12 → 3; 13-30 → 4; >30 → 0,15·N | C | P | nenhum | Conta os espaços. Somar potência de reserva no alimentador só se o usuário declarar, porque a norma não dá VA |
| N7 | §6.3.5.2.4, §6.3.5.2.9 | **Especificação mínima do DPS:** Up ≤ cat. II (Tab. 31), In ≥ 5 kA/modo, Iimp ≥ 12,5 kA (Classe I); condutor DPS-PE ≥ 4 mm² (16 mm² com descarga direta), a+b ≤ 0,5 m | C | P | nenhum | Corrige a linha da matriz que diz "dados de produto": a norma dá mínimos numéricos |
| N8 | §9.5.2.2.1 b | **≥ 2 tomadas acima da bancada da pia** | C | P | nº de tomadas de bancada no cômodo de serviço | Hoje está `AUSENTE` na matriz |
| N9 | §6.4.3.4.1, §6.4.3.1.4 | PEN ≥ 10 mm² (TN-C-S); PE fora do conduto ≥ 2,5/4 mm² | C | P | esquema; "PE separado?" | O piso de 10 mm² do alimentador já atende o PEN; falta declarar |
| N10 | §5.3.4.1 b | I₂ ≤ 1,45·Iz explícito | C | P | nenhum | Hoje é implícito pela escolha do disjuntor. Vira um critério visível |
| N11 | §6.4.1.2.1, Tab. 52 | Condutor de aterramento enterrado: Cu 2,5 / 16 / 50 mm² | C | P | 2 declarações (proteção mecânica/corrosão) | |
| N12 | §6.5.1.2.1 Nota | Motor > 3,7 kW em partida direta → consultar a distribuidora | C | P | nenhum | Aviso automático a partir das TUE indutivas |

### 1.2 Cálculo — prioridade média

| # | Cláusula | Requisito | Tipo | Esforço | Observação |
|---|---|---|---|---|---|
| N13 | §6.3.3.2.6, §5.1.3.2.2 Nota 5, §6.3.6.3.2 | **DR por grupo de circuitos** e aviso de disparo intempestivo com DR único; seletividade (a montante ≥ 3×IΔn, tipo S) | C | M | "Devem" ser divididos para que a fuga normal não dispare. Fuga não é calculável, então entra como aviso mais a UI de agrupar circuitos sob DRs. Muda o modelo do IDR (hoje é único) |
| N14 | §9.2 | **Piscina:** SELV ≤ 12 V nos volumes 0/1, DR ≤ 30 mA no volume 2, equipotencialização suplementar, IPX8/X5/X2-X5 | C+L | M | Mesmo molde de `avaliarRequisitosBanheiro`, com um novo tipo de cômodo "piscina" |
| N15 | §9.4 | **Sauna:** IP24, sem tomada, dispositivos fora do local | L | P | Novo tipo de cômodo "sauna". É raro em residência |
| N16 | §6.3.4.3.2 a | Ia ≤ Ikmin no ponto mais distante | C | P | Formaliza o que `curtoCircuito.js` já compara |
| N17 | §6.2.11.1.6 b / §6.2.11.1.7 | Percurso do eletroduto: ≤ 15/30 m entre caixas, −3 m por curva, ≤ 3 curvas | C | M | Exige cadastrar trechos. É a lacuna de menor valor da lista |

### 1.3 Checklists (não é cálculo; vira seção da UI e do memorial)

- **Comissionamento, cap. 7:**
  - inspeção visual (§7.2, itens a-j);
  - continuidade do PE (§7.3.2: fonte 4-24 V, ≥ 0,2 A);
  - resistência de isolamento (Tab. 60: 500 V cc, ≥ 0,5 MΩ; SELV 250 V, ≥ 0,25 MΩ);
  - medição de RA (TT) e ensaio do DR (§7.3.5.2/§7.3.7).

  Com N2 implementado, a medição de Zs passa a ser dispensável por cálculo (§7.3.5.1 Nota 1).
- **Advertência obrigatória no QD residencial** (§6.5.4.10): texto fixo.
- **Cores de condutores** (§6.1.5.3), **tomadas com PE** (NBR 14136, §6.5.3.1), **sem unipolar no neutro** (§6.3.2.2), **PE nunca seccionado** (§5.6.2.2).
- **Eletrodo de aterramento** (§6.4.1.1, Tab. 51): fundação ou anel, proibido usar canalização de água. **Equipotencialização principal** (§6.4.2.1): BEP, lista a-i, plaqueta.
- **DPS a jusante do DR** (§6.3.5.2.6 b): DR com imunidade ≥ 3 kA 8/20 (tipo S).
- **Quedas/faltas de tensão** (§5.5.1) e **manutenção** (§8.3.2.2: reaperto em até 90 dias).
- **Banheiro:** tomada só no volume 3, SELV 12 V no volume 0 (§9.1.4.3, §9.1.3.1.1). Já está na UI como informativo; entra no checklist formal.

---

## 2. Funcionalidades novas (`FUTURO.md`, sem o assistente de IA)

| # | Funcionalidade | Esforço | Como fazer (sem dependência pesada, tudo client-side) |
|---|---|---|---|
| F1 | **Memorial técnico / impressão** | M | Página de memorial com `@media print` bem feito: cabeçalho com data, tipo, tensão e aviso de ART; `details` abertos; tabelas sem corte; checklists do §1.3. "Salvar como PDF" é o do próprio navegador, sem biblioteca. Reaproveita direto para o relatório técnico do projeto de extensão |
| F2 | **Salvar/carregar vários projetos** | M | Lista de projetos no `localStorage` (nome, data, versão do esquema); renomear/duplicar/excluir. Usa a nova chave versionada do `localStorage`; projetos anteriores ao redesenho não são migrados (decisão de 28/09) |
| F3 | **Exportar/importar projeto (JSON)** | P | `Blob` + `FileReader`. Serve de backup e de compartilhamento offline |
| F4 | **Compartilhar por link** | P | Estado comprimido no hash da URL (`CompressionStream` nativo). Sem backend |
| F5 | **Lista de materiais** | M | Metros de cabo por seção/cor (fase, neutro, PE) com folga declarável; eletroduto por diâmetro; disjuntores por In/polos/curva; IDR; DPS; tomadas/interruptores pelos pontos da previsão; espaço de reserva (N6). Tudo derivado do resultado; a folga é uma entrada, não um número inventado |
| F6 | **Diagrama unifilar automático** | M | SVG gerado dos circuitos: QD, geral, IDR/grupos (N13), DPS, cada circuito com disjuntor, seção e fase. Atende §6.1.8.1 ("projeto com unifilar") |
| F7 | **Quadro de distribuição** | P | Vista do QD com posições, fases, reservas (N6) e advertência (§6.5.4.10) |
| F8 | **Verificação de instalação existente** | M | O usuário informa a seção e o disjuntor que já tem, e a ferramenta verifica contra o mínimo, em vez de dimensionar. Reaproveita `avaliarTrilhaSecao` |
| F9 | **Upload de planta (manual)** | G | Imagem/PDF de fundo com cômodos marcados como retângulos. A área é calculada pela escala informada e o perímetro vem do retângulo. É o item mais caro; fica para o fim |
| F11 | **Banco de produtos comerciais** | M | Sugestões de especificação (disjuntor C 20 A 3 kA etc.), sem marca e **sem preço**. Com marca, só com catálogo citado |
| F12 | **Simulador de consumo** | P | kWh/mês a partir de potência × horas/dia **informadas**; tarifa informada pelo usuário |
| — | ~~Fator de demanda~~ | — | **Removido** por decisão de 28/09: sem concessionária definida, a ferramenta só soma as cargas diretamente |
| F14 | **Percurso do eletroduto** | M | É o N17 |
| F15 | **Reconhecimento automático de planta (experimental)** | G | Tentativa na Sprint 9, em cima do F9. Sem backend nem IA: detecção de paredes/retângulos por processamento de imagem no navegador, e o resultado entra como **sugestão editável** que o usuário confirma antes de virar cômodo. Pode não ficar confiável em plantas reais; se não ficar, o F9 manual continua valendo sozinho |
| — | ~~Estimativa de custo~~ | — | **Removida** por decisão de 28/09: nenhuma estimativa de preço no sistema |

---

## 3. Outras funcionalidades e melhorias (novas)

- **CI no GitHub Actions:** rodar `verificar.mjs`, `npm run build` e `npm run lint` em todo push; o harness já sai com código 1 em falha.
- **Testes E2E com Playwright:** o UAT no navegador está pendente desde a Fase 2 por falta de ferramenta. Automatizá-lo resolve isso de vez e cobre os roteiros manuais M1-M9 de `casos-de-teste.md`. Dependência só de desenvolvimento.
- **Casa-modelo / "Ver exemplo":** carrega um projeto completo pronto para quem chega pela primeira vez. Também serve de demo no seminário.
- **Presets de equipamentos:** chuveiro, forno, ar-condicionado etc. com potência **marcada como "típica — confira a placa"**; o usuário confirma.
- **Duplicar cômodo e desfazer** (toast com "Desfazer").
- **Comparar cenários:** o mesmo projeto em PVC × EPR, B1 × C ou com outra temperatura, lado a lado. Reaproveita o motor sem mudança.
- **Página "Conformidade":** versão pública da matriz de conformidade (o que é verificado, o que não é e por quê). Dá transparência e rende material para o seminário.
- **Glossário** (Ib, In, Iz, TUG, TUE, cosφ, FCT, FCA, Icc, DR, DPS) ligado aos termos na UI.
- **PWA / offline:** manifest + service worker simples. O cálculo já é todo client-side.
- **Versão do estado salvo:** trocar a chave do `localStorage` (`fio-certo:projeto` → `fio-certo:v2:...`) no redesenho. Projetos salvos antes dele recomeçam do zero (decisão de 28/09), sem migração, mas também sem risco de quebrar ao abrir.
- **Error boundary:** um erro de renderização mostra uma mensagem em vez de tela branca.

---

## 4. Redesenho de UI/UX

Auditoria de 28/09. O build compila, mas há problemas concretos de fluxo, de clareza do veredito e de acessibilidade. Nada disso mexe no motor em `calculations/`. Não entra dependência nova: popover, `<details>`, SVG inline e `confirm` são nativos.

### 4.1 Problemas mais graves

1. **Dependência circular no fluxo.** A queda de tensão das etapas Condutores e Queda de tensão depende do comprimento do ramal, que só é pedido em Proteção geral (`ProtecaoGeral.jsx:95`). Na primeira passada o usuário vê números que depois mudam.
2. **Sem veredito e sem distinção de gravidade.** "Não verificado" e "não conforme" usam o mesmo vermelho (`etiqueta-status alerta`, em `Resultado.jsx`, `QuedaDeTensao.jsx` e `Condutores.jsx`), o que gera fadiga de alarme. Falta uma cor de atenção (âmbar) e um veredito geral no topo do Resultado.
3. **O stepper não mostra progresso.** Ele não indica o que está pronto nem o que falta, e "Avançar" fica liberado até com zero cômodos (`StepperCalculadora.jsx`, `PrevisaoDeCarga.jsx:130`).
4. **Sem validação de formulário.** Negativos, vazios e cosφ fora de 0-1 passam sem aviso.
5. **Ações destrutivas sem confirmação.** "Começar novo projeto" apaga tudo (`Resultado.jsx:265`); remover cômodo ou equipamento não tem desfazer.
6. **Acessibilidade.** O foco é só uma borda de 1px (`index.css:533`, `outline: none`), o que falha WCAG 2.4.7. Há headings pulando nível e o foco não se move ao trocar de rota.
7. **Deploy no GitHub Pages pode quebrar.** Falta `base` no `vite.config.js` e `BrowserRouter` sem `basename`/`404.html`: os assets quebram e recarregar uma rota profunda dá 404.
8. **Densidade de texto normativo.** Há parágrafos inteiros antes de qualquer ação e `<details>` aninhados (`ProtecaoGeral.jsx:281` dentro de `:116`). A tabela de Condutores tem 11 colunas, inviável em 400px.

### 4.2 Novo fluxo (5 etapas, sem dependência circular)

1. **Instalação:** tipo, tensão, esquema de aterramento (N1), comprimento do ramal, Icc opcional (tudo que afeta todas as etapas seguintes).
2. **Cômodos:** previsão de carga, com cards recolhíveis, presets de equipamentos e "duplicar".
3. **Circuitos:** divisão, comprimento e método por circuito.
4. **Dimensionamento:** Condutores + Queda de tensão fundidos. Mostra 4 colunas-chave (circuito, disjuntor, seção, status) e os detalhes por circuito.
5. **Proteção e resultado:** geral, IDR/grupos, DPS, veredito, memorial, materiais e unifilar.

A etapa "Queda de tensão" hoje não tem nenhum campo, só repete Condutores; vira seção da etapa 4.

### 4.3 Design system

Tokens em `index.css`:

- **Tipografia:** `--fs-xs .75rem` · `--fs-sm .875rem` · `--fs-md 1rem` · `--fs-lg 1.25rem` · `--fs-xl 1.5rem` · `--fs-2xl clamp(1.8rem, 4.5vw, 2.6rem)`. Substitui os 13 tamanhos ad hoc de hoje.
- **Espaçamento** em escala de 4px (`--esp-1` … `--esp-8`), **raios** (`--raio-sm/md/pill`) e **sombra** (`--sombra-1`).
- **Cores de status:** `--cor-ok` (sucesso escurecido para #166534, ≈5,5:1), `--cor-atencao` (âmbar: claro #92400e/#fef3c7, escuro #fbbf24/#3a2a0a), `--cor-erro`, `--cor-info`.
- **Foco global:** `:focus-visible { outline: 2px solid var(--acento); outline-offset: 2px }`.
- Inputs com `font-size: 1rem`, para o iOS não dar zoom. Área de toque ≥ 44px.
- **Modo escuro:** redefinir só os tokens novos e eliminar a duplicação atual (`index.css:24-57`).
- Ícones em SVG inline: sol/lua/monitor no seletor de tema no lugar de emojis, e um raio no logo.

### 4.4 Componentes novos

| Componente | Função |
|---|---|
| `<StatusBadge tipo="ok\|atencao\|erro\|info">` | Ícone + texto. Conforme = ok · não verificado = atenção · sem seção viável = erro |
| `<CardVeredito>` | Topo do Resultado: estado geral, contadores com link para a etapa que resolve, destaques (geral, IDR, alimentador, carga) |
| `<StepperCalculadora>` com progresso | ✓ / ● / "falta X", derivado de um hook `useProgresso(projeto)`; `<nav aria-label="Etapas">`; no mobile vira "Etapa 2 de 5" com barra |
| `<RefNorma clausulas=[…]>` | Chip "NBR 5410 §6.2.5 ⓘ" que abre um `popover` nativo; substitui os parágrafos azuis de `referenciaNorma` |
| `<Termo sigla="Ib">` | `<abbr>` + definição curta; alimenta o glossário |
| `<Nota>` | Recolhível de uma linha ("Por que assim? ▸") para as justificativas longas |
| `Campo` estendido | Props `erro`, `unidade` (sufixo dentro do input), `id`; `aria-invalid`/`aria-describedby`; validação no `onBlur` |
| `.tabela-cartoes` | Abaixo de 640px, cada linha vira um card (`td::before { content: attr(data-label) }`) |

### 4.5 Navegação, Home e institucional

- **`Layout.jsx`:** scroll ao topo e foco no `h1` a cada rota; `document.title` por página; "Calculadora" ativo em todo `/calculadora/*`; menu fecha com Esc.
- **Deploy:** configuração padrão de GitHub Pages: `HashRouter`, `base: './'` e workflow oficial de deploy via Actions (decisão de 28/09).
- **Home:**
  - aviso de ART logo abaixo do hero;
  - "com base na NBR 5410" no lugar de "conforme a norma";
  - CTA "Continuar projeto (N cômodos)" quando há estado salvo;
  - "Ver exemplo";
  - "Como funciona" clicável.
- **Sobre:** escopo e limitações (o que não é verificado), glossário, equipe, link do repositório. Hoje são 2 parágrafos.

---

## 5. Cronograma

Hoje é 28/09; entrega em 08/12, pouco mais de 10 semanas. Cada sprint fecha com harness verde, build/lint limpos e documentação atualizada.

| Sprint | Datas | Conteúdo | Por que nesta ordem |
|---|---|---|---|
| **1 — Fundação** | 29/09-05/10 | Deploy padrão do GitHub Pages (HashRouter + `base: './'` + workflow de Actions), design system (§4.3), `StatusBadge` + âmbar, foco visível, scroll/título por rota, confirmações/desfazer, nova chave do `localStorage`, error boundary, Playwright com um teste de fumaça do fluxo, CI (harness + build + lint) | Tudo o mais é construído em cima; o CI protege as sprints seguintes |
| **2 — Fluxo** | 06/10-12/10 | Novo fluxo de 5 etapas (§4.2) com o ramal e a Icc na etapa 1; stepper com progresso; `Campo` com validação/unidade; cards recolhíveis; tabelas responsivas; `RefNorma`/`Nota` no lugar dos parágrafos | Mata a dependência circular antes de acrescentar campos novos |
| **3 — NBR bloco 1** | 13/10-19/10 | N1 esquema de aterramento, N4 capacidade de interrupção, N5 equipotencialização, N6 reserva Tab. 59, N7 DPS, N8 tomadas de bancada, N9, N10, N11, N12 | Itens P, quase sem dados novos, de maior retorno normativo |
| **4 — NBR bloco 2** | 20/10-26/10 | N2 seccionamento TN (Tab. 25), N3 seccionamento TT, N16 Ikmin, N13 DR por grupo + seletividade + aviso de fuga | Depende de N1; muda o modelo do IDR |
| **5 — Resultado e memorial** | 27/10-02/11 | `CardVeredito`, F1 memorial/impressão, checklists do §1.3 (comissionamento cap. 7, advertência do QD, aterramento, cores) | Primeiro entregável "apresentável"; alimenta o relatório técnico |
| **6 — Projetos** | 03/11-09/11 | F2 vários projetos, F3 JSON, F4 link, casa-modelo, Home/Sobre/glossário, página Conformidade | Usabilidade e material para o seminário |
| **7 — Materiais e unifilar** | 10/11-16/11 | F5 lista de materiais, F6 unifilar SVG, F7 vista do QD, F8 verificação de instalação existente | Derivam do resultado completo das sprints 3-4 |
| **8 — Locais e extras** | 17/11-23/11 | N14 piscina, N15 sauna, F12 consumo, F11 produtos (sem preço), presets, comparar cenários | Itens de menor prioridade normativa |
| **9 — Planta e polimento** | 24/11-30/11 | F9 upload de planta (manual), F15 reconhecimento automático (experimental), N17 percurso do eletroduto, PWA, passada de acessibilidade, testes E2E completos dos roteiros M1-M9 | Os itens mais caros e de menor valor ficam onde podem ser cortados |
| **10 — Congelamento** | 01/12-08/12 | Só correção de bug; UAT completo; relatório técnico (a partir do memorial F1 e da página Conformidade); roteiro e demo do seminário | Margem de entrega; nada novo entra |

### Andamento

- **Sprint 1: concluída em 28/09.** Deploy padrão do Pages (HashRouter + `base: './'` + `.github/workflows/publicar.yml`, que também roda harness, lint, build e Playwright); tokens de cor, tipografia e espaçamento com o modo escuro definido uma vez só (`light-dark()`); âmbar para "não verificado" separado do vermelho de "não conforme"; foco visível; topo, título e foco a cada rota; "Calculadora" ativo em todas as etapas; Esc fecha o menu; ícones SVG; confirmação nas 3 ações destrutivas; limite de erro; Playwright com 2 testes de fumaça (`npm run e2e`). O harness segue em 145/0.
  - **Adiado para a Sprint 2:** a troca da chave do `localStorage`. Só faz sentido quando o formato do estado mudar, o que acontece no novo fluxo; trocar agora apagaria projetos sem motivo.
  - **Acrescentado:** `.gitignore` na raiz excluindo o `NBR-5410.pdf`. É um exemplar licenciado ("uso exclusivo"), e não pode ir para um repositório público.
- **Sprint 2: concluída em 28/09.** Fluxo de 5 etapas (Instalação → Cômodos → Circuitos → Dimensionamento → Proteção e resultado): ramal, Icc, curva, DPS e condições do alimentador foram para a etapa 1, então nada muda depois; Condutores e Queda de tensão viraram Dimensionamento (tabela de 5 colunas + detalhes recolhíveis por circuito); Proteção geral virou seção do Resultado. Tipo de carga e cosφ saíram da tabela de condutores e foram para o cadastro do equipamento; o método de instalação por circuito foi para Circuitos. Stepper com ✓/"falta X"/erro (`useProgresso`) e, no celular, "Etapa N de 5" com barra; avançar bloqueado sem cômodo. `Campo` com `unidade`, `erro` (mostrado no onBlur), `aria-invalid`/`aria-describedby`; cards de cômodo recolhíveis; `.tabela-cartoes` abaixo de 640px; `RefNorma` (popover nativo) e `Nota` no lugar dos parágrafos. O cálculo do projeto passou a ser feito uma vez só, no contexto. Playwright com 3 testes. Harness segue em 145/0.
  - **Chave do `localStorage` mantida:** o formato do estado não mudou nesta sprint (só a tela onde cada campo aparece), então os projetos salvos continuam valendo. A troca fica para quando um campo mudar de significado.
- **Sprint 3: concluída em 28/09.** N1 (esquema de aterramento declarado), N4 (capacidade de interrupção mínima: geral pela Icc da origem, circuitos pela Icc no quadro), N5 (equipotencialização principal e suplementar), N6 (reserva Tab. 59), N7 (especificação do DPS: Up, Uc, In/Iimp, condutor DPS-PE), N8 (tomadas da bancada), N9 (PEN ≥ 10 mm² no TN-C-S; PE fora do conduto como conferência), N10 (I₂ ≤ 1,45·Iz explícito), N11 (condutor de aterramento, Tab. 52), N12 (aviso de motor > 3,7 kW). Tudo em `complementares.js` e na nova seção "Verificações complementares" do Resultado. Harness em **157/0** (G24 novo, 9 critérios).
  - **Defeitos corrigidos no curto-circuito (achados ao reler §6.3.4.3.2):** (1) o I²t dos circuitos terminais usava a Icc da ponta do circuito, a menor do trecho; a norma manda usar a máxima no ponto de instalação do disjuntor, o quadro. Caso real que passava como conforme e não é: TUG 2,5 mm² 16 A a 25 m, Icc no quadro 4,1 kA (G23.5). (2) O disparo instantâneo era o limite inferior da faixa magnética (C: 5×In), que na IEC 60898 é o ponto de não atuação; passou a ser o superior (C: 10×In) (G9.2, G9.5). Os dois erravam para o lado permissivo.
  - **Adiantado da Sprint 4:** N16 (Ia ≤ Ikmin) entrou como parte da correção — a Icc na ponta do circuito, que antes era usada no lugar errado, virou a Ikmin.
- **Sprint 4: concluída em 28/09.** N2 (TN: Zs·Ia ≤ Uo no ponto mais distante, volta pelo PEN no TN-C-S ou PE no TN-S; atende pelo DR de 30 mA ou pelo disjuntor; alimentador só pelo disjuntor), N3 (TT: RA·IΔn ≤ UL, UL 25 V com banheiro; RA opcional na etapa de Instalação), N13 (DR único com aviso de disparo intempestivo, ou um DR de 30 mA por grupo escolhido na etapa de Circuitos, com DR tipo S de 100/300 mA opcional a montante e seletividade). Tudo em `seccionamento.js`. O aviso fixo "seccionamento não verificado em nenhum ponto" saiu; agora só aparece sem esquema declarado. Harness em **165/0** (G25 novo, 8 critérios); Playwright com 4 testes.
  - **Decisão de engenharia (não é cláusula):** corrente nominal do DR de grupo ≥ min(ΣIn dos disjuntores do grupo, In do geral). A norma só exige que o DR seja protegido contra sobrecorrente (§6.3.6.2.2).
  - **Teste instável corrigido:** o teste de fluxo às vezes falhava porque o stepper aparece em todas as etapas e a asserção passava ainda na etapa anterior. Agora espera o título da página; 8 execuções seguidas sem falha.
- **Sprint 5: concluída em 29/09.** `CardVeredito` no topo do Resultado (vermelho = não conforme, âmbar = falta dado, verde = tudo verificado), com cada item ligado à etapa que resolve e os números principais; o veredito vem de `veredito.js`, puro e testado. Listas de verificação do §1.3 (`checklists.js`): comissionamento do cap. 7, quadro (advertência integral da §6.5.4.10), condutores e tomadas, aterramento e BEP, banheiro e uso/manutenção — com itens condicionais ao esquema, ao banheiro e aos DRs. F1: página Memorial (`#/calculadora/memorial`) com cabeçalho (data, instalação, esquema, aviso de ART), veredito, proteção, verificações, tabelas e listas abertas; ao imprimir, todo `<details>` abre e o tema é forçado para claro. Harness em **169/0** (G26, 4 critérios); Playwright com 5 testes.
- **Sprint 6: concluída em 29/09.** F2: página "Meus projetos" (`#/projetos`), com vários projetos salvos em `fio-certo:v2:projetos` (novo, renomear, duplicar, abrir, excluir com confirmação); o nome do projeto aberto aparece em todas as etapas, e "Começar novo projeto" no Resultado não apaga mais nada. F3: exportar e importar arquivo JSON (`fio-certo/projeto`, versão 1). F4: link com o projeto comprimido no hash (`#/abrir?p=…`, `CompressionStream` deflate-raw), que abre como projeto novo depois de confirmar. Arquivo, link e armazenamento passam por `normalizarProjeto`: chave desconhecida é descartada e campo de tipo errado volta ao padrão. Casa-modelo ("Ver exemplo"): 2 quartos, bifásica 127/220 V, TN-C-S, DR por grupo, com veredito verde. Home: aviso de ART, "com base na NBR 5410", "Continuar projeto (N cômodos)", "Ver exemplo" e etapas clicáveis. Sobre: escopo e limitações e glossário de 21 termos (`<Termo>` com a definição no `title`, usado no Dimensionamento). Página Conformidade (`#/conformidade`), versão pública da matriz. Harness em **172/0** (G27, 3 critérios); Playwright com 11 testes.
  - **Migração em vez de recomeçar:** o projeto salvo na chave antiga vira "Meu projeto" na lista nova. Era trivial, porque o formato do projeto não mudou, só passou a ficar dentro de uma lista.
  - **Corrigido:** a carga prevista aparecia com casas decimais soltas ("12136.470588235294 VA") quando havia carga indutiva; os totais de VA agora são arredondados na tela, e o cálculo continua sem arredondar.
  - **Não feito:** a seção "Equipe" e o link do repositório no Sobre. Faltam os nomes, e o repositório ainda não existe.
- **Sprint 7: concluída em 29/09.** F5: lista de materiais (`materiais.js`), com cabos por função e seção e a cor do §6.1.5.3 (TN-C-S: PEN no alimentador, sem PE separado; fase-fase sem neutro), eletrodutos por diâmetro, disjuntores por In/polos/curva com a Icn mínima, DRs, DPS no esquema de conexão 2 (§6.3.5.2.3 a), reserva, largura do quadro em módulos e pontos de tomada/luz. A folga é campo do usuário (padrão: nenhuma). F6: diagrama unifilar em SVG (`DiagramaUnifilar`). F7: vista do quadro (`VistaQuadro`/`quadro.js`) com o trilho, a reserva e a identificação dos circuitos (§6.1.5.4); os circuitos são numerados C1…Cn na ordem do trilho, iguais no unifilar, no quadro e na lista. F8: instalação existente, com seção e disjuntor instalados por circuito na etapa de Dimensionamento (`existente.js`), conferidos por seção mínima, Ib ≤ In ≤ Iz, I₂, queda e curto; o que não atende entra no veredito. Unifilar, quadro e materiais também saem no Memorial. Harness em **177/0** (G28, 5 critérios; os metros da casa-modelo foram conferidos à mão); Playwright com 13 testes.
  - **Limites declarados (Sprint 7):** o eletroduto é contado um por circuito (trechos compartilhados na obra usam menos metros, mas o diâmetro precisa ser recalculado); os módulos DIN são 1 por polo (DR e DPS variam por fabricante); na instalação existente, seccionamento e PE não são reavaliados.
- **Sprint 8: concluída em 29/09.** N14: piscina marcada num cômodo externo (volumes 0-2 com IP mínimo, SELV 12 V nos volumes 0 e 1, DR ≤ 30 mA no volume 2, equipotencialização suplementar, lista "Piscina"). N15: tipo de cômodo "sauna" com mínimo de 0 tomadas (§9.4.4.3.2 prevalece sobre o §9.5.2.2.1); tomada informada é não conformidade, e o aquecedor gera o aviso de cabo para 170 °C no volume 3, que a ferramenta não dimensiona; lista "Sauna". Presets: 12 equipamentos com potência "típica — confira a placa"; o aparelho de 220 V fica fase-fase só em 127/220 V. F11: especificação de compra na lista de materiais (norma de produto do cabo, Icn na próxima padronizada da NBR NM 60898, DR tipo A com a justificativa do §6.3.3.2.2, DPS classe II), sem marca e sem preço. F12: simulador de consumo (`#/calculadora/consumo`) com horas, dias e tarifa informados. Comparar cenários (`#/calculadora/comparar`): isolação, método ou temperatura trocados, com o motor completo rodando de novo. Harness em **182/0** (G29, 5 critérios); Playwright com 16 testes.
  - **Observação da comparação (Sprint 8):** com EPR, o alimentador da casa-modelo cai de 16 para 10 mm² e consome mais dos 5% de queda, então a iluminação e as TUG engrossam (com o método C, o chuveiro afina). É o orçamento cumulativo do §6.2.7.1 funcionando; a página explica isso numa nota.
- **Sprint 9: concluída em 29/09.** N17: percurso do eletroduto por circuito (`percurso.js`): trechos de caixa a caixa com comprimento, curvas e área externa; limite de 15/30 m − 3 m por curva, máximo de 3 curvas, e a alternativa da NOTA (+1 tamanho a cada 6 m ou fração) calculada sobre o eletroduto do circuito. Trecho fora do limite entra no veredito. F9: página "Cômodos a partir da planta" (`#/calculadora/planta`), com imagem de fundo, escala por dois pontos de cota conhecida e retângulos desenhados que viram cômodos com área e perímetro. F15 (experimental): detecção automática no navegador (`planta/detectar.js`): parede escura engrossada até fechar os vãos de porta, regiões fechadas viram retângulos sugeridos, e cada sugestão só vira cômodo depois de aceita. PWA: `manifest.webmanifest`, ícone próprio (o favicon ainda era o do Vite) e service worker (páginas pela rede, com cache offline; arquivos com hash pelo cache); o teste abre o site sem internet. Acessibilidade: auditoria automática em 13 telas (nome acessível, títulos sem pulo, ids únicos, `aria-describedby` válido), que também confere que ela própria acusa problemas plantados. Roteiros M1–M7 e M9 automatizados. Harness em **188/0** (G30, 4 critérios; G31, 2); Playwright com 25 testes.
  - **Defeito achado pelo M7 e corrigido:** um projeto salvo sem data derrubava a página Projetos. O carregamento agora confere id, nome e datas de cada registro.
  - **Limites declarados (Sprint 9):** a planta aceita imagem e PDF (pdf.js, baixado só quando um PDF é aberto; escolhe-se a página). O desenho é por mouse ou toque, e para teclado a alternativa é a etapa de Cômodos. A imagem não é salva no projeto. A detecção automática é experimental e só sugere retângulos. O percurso cobre os circuitos e o alimentador (G30.5).
- **Sprint 10 (congelamento): parte da ferramenta concluída em 29/09.** Só correções, nada novo:
  - `normalizarProjeto` passou a validar campo a campo o que vem de arquivo, link ou armazenamento: opções inexistentes (inclusive nomes do protótipo, como "toString"), mapas com valores do tipo errado e datas inválidas. Antes, um arquivo com um método de instalação inexistente derrubava o cálculo (G27.4).
  - Os campos `curtoCircuitoVerificado` e `avisoCurtoCircuito` do resultado completo ficavam desatualizados; agora refletem a verificação feita.
  - Rascunhos de `docs/relatorio-tecnico.md` (números da casa-modelo tirados do motor) e `docs/roteiro-seminario.md` (15 minutos, com demonstração e plano B).
  - Harness em **190/0**; Playwright com 26 testes.
  - **Falta, e depende da equipe:** UAT com pessoas, M8 (projeto real), completar o relatório (equipe, links) e ensaiar o seminário — ver `PENDENCIAS.md`.

- **Lacunas de cálculo: concluída em 29/09** (depois da Sprint 10, a pedido). Planta aceita PDF (pdf.js, só quando um PDF é aberto) e o percurso cobre o alimentador (G30.5). Curto-circuito nos circuitos fase-fase (`propagarIccFaseFase`): a Icc informada é tomada como a trifásica (Xs = Uo/Icc por fase); laço por 2 fases a √3·Uo; I²t e capacidade de interrupção com a maior entre a Icc entre fases e a fase-neutro no quadro, Ikmin com a entre fases na ponta (G23.2, G23.7). Na casa-modelo, o ar-condicionado e o chuveiro passaram a verificados e conformes, e a Icn dos disjuntores dos circuitos subiu de 2,1 para 2,9 kA (padronizada continua 3 kA). Eletroduto com cabo EPR/XLPE: diâmetros do cabo HEPR 0,6/1 kV (página do produto Corfio, transcrição conferida pela soma das espessuras) (G7.4). Harness em **192/0**; Playwright com 26 testes.

- **Tudo o que dava no código: concluída em 29/09.** Instalação existente com o PE conferido pela Tabela 58 e o seccionamento refeito com o que está instalado (G28.6). Campo opcional de Icc fase-neutro: vale nos laços fase-neutro e fase-PE; o curto entre fases continua da trifásica, e o disjuntor geral usa a maior (G23.8). Testes de navegador também em Firefox e WebKit (Safari), no CI inclusive; o teste offline do PWA é pulado só no WebKit, que não serve pelo service worker com a rede desligada. Achados pelos navegadores novos: na planta, um arraste rápido podia perder o retângulo (o fim vinha do último movimento, agora vem do soltar); dois testes dependiam de tempo (localizador ambíguo no DR por grupo, gravação no armazenamento antes de recarregar no M7). Diâmetros do cabo PVC reconferidos na página atual da Corfio (os 12 batem). Referências em `QA/referencias/fontes-externas.md` e na seção 8 do relatório. `FUTURO.md` atualizado. Lint sem advertências (o hook `useProjeto` saiu para `context/useProjeto.js`). Harness em **194/0**; Playwright com 26 testes × 3 navegadores (77 passam, 1 pulado).

- **Fator de demanda por distribuidora: concluída em 29/09** (decisão 6 revista). Campo opcional de distribuidora (9 principais: Cemig, Celesc, CPFL, Enel, Equatorial, Light, Neoenergia, EDP SP, EDP ES) na etapa de Instalação; mostra a demanda de iluminação/tomadas que a norma dela calcularia, ao lado (não em troca) do dimensionamento por NBR 5410. 3 das 9 (CPFL, EDP SP, Neoenergia) têm a tabela idêntica entre si — achado citado nas três, com suspeita de origem comum na NBR 10676:2011, não confirmada (a edição de 1999 obtida não tem essa tabela). Piso de Icn do disjuntor geral onde a distribuidora publica (Cemig). Copel e Energisa bloquearam o download desta rede — falta o usuário baixar os PDFs. Fonte de cada tabela, com número de linha do PDF oficial, em `QA/referencias/fator-demanda-concessionarias.md`. Harness em **202/0**; Playwright com 27 testes × 3 navegadores.

- **Entregáveis para conferência: concluída em 30/09.** Relatório técnico e memorial da casa-modelo exportados em PDF (Playwright headless, já que pandoc não está disponível neste ambiente — conversor markdown→HTML próprio em vez de instalar uma biblioteca nova), enviados para o usuário conferir o formato antes da entrega. Slides do seminário (8, conforme o roteiro) montados como Artifact a partir da casa-modelo e do roteiro existentes. Título e ano das 5 normas de produto citadas no relatório (NM 60898, NM 247-3, 7286, 7287, 15465) conferidos por busca externa — não contra o texto pago da norma, ver ressalva em `fontes-externas.md`.

- **Volumes do banheiro pela planta (N19): concluída em 30/09.** Página `#/calculadora/banheiro`, aberta a partir de cada cômodo tipo banheiro em Cômodos: marca a caixa do chuveiro/banheira (largura × profundidade, 0×0 = chuveiro sem piso-boxe, Figura 18) e os pontos elétricos (tomada, interruptor, luminária, aquecedor, outro), cada um com posição e altura — na planta (imagem/PDF, com escala) ou direto em metros, sem precisar de imagem nenhuma. `classificarVolume` (locaisEspeciais.js) calcula a distância horizontal ponto-caixa (fórmula que já dá a distância ponto-ponto quando a caixa é 0×0, sem caso especial) e classifica no volume 0-3 ou fora, aplicando §9.1.4.3.1 (proibição nos volumes 0-2), §9.1.4.3.2 (tomada no volume 3) e §9.1.4.4 (classe de equipamento por volume) por tipo de ponto. Simplificação conservadora documentada: a faixa entre 2,25 e 3 m de altura acima do volume 1 (a "tampa" das Figuras 16-18, não reproduzível em texto) entra no volume 2, a leitura mais restritiva. Resultado integrado a `locaisEspeciais` (pontosPorComodo/pontosNaoConformes), ao veredito, ao checklist do Memorial e à Proteção Geral — sem geometria marcada, nada muda (regressão travada em G33.8). Harness em **211/0** (G33, 9 critérios); Playwright com 28 testes × 3 navegadores.

**Onde cortar se atrasar,** do primeiro ao último candidato: F15, F9, N17, F11, PWA, N15. Os itens das Sprints 1-5 são o núcleo e não devem ser cortados.

---

## 6. Decisões

Tomadas em 28/09/2026:

1. **Reconhecimento automático de planta:** tentar na Sprint 9 (F15), experimental, em cima do upload manual (F9).
2. **Preço:** nenhuma estimativa de preço no sistema. F10 foi removida; F11 sugere só especificação.
3. **Hospedagem:** configuração padrão de GitHub Pages para app Vite/React:
   - `HashRouter` (URLs com `#/`, o único roteamento que funciona no Pages sem truque de `404.html`);
   - `base: './'` no `vite.config.js` (funciona com qualquer nome de repositório);
   - workflow oficial de deploy do Pages via GitHub Actions.
5. **Projetos salvos antes do redesenho:** recomeçam do zero. Troca da chave do `localStorage`, sem migração.

4. **Playwright:** aceito, como dependência só de desenvolvimento. Adiantado para a Sprint 1, para que o redesenho seja testado num navegador de verdade desde o começo.
6. **Concessionária:** ~~não entra~~ **revista em 29/09: entra.** Campo de distribuidora na etapa de Instalação, começando pelas principais (grupos com norma única). Cada valor (fator de demanda, tensão, categoria de atendimento) é transcrito do PDF oficial da norma da distribuidora, com código, revisão e página, e vira critério do harness. A Icc de referência da distribuidora, quando houver, vale só para a capacidade de interrupção; o seccionamento e o Ikmin continuam pedindo a Icc do ponto. Sem distribuidora escolhida, a ferramenta segue somando as cargas (fator 1).
7. **Repositório GitHub:** será criado depois pelo usuário. A configuração de deploy e o workflow de CI ficam prontos, e passam a rodar quando o projeto for publicado.
8. **Cabo de 170 °C da sauna (29/09):** fica só o aviso. A NBR 5410 não tabela a capacidade dessa isolação, e não entra campo para dado de fabricante.
