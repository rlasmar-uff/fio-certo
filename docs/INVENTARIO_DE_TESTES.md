# Inventário dos testes do harness de conformidade

Gerado por `node QA/scripts/inventario.mjs` a partir de `QA/scripts/verificar.mjs` (leitura do código-fonte).

- **Critérios:** 246 em 45 grupos.
- **Com valor de referência fixo no teste** (norma ou conta manual): 140.
- **Só consistência/forma** (comparam saídas do motor entre si, ou testam presença/`null`/`> 0`): 106. São os que mais precisam de olho humano — um erro do motor e do teste podem coincidir.

A classificação é por heurística textual (existência de número literal diferente de 0/1 na condição). Ela aponta onde olhar; não substitui a leitura do critério.

## Critérios que só verificam consistência ou forma

| Critério | Cláusula | O que verifica | Severidade |
|---|---|---|---|
| G2.2 | §6.2.5.6 / Tabela 36 | 3 condutores carregados sempre dá ampacidade menor que 2, em todos os métodos | alto |
| G2.3 | Tabela 36 | Todas as 12 colunas estritamente crescentes com a seção | baixo |
| G2.4 | Tabela 36 | Toda linha tem exatamente 12 valores, todos numéricos | alto |
| G2.5 | Tabela 36 | Ordem física entre métodos (A2 ≤ A1 < B1 < C, B2 < B1) em todas as seções | alto |
| G3.1 | §4.2.5.5 / §9.5.3.3 | Iluminação e TUG em circuitos separados | alto |
| G3.2 | §9.5.3.2 | TUG de cozinha/área de serviço em circuito exclusivo | alto |
| G3.3 | §9.5.3.2 | Banheiro fora do circuito exclusivo de cozinha/área de serviço | alto |
| G3.4 | §9.5.3.1 | Equipamento acima de 10 A em circuito independente | alto |
| G3.5 | convenção de projeto (não normativa) | Nenhum circuito de TUG acima do teto declarado de ${POTENCIA_MAXIMA_CIRCUITO_TUG_VA} VA | medio |
| G4.8 | §6.2.6.1.2 c) / §5.3.5 | Curto-circuito e solicitação térmica declarados como não verificados (não calculados silenciosamente) | baixo |
| G4.9 | §6.2.6.1.2 d) / §5.1.2.2.4 | Seccionamento automático declarado como não verificado (não calculado silenciosamente) | baixo |
| G5.3 | §6.2.7.2 | Seção elevada quando a queda no circuito terminal ultrapassa 4% | alto |
| G5.5 | §6.2.6.1.2 e) | Circuito sem comprimento informado é declarado NÃO VERIFICADO (não conforme por omissão) | alto |
| G6.4 | §6.4.3.1 / Tabela 58 | Circuitos terminais recebem seção do condutor de proteção | alto |
| G6.6 | §5.3.4.1 a) | Corrente nominal do DR ≥ corrente do disjuntor geral | alto |
| G6.7 | §6.2.6.2.2 | Alimentador monofásico nunca reduz o neutro, mesmo com a redução declarada | critico |
| G6.9 | §6.2.6.2.6 | Sem declaração explícita do usuário, o neutro NÃO reduz automaticamente | alto |
| G7.2 | §6.2.11.1.6 a) | Circuito de chuveiro 10 mm² (fase+neutro+PE) rejeita eletroduto de 1/2" por exceder 40% de ocupação | medio |
| G7.3 | §6.2.11.1.6 | Eletroduto calculado para cada circuito terminal e para o alimentador dentro de calcularProjetoCompleto | medio |
| G8.5 | §6.2.11.1.6 | Circuito em método C não tem eletroduto calculado (cabo direto na parede, sem conduto) | medio |
| G9.1 | §5.3.5.1 | Sem Icc informada, curto-circuito continua não verificado (não "conforme" por omissão) | baixo |
| G9.5 | §6.3.4.3.2 a) (curva do disjuntor, IEC 60898) | Icc entre o limite inferior e o superior da faixa magnética fica não verificada, não aprovada com 10 ms | alto |
| G9.3 | §5.3.5.5.2 / Tabela 30 | Icc alta o bastante reprova um condutor que não aguentaria a energia de curto-circuito | critico |
| G9.4 | §5.3.5.5.2 / Tabela 30 | Icc dentro da capacidade do condutor aprova de verdade — a verificação não é sempre "não verificado" | alto |
| G10.2 | engenharia (otimização pedida à parte da norma) | Quando o espaço de estados realmente estoura (entradas heterogêneas, sem VAs repetidos), cai de volta no guloso em vez de travar ou estourar tempo | baixo |
| G10.3 | engenharia (otimização pedida à parte da norma) | Acima do antigo teto de 24 circuitos, a busca exata continua rodando quando o espaço de estados permanece pequeno (sem o teto por contagem, removido) | medio |
| G11.3 | fonte externa (catálogo Cordeiro, Tabela 8) | Reatância por seção nunca aumenta com a seção (tabela impressa é decrescente/estável) | baixo |
| G12.1 | engenharia (estabilidade de ID — FUTURO.md) | Adicionar um cômodo independente não muda o ID de um circuito cuja composição não mudou | alto |
| G12.2 | engenharia (estabilidade de ID — FUTURO.md) | Remover um cômodo muda a composição do grupo afetado, e o ID antigo dessa composição desaparece (não é reaproveitado por um grupo com cômodos diferentes) | critico |
| G13.1 | engenharia (otimização pedida à parte da norma) | Divisão de circuitos por First-Fit Decreasing usa menos circuitos que empacotar na ordem de cadastro, para os mesmos cômodos | baixo |
| G13.2 | convenção de projeto (não normativa) | FFD nunca excede o teto de VA por circuito | medio |
| G14.6 | §6.2.6.2 (verificação real, não só a declaração do usuário) | Corrente do neutro acima da ampacidade do condutor reduzido é sinalizada como não conforme | critico |
| G14.7 | §6.2.6.2 (verificação real, não só a declaração do usuário) | Corrente do neutro dentro da ampacidade do condutor reduzido é conforme (não dispara alerta à toa) | medio |
| G15.1 | §5.4.2.1.1 | Sem nenhuma declaração, DPS continua recomendação de boa prática (não alega exigência normativa) | medio |
| G15.2 | §5.4.2.1.1 a) | Alimentação aérea sozinha (sem alto índice de descargas) não basta para tornar o DPS exigência normativa — as duas condições valem juntas | alto |
| G15.3 | §5.4.2.1.1 a) | Alimentação aérea E região de alto índice de descargas juntas tornam o DPS exigência normativa | alto |
| G15.4 | §6.3.5.2.1 b) | Exposição a descarga direta recomenda Classe I além da Classe II, independente da exigência geral do §5.4.2.1.1 | alto |
| G15.5 | §5.4.2.1.1/§6.3.5.2.1 b) | As 3 declarações juntas dão exigência normativa E Classe I+II | medio |
| G16.6 | §6.2.5.6.1 / §6.2.6.2.6 | Sem declarar a 3ª harmônica, nem o neutro reduz nem o fator 0,86 é aplicado | alto |
| G17.4 | Tabela 37 vs Tabela 36 | EPR/XLPE (90°C) tem ampacidade maior que PVC (70°C) nas 144 células (12 seções × 12 colunas) | alto |
| G17.5 | Tabela 37 | Todas as 12 colunas da Tabela 37 estritamente crescentes com a seção | baixo |
| G17.6 | §6.2.5.6 / Tabela 37 | 3 condutores carregados sempre dá ampacidade menor que 2, também na Tabela 37 (EPR/XLPE) | alto |
| G18.1 | Tabela 40 | Todas as células numéricas batem com a forma fechada f=√((θmax−θ)/(θmax−θref)) | alto |
| G19.2 | ISOLACOES / condutividade a 90°C | Queda de tensão com EPR/XLPE (90°C) é estritamente maior que com PVC (70°C), mesma seção/corrente | alto |
| G20.5 | §6.2.11.1.6 / §6.2.5.1.2 | Circuito em método D tem eletroduto calculado (ao contrário do método C) | alto |
| G22.1 | §9.1.1 | Projeto sem cômodo tipo banheiro não gera exigência de locais especiais | baixo |
| G22.2 | §9.1.3.1.2 | Projeto com banheiro exige equipotencialização suplementar | alto |
| G23.1 | §5.3.5.1 | Sem Icc declarada no alimentador, todo circuito terminal continua não verificado | alto |
| G23.2 | §5.3.5.1 / §6.3.4.3.2 | Circuito fase-fase verificado pelo laço entre duas fases: I²t com a maior Icc no quadro, Ikmin na ponta | alto |
| G23.3 | §5.3.5.1 | Icc propagada cai quando o circuito terminal é mais comprido (mais impedância a jusante) | alto |
| G23.6 | §6.3.4.3.2 a) | Sem comprimento do circuito, Ia ≤ Ikmin fica não verificado (Icc no ponto mais distante desconhecida) | alto |
| G24.1 | §6.5.4.7 / Tabela 59 | Espaço de reserva do quadro nas fronteiras da tabela (0,15·N arredondado para cima) | medio |
| G24.2 | §6.4.4.1.1 | Equipotencialização principal ≥ ½ do maior PE, mínimo 6 mm², limitada a 25 mm² | alto |
| G24.5 | §6.4.1.2.1 / Tabela 52 | Condutor de aterramento enterrado = maior entre o PE do alimentador e o mínimo da Tabela 52 | alto |
| G24.6 | §6.5.1.2.1 NOTA | Equipamento indutivo acima de 3,7 kW gera aviso de consulta à distribuidora; carga resistiva não | medio |
| G25.2 | §5.1.2.2.4.2 d) / §4.2.2.2 | Volta da falta pelo PE (TN-S) ou pelo PEN (TN-C-S): PE mais fino dá Zs maior | alto |
| G25.3 | §5.1.2.2.4.2 d) | TN sem Icc declarada: seccionamento não verificado (a impedância da fonte é desconhecida) | alto |
| G25.4 | §5.1.2.2.4.1 c) / §5.1.2.2.4.2 d) | Alimentador sem disparo instantâneo garantido e sem DR fica não verificado, não aprovado | alto |
| G25.7 | §6.3.3.2.6 | DR único para vários circuitos gera aviso de disparo intempestivo (fuga não calculável) | medio |
| G25.8 | §6.2.6.1.2 d) | Sem esquema de aterramento declarado, o seccionamento continua não verificado em todo circuito | alto |
| G26.1 | §6.2.6.1.2 c/d | Sem esquema nem Icc, o veredito fica "falta dado" (âmbar) e lista as duas pendências — nunca "conforme" | alto |
| G26.2 | §9.5.2.2.1 b) | Uma não conformidade (bancada com 1 tomada) deixa o veredito vermelho e aponta a etapa que resolve | alto |
| G27.1 | — | Exportar e reimportar (arquivo JSON e link) devolve o mesmo projeto e o mesmo cálculo | alto |
| G27.3 | — | A casa-modelo tem todos os comprimentos preenchidos e sai sem problema nem pendência (é a demonstração) | medio |
| G28.1 | §6.1.5.3, §6.4.3.4 | Cabos da casa-modelo por função e seção batem com a conta à mão (TN-C-S: PEN no alimentador, sem PE separado; fase-fase sem neutro) | medio |
| G28.3 | §6.3.5.2.3 a), §6.5.4.7 / Tabela 59, §6.1.5.4 | Quadro: DPS em conexão 2 (fases + neutro–PE), reserva da Tabela 59 e circuitos numerados na ordem do trilho | medio |
| G28.4 | §5.3.4.1 | Existente: 2,5 mm² com 20 A num circuito de Iz 13,7 A não atende (In > Iz); a própria seção e disjuntor dimensionados não falham em nenhum item verificável — o único item em aberto é o curto-circuito, "não verificado" abaixo de 10 mm² (Tabela 30 NOTA 1, ver G34.3), não uma falha nova | alto |
| G28.5 | §5.3.4.1 | Instalação existente que não atende deixa o veredito vermelho, apontando o Dimensionamento | alto |
| G29.1 | §9.4.4.3.2 | Sauna: mínimo de tomadas é 0 (a proibição prevalece sobre §9.5.2.2.1); tomada informada vira não conformidade | alto |
| G29.3 | §9.2.4.1, §9.2.3.1.4 | Piscina: IPX8 / IPX5 / IPX2 (mínimos por volume), equipotencialização suplementar e lista própria; sem piscina, nada | medio |
| G29.5 | §5.3.5.5.1 | Especificação: Icn mínima sobe para a próxima padronizada (NBR NM 60898), nunca desce (5 → 6 kA; 2,9 → 3 kA, a do curto entre fases no quadro) | medio |
| G30.2 | §6.2.11.1.7 | Mais de 3 curvas de 90° num trecho é não conforme, mesmo curto | medio |
| G30.4 | §6.2.11.1.6 b) | Trecho fora do limite (14 m com 2 curvas > 9 m) deixa o veredito vermelho, apontando o Dimensionamento | medio |
| G32.1 | — | Sem distribuidora escolhida, demandaConcessionaria é null (nada muda no projeto por padrão) | medio |
| G32.6 | — | Enel não publica tabela própria: aplicavel=false, com o motivo explicado, não um valor chutado | medio |
| G32.7 | — | Light: carga acima da faixa conferida da tabela (>9 kW) fica não aplicável, em vez de extrapolar um fator | baixo |
| G33.4 | §9.1.4.3.1 · §9.1.4.3.2 | Tomada no volume 1 é não conforme; a mesma tomada no volume 3 é conforme (DR ≤30mA já garantido) | critico |
| G33.5 | §9.1.4.4 | Aquecedor: proibido no volume 0, permitido no volume 1 (classe I/II). Luminária: proibida no volume 1, só a partir do volume 2 (classe II) | alto |
| G33.8 | — | Sem geometriaBanheiro marcada, pontosPorComodo continua vazio (regressão do caso comum) | medio |
| G33.9 | — | normalizarProjeto sanitiza geometriaBanheiro vinda de fora: tipo inválido vira "outro", ponto ganha id, "pontos" não-array vira [] | alto |
| G34.2 | §6.2.6.2.5 | Taxa de 3a harmônica acima de 33% (neutro possivelmente MAIOR que a fase) é distinguível e avisada | medio |
| G34.3 | Tabela 30, NOTA 1 | k abaixo de 10 mm² sinalizado como não normalizado, e o curto-circuito fica não verificado nessa faixa | medio |
| G34.4 | Tabela 45 | Sub-tabela de condutores isolados/unipolares em eletroduto enterrado disponível | medio |
| G34.6 | §9.1.2.1 a) | Volume 0 limitado em altura (não se estende indefinidamente acima do box) | medio |
| G34.7 | §9.1.2.1 b) | Com box declarado, volume 1 não é estendido 0,6 m além da borda | medio |
| G34.10 | §9.5.2.2.2 a) | Alternativa permissiva dos 2 pontos só entra em ação com `aplicarAlternativa600VA` declarado — nunca por padrão | medio |
| G36.2 | Tabela 40 | Fatores de temperatura (15 temperaturas × PVC/EPR × ar/solo = 60 valores) idênticos à tabela do PDF, inclusive as faixas sem valor (PVC acima de 60 °C → null) | critico |
| G37.1 | §9.5.2.1.2 | Iluminação mínima nas fronteiras de área (5,99/6/9,99/10/13,99/14 m²…), valores calculados à mão | critico |
| G37.2 | §9.5.2.2.1 | Quantidade mínima de tomadas por tipo de cômodo, nas fronteiras de perímetro (5/10 m salas; 3,5/7 m cozinhas) e área (2,25/6 m² demais) | critico |
| G37.7 | §9.5.2 | O veredito do projeto fica vermelho (não conforme) quando iluminação ou tomadas informadas estão abaixo do mínimo — antes dizia "conforme" | critico |
| G39.1 | Tabelas 36/37 · §5.3.4.1 | Ib = 20 A em cada um dos 6 métodos (A1/A2/B1/B2/C/D) × PVC/EPR: seção e Iz iguais ao esperado pela tabela do PDF | critico |
| G39.2 | §6.2.5.3 / §6.2.5.5 / Tabelas 40 e 42 | Mudança de temperatura (40/45 °C) e de agrupamento (2/3/4 circuitos) muda a seção como calculado à mão; Iz = tabela × FCT × FCA | critico |
| G39.5 | §5.3.4.1 a) e b) | Varredura Ib 0,5…200 A × 6 métodos × PVC/EPR (${n} casos): disjuntor e seção mínimos, e Ib ≤ In ≤ Iz (Iz da tabela do PDF) em todos | critico |
| G41.1 | §5.3.5.5.2 / Tabela 30 | I²t ≤ k²S² exato: PVC 10 mm² aceita 11.500 A e reprova 11.501 A; EPR 10 mm² aceita 14.300 A e reprova 14.301 A | critico |
| G41.2 | §6.3.4.3.2 a) · IEC 60898 | Ikmin só garante o disparo no limite superior da faixa magnética: In 32 A → B 160 A, C 320 A, D 640 A (no limite verifica; 0,01 A abaixo fica não verificado) | critico |
| G41.3 | Tabela 30 NOTA 1 · §5.3.5.1 | Seção de 6 mm², Icc ausente (0) e Icc mínima ausente: sempre "não verificado" (verificado=false, conforme=null), nunca conforme | critico |
| G41.5 | §5.1.2.2.4.3 b) · Anexo C | TT: RA ≤ 1666,7 Ω (UL 50 V) e ≤ 833,3 Ω com banheiro (UL 25 V), nos dois lados do limite | critico |
| G42.4 | §5.4.2.1.1 a) | DPS é "exigido pela norma" somente com alimentação aérea + região de alto índice de descargas; nos demais casos é recomendação — e a ferramenta não alega exigência | alto |
| G42.5 | Tabela 59 | Reserva do quadro nas fronteiras 6/7, 12/13, 30/31, e 0,15·N arredondado para cima (31→5, 40→6, 101→16) | alto |
| G42.6 | §6.4.4.1.1 | Equipotencialização principal: metade do maior PE (padronizada), mín. 6, limitada a 25 mm² | medio |
| G43.1 | §9.1.2.1 b), c), d) | Fronteiras com box delimitado: volume 1 até 2,25 m; volume 2 até 0,6 m e 3 m de altura; volume 3 até 0,6+2,40 = 3,0 m e 2,25 m de altura | critico |
| G44.1 | Entrada ausente | Projeto sem nenhum cômodo NÃO é "conforme": o veredito traz a pendência "nenhum cômodo cadastrado" (antes dizia ok) | critico |
| G44.2 | Entrada inválida | Área negativa/texto, tipo desconhecido, potência negativa, cosφ>1, η>1 e quantidade negativa: sem exceção e com problema apontado (veredito vermelho) | critico |
| G44.3 | Entrada ausente | Área, perímetro ou potência em branco: pendência explícita (não verificado), nunca "ok" — e o equipamento sem potência é avisado como fora do cálculo | alto |
| G44.5 | §6.2.6.1.2 e) | Circuitos sem comprimento informado: "não verificado" (naoVerificado=true, conforme=false) e pendência no veredito — queda 0% não aprova nada | alto |
| G45.3 | Creder Tab. 3.22/3.23 | Em nenhuma das 12 seções o diâmetro externo do cabo PVC usado no eletroduto fica abaixo do que resulta da área "Total" do livro (antes: 50 mm² −6,5% e 120 mm² −8,7% de área) | alto |

