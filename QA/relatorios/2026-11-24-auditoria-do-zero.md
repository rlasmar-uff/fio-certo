# Auditoria do zero do motor de cálculo — 24/11/2026

> **Atualização:** a 2ª rodada (telas, conteúdo, memorial e os módulos restantes do motor) achou mais
> problemas, entre eles um segundo crítico: no modo de DR padrão, a lista de materiais sai sem DR. A lista
> completa, renumerada, e o plano de correção estão em `docs/PLANO_DE_CORRECAO_2026-11.md`.

## 1. Como foi feita

- **Premissa:** tudo podia estar errado. Não usei o harness do projeto, a skill de QA, os arquivos
  de `QA/referencias/` nem os relatórios anteriores. Os comentários do código também não contaram
  como prova.
- **Fonte primária:** o PDF da ABNT NBR 5410:2004 (exemplar de 22/01/2010, 217 páginas), extraído
  com pdf.js preservando as colunas. Cada valor esperado foi calculado à mão a partir desse texto.
- **Código lido:** `constantes.js`, `previsaoDeCarga.js`, `circuitos.js`, `condutores.js`,
  `quedaDeTensao.js`, `agrupamento.js`, `protecaoGeral.js`, `curtoCircuito.js`,
  `condutorProtecao.js`, `seccionamento.js`, `exigenciaDR.js`, `locaisEspeciais.js`,
  `eletroduto.js` e `projeto.js`, além dos trechos de interface ligados aos achados.
- **Testes próprios:** 49, em `QA/auditoria-independente/testes.mjs`. As Tabelas 36 e 37 foram
  comparadas célula por célula com o PDF, por programa, não a olho.

**Resultado: 42 testes passaram e 7 falharam.** O núcleo do cálculo está correto. Os problemas
estão em verificações que deixam de acontecer, em suposições padrão que engrossam os cabos e em
textos que afirmam coisas que o motor não faz.

## 2. Achados

Gravidade pela direção do erro: **crítico** = pode deixar pessoas sem uma proteção exigida;
**alto** = verificação exigida que não acontece; **médio** = superdimensionamento ou explicação
errada; **baixo** = detalhe.

### 1. CRÍTICO — Piscina fica sem DR na configuração padrão, e a tela diz o contrário

- **O que acontece:** a opção "Aqui fica uma piscina" só aparece em cômodos do tipo **Outro**
  (`ComodoCard.jsx:111`). Esse tipo nunca entra em `exigenciaDR` (`exigenciaDR.js`), que também
  não lê a marcação `piscina`. No modo de DR padrão (`modoDR: 'exigidos'`, `estado.js:148`), todos
  os circuitos do local da piscina ficam **sem DR**: iluminação, tomadas e a bomba.
- **Prova:** `QA/auditoria-independente/piscina.mjs`. Saída: `sobDR=false exige=false` nos três
  circuitos.
- **O que a tela diz:** "No volume 2, todos os circuitos já estão sob DR de 30 mA"
  (`SecaoComplementares.jsx:186`). O comentário de `locaisEspeciais.js:235` diz o mesmo. As duas
  afirmações são falsas no modo padrão.
- **Norma:** §9.2.3.1.2 b) e §9.2.4.3.3 b) admitem equipamentos e tomadas no volume 2 só com DR de
  30 mA (ou SELV, ou separação elétrica). §5.1.3.2.2 b) exige DR nas tomadas de áreas externas.
- **Correção sugerida:**
  - fazer `exigenciaDR` exigir DR em todo circuito de cômodo com `piscina: true`;
  - oferecer a marcação de piscina também no tipo "Área externa";
  - trocar o texto por uma frase calculada a partir de `sobDR` em vez de uma afirmação fixa.

### 2. ALTO — Curto-circuito nunca é verificado em cabos abaixo de 10 mm²

- **O que acontece:** `obterK` (`constantes.js:403`) devolve `null` para qualquer seção abaixo de
  10 mm². O código se apoia na Nota 1 da Tabela 30: "Outros valores de k, para os casos
  mencionados abaixo, ainda não estão normalizados: condutores de pequena seção (principalmente
  para seções inferiores a 10 mm²)".
