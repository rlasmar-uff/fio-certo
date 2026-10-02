# Escopo do Projeto — Calculadora de Instalações Elétricas Residenciais

Projeto de extensão universitária (TEE00192 — Circuitos Elétricos de Corrente Alternada, prof. Vitor Hugo Ferreira), período 01/09/2026 a 08/12/2026.

## Objetivo

Site gratuito, de acesso aberto, para apoiar o dimensionamento de instalações elétricas residenciais (monofásicas, bifásicas e trifásicas), com base na ABNT NBR 5410:2004 (versão corrigida 17.03.2008).

O site é uma ferramenta de apoio educacional/técnico — não substitui projeto elétrico assinado por profissional habilitado (ART).

## Escopo técnico — Versão 1

Cálculos incluídos nesta primeira versão:

1. **Previsão de carga** (NBR 5410 §9.5.2) — iluminação e tomadas por cômodo
2. **Divisão da instalação em circuitos**
3. **Dimensionamento de condutores** — capacidade de condução de corrente (Tabela 36 PVC e Tabela 37 EPR/XLPE, métodos A1/A2/B1/B2/C/D — os seis métodos de referência aplicáveis a instalação residencial brasileira, escolhidos por circuito e para o alimentador; E/F/G, industriais, e condutor de alumínio, que a própria norma não admite em habitação — §6.2.3.7/§6.2.3.8 —, ficam fora, ver "fora de escopo" abaixo) + fatores de correção (Tabela 40 — temperatura, nas 4 colunas ar/solo × PVC/EPR/XLPE; Tabela 41 — resistividade térmica do solo, só método D; Tabela 42 referências 1 e 2 — agrupamento dos métodos A1/A2/B1/B2 e C; Tabela 45 — agrupamento do método D, enterrado) + redução do condutor neutro do alimentador trifásico acima de 25 mm² (Tabela 48, §6.2.6.2.6 — só quando o usuário declara explicitamente que as 3 condições da norma valem) + fator k por isolação na verificação de curto-circuito (Tabela 30)
4. **Queda de tensão admissível** (§6.2.7) — 4% no circuito terminal (§6.2.7.2), cumulativo com 5% no total a partir do ponto de entrega em tensão secundária (§6.2.7.1 c, caso residencial típico — 7% de transformador/gerador próprio não é modelado); resistência do condutor na temperatura de operação de cada isolação (70°C PVC, 90°C EPR/XLPE)
5. **Dimensionamento de eletroduto** (§6.2.11.1.6) — taxa de ocupação máxima (53%/31%/40%) a partir dos condutores de cada circuito (métodos A1/A2/B1/B2/D; o método C não usa eletroduto); diâmetros de cabo e de eletroduto usados na conta são valores comerciais típicos, já que a NBR 5410 não tabela dimensão de produto — cabo PVC 450/750 V e cabo EPR/XLPE 0,6/1 kV, até 120 mm²; o percurso (curvas e comprimento entre caixas, §6.2.11.1.6 b/§6.2.11.1.7) é verificado quando cadastrado
6. **Verificação de curto-circuito** (§5.3.5, opcional) — quando o usuário informa a corrente de curto-circuito presumida (Icc, dado que só a concessionária ou um laudo têm) e a curva do disjuntor geral, verifica I²t ≤ k²S² (Tabela 30) no alimentador; para os circuitos terminais, fase-neutro ou fase-fase, a Icc é derivada por propagação de impedância a partir dessa mesma declaração (§5.3.5.1 permite explicitamente "cálculo" como método de determinação) — sem a Icc do alimentador, tudo continua declarado como não verificado. O I²t usa a Icc no quadro e o disparo instantâneo é conferido com a Icc na ponta de cada circuito (§6.3.4.3.2). No fase-fase, o valor informado é tomado como a Icc trifásica, já que a norma não traz a conversão entre tipos de falta
6a. **Seccionamento automático e DR** (§5.1.2.2.4, §6.3.3.2.6) — com o esquema de aterramento declarado: TN por Zs·Ia ≤ Uo (pelo DR de 30 mA ou pelo disjuntor), TT por RA·IΔn ≤ UL (UL 25 V com banheiro). DR único de 30 mA ou um por grupo de circuitos, com DR tipo S opcional a montante (seletividade §6.3.6.3.2)
7. **Proteção geral (disjuntor geral, IDR, DPS) e alimentador** — corrente de entrada por soma vetorial das correntes de cada fase (considera o fator de potência de cada circuito, não só a soma de VA), incluindo o cálculo da corrente real do condutor NEUTRO (§6.2.6.2 — antes só calculada por tabela, nunca verificada contra uma corrente real), sempre comparada à ampacidade do condutor adotado. DPS Classe II sempre recomendado como boa prática; exigência normativa (§5.4.2.1.1) e Classe I (§6.3.5.2.1 b) dependem de 3 declarações opcionais do usuário sobre a instalação real (alimentação aérea, região de alto índice de descargas atmosféricas, exposição a descarga direta) — sem embutir a Tabela 15 completa (mapeamento geográfico do Brasil, fora de escopo). Especificação mínima do DPS pela norma (Up da categoria II, Uc, In/Iimp, condutor DPS-PE — §6.3.5.2.4/§6.3.5.2.9), capacidade de interrupção mínima dos disjuntores (§5.3.5.5.1), I₂ ≤ 1,45·Iz (§5.3.4.1 b), reserva no quadro (Tabela 59), tomadas da bancada (§9.5.2.2.1 b) e aviso de partida de motor acima de 3,7 kW (§6.5.1.2.1)
8. **Locais especiais — banheiro/chuveiro** (§9.1) — quando o projeto tem cômodo cadastrado como banheiro: confirma que o DR geral (já 30 mA por padrão) satisfaz a exigência de §5.1.3.2.2 a) para os circuitos do local e declara a exigência de equipotencialização suplementar (§9.1.3.1.2). Geometria real dos volumes (30/09/2026, N19): marcando a caixa do chuveiro/banheira e os pontos elétricos na planta (imagem/PDF) ou direto em metros (`#/calculadora/banheiro`), a ferramenta classifica cada ponto no volume 0-3 pela distância e pela altura, e verifica a proibição de dispositivo por volume (§9.1.4.3.1/.2) e a classe de equipamento por volume (§9.1.4.4) de verdade — sem marcação, continua o checklist informativo dos volumes e do grau de proteção (IP) mínimo de cada um (§9.1.2.1/§9.1.4.1)
9. **Locais especiais — piscina e sauna** (§9.2, §9.4) — piscina marcada num cômodo externo: volumes 0-2 com IP mínimo, SELV 12 V nos volumes 0 e 1, DR ≤ 30 mA no volume 2 (todo circuito já está sob DR de 30 mA) e equipotencialização suplementar. Sauna como tipo de cômodo: sem tomadas (§9.4.4.3.2 prevalece sobre o mínimo do §9.5.2.2.1; tomada informada é não conformidade), IP24, dispositivos fora do local, corte a 140 °C e o aviso de que o cabo do aquecedor no volume 3 precisa de isolação para 170 °C, que a ferramenta não dimensiona. Geometria real dos volumes fica para conferência manual
10. **Fator de demanda por distribuidora** (fonte externa à NBR 5410, não uma cláusula dela) — escolhendo a distribuidora (opcional; 9 das principais do Brasil), a ferramenta mostra a demanda de iluminação/tomadas que a norma técnica dela calcularia, com a fonte citada — informativo, ao lado do dimensionamento por NBR 5410, que continua sendo o que soma as cargas cheias e protege os condutores. Só iluminação/tomadas entram; chuveiro, ar-condicionado e motor ficam de fora nesta versão (ver `FUTURO.md`). Onde a distribuidora publica um Icn mínimo do disjuntor geral do padrão de entrada (achado da Cemig), a especificação de compra usa esse piso