## Todos os critérios, por grupo

### G1

| Critério | Cláusula | O que verifica | Referência | Severidade |
|---|---|---|---|---|
| G1.4 | §9.5.2.2.1 a) | TUG mínima em banheiro | referência fixa | medio |
| G1.5 | §9.5.2.2.2 a) | Potência de TUG em área de serviço: 600 VA até 3 pontos, 100 VA excedentes | referência fixa | alto |
| G1.6 | §9.5.2.2.2 b) | Potência de TUG em sala/dormitório: 100 VA por ponto | referência fixa | alto |
| G1.7 | §9.5.2.2.2 a) | Regra alternativa dos 6 pontos (600 VA até 2 pontos) disponível como opt-in, não por padrão | referência fixa | baixo |
| G1.8 | §4.2.1.2 / cálculo de corrente | TUE indutiva convertida de W para VA pelo fator de potência | referência fixa | alto |

### G2

| Critério | Cláusula | O que verifica | Referência | Severidade |
|---|---|---|---|---|
| G2.2 | §6.2.5.6 / Tabela 36 | 3 condutores carregados sempre dá ampacidade menor que 2, em todos os métodos | só consistência | alto |
| G2.3 | Tabela 36 | Todas as 12 colunas estritamente crescentes com a seção | só consistência | baixo |
| G2.4 | Tabela 36 | Toda linha tem exatamente 12 valores, todos numéricos | só consistência | alto |
| G2.5 | Tabela 36 | Ordem física entre métodos (A2 ≤ A1 < B1 < C, B2 < B1) em todas as seções | só consistência | alto |
| G2.6 | Tabela 36 | Método inexistente devolve null em vez de cair silenciosamente em B1 | referência fixa | medio |