- **Efeito:** na casa-modelo, com Icc de 5 kA informada, **5 dos 6 circuitos** ficam "não
  verificado". Na prática, o critério I²t ≤ k²S² do §5.3.5.5.2 nunca é aplicado a 1,5, 2,5, 4 e
  6 mm², que são quase todos os circuitos de uma casa.
- **Por que considero a leitura errada:**
  - A Tabela 30 dá k = 115 para "PVC ≤ 300 mm²", sem limite inferior. A nota diz que *outros*
    valores, mais precisos, ainda não estão normalizados. Ela não diz que o 115 não vale para
    seções pequenas.
  - O próprio código já usa k = 115 para um **PE** de 2,5 mm² (Tabela 55, `condutorProtecao.js:8`).
    A Tabela 55 tem a mesma temperatura inicial e final da Tabela 30 para PVC. A ferramenta aceita
    o 115 no PE de 2,5 mm² e recusa o mesmo 115 na fase de 2,5 mm² (teste G4).
- **Correção sugerida:** usar k = 115 (PVC) e 143 (EPR/XLPE) em todas as seções até 300 mm², e
  mostrar a Nota 1 como ressalva. Vale **confirmar essa leitura com o professor** antes de mudar,
  porque é uma questão de interpretação.

### 3. MÉDIO — Por padrão, o motor supõe que todos os circuitos da casa correm no mesmo eletroduto

- **O que acontece:** sem um número de circuitos agrupados informado, `dimensionarCircuitos`
  (`condutores.js:322`) aplica o fator de agrupamento como se **todos** os circuitos da instalação
  estivessem juntos no mesmo eletroduto, em toda a extensão.
- **Efeito na casa-modelo (6 circuitos, FCA = 0,57):**
  - o chuveiro de 5.500 W em 220 V (Ib = 25 A, sozinho no eletroduto) sai com **10 mm²**. Sem
    agrupamento, a Tabela 36 dá **4 mm²** (2,5 mm² = 24 A não atende; 4 mm² = 32 A atende);
  - as tomadas saem com 4 mm² em vez de 2,5 mm².
- **Norma:** o §6.2.5.5 aplica fator de agrupamento a condutores que estão de fato agrupados. O
  §6.2.5.8 manda usar a condição mais desfavorável *do percurso real*. Supor o grupo inteiro é
  seguro, mas não é o que um projetista faria, e eleva o custo de cabo da obra.
- **Explicação na tela:** a interface mostra só "Tabela 42 — automático: 6"
  (`Dimensionamento.jsx:587`). Ela não diz que isso significa "todos juntos" nem que pode engrossar
  os cabos.
- **Correção sugerida:** pedir o agrupamento por trecho (a ferramenta já tem grupos de
  agrupamento) ou adotar 1 como padrão com um aviso forte. No mínimo, explicar a suposição e
  mostrar a seção que sairia sem ela.

### 4. MÉDIO — A explicação do método A1 cita a norma de forma errada

- **Texto atual:** "parede termicamente isolante (drywall, wood frame, steel frame — §6.2.5.1.2,
  nota 1)" (`constantes.js:107`, exibido em `Dimensionamento.jsx:397`).
- **O que a norma diz:**
  - a Nota 1 do §6.2.5.1.2 descreve uma parede com face externa estanque, isolação térmica e face
    interna de madeira, sem citar drywall, wood frame nem steel frame;
  - a Nota 5 da Tabela 33 diz o oposto do texto atual: os espaços internos de "paredes de gesso
    acartonado" são **espaços de construção**. Eletroduto ali segue as maneiras 21 a 25
    (B1 ou B2, conforme a relação V/De), não A1.
- **Efeito:** o erro vai para o lado seguro (A1 tem menos ampacidade), mas ensina errado e atribui
  à norma algo que ela não diz.
- **Correção sugerida:** remover "drywall, wood frame, steel frame" e, se quiser manter o drywall,
  apontar a Nota 5 da Tabela 33 e as maneiras 21 a 25.

### 5. MÉDIO — "Esta instalação já tem DR ≤ 30 mA em todo circuito"

