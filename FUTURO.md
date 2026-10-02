# Futuro do Projeto — Backlog e Ideias

Este arquivo reúne o que decidimos **não** fazer na v1 e outras funcionalidades úteis para versões futuras. Nada aqui está confirmado — é material para priorizar conforme o projeto evoluir (e conforme o tempo disponível até 08/12/2026 permitir).

## Simplificações assumidas na implementação da v1

O motor de cálculo (`frontend/src/calculations/`) já cobre as 4 etapas do escopo de ponta a ponta, mas com estas simplificações conscientes — refinar antes de tratar o resultado como memorial de cálculo definitivo:

- **Condutores:** considera os métodos de instalação A1/A2 (fios/cabo multipolar em eletroduto embutido em parede termicamente isolante), B1/B2 (idem, alvenaria comum), C (cabo direto na parede/teto, sem eletroduto) e D (cabo em eletroduto enterrado) — os seis métodos de referência aplicáveis a instalação residencial brasileira, escolhidos por circuito (e para o alimentador); cobre, isolação PVC (Tabela 36) ou EPR/XLPE (Tabela 37), escolha de projeto. A ampacidade é corrigida pela Tabela 40 (temperatura, nas 4 colunas ar/solo × PVC/EPR/XLPE, todas as faixas tabeladas — 10-60°C para PVC, 10-80°C para EPR/XLPE), pela Tabela 41 (resistividade térmica do solo, só método D) e pela Tabela 42/45 (agrupamento: referência 1 para A1/A2/B1/B2, referência 2 para C, Tabela 45 para D — sempre pelo espaçamento mais severo entre eletrodutos, já que a ferramenta não modela essa distância). Por padrão, temperatura = 30°C (ar) ou 20°C (solo) e nº de circuitos agrupados = total de circuitos gerados pela ferramenta (pior caso razoável); campos avançados opcionais permitem ajustar. Métodos E/F/G (bandeja/leito/espaçados — Tabelas 38-39) ficam fora — instalação industrial. Condutor de alumínio fica fora não por escolha, mas porque a própria norma (§6.2.3.7/§6.2.3.8) só o admite em estabelecimentos industriais/comerciais, nunca em habitação. A seção final é escolhida considerando ampacidade corrigida **e** queda de tensão juntas (a queda também depende da isolação: EPR/XLPE opera 20°C mais quente que PVC, mais resistência na mesma seção/corrente).
- **Fator de potência:** iluminação e TUG são tratadas como carga resistiva (cosφ = 1) — só os equipamentos de uso específico (TUE) têm cosφ e tipo de carga (resistiva/indutiva/capacitiva) editáveis. Não há correção de fator de potência (banco de capacitores), pouco relevante em escala residencial.
- **Queda de tensão:** fórmula com resistência (na temperatura de operação do condutor, 70°C) e reatância por seção (0,10-0,16 Ω/km conforme a bitola — catálogo técnico do fabricante Cordeiro, Tabela 8; a NBR 5410 não tabela reatância, o texto completo da norma não usa essa palavra). O orçamento é cumulativo entre alimentador e circuito terminal: o circuito terminal nunca pode passar de 4% (§6.2.7.2) sozinho, mas o que sobra do total de 5% a partir do ponto de entrega (§6.2.7.1 c, caso de entrega em tensão secundária — o único modelado; 7% de transformador/gerador próprio não se aplica) pode ser menor que isso, dependendo do que o alimentador já consumiu.
- **Divisão de circuitos:** First-Fit Decreasing (empacota cômodos por VA decrescente em qualquer circuito já aberto que tenha espaço, não só na ordem de cadastro) — heurística clássica de bin-packing, cota de qualidade conhecida (~11/9 do ótimo + 1 circuito), tende a usar menos circuitos e distribuí-los de forma mais equilibrada que empacotar na ordem de cadastro (conferido em `verificar.mjs`, G13.1). Não é uma busca exata do número mínimo de circuitos (isso teria risco de explosão combinatória sem um ganho claramente necessário aqui).
- **Balanceamento de fases:** busca exata (programação dinâmica) — encontra o desequilíbrio mínimo verdadeiro entre fases, não só uma aproximação (conferido por força bruta em `verificar.mjs`, G10.1). Não há mais um teto por NÚMERO de circuitos (o antigo limite de 24 foi removido — o custo por circuito processado é independente de quantos existem, graças a uma representação de estado por parent-pointer); só se o espaço de estados de busca ficar grande demais (entradas muito heterogêneas, sem VAs repetidos) é que cai de volta no guloso (cada circuito vai para a fase menos carregada até o momento) — ainda um resultado bom na prática, só não garantidamente ótimo (G10.2/G10.3 cobrem os dois casos).
- **IDs de circuito** são derivados do CONJUNTO de cômodos que caem em cada circuito (não mais da posição de saída do agrupamento) — reordenar/remover um cômodo só muda o ID de um circuito cuja composição realmente mudou; um circuito cuja composição não mudou mantém o mesmo ID, e um comprimento/método já digitado continua válido (G12 em `verificar.mjs`). Efeito colateral de quando essa mudança foi implantada: projetos salvos no `localStorage` antes dela tiveram os comprimentos/métodos de circuitos de iluminação/TUG reiniciados na primeira abertura seguinte (os IDs antigos, posicionais, não batem mais com os novos) — evita associação errada, não é um bug.
- **Proteção geral (disjuntor geral, IDR, DPS) e alimentador:** a corrente de entrada é calculada por soma vetorial das correntes de cada fase — soma P/Q por circuito (considerando cosφ), não só a soma escalar de VA, com os ângulos de 120° entre fases (conferido em `verificar.mjs`, G14). A mesma conta dá a corrente real do condutor NEUTRO (nunca calculada antes — só a seção vinha de tabela), verificada contra a ampacidade do condutor adotado sempre, não só quando reduzido pela Tabela 48 (a hipótese de que o neutro nunca excede a maior corrente de fase é falsa quando cargas de fases diferentes têm fator de potência de sinal oposto — G14.5). O DR de 30 mA pode ser único ou um por grupo de circuitos (Sprint 4), com DR tipo S opcional a montante. DPS: Classe II sempre recomendada como boa prática; a exigência NORMATIVA (§5.4.2.1.1 — alimentação aérea + região de alto índice de descargas atmosféricas) e a Classe I (§6.3.5.2.1 b — exposição a descarga direta) dependem de 3 declarações opcionais do usuário sobre a instalação real (mapa isocerâunico, presença de SPDA) — sem embutir a Tabela 15 completa (mapeamento geográfico de todo o Brasil, fora de escopo). Seção do neutro do alimentador é igual à da fase por padrão; reduz pela Tabela 48 (§6.2.6.2.6) só quando a fase passa de 25 mm² **e** o usuário declara explicitamente que as 3 condições da norma valem (circuito presumivelmente equilibrado, 3ª harmônica ≤15%, neutro protegido contra sobrecorrente) — são julgamentos sobre o uso real que só quem vai operar a instalação pode fazer, nunca inferidos automaticamente. A seção mínima NORMATIVA do alimentador é 2,5 mm² (§6.2.6.1.1, cabo isolado); por padrão a ferramenta eleva para 10 mm² como piso PRÁTICO (exigência típica de concessionária, não da NBR 5410 — os dois são mostrados separadamente).
- **Curto-circuito e seccionamento automático (§6.2.6.1.2 c e d):** dependem da corrente de curto-circuito presumida no ponto (estudo/laudo da concessionária), dado que um usuário residencial autônomo normalmente não tem. O curto-circuito do **alimentador** tem verificação real e opcional: se o usuário informar a Icc presumida e a curva do disjuntor geral (B/C/D), a ferramenta calcula I²t≤k²S² (Tabela 30, com o fator k conforme a isolação — PVC ou EPR/XLPE) de verdade; sem esse dado, continua "não verificado" — nunca um valor chutado, já que a Icc varia em ordens de grandeza conforme a rede real e não existe um "padrão" seguro para assumir. Os circuitos **terminais** ligados fase-neutro também ganharam verificação real: a NBR 5410 (§5.3.5.1) permite explicitamente determinar a Icc presumida num ponto "por cálculo ou por medição", então a ferramenta propaga a Icc já declarada no alimentador por uma cadeia de impedância (resistência/reatância por seção, já usadas na queda de tensão, mais a impedância da fonte a montante — tratada como puramente reativa, convenção usual de estudo de curto-circuito em BT) até cada circuito terminal, sem exigir uma nova declaração do usuário por circuito. Circuitos ligados **fase-fase** (29/09) usam o laço entre duas fases, com o valor informado tomado como a Icc trifásica (a norma não traz a conversão entre tipos de falta). O **seccionamento automático** foi implementado na Sprint 4 (28/09): com o esquema de aterramento declarado, TN por Zs·Ia ≤ Uo e TT por RA·IΔn ≤ UL; sem esquema (ou, no TN, sem Icc), continua "não verificado".
- **Dimensionamento de eletroduto (§6.2.11.1.6):** taxa de ocupação (53%/31%/40%) calculada a partir dos condutores de cada circuito (fase(s) + neutro, quando houver + terra) e do alimentador — inclusive para o método D (é a própria definição do método: cabo *em eletroduto* enterrado), diferente do método C, que não usa eletroduto. Os diâmetros de cabo e de eletroduto usados são valores comerciais típicos de catálogo (Corfio/NBR NM 247-3 para o cabo PVC; equivalência de mercado para o eletroduto de PVC rígido, NBR 15465) — a própria NBR 5410 não tabela essas dimensões de produto, só a taxa de ocupação em si. EPR/XLPE (29/09): cabo HEPR 0,6/1 kV, diâmetros da página do produto Corfio. O percurso físico (comprimento entre caixas, curvas — §6.2.11.1.6 b e §6.2.11.1.7) é verificado desde a Sprint 9, nos circuitos e no alimentador.
- **Locais especiais — banheiro/chuveiro (§9.1):** quando o projeto tem cômodo cadastrado como banheiro (`TIPOS_COMODO.banheiro`, já usado desde a previsão de carga), a ferramenta presume que o local contém banheira/chuveiro (§9.1.1) — simplificação conservadora que nunca perde um requisito real, no pior caso mostra o checklist a mais para um lavabo sem box. Declara a equipotencialização suplementar como exigida (§9.1.3.1.2, sem condição de dispensa no texto da norma) e confirma que o DR geral — já único e fixo em 30 mA por padrão desta ferramenta — satisfaz a exigência ampla de DR ≤30mA para os circuitos do local (§5.1.3.2.2 a), mais rigorosa que o mínimo normativo. **Geometria real dos volumes (N19, 30/09/2026):** marcando a caixa do chuveiro/banheira e os pontos elétricos na planta (imagem/PDF) ou direto em metros (link "Marcar chuveiro e pontos na planta", em cada banheiro cadastrado), a ferramenta classifica cada ponto no volume 0-3 pela distância horizontal até a caixa (0×0 = chuveiro sem piso-boxe, Figura 18) e pela altura, e aplica de verdade a proibição de dispositivo por volume (§9.1.4.3.1/.2) e a classe de equipamento por volume (§9.1.4.4). Simplificação conservadora documentada: a faixa entre 2,25 e 3m de altura acima do volume 1 (a "tampa" das Figuras 16-18, que não dá pra reproduzir por texto) entra no volume 2, a leitura mais restritiva. Sem essa marcação — o caso comum — continua o checklist informativo dos volumes 0-3 e do IP mínimo de cada um (§9.1.2.1/§9.1.4.1), para conferência manual do projeto físico.