### G3

| Critério | Cláusula | O que verifica | Referência | Severidade |
|---|---|---|---|---|
| G3.1 | §4.2.5.5 / §9.5.3.3 | Iluminação e TUG em circuitos separados | só consistência | alto |
| G3.2 | §9.5.3.2 | TUG de cozinha/área de serviço em circuito exclusivo | só consistência | alto |
| G3.3 | §9.5.3.2 | Banheiro fora do circuito exclusivo de cozinha/área de serviço | só consistência | alto |
| G3.4 | §9.5.3.1 | Equipamento acima de 10 A em circuito independente | só consistência | alto |
| G3.5 | convenção de projeto (não normativa) | Nenhum circuito de TUG acima do teto declarado de ${POTENCIA_MAXIMA_CIRCUITO_TUG_VA} VA | só consistência | medio |

### G4

| Critério | Cláusula | O que verifica | Referência | Severidade |
|---|---|---|---|---|
| G4.1 | §6.2.6.1.1 / Tabela 47 | Seção mínima de circuito de iluminação = 1,5 mm² Cu | referência fixa | alto |
| G4.2 | §6.2.6.1.1 / Tabela 47, nota 2 | Seção mínima de circuito de tomadas (força) = 2,5 mm² Cu | referência fixa | alto |
| G4.3 | §6.2.6.1.1 / Tabela 47 | Seção mínima do alimentador atribuída à fonte correta | referência fixa | medio |
| G4.6 | §5.3.4.1 | Faixa de disjuntores cobre correntes acima de 100 A | referência fixa | medio |
| G4.7 | §9.5.4 | Circuito fase-fase declara disjuntor multipolar (número de polos) | referência fixa | medio |
| G4.8 | §6.2.6.1.2 c) / §5.3.5 | Curto-circuito e solicitação térmica declarados como não verificados (não calculados silenciosamente) | só consistência | baixo |
| G4.9 | §6.2.6.1.2 d) / §5.1.2.2.4 | Seccionamento automático declarado como não verificado (não calculado silenciosamente) | só consistência | baixo |

### G5

| Critério | Cláusula | O que verifica | Referência | Severidade |
|---|---|---|---|---|
| G5.1 | §6.2.7 / Tabela 36 (condutor a 70 °C) | Resistência do condutor tomada na temperatura de operação | referência fixa | alto |
| G5.2 | §6.2.7.4 | Queda proporcional à corrente de projeto | referência fixa | alto |
| G5.3 | §6.2.7.2 | Seção elevada quando a queda no circuito terminal ultrapassa 4% | só consistência | alto |
| G5.4 | §6.2.7.1 c) | Orçamento de queda do circuito terminal reduzido pelo que o alimentador já consumiu (não são 4% fixos) | referência fixa | critico |
| G5.5 | §6.2.6.1.2 e) | Circuito sem comprimento informado é declarado NÃO VERIFICADO (não conforme por omissão) | só consistência | alto |

### G6

| Critério | Cláusula | O que verifica | Referência | Severidade |
|---|---|---|---|---|
| G6.1 | cálculo de corrente por fase | Contribuição de carga fase-fase por fase = S/√3 (e não S/2) | referência fixa | alto |
| G6.2 | §6.2.7 (sistema trifásico) | Queda no alimentador trifásico usa a fórmula trifásica | referência fixa | medio |
| G6.4 | §6.4.3.1 / Tabela 58 | Circuitos terminais recebem seção do condutor de proteção | só consistência | alto |
| G6.5 | §5.1.3.2.2 | DR de alta sensibilidade (≤ 30 mA) previsto | referência fixa | alto |
| G6.6 | §5.3.4.1 a) | Corrente nominal do DR ≥ corrente do disjuntor geral | só consistência | alto |
| G6.7 | §6.2.6.2.2 | Alimentador monofásico nunca reduz o neutro, mesmo com a redução declarada | só consistência | critico |
| G6.8 | §6.2.6.2.6 / Tabela 48 | Alimentador trifásico com fase > 25 mm² e redução declarada usa a Tabela 48 | referência fixa | medio |
| G6.9 | §6.2.6.2.6 | Sem declaração explícita do usuário, o neutro NÃO reduz automaticamente | só consistência | alto |

### G7

| Critério | Cláusula | O que verifica | Referência | Severidade |
|---|---|---|---|---|
| G7.1 | §6.2.11.1.6 a) | Taxa de ocupação máxima do eletroduto por número de condutores (53%/31%/40%) | referência fixa | alto |
| G7.2 | §6.2.11.1.6 a) | Circuito de chuveiro 10 mm² (fase+neutro+PE) rejeita eletroduto de 1/2" por exceder 40% de ocupação | só consistência | medio |
| G7.4 | §6.2.11.1.6 a) | Eletroduto com cabo EPR/XLPE: 3 × 2,5 mm² → 1/2" (31,9%); 3 × 10 mm² → 3/4" (38,2%) | referência fixa | medio |
| G7.3 | §6.2.11.1.6 | Eletroduto calculado para cada circuito terminal e para o alimentador dentro de calcularProjetoCompleto | só consistência | medio |
| G7.4 | §6.2.11.1.6 a) | Condutor de proteção (PE) conta como condutor físico na taxa de ocupação, não só os carregados | referência fixa | baixo |

### G8

| Critério | Cláusula | O que verifica | Referência | Severidade |
|---|---|---|---|---|
| G8.1 | Tabela 36 | Ampacidade B2 (cabo multipolar) é sempre menor que B1 (fios soltos) na mesma seção — a norma diferencia por tipo de condutor, não por embutido/aparente | referência fixa | alto |
| G8.2 | Tabela 36 | Ampacidade C (cabo direto na parede, sem eletroduto) é sempre maior que B1 na mesma seção | referência fixa | alto |
| G8.3 | §6.2.6.1.2 a) (Iz por método) | A seção final realmente muda ao trocar o método de instalação (não é decorativo) | referência fixa | critico |
| G8.4 | Tabela 42, referências 1 e 2 | Método C usa a referência 2 da Tabela 42 (menos severa); B1 e B2 usam a mesma referência 1 | referência fixa | alto |
| G8.5 | §6.2.11.1.6 | Circuito em método C não tem eletroduto calculado (cabo direto na parede, sem conduto) | só consistência | medio |

### G9