Suporte a instalações **monofásicas, bifásicas e trifásicas** desde a v1 (inclui balanceamento de cargas entre fases para bi/trifásico).

### Fora de escopo da v1 (backlog para fase 2)

- Projeto físico do aterramento (§6.4) — eletrodo, malha e percurso. Já entram: esquema de aterramento declarado (§4.2.2.2), seção do PE, do condutor de aterramento (Tabela 52), do PEN (§6.4.3.4.1) e das equipotencializações principal e suplementar (§6.4.4.1)
- Compartimentos condutivos (§9.3) — não se aplica a residência. Banheiro, piscina e sauna já são suportados (itens 8 e 9 do escopo técnico)
- Esquema IT e cálculo da fuga normal dos circuitos (§6.3.3.2.6). O curto-circuito é verificado no alimentador e em todos os circuitos terminais, só quando o usuário informa a Icc (ver escopo técnico acima)
- Fator de demanda de chuveiro, ar-condicionado e motor por distribuidora — só iluminação/tomadas entrou (item 10 do escopo técnico); as demais categorias exigiriam categorizar o TUE cadastrado por tipo de uso, que o modelo de dados de hoje não faz
- Tabela 15 completa (mapa de regiões brasileiras → influência externa AQ2/AQ3) — a exigência normativa de DPS depende de autodeclaração do usuário em vez de um mapeamento geográfico embutido
- Conteúdo educativo/explicativo (a v1 é calculadora pura: entrada → resultado)

