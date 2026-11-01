# Matriz de conformidade — auditoria independente (nov/2026)

Estados: **Conforme** (inspecionado nesta auditoria e demonstrado com referência independente) ·
**Não conforme** · **Parcialmente implementado** · **Não implementado** · **Não verificado**
(não foi possível confirmar). Referências a páginas são do `NBR-5410.pdf` (página do PDF).

| Funcionalidade | Referência normativa | Implementação | Teste independente | Resultado |
|---|---|---|---|---|
| Iluminação mínima | §9.5.2.1.2 | `calcularIluminacaoMinimaVA` | G37.1 (fronteiras 5,99/6/9,99/10/14 m², conta manual) | Conforme |
| Número de tomadas | §9.5.2.2.1 | `calcularQuantidadeTugMinima` | G37.2 (16 casos, fronteiras de perímetro e área) | Conforme |
| Potência das tomadas, 600/100 VA | §9.5.2.2.2 | `potenciaTugPorPonto` | G37.3, G37.4 | Conforme (alternativa permissiva só com opt-in) |
| Aquecimento de água sem tomada | §9.5.2.3 | só texto | — | Não verificado |
| Divisão de circuitos | §9.5.3 | `gerarCircuitos` | G3, G13 (harness anterior) + G38.1 | Parcialmente implementado: um circuito por TUE (conservador); tetos de VA são convenção de projeto |
| Corrente de projeto mono/bi/tri, fase × linha | §6.2.5 | `calcularCorrenteProjeto`, vetorial | G38.1–G38.3 | Conforme |
| Fator de potência | — | cosφ por equipamento | G37.5, G38.4 | Conforme; iluminação/TUG tratadas como cosφ = 1 (declarado) |
| Rendimento η | — | campo opcional | G37.5 | Conforme (novo) |
| Potência instalada / demandada | — | soma cheia, sem fator de demanda | — | Parcialmente implementado: a NBR 5410 não fixa fator de demanda; padrão de distribuidora é informativo (G32) |
| Ampacidade, Tabelas 36/37 | §6.2.5 | `obterAmpacidade` | G36.1 (288 células × PDF), G39.1, G39.5 (varredura 4800 casos) | Conforme |
| Fator de temperatura, Tabela 40 | §6.2.5.3 | `obterFatorTemperatura` | G36.2 (60 valores × PDF) | Conforme |
| Fator de agrupamento, Tabelas 42/45 | §6.2.5.5 | `obterFatorAgrupamento` | G36.3; fora da tabela → null (G39.6) | Conforme (corrigido); Tabela 43/44 não implementadas |
| Resistividade do solo, Tabela 41 | §6.2.5.4 | `obterFatorResistividadeSolo` | G18 (harness anterior) | Não verificado nesta rodada contra o PDF célula a célula (4 pontos lidos manualmente: 1,18/1,10/1,05/0,96 conferem) |
| Nº de condutores carregados, Tabela 46 + 0,86 | §6.2.5.6 | `TABELA_46…`, `FATOR_NEUTRO_CARREGADO` | G40.2, G16 | Conforme |
| Seções mínimas, Tabela 47 | §6.2.6.1.1 | `SECAO_MINIMA_MM2` | G36.5, G39.4 | Conforme |
| Queda de tensão, circuito terminal | §6.2.7.2 | `calcularQuedaPercentual` | G38.4, G39.3 (4,0%: 3,870 / 4,038%) | Conforme |
| Queda de tensão, alimentador | §6.2.7.1 c) | `calcularQuedaAlimentadorFasorial` | G35.1–G35.5 | Conforme (corrigido) |
| Queda 7% (transformador/gerador próprios) | §6.2.7.1 a), b), d) | — | — | Não implementado (fora do escopo residencial) |
| Neutro (mono/bi/tri, ≤ 25 mm², Tabela 48) | §6.2.6.2 | `dimensionarCondutorNeutroGeral` | G36.4, G40.1, G40.3 | Conforme |
| 3ª harmônica 15% / 33% | §6.2.6.2.3 / .5 | `TAXAS_TERCEIRA_HARMONICA` | G40.1, G40.2 | Parcialmente implementado: > 33% só avisa (Anexo F não implementado) |
| Corrente real do neutro | §6.2.6.2 | `verificacaoNeutro` | G38.3, G40.4 | Conforme |
| Harmônicas além da 3ª, cargas não lineares | Anexo F | — | — | Não implementado |
| PE, Tabela 58 | §6.4.3.1 | `calcularSecaoTerra` | G36.4 | Conforme |
| Equipotencialização principal | §6.4.4.1.1 | `calcularEquipotencializacaoPrincipal` | G42.6 | Conforme |
| Equipotencialização suplementar | §6.4.4.1.2, §9.1.3.1.2 | seções mínimas informadas | G24 | Parcialmente implementado: dimensiona, não verifica a instalação em campo |
| Esquemas TN/TT, seccionamento | §5.1.2.2.4 | `verificarSeccionamentoTN/TT` | G41.4, G41.5 | Conforme; IT não implementado |
| Continuidade do PE | §6.4.3 | — | — | Não verificado (só em campo) |
| Disjuntor Ib ≤ In ≤ Iz | §5.3.4.1 | `escolherDisjuntor` + trilha | G39.5 | Conforme |
| I₂ ≤ 1,45·Iz | §5.3.4.1 b) | `verificarSobrecarga` (I₂ = 1,45·In, IEC 60898) | G39.5 | Conforme (I₂ vem da norma de produto) |
| Curvas B/C/D, Ikmin | §6.3.4.3.2 a) | `TABELA_MULTIPLICADOR…` | G41.2 | Parcialmente implementado: só o limite superior da faixa magnética |
| Capacidade de interrupção | §5.3.5.5.1 | especificação (Icc na origem e no quadro) | G23 | Conforme (especifica; não confere o disjuntor instalado) |
| Seletividade | §5.3.6, §6.3.6 | — (só DR) | — | Não implementado |
| I²t ≤ k²S² | §5.3.5.5.2, Tabela 30 | `verificarCurtoCircuito` | G41.1, G41.3 | Conforme; seção < 10 mm² → não verificado (Tabela 30 NOTA 1) |
| Icc fase-neutro, neutro reduzido | §5.3.5.1 | `iccQuadroMinA`, `secaoVoltaMm2` | G35.6–G35.10 | Conforme (corrigido) |
| Icc fase-fase | §5.3.5.1 | `propagarIccFaseFase` | G35.9 | Conforme (modelo de engenharia declarado) |
| Icc trifásica separada | §5.3.5.1 | Icc informada = trifásica | G23 | Parcialmente implementado (premissa: usuário informa) |
| DR 30 mA | §5.1.3.2.2 | `dimensionarIDR` / grupos | G42.2 | Conforme (aplicado a todos os circuitos: mais rigoroso que o mínimo da norma) |
| Tipo do DR (AC/A/B) | IEC 61008/61009 | — | — | Não implementado |
| DPS: Up, Uc, In, Iimp | §6.3.5.2.4, Tab. 31/49 | `especificarDPS` | G42.3, G42.4 | Conforme (especificação); coordenação em cascata e comprimento real das ligações: não verificados |
| DPS × NBR 5419 | NBR 5419 | só declaração do usuário | — | Não verificado (fora do escopo) |
| Eletroduto (taxa, Ø externo real) | §6.2.11.1.6 a) | `dimensionarEletroduto` | G42.1, G45.3, G45.4 | Conforme (corrigido); diâmetro do cabo = maior entre catálogo e Creder; Di dos eletrodutos conferem com a Tab. 10.4 |
| Percurso do eletroduto | §6.2.11.1.6 b), .7 | `verificarTrecho` | G30 | Não verificado nesta rodada |
| Banheiro: volumes, componentes | §9.1.2.1, §9.1.4 | `classificarVolume` | G43.1–G43.3 | Conforme (corrigido); sem planta é só checklist |
| Cabine de banho a 0,60 m | §9.1.4.3.3 | — | — | Não implementado |
| Piscina | §9.2 | checklist | — | Parcialmente implementado (sem geometria) |
| Sauna | §9.4 | checklist | G29 | Parcialmente implementado |
| Locais molhados/externos, influências externas | §4.2.6 | — | — | Não implementado |
| Alimentador | §6.2.6, §6.2.7.1 c) | `dimensionarProtecaoGeral` | G35, G40 | Conforme (corrigido) |
| Reserva do quadro | Tabela 59 | `calcularReservaQuadro` + carga declarada | G42.5, G42.7 | Conforme quando declarada; sem declaração é pendência |
| Equilíbrio de fases | §4.2.5 | DP exata | G10 | Não verificado nesta rodada |
| Padrão de entrada, concessionárias | normas de cada distribuidora | informativo (9) | G32 | Não verificado |
| Veredito (CONFORME / NÃO CONFORME / NÃO VERIFICADO) | — | `calcularVeredito` | G37.7, G44, G27.3 | Conforme (corrigido); lista de limitações sempre exibida |
| Conferência com Hélio Creder (16ª ed.) | Tabelas 3.2, 3.6, 3.7, 3.10–3.18, 3.22/3.23, 10.4, 5.3; §3.3, §3.4, §3.10, §4.5 | ver `AUDITORIA_NORMATIVA.md` | G45.1–G45.5 | Conforme, com 2 erros de impressão do livro e 2 divergências de método a favor da segurança; Tab. 3.12 e equações do §4.5.3 (imagens) não conferidas |