| Critério | Cláusula | O que verifica | Referência | Severidade |
|---|---|---|---|---|
| G9.1 | §5.3.5.1 | Sem Icc informada, curto-circuito continua não verificado (não "conforme" por omissão) | só consistência | baixo |
| G9.2 | §5.3.5.5 (curva do disjuntor, IEC 60898) | Icc abaixo do disparo instantâneo fica não verificável, em vez de aprovar sem embasamento | referência fixa | baixo |
| G9.5 | §6.3.4.3.2 a) (curva do disjuntor, IEC 60898) | Icc entre o limite inferior e o superior da faixa magnética fica não verificada, não aprovada com 10 ms | só consistência | alto |
| G9.3 | §5.3.5.5.2 / Tabela 30 | Icc alta o bastante reprova um condutor que não aguentaria a energia de curto-circuito | só consistência | critico |
| G9.4 | §5.3.5.5.2 / Tabela 30 | Icc dentro da capacidade do condutor aprova de verdade — a verificação não é sempre "não verificado" | só consistência | alto |

### G10

| Critério | Cláusula | O que verifica | Referência | Severidade |
|---|---|---|---|---|
| G10.1 | engenharia (otimização pedida à parte da norma) | Busca exata de balanceamento encontra o desequilíbrio mínimo verdadeiro entre fases | referência fixa | baixo |
| G10.2 | engenharia (otimização pedida à parte da norma) | Quando o espaço de estados realmente estoura (entradas heterogêneas, sem VAs repetidos), cai de volta no guloso em vez de travar ou estourar tempo | só consistência | baixo |
| G10.3 | engenharia (otimização pedida à parte da norma) | Acima do antigo teto de 24 circuitos, a busca exata continua rodando quando o espaço de estados permanece pequeno (sem o teto por contagem, removido) | só consistência | medio |

### G11

| Critério | Cláusula | O que verifica | Referência | Severidade |
|---|---|---|---|---|
| G11.1 | fonte externa (catálogo Cordeiro, Tabela 8 — condutos fechados) | Reatância de 1,5 mm² bate com a fonte (0,16 Ω/km) | referência fixa | medio |
| G11.2 | fonte externa (catálogo Cordeiro, Tabela 8) | Reatância de 120 mm² bate com a fonte (0,10 Ω/km) | referência fixa | medio |
| G11.3 | fonte externa (catálogo Cordeiro, Tabela 8) | Reatância por seção nunca aumenta com a seção (tabela impressa é decrescente/estável) | só consistência | baixo |
| G11.4 | engenharia (reatância variável por seção, fonte externa) | Queda de tensão com carga indutiva usa a reatância por seção, não mais uma constante única | referência fixa | baixo |

### G12

| Critério | Cláusula | O que verifica | Referência | Severidade |
|---|---|---|---|---|
| G12.1 | engenharia (estabilidade de ID — FUTURO.md) | Adicionar um cômodo independente não muda o ID de um circuito cuja composição não mudou | só consistência | alto |
| G12.2 | engenharia (estabilidade de ID — FUTURO.md) | Remover um cômodo muda a composição do grupo afetado, e o ID antigo dessa composição desaparece (não é reaproveitado por um grupo com cômodos diferentes) | só consistência | critico |

### G13

| Critério | Cláusula | O que verifica | Referência | Severidade |
|---|---|---|---|---|
| G13.1 | engenharia (otimização pedida à parte da norma) | Divisão de circuitos por First-Fit Decreasing usa menos circuitos que empacotar na ordem de cadastro, para os mesmos cômodos | só consistência | baixo |
| G13.2 | convenção de projeto (não normativa) | FFD nunca excede o teto de VA por circuito | só consistência | medio |

### G14

| Critério | Cláusula | O que verifica | Referência | Severidade |
|---|---|---|---|---|
| G14.1 | §6.2.6.2 (soma vetorial, prova por KCL na fonte) | Cargas resistivas iguais, uma por fase (circuito equilibrado): corrente do neutro ≈ 0 | referência fixa | alto |
| G14.2 | §6.2.6.2 (soma vetorial) | Carga sozinha numa única fase: corrente do neutro = exatamente a corrente dessa fase | referência fixa | alto |
| G14.3 | §6.2.6.2 (soma vetorial — resultado não intuitivo, por isso é caso de teste explícito) | Duas cargas iguais em fases diferentes (3ª vazia): corrente do neutro = a magnitude de UMA fase, não a soma aritmética | referência fixa | medio |
| G14.4 | §6.2.6.2 (soma vetorial — par de fases A-C) | Tensão fase-fase do par A-C (índices 0 e 2) é calculada por subtração direta de componentes, não por um atalho de ângulo fixo | referência fixa | critico |
| G14.5 | §6.2.6.2 (a corrente do neutro pode exceder a maior corrente de fase) | Fatores de potência de sinal oposto em fases diferentes fazem a corrente do neutro superar a maior corrente de fase | referência fixa | critico |
| G14.6 | §6.2.6.2 (verificação real, não só a declaração do usuário) | Corrente do neutro acima da ampacidade do condutor reduzido é sinalizada como não conforme | só consistência | critico |
| G14.7 | §6.2.6.2 (verificação real, não só a declaração do usuário) | Corrente do neutro dentro da ampacidade do condutor reduzido é conforme (não dispara alerta à toa) | só consistência | medio |

### G15

| Critério | Cláusula | O que verifica | Referência | Severidade |
|---|---|---|---|---|
| G15.1 | §5.4.2.1.1 | Sem nenhuma declaração, DPS continua recomendação de boa prática (não alega exigência normativa) | só consistência | medio |
| G15.2 | §5.4.2.1.1 a) | Alimentação aérea sozinha (sem alto índice de descargas) não basta para tornar o DPS exigência normativa — as duas condições valem juntas | só consistência | alto |
| G15.3 | §5.4.2.1.1 a) | Alimentação aérea E região de alto índice de descargas juntas tornam o DPS exigência normativa | só consistência | alto |
| G15.4 | §6.3.5.2.1 b) | Exposição a descarga direta recomenda Classe I além da Classe II, independente da exigência geral do §5.4.2.1.1 | só consistência | alto |
| G15.5 | §5.4.2.1.1/§6.3.5.2.1 b) | As 3 declarações juntas dão exigência normativa E Classe I+II | só consistência | medio |

### G16

| Critério | Cláusula | O que verifica | Referência | Severidade |
|---|---|---|---|---|
| G16.1 | §6.2.5.6 / Tabela 46 | Alimentador BIFÁSICO é "duas fases com neutro" → 3 condutores carregados | referência fixa | critico |
| G16.2 | §6.2.5.6 / Tabela 46 | Alimentador TRIFÁSICO com neutro → 3 condutores carregados | referência fixa | critico |
| G16.3 | §6.2.5.6 / Tabela 46 | Alimentador MONOFÁSICO continua em 2 condutores carregados (correção dirigida, não geral) | referência fixa | alto |
| G16.4 | Tabela 46 | Circuitos terminais (F-N e F-F) permanecem em 2 condutores carregados | referência fixa | alto |
| G16.5 | §6.2.5.6.1 | 3ª harmônica > 15% aplica o fator 0,86 sobre a coluna de 3 condutores carregados | referência fixa | alto |
| G16.6 | §6.2.5.6.1 / §6.2.6.2.6 | Sem declarar a 3ª harmônica, nem o neutro reduz nem o fator 0,86 é aplicado | só consistência | alto |
| G16.7 | §6.2.5.6.2 | Nenhum esquema da Tabela 46 conta o condutor de proteção (PE) | referência fixa | medio |

### G17

| Critério | Cláusula | O que verifica | Referência | Severidade |
|---|---|---|---|---|
| G17.1 | Tabela 37 | Ampacidade EPR/XLPE de 1,5 mm², método B1, 2 condutores carregados | referência fixa | alto |
| G17.2 | Tabela 37 | Ampacidade EPR/XLPE de 25 mm², método B1, 3 condutores carregados | referência fixa | alto |
| G17.3 | Tabela 37 | Ampacidade EPR/XLPE de 120 mm², método D, 3 condutores carregados | referência fixa | alto |
| G17.4 | Tabela 37 vs Tabela 36 | EPR/XLPE (90°C) tem ampacidade maior que PVC (70°C) nas 144 células (12 seções × 12 colunas) | só consistência | alto |
| G17.5 | Tabela 37 | Todas as 12 colunas da Tabela 37 estritamente crescentes com a seção | só consistência | baixo |
| G17.6 | §6.2.5.6 / Tabela 37 | 3 condutores carregados sempre dá ampacidade menor que 2, também na Tabela 37 (EPR/XLPE) | só consistência | alto |

### G18

| Critério | Cláusula | O que verifica | Referência | Severidade |
|---|---|---|---|---|
| G18.1 | Tabela 40 | Todas as células numéricas batem com a forma fechada f=√((θmax−θ)/(θmax−θref)) | só consistência | alto |
| G18.2 | Tabela 40 | Fora da faixa tabelada, devolve null — nunca extrapola (PVC não vai a 65°C, EPR vai) | referência fixa | alto |
| G18.3 | Tabela 40 | A 30°C, a coluna de SOLO (0,89) é diferente da de AR (1,00) — `enterrado` muda a coluna lida de verdade | referência fixa | critico |
| G18.4 | Tabela 40 | listarTemperaturasDisponiveis nunca oferece uma temperatura sem fator para a isolação/ambiente | referência fixa | medio |

### G19