## Implementado depois da v1 (Sprints 1-10 e fase de lacunas, até 30/09/2026)

Estava nesta lista e já existe — ver `PLANO.md`, seção Andamento: DR por grupo de circuitos,
banheiro/piscina/sauna, percurso do eletroduto (circuitos e alimentador), lista de materiais,
diagrama unifilar e vista do quadro, conferência de instalação existente (com PE e seccionamento),
curto-circuito fase-fase, eletroduto com cabo EPR/XLPE, planta em imagem ou PDF com detecção
automática experimental, memorial para imprimir/PDF, vários projetos salvos, arquivo e link de
compartilhamento, especificação de compra sem preço, simulador de consumo, comparação de cenários,
glossário e conteúdo explicativo, PWA offline e auditoria de acessibilidade, fator de demanda por
distribuidora, volumes do banheiro pela planta (geometria real, não só checklist). Testes de
navegador em Chrome, Firefox e Safari (WebKit).

## Ainda não feito — cálculo/norma

- **Tabela 15 completa (regiões → AQ2/AQ3)** — hoje a exigência de DPS depende de autodeclaração; o
  mapeamento por município é projeto de dado geográfico, não elétrico
- **Disparo abaixo do instantâneo garantido (Ikmin)** — exigiria a curva tempo-corrente do
  fabricante de cada disjuntor