- **Onde:** é o motivo mostrado para a tomada no volume 3 do banheiro (`locaisEspeciais.js:111`).
- **Problema:** no modo padrão a frase é falsa como afirmação geral. O circuito do banheiro tem DR
  porque o banheiro está na lista de exigência, não porque "todo circuito" tem.
- **Correção sugerida:** dizer "o circuito desta tomada está sob DR de 30 mA" com base em `sobDR`.

### 6. MÉDIO — Varanda não recebe DR por padrão

- **O que acontece:** tomadas de varanda só exigem DR se o usuário marcar "tomadas alimentam
  equipamentos no exterior".
- **Norma:** o §5.1.3.2.2 b) cobre tomadas "situadas em áreas externas à edificação" e a alínea c)
  cobre tomadas internas que "possam vir a alimentar equipamentos no exterior". Uma tomada de
  varanda é o caso típico da alínea c).
- **Correção sugerida:** deixar essa marcação ligada por padrão no tipo Varanda, ou pelo menos
  mostrar um aviso.

### 7. BAIXO — Garagem ou área externa pequena recebe mais tomadas que o mínimo

- **O que acontece:** o tipo "Área externa / garagem / dependência molhada" aplica 1 tomada por
  5 m de perímetro sempre. Uma garagem de 5 m² e 9 m de perímetro sai com 2 tomadas.
- **Norma:** pela alínea e) do §9.5.2.2.1, até 6 m² o mínimo é 1 tomada.
- **Efeito:** conservador, não perigoso.

### 8. BAIXO — Descrições dos volumes do banheiro imprecisas

- **Volume 1:** a descrição diz "0,6 m ao redor do chuveiro/banheira" (`locaisEspeciais.js:5`).
  Isso só vale **sem** box delimitado. Com box, o volume 1 é a projeção do próprio box (§9.1.2.1 b).
  O cálculo está certo; o texto não.
- **Graus de proteção:** a tela mostra "IPX3–IPX5" no volume 2 e "IPX1–IPX5" no volume 3. Pelo
  §9.1.4.1, em casa vale IPX3 e IPX1; o IPX5 é só para banheiros públicos.

### 9. BAIXO — Outras inconsistências

- **Método D:** o rótulo diz "cabo multipolar em eletroduto enterrado", mas o cálculo usa a
  sub-tabela de condutores unipolares da Tabela 45, que é mais severa. O resultado é seguro, mas o
  texto e o cálculo não combinam.
- **Comentário da Tabela 45:** o comentário de `TABELA_45_AGRUPAMENTO_ENTERRADO`
  (`constantes.js:604`) diz que o último fator é mantido como piso, mas `obterFatorAgrupamento`
  devolve `null` acima de 6 circuitos. O código está certo; o comentário, não.
- **Mensagem morta no PE:** `dimensionarPE` tem uma pendência "k da Tabela 53 para EPR/XLPE não
  consta do documento". O valor consta (176, linha 6948 do texto extraído) e a mensagem nunca
  aparece.
- **DR geral acima de 100 A:** `dimensionarIDR(125)` devolve corrente `null`, porque a lista de DR
  termina em 100 A. Vale conferir como a tela mostra isso.
- **Casa-modelo:** a varanda da casa-modelo está cadastrada como tipo "Outro", não "Varanda"
  (`casaModelo.js:33`).

## 3. O que foi conferido e está correto