| Critério | Cláusula | O que verifica | Referência | Severidade |
|---|---|---|---|---|
| G19.1 | Tabela 30 | Fator k por isolação: PVC=115 (≤300mm²), EPR/XLPE=143 | referência fixa | alto |
| G19.2 | ISOLACOES / condutividade a 90°C | Queda de tensão com EPR/XLPE (90°C) é estritamente maior que com PVC (70°C), mesma seção/corrente | só consistência | alto |
| G19.3 | §6.2.5.6 (Iz por isolação) | A seção final muda ao trocar a isolação, na mesma corrente (não é decorativo) | referência fixa | critico |

### G20

| Critério | Cláusula | O que verifica | Referência | Severidade |
|---|---|---|---|---|
| G20.1 | Tabela 45 vs Tabela 42 | Método D usa a Tabela 45 (agrupamento enterrado, sub-tabela de condutor unipolar), diferente da Tabela 42 usada por A1/A2/B1/B2 | referência fixa | alto |
| G20.2 | Tabela 45 | Acima de 6 circuitos a Tabela 45 não tem fator: o método D devolve null (não verificado), nunca repete o último valor (auditoria nov/2026) | referência fixa | alto |
| G20.3 | Tabela 40 (coluna solo, método D) | Método D lê `temperaturaSoloC` (coluna solo), não `temperaturaC` (coluna ar) — declaradas com valores diferentes de propósito | referência fixa | critico |
| G20.4 | §6.2.5.4 / Tabela 41 | Resistividade térmica do solo declarada corrige a ampacidade do método D | referência fixa | medio |
| G20.5 | §6.2.11.1.6 / §6.2.5.1.2 | Circuito em método D tem eletroduto calculado (ao contrário do método C) | só consistência | alto |

### G21

| Critério | Cláusula | O que verifica | Referência | Severidade |
|---|---|---|---|---|
| G21.1 | Tabela 36/37 | A1 e A2 têm ampacidade menor ou igual a B1/B2 na mesma seção (parede isolante dissipa pior) | referência fixa | alto |
| G21.2 | Tabela 42, referência 1 | A1 e A2 usam a mesma referência 1 da Tabela 42 que B1/B2 (não a Tabela 45, do método D) | referência fixa | medio |
| G21.3 | §6.2.6.1.2 a) (Iz por método) | A seção final muda entre A1 e B1 na mesma corrente (não é decorativo) | referência fixa | alto |

### G22

| Critério | Cláusula | O que verifica | Referência | Severidade |
|---|---|---|---|---|
| G22.1 | §9.1.1 | Projeto sem cômodo tipo banheiro não gera exigência de locais especiais | só consistência | baixo |
| G22.2 | §9.1.3.1.2 | Projeto com banheiro exige equipotencialização suplementar | só consistência | alto |
| G22.3 | §5.1.3.2.2 a) | IDR geral sempre com sensibilidade ≤30 mA — satisfaz a exigência de DR dos circuitos de banheiro | referência fixa | critico |
| G22.4 | §9.1.4.1 | Volumes 0-3 com grau de proteção mínimo correto | referência fixa | medio |

### G23

| Critério | Cláusula | O que verifica | Referência | Severidade |
|---|---|---|---|---|
| G23.1 | §5.3.5.1 | Sem Icc declarada no alimentador, todo circuito terminal continua não verificado | só consistência | alto |
| G23.2 | §5.3.5.1 / §6.3.4.3.2 | Circuito fase-fase verificado pelo laço entre duas fases: I²t com a maior Icc no quadro, Ikmin na ponta | só consistência | alto |
| G23.8 | §5.3.5.1 / §5.3.5.5.1 | Icc fase-neutro informada vale nos laços fase-neutro (quadro 1782,7 A com 3 kA); entre fases não muda; o geral usa a maior (6 kA) | referência fixa | alto |
| G23.7 | §5.3.5.1 | Icc fase-fase: 866,0 A na origem (1000 A × √3/2) e 845,6 A após 10 m de 10 mm² PVC (conta à mão) | referência fixa | alto |
| G23.3 | §5.3.5.1 | Icc propagada cai quando o circuito terminal é mais comprido (mais impedância a jusante) | só consistência | alto |
| G23.4 | §5.3.5.1 | Icc propagada bate com Zfonte reativa + R/X somados separadamente ao longo do alimentador e do circuito terminal | referência fixa | critico |
| G23.5 | §6.3.4.3.2 b) | I²t do circuito terminal usa a Icc no quadro (máxima), não a da ponta do circuito | referência fixa | critico |
| G23.6 | §6.3.4.3.2 a) | Sem comprimento do circuito, Ia ≤ Ikmin fica não verificado (Icc no ponto mais distante desconhecida) | só consistência | alto |

### G24

| Critério | Cláusula | O que verifica | Referência | Severidade |
|---|---|---|---|---|
| G24.1 | §6.5.4.7 / Tabela 59 | Espaço de reserva do quadro nas fronteiras da tabela (0,15·N arredondado para cima) | só consistência | medio |
| G24.2 | §6.4.4.1.1 | Equipotencialização principal ≥ ½ do maior PE, mínimo 6 mm², limitada a 25 mm² | só consistência | alto |
| G24.3 | §6.3.5.2.4 a/b/d, Tabelas 31 e 49, §6.3.5.2.9 | DPS: Up da categoria II, Uc ≥ 1,1·Uo, In ≥ 5 kA, Iimp ≥ 12,5 kA e condutor DPS-PE 4/16 mm² | referência fixa | alto |
| G24.4 | §6.4.3.4.1 | TN-C-S: o PEN (alimentador até o quadro) é conferido contra 10 mm²; sem esquema declarado, nada é afirmado | referência fixa | alto |
| G24.5 | §6.4.1.2.1 / Tabela 52 | Condutor de aterramento enterrado = maior entre o PE do alimentador e o mínimo da Tabela 52 | só consistência | alto |
| G24.6 | §6.5.1.2.1 NOTA | Equipamento indutivo acima de 3,7 kW gera aviso de consulta à distribuidora; carga resistiva não | só consistência | medio |
| G24.7 | §9.5.2.2.1 b) | Tomadas acima da bancada da pia: 1 não conforme, 2 conforme, sem informar não verificado | referência fixa | medio |
| G24.8 | §5.3.4.1 b) | I2 = 1,45·In (IEC 60898) ≤ 1,45·Iz em todo circuito e no alimentador | referência fixa | alto |
| G24.9 | §5.3.5.5.1 | Capacidade de interrupção mínima: Icc da origem no geral, Icc do quadro (menor) nos terminais | referência fixa | alto |

### G25

| Critério | Cláusula | O que verifica | Referência | Severidade |
|---|---|---|---|---|
| G25.1 | §5.1.2.2.4.2 d) | TN-C-S: Zs do ponto mais distante (fonte + fase + PEN até o quadro + PE do circuito) bate com a conta à mão | referência fixa | critico |
| G25.2 | §5.1.2.2.4.2 d) / §4.2.2.2 | Volta da falta pelo PE (TN-S) ou pelo PEN (TN-C-S): PE mais fino dá Zs maior | só consistência | alto |
| G25.3 | §5.1.2.2.4.2 d) | TN sem Icc declarada: seccionamento não verificado (a impedância da fonte é desconhecida) | só consistência | alto |
| G25.4 | §5.1.2.2.4.1 c) / §5.1.2.2.4.2 d) | Alimentador sem disparo instantâneo garantido e sem DR fica não verificado, não aprovado | só consistência | alto |
| G25.5 | §5.1.2.2.4.3 b) / Anexo C | TT: RA·IΔn ≤ UL, com UL 25 V quando há banheiro (situação 2) e 50 V sem; sem RA medida, só o limite | referência fixa | critico |
| G25.6 | §6.3.6.3.2 / §6.3.6.2.2 | DR por grupo: 30 mA, In ≥ min(ΣIn do grupo, In geral), polos = fases + neutro; montante 300 mA tipo S seletivo | referência fixa | alto |
| G25.7 | §6.3.3.2.6 | DR único para vários circuitos gera aviso de disparo intempestivo (fuga não calculável) | só consistência | medio |
| G25.8 | §6.2.6.1.2 d) | Sem esquema de aterramento declarado, o seccionamento continua não verificado em todo circuito | só consistência | alto |

### G26

| Critério | Cláusula | O que verifica | Referência | Severidade |
|---|---|---|---|---|
| G26.1 | §6.2.6.1.2 c/d | Sem esquema nem Icc, o veredito fica "falta dado" (âmbar) e lista as duas pendências — nunca "conforme" | só consistência | alto |
| G26.2 | §9.5.2.2.1 b) | Uma não conformidade (bancada com 1 tomada) deixa o veredito vermelho e aponta a etapa que resolve | só consistência | alto |
| G26.3 | §7.3.5.1-2, §6.1.5.3.3, §9.1.4.3 | Listas condicionais: TT pede medir RA (com o limite), TN-C-S traz a cor do PEN, banheiro só com banheiro, TN com Zs calculado dispensa a medição | referência fixa | medio |
| G26.4 | §6.5.4.10 | Advertência do quadro transcrita da norma (2 itens, termina em "RISCO DE VIDA PARA OS USUÁRIOS DA INSTALAÇÃO.") | referência fixa | medio |

### G27