- **Cabo de 170 °C da sauna** — fica só o aviso (decisão de 29/09); a norma não tabela essa isolação
- **Seção acima de 120 mm²** no eletroduto — os catálogos usados vão até 120 mm²

## Ainda não feito — produto

- **Seção Equipe e link do repositório** na página Sobre — faltam os nomes e o repositório
- **Histórico de versões** de um projeto salvo
- **Planta salva no projeto** — hoje a imagem fica só na memória da tela, por privacidade e tamanho

## Fator de demanda por distribuidora (N18, 29/09/2026) — o que ficou e o que falta

Implementado: campo opcional de distribuidora (9 das principais do Brasil) na etapa de Instalação,
com a demanda de **iluminação e tomadas** que a norma dela calcularia, mostrada ao lado do
dimensionamento por NBR 5410 (que continua sendo o que soma as cargas cheias, sem redução, e é o
que realmente protege os condutores). Fonte de cada tabela em
`QA/referencias/fator-demanda-concessionarias.md`, com o número de linha do PDF oficial de origem.

O que ficou de fora, por decisão explícita, não por limitação técnica:

- **Chuveiro, ar-condicionado, motor e demais categorias da fórmula `D=a+b+c+...`** — cada
  distribuidora conta esses por número de aparelhos de um tipo específico (ex.: só chuveiro+torneira
  +ferro juntos, separado de ar-condicionado). O modelo de dados de hoje (TUE cadastrado como nome
  livre + potência) não marca cada equipamento com essa categoria — precisaria de um campo novo no
  cadastro do equipamento, ou de uma heurística por nome/potência, que decidi não fazer sem
  categorização real (o risco é o usuário ler "demanda calculada pela distribuidora" e achar que é
  o valor completo da fórmula, quando só a parcela de iluminação/tomadas entrou)