| Item | Cláusula | Teste |
|---|---|---|
| Tabela 36 (cobre, PVC): 180 células idênticas ao PDF | Tab. 36 | A36 |
| Tabela 37 (cobre, EPR/XLPE): 180 células idênticas ao PDF | Tab. 37 | A37 |
| Tabelas 40, 41, 42 (linhas 1 a 3), 43, 44, 45, 46, 47, 48, 52, 53, 55 e 58, conferidas contra o texto | — | leitura + D5–D8, F1–F5 |
| Iluminação: 100 VA + 60 VA por 4 m² **inteiros** (piso) | §9.5.2.1.2 | B1 |
| Tomadas "por X m ou fração" (teto), inclusive em múltiplos exatos como 10,5 m | §9.5.2.2.1 | B2, B3 |
| 600 VA nas 3 primeiras tomadas, 100 VA nas demais; alternativa de 2 pontos só por opção do usuário | §9.5.2.2.2 a) | B5, B6 |
| Hall de serviço com 1000 VA; potência de saída dividida por η·cosφ | §4.2.1.2.1/3 | B7, B8 |
| Tomadas de cozinha/serviço em circuito exclusivo; iluminação separada de tomadas | §9.5.3.2, §4.2.5.5 | C1, C2 |
| Equipamento acima de 10 A em circuito próprio; exatamente 10 A não obriga | §9.5.3.1 | C3 |
| Circuito misto limitado a 16 A | §9.5.3.3 a) | C4 |
| Correntes por fase e no neutro somadas como fasores (conferido à mão) | — | C5, C6 |
| Coordenação Ib ≤ In ≤ Iz, com Iz já corrigido por temperatura e agrupamento | §5.3.4.1 | D1, D3 |
| Bifásico com neutro = 3 condutores carregados; fator 0,86 para 4 condutores | Tab. 46, §6.2.5.6.1 | D5, D8 |
| Queda de tensão: fórmula, resistência a 70 °C, orçamento min(4 %, 5 % − alimentador) | §6.2.7 | D2, E1–E3, E5 |
| Comprimento não informado vira "não verificado", nunca 0 % aprovado | §6.2.6.1.2 e) | E4 |
| Neutro reduzido só em trifásico acima de 25 mm², com as três condições declaradas | §6.2.6.2.6 | F2 |
| PE por tabela, por cálculo (√(I²t)/k) e mínimo de 4 mm² fora do conduto | §6.4.3.1 | F1, F3, F4 |
| I²t ≤ k²S² quando aplicado (10 mm² ou mais) | §5.3.5.5.2 | G1 |
| DR em banheiro, cozinha/serviço e área externa; exclusão da iluminação a 2,5 m só na alínea d) | §5.1.3.2.2 | H1, H2 |
| Geometria dos volumes do banheiro, com e sem box | §9.1.2.1 | I1, I2 |
| Tomada, interruptor, luminária e aquecedor permitidos ou proibidos por volume | §9.1.4.3, §9.1.4.4 | I3 |
| Mapeamento das maneiras de instalar para o método de referência | Tab. 33 | leitura |
| DPS exigido só com linha aérea + AQ2, ou AQ3 | §5.4.2.1.1 | leitura |
| Taxa de ocupação do eletroduto: 53 / 31 / 40 % | §6.2.11.1.6 a) | J1, J2 |

## 4. O que esta auditoria não cobriu

- **Fora do escopo desta rodada:** `demanda.js` (perfil do Creder), `consumo.js`, `materiais.js`,
  `quadro.js`, `checklists.js`, `veredito.js`, `existente.js` e `percurso.js`. Também não conferi
  os textos de todas as telas; li só os ligados aos achados.
- **Interface não testada clicando:** não rodei os testes de navegador (Playwright).
- **Figuras da norma:** as Figuras 16 a 18 (banheiro) existem só como imagem no PDF e não foram
  conferidas.
- **Validação real:** não houve comparação com um projeto real assinado por profissional, que
  continua sendo a validação que falta.

## 5. Melhorias, em ordem de prioridade

1. **Piscina:** exigir DR em todo circuito de cômodo com piscina e trocar o texto fixo por um
   calculado (achado 1).
2. **Curto-circuito abaixo de 10 mm²:** decidir a leitura da Nota 1 da Tabela 30 com o professor.
   Se valer k = 115/143, a verificação passa a funcionar em quase todos os circuitos (achado 2).
3. **Agrupamento padrão:** pedir o agrupamento real ou explicar a suposição, mostrando a seção que
   sairia sem ela (achado 3).
4. **Textos falsos ou mal citados:** drywall, "DR em todo circuito", volumes e IP (achados 4, 5, 8).
5. **Varanda com DR por padrão** (achado 6).
6. **Transformar estes 49 testes em parte do harness** do projeto, para os achados não voltarem.