| Critério | Cláusula | O que verifica | Referência | Severidade |
|---|---|---|---|---|
| G27.1 | — | Exportar e reimportar (arquivo JSON e link) devolve o mesmo projeto e o mesmo cálculo | só consistência | alto |
| G27.2 | — | Arquivo inválido é recusado; campos de tipo errado voltam ao padrão em vez de entrar no cálculo | referência fixa | medio |
| G27.4 | — | Arquivo com opções inexistentes (até nomes do protótipo) e mapas de tipo errado abre e calcula, com os padrões no lugar | referência fixa | alto |
| G27.3 | — | A casa-modelo tem todos os comprimentos preenchidos e sai sem problema nem pendência (é a demonstração) | só consistência | medio |

### G28

| Critério | Cláusula | O que verifica | Referência | Severidade |
|---|---|---|---|---|
| G28.1 | §6.1.5.3, §6.4.3.4 | Cabos da casa-modelo por função e seção batem com a conta à mão (TN-C-S: PEN no alimentador, sem PE separado; fase-fase sem neutro) | só consistência | medio |
| G28.2 | — | Folga é só a informada, arredondada para cima (39 m + 10% = 43 m); sem folga, nenhuma | referência fixa | medio |
| G28.3 | §6.3.5.2.3 a), §6.5.4.7 / Tabela 59, §6.1.5.4 | Quadro: DPS em conexão 2 (fases + neutro–PE), reserva da Tabela 59 e circuitos numerados na ordem do trilho | só consistência | medio |
| G28.4 | §5.3.4.1 | Existente: 2,5 mm² com 20 A num circuito de Iz 13,7 A não atende (In > Iz); a própria seção e disjuntor dimensionados não falham em nenhum item verificável — o único item em aberto é o curto-circuito, "não verificado" abaixo de 10 mm² (Tabela 30 NOTA 1, ver G34.3), não uma falha nova | só consistência | alto |
| G28.5 | §5.3.4.1 | Instalação existente que não atende deixa o veredito vermelho, apontando o Dimensionamento | só consistência | alto |
| G28.6 | Tabela 58 / §5.1.2.2.4 | Existente: PE conferido pela Tabela 58 e seccionamento refeito com o PE instalado (PE 2,5 mm² em fase de 4 mm² reprova; sem PE, fica em aberto). PE 4 mm² não falha em nada verificável — só fica "não verificado" no curto-circuito, abaixo de 10 mm² (Tabela 30 NOTA 1, ver G34.3) | referência fixa | alto |

### G29

| Critério | Cláusula | O que verifica | Referência | Severidade |
|---|---|---|---|---|
| G29.1 | §9.4.4.3.2 | Sauna: mínimo de tomadas é 0 (a proibição prevalece sobre §9.5.2.2.1); tomada informada vira não conformidade | só consistência | alto |
| G29.2 | §9.4.4.1.4, §9.4.4.3.3 | Sauna com aquecedor: exige cabo para 170 °C no volume 3 (a ferramenta não dimensiona) e desligamento a 140 °C na lista | referência fixa | medio |
| G29.3 | §9.2.4.1, §9.2.3.1.4 | Piscina: IPX8 / IPX5 / IPX2 (mínimos por volume), equipotencialização suplementar e lista própria; sem piscina, nada | só consistência | medio |
| G29.4 | — | Consumo: 5500 W × 0,5 h × 30 dias = 82,5 kWh; × R$ 0,80 = R$ 66,00; carga sem horas fica fora; sem dias, nenhum total | referência fixa | medio |
| G29.5 | §5.3.5.5.1 | Especificação: Icn mínima sobe para a próxima padronizada (NBR NM 60898), nunca desce (5 → 6 kA; 2,9 → 3 kA, a do curto entre fases no quadro) | só consistência | medio |

### G30

| Critério | Cláusula | O que verifica | Referência | Severidade |
|---|---|---|---|---|
| G30.1 | §6.2.11.1.6 b) | Limite do trecho: 15 m interno / 30 m externo, menos 3 m por curva de 90° (15 m reto passa; 13 m com 1 curva passa do limite de 12 m; 27 m externo com 1 curva passa) | referência fixa | medio |
| G30.2 | §6.2.11.1.7 | Mais de 3 curvas de 90° num trecho é não conforme, mesmo curto | só consistência | medio |
| G30.3 | §6.2.11.1.6 b) NOTA | Alternativa da NOTA: +1 tamanho de eletroduto por 6 m ou fração de excesso (exemplo da norma: 9 m → 2 degraus) | referência fixa | medio |
| G30.4 | §6.2.11.1.6 b) | Trecho fora do limite (14 m com 2 curvas > 9 m) deixa o veredito vermelho, apontando o Dimensionamento | só consistência | medio |
| G30.5 | §6.2.11.1.6 b) | Percurso do alimentador (medidor → quadro) é verificado e entra no veredito | referência fixa | medio |

### G31

| Critério | Cláusula | O que verifica | Referência | Severidade |
|---|---|---|---|---|
| G31.1 | — | Retângulo de 80 × 60 px a 0,05 m/px = 4 × 3 m → 12 m² e 14 m de perímetro | referência fixa | medio |
| G31.2 | — | Detecção: dois cômodos separados por parede com porta viram 2 retângulos exatos (face interna das paredes); sem fechar o vão da porta, não viram | referência fixa | medio |

### G32

| Critério | Cláusula | O que verifica | Referência | Severidade |
|---|---|---|---|---|
| G32.1 | — | Sem distribuidora escolhida, demandaConcessionaria é null (nada muda no projeto por padrão) | só consistência | medio |
| G32.2 | — | CPFL: 5,46 kW de iluminação/tomadas cai na faixa "acima de 10 kW"? Não — cai em nenhuma faixa ≤10 (é >5, ≤6) → FD 0,45 → demanda 2,457 kW | referência fixa | medio |
| G32.3 | — | EDP SP e Neoenergia dão o mesmo resultado que a CPFL para a mesma carga (tabela idêntica, conferida contra 3 PDFs oficiais) | referência fixa | medio |
| G32.4 | — | Cemig: mesma carga, tabela própria e diferente → FD 0,64 → demanda 3,4944 kW (não é a mesma da CPFL) | referência fixa | medio |
| G32.5 | — | Celesc e EDP ES não reduzem carga residencial: FD=1, demanda = carga instalada cheia (5,46 kW) | referência fixa | medio |
| G32.6 | — | Enel não publica tabela própria: aplicavel=false, com o motivo explicado, não um valor chutado | só consistência | medio |
| G32.7 | — | Light: carga acima da faixa conferida da tabela (>9 kW) fica não aplicável, em vez de extrapolar um fator | só consistência | baixo |
| G32.8 | §5.3.5.5.1 / N18 | Piso de Icn da Cemig no disjuntor geral (63 A → mínimo 5 kA) vale mesmo sem Icc declarada; sem distribuidora, continua null | referência fixa | medio |

### G33

| Critério | Cláusula | O que verifica | Referência | Severidade |
|---|---|---|---|---|
| G33.1 | §9.1.2.1 | Régua de distância/altura dos volumes 0-3, com box declarado (caixa 0,9×0,9 m) | referência fixa | critico |
| G33.2 | §9.1.2.1, nota 1 (Figura 18) | A "tampa" do volume 2 (0 a 0,6m de distância, entre 2,25 e 3m de altura) é classificada como vol.2, não como fora dos volumes — leitura conservadora, nunca a mais permissiva | referência fixa | alto |
| G33.3 | §9.1.2.1, Figura 18 | Caixa 0×0 (chuveiro sem piso-boxe): mesma fórmula de distância vira um círculo de raio 0,6m ao redor do chuveiro | referência fixa | alto |
| G33.4 | §9.1.4.3.1 · §9.1.4.3.2 | Tomada no volume 1 é não conforme; a mesma tomada no volume 3 é conforme (DR ≤30mA já garantido) | só consistência | critico |
| G33.5 | §9.1.4.4 | Aquecedor: proibido no volume 0, permitido no volume 1 (classe I/II). Luminária: proibida no volume 1, só a partir do volume 2 (classe II) | só consistência | alto |
| G33.6 | — | Ponto sem altura declarada (ainda não preenchida) não entra na lista verificada — não vira falso "conforme" nem "não conforme" | referência fixa | medio |
| G33.7 | §9.1.2.1 / §9.1.4.3.1 | locaisEspeciais.pontosPorComodo e pontosNaoConformes refletem a geometria marcada; o veredito aponta o ponto não conforme | referência fixa | alto |
| G33.8 | — | Sem geometriaBanheiro marcada, pontosPorComodo continua vazio (regressão do caso comum) | só consistência | medio |
| G33.9 | — | normalizarProjeto sanitiza geometriaBanheiro vinda de fora: tipo inválido vira "outro", ponto ganha id, "pontos" não-array vira [] | só consistência | alto |

### G34

