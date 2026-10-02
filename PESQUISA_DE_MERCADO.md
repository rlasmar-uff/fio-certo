# Pesquisa de Mercado — Concorrentes e Referências

Levantamento de sites/apps existentes para dimensionamento de instalações elétricas residenciais conforme NBR 5410. Feito para calibrar o [ESCOPO.md](ESCOPO.md) e o [FUTURO.md](FUTURO.md) com o que já existe no mercado.

## Achado principal

O mercado **não é vazio** — existem vários concorrentes gratuitos, alguns bem avançados. Um deles ([Portal dos Eletricistas](#portal-dos-eletricistas)) já cobre boa parte do que colocamos como "stretch goal" no FUTURO.md (IA, editor de planta, simuladores 3D). Isso muda a forma como devemos pensar a diferenciação — ver seção final.

## Concorrentes analisados

### Portal dos Eletricistas
[portaldoseletricistas.com](https://www.portaldoseletricistas.com/)

O mais completo encontrado. Gratuito, sem cadastro. Inclui:
- Calculadoras: corrente/bitola/disjuntor, queda de tensão, luminotécnica (método dos lúmens com simulação 2D), motores (5 métodos de partida), padrão de entrada (demanda kVA + memorial)
- **Editor de planta elétrica online (CAD)** com exportação DXF — já cobre parte do nosso "upload de planta" do backlog
- **Chat IA** para dúvidas técnicas — já cobre nosso stretch goal de assistente com IA (embora pareça ser Q&A, não preenchimento de formulário via linguagem natural)
- Simuladores 3D (montagem de QDC, aterramento TN/TT/IT) e gamificação (quiz com certificado)
- Ferramentas de gestão (orçamento em PDF, checklist de vistoria, etiquetas de QDC)
- Aviso legal padrão: resultados são estimativas, não substituem profissional habilitado

### Calculadora do Eletricista
[calculadoradoeletricista.com.br](https://www.calculadoradoeletricista.com.br/)

14 calculadoras separadas (cabos, queda de tensão, disjuntor, aterramento/SPDA, eletrodutos, transformador, gerador, solar fotovoltaico + payback, BTU, fator de potência, iluminação, consumo, carga instalada). Gratuito, sem cadastro. Não deixa claro suporte a bi/trifásico nem geração de PDF.

### Elétrica Predial — Montador de Quadro Elétrico
[eletricapredial.com/montador-quadro-eletrico](https://eletricapredial.com/montador-quadro-eletrico)

Entrada por circuito (nome, potência, tensão 127/220V, tipo de carga) → gera tabela completa do quadro (cabo geral, disjuntor geral, cabo/disjuntor por circuito) + lista de materiais. Aplica fator de demanda de 80% (NBR 5410). Suporte a mono é sólido; bi/trifásico é mencionado mas a interface parece simplificada — **não há previsão de carga por cômodo** (usuário já entra com a potência do circuito pronta, não calcula a partir da planta/área dos ambientes).

### GreenGold Engenharia — Calculadora de Carga Elétrica
[greengoldengenharia.com.br/calculadora-carga-eletrica](https://greengoldengenharia.com.br/calculadora-carga-eletrica/)

Entrada bem simplificada: área total do imóvel (m²) + tipo (padrão/alto padrão/comercial) + nº de chuveiros/splits → estimativa de carga/demanda/disjuntor geral. **Não faz previsão de carga por cômodo** conforme §9.5.2 (ponto de tomada/iluminação por ambiente) — é uma estimativa grosseira por área total, não o cálculo normativo detalhado.

### Outros identificados (não aprofundados)
- [eletroproj.com.br](https://eletroproj.com.br/calculadora-eletrica-nbr-5410/), [ecalculadora.com.br](https://ecalculadora.com.br/construcao/calculadora-eletrica/), [calculohub.com.br](https://www.calculohub.com.br/calculadoras/bitola-de-fio-por-corrente), [fasedelta.com](https://fasedelta.com/dimensionamento-disjuntor-cabo), [quantopreciso.com](https://quantopreciso.com/calculadora-de-fio-eletrico.html) — calculadoras pontuais de bitola/disjuntor, escopo estreito (parecem todas focar só no item 3 do nosso escopo: dimensionamento de condutor a partir de uma corrente já conhecida)
- **WOCA** (app Android) — gera diagrama unifilar, dimensiona condutores/disjuntores e lista de materiais
- **Intera** (USP/PEA) — software desktop didático, gratuito, para projetos de instalações residenciais
- **QelectroTech** — software desktop gratuito para desenho de diagramas elétricos (símbolos + memorial), não é uma calculadora normativa
- **App Elétrico** ([appeletrico.com.br](https://appeletrico.com.br/)) — app mobile, cálculo de circuito com "6 critérios da NBR 5410", voltado a estudantes/eletricistas iniciantes

## Conclusões para o projeto

**Importante: o objetivo aqui não é competir com essas ferramentas ou se diferenciar delas.** O projeto é uma extensão universitária cujo produto é um site gratuito de aplicação correta da norma — se uma funcionalidade já existe no mercado, isso não é motivo para não fazê-la também. Esta pesquisa serve para calibrar prioridade e complexidade, não para escolher "onde atacar".

Dito isso, alguns aprendizados úteis para priorização:

- **Previsão de carga por cômodo (§9.5.2) é pouco comum de ser feita de forma completa** — a maioria dos concorrentes pede a potência do circuito já pronta (Elétrica Predial) ou estima por área total do imóvel de forma grosseira (GreenGold), em vez de aplicar as regras reais da norma (100VA/6m² + 60VA/4m² adicionais para iluminação; regras de TUG por perímetro/tipo de cômodo). Confirma que é um bom ponto de partida técnico para a v1, independente de mercado.
- **Transparência normativa** — mostrar *qual critério da norma* está sendo aplicado em cada resultado (ex: "iluminação: 100VA pelos primeiros 6m² + 60VA a cada 4m² adicionais, NBR 5410 §9.5.2.1") é algo que nenhum concorrente parece destacar, e conecta diretamente com o objetivo pedagógico do GP — vale a pena fazer por isso, não para "ganhar" de ninguém.
- **Editor de planta CAD, chat IA, simuladores 3D** — o fato de já existirem maduros no mercado (Portal dos Eletricistas) não os tira do backlog; continuam no FUTURO.md como fases mais avançadas simplesmente porque são tecnicamente mais complexos (backend/IA, renderização gráfica) e menos urgentes que o núcleo de cálculo, não porque "já tem quem faça".

## Sources

- [Calculadora Elétrica NBR 5410 — Cabos e Tabelas](https://eletroproj.com.br/calculadora-eletrica-nbr-5410/)
- [Calculadora de Carga Elétrica Residencial — GreenGold Engenharia](https://greengoldengenharia.com.br/calculadora-carga-eletrica/)
- [Calculadora Elétrica — eCalculadora](https://ecalculadora.com.br/construcao/calculadora-eletrica/)
- [Calculadora do Eletricista](https://www.calculadoradoeletricista.com.br/)
- [Proeletrics — Calculadoras NBR 5410](https://www.proeletrics.com/)
- [Montador de Quadro Elétrico Online — Elétrica Predial](https://eletricapredial.com/montador-quadro-eletrico)
- [Calculadora de Dimensionamento de Cabos NBR5410 — LGL Engenharia](https://lglengenharia.com.br/calculadora-dimensionamento-cabos-nbr5410/)
- [Assistente de Elétrica Predial Gratuito](https://eletricapredial.com/)
- [Calculadora de Circuitos Elétricos Gratuita](https://eletricidadeonline.com/calculadora-de-circuitos-eletricos-gratuita-facil-de-usar/)
- [Portal dos Eletricistas](https://www.portaldoseletricistas.com/)
- [Calculadora de Bitola de Fio e Disjuntor — CalculoHub](https://www.calculohub.com.br/calculadoras/bitola-de-fio-por-corrente)
- [Calculadora de Disjuntor e Cabo — Fase Delta](https://fasedelta.com/dimensionamento-disjuntor-cabo)
- [Calculadora de Fio Elétrico — Quanto Preciso](https://quantopreciso.com/calculadora-de-fio-eletrico.html)
- [PRO-Elétrica — Multiplus](https://multiplus.com/software/pro-eletrica/index.html)
- [Intera — Ensinando Elétrica](https://ensinandoeletrica.blogspot.com/2017/09/intera-programa-didatico-para-projetos.html)
- [Ferramentas para elaborar projeto elétrico — WEG](https://www.weg.net/weghome/blog/arquitetura/ferramentas-para-elaborar-projeto-eletrico/)
- [Software para dimensionamento de fios e cabos — AditivoCAD](https://www.aditivocad.com/utilidades.php?software=dce_dimensiona_fios_cabos)
- [Aplicativos para elétrica predial e industrial — Trick Drawing](https://trickdrawing.com/aplicativos-para-eletrica/)
- [Aplicativo para Projeto Elétrico Grátis: 7 Opções — Cidesp](https://cidesp.com.br/conteudo/aplicativo-para-projeto-eletrico-gratis-7-opcoes-top)
- [Calculadora Elétrica NBR 5410 — Google Play](https://play.google.com/store/apps/details?id=com.bns.calculadora_eletrica_nbr5410&hl=en_US)
- [App Elétrico](https://appeletrico.com.br/)
- [Planilha Web — Calculadora de Previsão de Carga de Iluminação](https://planilhaweb.com.br/calculadora_previsao_carga_iluminacao.php)