### Fora de escopo do projeto (não planejado)

- Instalações comerciais/industriais — inclui os métodos de instalação E/F/G (bandeja/leito/espaçados, Tabelas 38-39), que só aparecem nesse tipo de instalação
- Condutor de alumínio — a própria norma (§6.2.3.7/§6.2.3.8) só o admite em estabelecimentos industriais e comerciais, nunca em habitação
- Luminotécnica avançada, SPDA
- Emissão de memorial de cálculo com validade legal (ART)

## Formato do produto

Calculadora pura: formulário de entrada (cômodos, áreas, cargas) → resultado dimensionado. Sem conteúdo educativo embutido na v1.

## Stack técnico

- **React + Vite** — revisado a partir da decisão inicial (HTML/CSS/JS puro) após ampliar o backlog ([FUTURO.md](FUTURO.md)) com funcionalidades que exigem UI dinâmica e múltiplas telas (upload de planta, múltiplos cômodos, salvar projetos, futura integração com IA)
- Lógica de cálculo (previsão de carga, condutores, queda de tensão) implementada como funções puras, desacopladas dos componentes de UI — facilita testes e permite que uma futura IA preencha o mesmo modelo de dados sem depender do framework de UI
- Toda a lógica de cálculo roda no cliente na v1 (sem backend); um backend/proxy só entra na Fase 4, se o assistente de IA for implementado (necessário para não expor chave de API no navegador)
- **Hospedagem:** GitHub Pages (build estático gerado pelo Vite)

## Referência normativa

ABNT NBR 5410:2004, versão corrigida 17.03.2008 — exemplar de referência técnica mantido localmente (`NBR-5410.pdf`), não redistribuído publicamente pelo site (ver observação de direitos autorais abaixo). O site usa apenas os critérios técnicos (tabelas, fórmulas, limites) extraídos da norma para implementar a lógica de cálculo — não reproduz o texto da norma.

## Entregáveis do projeto de extensão

Conforme o Guia Pedagógico:
- Site funcional (Atividade 4)
- Relatório técnico
- Seminário de apresentação

## Próximos passos

1. Estruturar o projeto (arquivos HTML/CSS/JS base)
2. Implementar previsão de carga (§9.5.2) como primeiro módulo
3. Implementar dimensionamento de condutores
4. Implementar queda de tensão
5. Testar com casos reais (mono/bi/trifásico)