| Critério | Cláusula | O que verifica | Referência | Severidade |
|---|---|---|---|---|
| G34.1 | §6.2.6.2.6 / Tabela 48 | Tabela 48 transcrita sem linhas que a norma não tem (começa em 35 mm²) | referência fixa | baixo |
| G34.2 | §6.2.6.2.5 | Taxa de 3a harmônica acima de 33% (neutro possivelmente MAIOR que a fase) é distinguível e avisada | só consistência | medio |
| G34.3 | Tabela 30, NOTA 1 | k abaixo de 10 mm² sinalizado como não normalizado, e o curto-circuito fica não verificado nessa faixa | só consistência | medio |
| G34.4 | Tabela 45 | Sub-tabela de condutores isolados/unipolares em eletroduto enterrado disponível | só consistência | medio |
| G34.5 | Anexo C, Tabela C.2 / Tabela C.1 NOTA 2 | Tensão de contato limite cobre as três situações da norma | referência fixa | medio |
| G34.6 | §9.1.2.1 a) | Volume 0 limitado em altura (não se estende indefinidamente acima do box) | só consistência | medio |
| G34.7 | §9.1.2.1 b) | Com box declarado, volume 1 não é estendido 0,6 m além da borda | só consistência | medio |
| G34.8 | §9.1.2.1 b), c), d) | Altura do volume 1 referida ao fundo do box (baseM), não ao piso do banheiro como nos volumes 2 e 3 | referência fixa | medio |
| G34.9 | §9.5.2.2.1 c) vs e) | Varanda tem regra própria (1 ponto), separada da regra dos "demais cômodos" (1 por 5 m) | referência fixa | baixo |
| G34.10 | §9.5.2.2.2 a) | Alternativa permissiva dos 2 pontos só entra em ação com `aplicarAlternativa600VA` declarado — nunca por padrão | só consistência | medio |
| G34.11 | — (cobertura do próprio harness) | Todo método selecionável tem dupla digitação independente, nas duas tabelas de ampacidade | referência fixa | medio |

### G35

| Critério | Cláusula | O que verifica | Referência | Severidade |
|---|---|---|---|---|
| G35.1 | §6.2.7.1 c) / Problema A | Queda do alimentador trifásico com toda a carga numa fase (cosφ 0,8) bate com o cálculo manual (3,55%), não com a fórmula equilibrada (2,02%) | referência fixa | critico |
| G35.2 | §6.2.7.1 c) | Carga equilibrada: o neutro (mesmo reduzido) não altera a queda — 1,78% manual; a aproximação R·cosφ+X·senφ (1,786%) fica dentro de 0,02 | referência fixa | alto |
| G35.3 | §6.2.7.1 c) | Carga desequilibrada (A 9 kVA cosφ 0,9 ind., B 3 kVA, C 1 kVA cosφ 0,7 cap.), neutro 16 mm²: coincide com a referência independente; neutro mais fino piora a queda | referência fixa | alto |
| G35.4 | — (robustez de entrada) | Queda fasorial sem seção, sem tensão ou sem fasores retorna null (não verificado), nunca 0 | referência fixa | alto |
| G35.5 | §6.2.7.1 c) / §6.2.5 | dimensionarProtecaoGeral escolhe a menor seção que cumpre ampacidade E queda fasorial (≤5%), e reporta a queda fasorial | referência fixa | critico |
| G35.6 | §5.3.5.1 / Problema B | Icc mínima fase-neutro do alimentador usa a seção REAL do neutro reduzido (50/25 mm², 30 m): 2032,8 A, não 2298,9 A | referência fixa | critico |
| G35.7 | §6.3.4.3.2 a) | Alimentador 50/25 mm² a 90 m: Icc mínima real (966 A) < disparo instantâneo (1250 A) — não pode aparecer como verificado/conforme | referência fixa | critico |
| G35.8 | §5.3.5.1 | Sem neutro reduzido, a Icc mínima e a de referência para I²t são iguais (regressão: caso comum inalterado) | referência fixa | medio |
| G35.9 | §5.3.5.1 | Icc fase-fase do alimentador 50 mm² / 30 m coincide com a referência independente (laço pelas 2 fases, sem neutro) | referência fixa | alto |
| G35.10 | §5.3.5.1 / Problema B | Projeto completo, neutro 70/35 mm²: Icc na ponta do circuito terminal fase-neutro bate com a referência independente (neutro real do ramal) | referência fixa | critico |

### G36

| Critério | Cláusula | O que verifica | Referência | Severidade |
|---|---|---|---|---|
| G36.1 | Tabelas 36 e 37 | As 288 células de cobre (12 seções × 12 colunas × 2 tabelas) são idênticas às lidas do PDF por posição (x,y) das palavras | referência fixa | critico |
| G36.2 | Tabela 40 | Fatores de temperatura (15 temperaturas × PVC/EPR × ar/solo = 60 valores) idênticos à tabela do PDF, inclusive as faixas sem valor (PVC acima de 60 °C → null) | só consistência | critico |
| G36.3 | Tabelas 42 (ref. 1 e 2) e 45 | Fatores de agrupamento idênticos ao PDF; onde a tabela não tem valor (ref. 2 acima de 11 circuitos; Tabela 45 acima de 6) o motor devolve null | referência fixa | alto |
| G36.4 | Tabelas 48 e 58 | Seção do neutro reduzido (Tab. 48) e do condutor de proteção (Tab. 58) idênticas ao PDF; 120 mm² → S/2=60, adota 70 (maior das duas equidistantes) | referência fixa | critico |
| G36.5 | Tabelas 30 e 47; §6.2.11.1.6 a) | k = 115 (PVC) e 143 (EPR); seções mínimas 1,5 (iluminação) e 2,5 mm² (força); taxas de ocupação 53/31/40% | referência fixa | alto |

### G37

| Critério | Cláusula | O que verifica | Referência | Severidade |
|---|---|---|---|---|
| G37.1 | §9.5.2.1.2 | Iluminação mínima nas fronteiras de área (5,99/6/9,99/10/13,99/14 m²…), valores calculados à mão | só consistência | critico |
| G37.2 | §9.5.2.2.1 | Quantidade mínima de tomadas por tipo de cômodo, nas fronteiras de perímetro (5/10 m salas; 3,5/7 m cozinhas) e área (2,25/6 m² demais) | só consistência | critico |
| G37.3 | §9.5.2.2.2 | Potência dos pontos de tomada: cozinha de 4 pontos = 3×600+100 = 1900 VA; banheiro = 600 VA; sala de 3 pontos = 300 VA | referência fixa | critico |
| G37.4 | §9.5.2.2.2 a) | Duas cozinhas de 4 pontos (8 > 6): leitura base 2×1900 = 3800 VA; alternativa "admite-se" (opt-in) 2×1400 = 2800 VA | referência fixa | alto |
| G37.5 | §4.2.1.2 / §6.2.5 | Potência aparente do equipamento: 1000 W/0,85 = 1176,47 VA; motor 736 W, η 0,8, cosφ 0,85 = 1082,35 VA; cosφ>1, η>1 e potência negativa nunca reduzem a carga | referência fixa | critico |
| G37.6 | §9.5.2.1.2 / §9.5.2.2.1 | Iluminação (1×60 W em 20 m², mínimo 280 VA) e tomadas (1 em perímetro 14 m, mínimo 4) abaixo da norma são sinalizadas | referência fixa | alto |
| G37.7 | §9.5.2 | O veredito do projeto fica vermelho (não conforme) quando iluminação ou tomadas informadas estão abaixo do mínimo — antes dizia "conforme" | só consistência | critico |

### G38

| Critério | Cláusula | O que verifica | Referência | Severidade |
|---|---|---|---|---|
| G38.1 | Tensão de fase × linha | Chuveiro fase-fase em 127/220 V = 220 V (25 A); em 220/380 V = 380 V (14,47 A); forno fase-neutro 2540 VA em 127 V = 20 A — nunca mistura fase com linha | referência fixa | critico |
| G38.2 | §6.2.5.6 / §6.2.6.2 | Corrente de neutro por soma fasorial: fase-fase isolado → 25 A nas duas fases (25,003 A: o fasor usa 127·√3 = 219,97 V, não os 220 V nominais — 0,014%, a favor da segurança) e neutro 0; duas cargas iguais de 10 A → neutro 10 A; três iguais → 0 | referência fixa | alto |
| G38.3 | §6.2.6.2 | Indutiva em A e capacitiva em B (10 A cada, cosφ 0,8): neutro = /9,2 − j15,93/ = 18,39 A, maior que qualquer fase (10 A) — a hipótese "neutro ≤ maior fase" é falsa | referência fixa | alto |
| G38.4 | §6.2.7 | Queda de tensão com R e X, carga indutiva: 1,3305%; capacitiva (X com sinal oposto): 2·25·(0,071225·0,8 − 0,0026·0,6)/220 = 1,2596% | referência fixa | alto |

### G39

| Critério | Cláusula | O que verifica | Referência | Severidade |
|---|---|---|---|---|
| G39.1 | Tabelas 36/37 · §5.3.4.1 | Ib = 20 A em cada um dos 6 métodos (A1/A2/B1/B2/C/D) × PVC/EPR: seção e Iz iguais ao esperado pela tabela do PDF | só consistência | critico |
| G39.2 | §6.2.5.3 / §6.2.5.5 / Tabelas 40 e 42 | Mudança de temperatura (40/45 °C) e de agrupamento (2/3/4 circuitos) muda a seção como calculado à mão; Iz = tabela × FCT × FCA | só consistência | critico |
| G39.3 | §6.2.7.2 | Limite de 4% no circuito terminal: 4 mm² serve a 23 m (3,870%) e deixa de servir a 24 m (4,038%) → 6 mm² (2,692%) | referência fixa | critico |
| G39.4 | Tabela 47 · §5.3.4.1 | Seção mínima: iluminação 14 A (In 16) = 1,5 mm² (Iz 17,5); com FCA 0,8 → 2,5 mm²; tomada de 1 A nunca abaixo de 2,5 mm² | referência fixa | alto |
| G39.5 | §5.3.4.1 a) e b) | Varredura Ib 0,5…200 A × 6 métodos × PVC/EPR (${n} casos): disjuntor e seção mínimos, e Ib ≤ In ≤ Iz (Iz da tabela do PDF) em todos | só consistência | critico |
| G39.6 | §6.2.5.3 / §6.2.5.5 | PVC a 65 °C (sem fator na Tabela 40) e método C com 12 circuitos (sem fator na Tabela 42, ref. 2): erro explícito e nenhuma seção — nunca aprovação por extrapolação | referência fixa | alto |