- **Categoria de atendimento / padrão de entrada (mono/bi/trifásico por faixa de carga ou demanda)**
  — as tabelas de cada distribuidora saíram desalinhadas da extração de texto do PDF (mesmo
  problema de coluna já visto com a NBR 5410), e variam por estado dentro do mesmo grupo econômico
  (ex.: Equatorial muda a tensão monofásica por estado). Ficou fora para não arriscar transcrever
  errado
- **Icc de referência da distribuidora para seccionamento/Ikmin** — só a Cemig, a Celesc e a CPFL
  publicam um piso de Icn do disjuntor geral (usado, com citação, na especificação de compra); é um
  requisito mínimo do equipamento, não a Icc real do ponto, e por isso nunca serve para o
  seccionamento automático nem para o Ikmin (que continuam pedindo a Icc do usuário)
- **Copel (PR) e Energisa (MT/MS/TO/PB/SE/MG/RO/AC e outros)** — os sites bloquearam o download
  desta rede (HTTP 403/503, inclusive na página inicial); faltam os PDFs, que só o usuário consegue
  baixar manualmente
- **NBR 10676:2011** — três distribuidoras (CPFL, EDP São Paulo, Neoenergia) têm a tabela de
  iluminação/tomadas idêntica, e cinco citam essa norma ABNT nas referências; a cópia de 1999 que o
  usuário tinha não é a mesma edição e não traz essa tabela. Conseguir a edição de 2011 permitiria
  trocar "tabela de cada distribuidora" por uma fonte única citável, quando/se existir de fato

## Assistente com IA (entrada em linguagem natural)

Em vez de preencher campos manualmente, o usuário descreve a instalação em linguagem natural (“sala de 20m² com duas tomadas de ar-condicionado, cozinha de 12m²...”) e a IA extrai os dados estruturados e preenche o formulário/estado da aplicação.

- Ponto chave: isso depende de a aplicação ter um **modelo de dados bem definido** (cômodos, áreas, cargas como objetos/estado, não só campos de formulário soltos) — a IA vai preencher esse modelo, e a UI (seja qual for) reage a ele. Ver discussão sobre stack abaixo.
- Provavelmente exige uma chamada a uma API de LLM (custo, backend/proxy para não expor chave de API no client) — não é puramente client-side.
- Fase avançada, depois do core de cálculo estar sólido.

## Notas de priorização (sugestão, a validar)

> **Substituído em 28/09/2026 por [PLANO.md](PLANO.md)** (cronograma em sprints até 08/12, com as lacunas da NBR 5410 para residência e o redesenho de UI/UX). As notas abaixo ficam como histórico.

**Fase 2 (pós-v1):** aterramento geral da edificação, lista de materiais, percurso físico do eletroduto, Tabela 15 completa (AQ2/AQ3 por região) — extensões diretas do motor de cálculo já existente (disjuntores/DR, taxa de ocupação do eletroduto, redução do neutro e curto-circuito do alimentador, reatância por seção, divisão de circuitos por First-Fit Decreasing, IDs de circuito estáveis, cálculo vetorial completo da proteção geral e DPS condicional, e — mais recentemente — métodos A1/A2/D, isolação EPR/XLPE, a correção do número de condutores carregados do alimentador bi/trifásico, os locais especiais de banheiro/chuveiro §9.1, e o curto-circuito por circuito terminal fase-neutro já foram implementados na v1).

**Fase 3:** upload de planta (manual), memorial em PDF, salvar/carregar projetos.

**Fase 4 / stretch goals:** assistente com IA, reconhecimento automático de planta, banco de produtos comerciais, estimativa de custo.