### G40

| Critério | Cláusula | O que verifica | Referência | Severidade |
|---|---|---|---|---|
| G40.1 | §6.2.6.2.3 / .5 / .6 · Tabela 48 | Neutro do alimentador trifásico (fase 50 mm²): igual à fase por padrão e sem declaração de harmônica; 25 mm² só com as condições declaradas e harmônica ≤15%; igual à fase com 15–33%; "acima de 33%" gera aviso de neutro possivelmente maior | referência fixa | critico |
| G40.2 | §6.2.5.6.1 | Harmônica >15%: Iz do alimentador = Tabela 36 (3 condutores) × 0,86 — 50 mm² cai de 134 para 115,24 A e deixa de servir ao disjuntor de 125 A; adota 70 mm² (147,06 A) | referência fixa | critico |
| G40.3 | §6.2.6.2.2 / .4 / .6 | Neutro igual à fase em monofásico (50→50), bifásico (50→50) e trifásico com fase ≤25 mm² (25→25); reduz só acima de 25 mm² (35→25) | referência fixa | critico |
| G40.4 | §6.2.6.2.6 a) · §6.2.5 | Carga toda numa fase (118,1 A no neutro) com neutro reduzido pela Tabela 48 (25 mm²): a verificação da corrente real do neutro reprova (conforme=false), em vez de aceitar a redução | referência fixa | critico |

### G41

| Critério | Cláusula | O que verifica | Referência | Severidade |
|---|---|---|---|---|
| G41.1 | §5.3.5.5.2 / Tabela 30 | I²t ≤ k²S² exato: PVC 10 mm² aceita 11.500 A e reprova 11.501 A; EPR 10 mm² aceita 14.300 A e reprova 14.301 A | só consistência | critico |
| G41.2 | §6.3.4.3.2 a) · IEC 60898 | Ikmin só garante o disparo no limite superior da faixa magnética: In 32 A → B 160 A, C 320 A, D 640 A (no limite verifica; 0,01 A abaixo fica não verificado) | só consistência | critico |
| G41.3 | Tabela 30 NOTA 1 · §5.3.5.1 | Seção de 6 mm², Icc ausente (0) e Icc mínima ausente: sempre "não verificado" (verificado=false, conforme=null), nunca conforme | só consistência | critico |
| G41.4 | §5.1.2.2.4.2 d) | Seccionamento TN: Zs ≤ 0,635 Ω atende (In 20 A, curva C, Uo 127 V); Zs = 0,636 Ω deixa de atender pelo disjuntor (sem DR → não verificado) | referência fixa | critico |
| G41.5 | §5.1.2.2.4.3 b) · Anexo C | TT: RA ≤ 1666,7 Ω (UL 50 V) e ≤ 833,3 Ω com banheiro (UL 25 V), nos dois lados do limite | só consistência | critico |

### G42

| Critério | Cláusula | O que verifica | Referência | Severidade |
|---|---|---|---|---|
| G42.1 | §6.2.11.1.6 a) | Eletroduto por área externa real (não mm² nominal): 3×2,5 mm² (Ø 3,60) → 1/2" (30,71 mm² em 211,2 = 14,54%); 3×25 mm² → 1" (3/4" daria 48,9% > 40%); 2×25 mm² → 1" (3/4" daria 32,6% > 31%) | referência fixa | alto |
| G42.2 | §5.1.3.2.2 / §6.3.3.2 | DR geral: 40 A → 40; 41 A → 63; 100 A → 100; 101 A → sem DR padronizado (null); 4 polos em trifásico; sensibilidade 30 mA | referência fixa | alto |
| G42.3 | §6.3.5.2.4 a), b), d) · Tabelas 31 e 49 | DPS: 127 V → Up 1,5 kV, Uc 139,7 V, In 5 kA, N-PE 10 kA (mono), PE 4 mm²; 220 V trifásico com descarga direta → Up 2,5 kV, Uc 242 V, N-PE 20 kA, Iimp 12,5 kA, PE 16 mm² | referência fixa | alto |
| G42.4 | §5.4.2.1.1 a) | DPS é "exigido pela norma" somente com alimentação aérea + região de alto índice de descargas; nos demais casos é recomendação — e a ferramenta não alega exigência | só consistência | alto |
| G42.5 | Tabela 59 | Reserva do quadro nas fronteiras 6/7, 12/13, 30/31, e 0,15·N arredondado para cima (31→5, 40→6, 101→16) | só consistência | alto |
| G42.6 | §6.4.4.1.1 | Equipotencialização principal: metade do maior PE (padronizada), mín. 6, limitada a 25 mm² | só consistência | medio |
| G42.7 | Tabela 59 NOTA | Reserva declarada entra no alimentador (2 circuitos × 1000 VA / 127 V = +15,748 A); não declarada, vira pendência do veredito | referência fixa | alto |

### G43

| Critério | Cláusula | O que verifica | Referência | Severidade |
|---|---|---|---|---|
| G43.1 | §9.1.2.1 b), c), d) | Fronteiras com box delimitado: volume 1 até 2,25 m; volume 2 até 0,6 m e 3 m de altura; volume 3 até 0,6+2,40 = 3,0 m e 2,25 m de altura | só consistência | critico |
| G43.2 | §9.1.2.1 b) × c) | Banheira com fundo a 0,5 m: volume 1 vai até 2,75 m (2,25 acima do fundo); acima disso e até 3 m (do piso) é volume 2 | referência fixa | alto |
| G43.3 | §9.1.4.3 / §9.1.4.4 | Tomada no volume 2 (0,3 m, 1 m de altura) → não conforme; tomada no volume 3 (1 m) → conforme (DR 30 mA); interruptor no volume 1 → não conforme; luminária no volume 1 → não conforme, no volume 2 → conforme (classe II); aquecedor no volume 1 → conforme (classe I/II) | referência fixa | critico |

### G44

| Critério | Cláusula | O que verifica | Referência | Severidade |
|---|---|---|---|---|
| G44.1 | Entrada ausente | Projeto sem nenhum cômodo NÃO é "conforme": o veredito traz a pendência "nenhum cômodo cadastrado" (antes dizia ok) | só consistência | critico |
| G44.2 | Entrada inválida | Área negativa/texto, tipo desconhecido, potência negativa, cosφ>1, η>1 e quantidade negativa: sem exceção e com problema apontado (veredito vermelho) | só consistência | critico |
| G44.3 | Entrada ausente | Área, perímetro ou potência em branco: pendência explícita (não verificado), nunca "ok" — e o equipamento sem potência é avisado como fora do cálculo | só consistência | alto |
| G44.4 | Dados incompatíveis | cosφ 1,5 não pode diminuir a corrente (≥ a de cosφ 1); potência negativa não abate a carga das demais | referência fixa | critico |
| G44.5 | §6.2.6.1.2 e) | Circuitos sem comprimento informado: "não verificado" (naoVerificado=true, conforme=false) e pendência no veredito — queda 0% não aprova nada | só consistência | alto |
| G44.6 | §6.4.3.4.1 | PEN do TN-C-S: seção mínima 10 mm² (Cu); o neutro do alimentador adotado (≥10 mm² pelo piso prático) atende | referência fixa | medio |

### G45

| Critério | Cláusula | O que verifica | Referência | Severidade |
|---|---|---|---|---|
| G45.1 | Creder Tab. 3.7 × NBR Tab. 37 | Duas células da Tabela 3.7 do livro divergem da NBR (4 mm² B1/3 = 57 × 37 A; 95 mm² D/2 = 525 × 252 A) e são erros de impressão: o código usa a NBR (37 A e 252 A), coerente com a coluna de 2 condutores e com a seção vizinha | referência fixa | medio |
| G45.2 | Creder Tab. 3.18 | Para cada Σ(P·ℓ) que o livro dá como 1% de queda (9 seções, 127 V), o motor calcula 1,239% (= 58/46,8): mesma fórmula, resistência a 70 °C em vez de 20 °C — nunca menos que o livro | referência fixa | alto |
| G45.3 | Creder Tab. 3.22/3.23 | Em nenhuma das 12 seções o diâmetro externo do cabo PVC usado no eletroduto fica abaixo do que resulta da área "Total" do livro (antes: 50 mm² −6,5% e 120 mm² −8,7% de área) | só consistência | alto |
| G45.4 | Creder Tab. 10.4 | Diâmetros internos dos eletrodutos de 20 a 85 mm iguais aos do livro; o de 16 mm (Di 12,8), sem fonte, saiu da lista — o menor passa a ser o de 20 mm (1/2") | referência fixa | medio |
| G45.5 | Creder §4.5.3 | Icc a jusante pelo método do motor (7,52 kA) fica a 1,2% do exemplo do livro (7,43 kA, fórmula simplificada com cosφ_ko = 0,5): mesma ordem de grandeza e mesmo sentido | referência fixa | medio |

