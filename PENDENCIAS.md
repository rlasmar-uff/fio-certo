# O que falta você fazer

Coisas que dependem de você, não do código. Atualizado a cada sprint. Marque com `[x]` o que for resolvendo.

## Publicação (GitHub)

- [x] **Criar o repositório no GitHub** e enviar o projeto — feito em 02/10/2026: [github.com/rlasmar-uff/fio-certo](https://github.com/rlasmar-uff/fio-certo). `NBR-5410.pdf` e `GP do Projeto de Extensão.pdf` ficaram de fora (adicionados ao `.gitignore`, nunca entraram no histórico).
  - Atenção: o Git deste computador estava autenticado no GitHub como `rl-tiecia` (conta profissional), sem permissão no repositório `rlasmar-uff`. Foi preciso apagar a credencial salva (`git credential reject`) para forçar um novo login antes do push dar certo. Se isso acontecer de novo em outra máquina, é o mesmo problema.
- [x] **Ligar o GitHub Pages** — já estava em Settings → Pages → Source → **GitHub Actions**.
- [x] **Site publicado e verificado** em 02/10/2026: [rlasmar-uff.github.io/fio-certo](https://rlasmar-uff.github.io/fio-certo/) (HTTP 200; JS, CSS e favicon carregando; branding novo confirmado no HTML servido). No caminho, o primeiro deploy falhou de verdade por 2 motivos sem relação com o Pages em si — corrigidos e já publicados (commit `75a3085`): um teste com valor de demanda desatualizado (2,46 kW → 2,58 kW, o certo) e uma regressão onde o popover ⓘ duplicava o texto do checklist e confundia os testes de navegador.

## Conteúdo que só você tem

- [ ] **Equipe:** nomes (e grupos, se houver) para a seção "Equipe" da página Sobre.
- [ ] **Professor e instituição:** confirme se quer o nome do professor (Vitor Hugo Ferreira, segundo o guia) e da universidade no Sobre e no memorial.

## Validação (UAT) — só uma pessoa consegue fazer

- [ ] **Comparar com um projeto real** dimensionado por um profissional (roteiros em `QA/referencias/casos-de-teste.md`, seção 7). É o teste que falta para dizer que os números batem fora do harness.
- [ ] **Imprimir o memorial** (`Proteção e resultado → Memorial para imprimir / PDF`) no seu navegador e conferir o PDF.
- [ ] **Abrir um link compartilhado no celular** de outra pessoa.
- [ ] **Conferir a lista de materiais com um quadro real:** a largura em módulos DIN assume 1 módulo por polo; DR e DPS de alguns fabricantes ocupam mais.
- [ ] **Testar a planta com arquivos reais** (`Cômodos → Medir cômodos na planta`): uma imagem e um PDF de arquitetura, de preferência com várias páginas. A detecção automática acerta plantas limpas nos testes; em planta real, com móveis e cotas, pode errar. É experimental. PDF com senha não abre.
- [ ] **Instalar o site como app no celular** (menu do navegador → "Adicionar à tela inicial") depois do deploy e abrir sem internet.
- [ ] **Testar no Safari/iPhone**, se tiver acesso. Os testes automáticos já rodam em Chrome, Firefox e WebKit (o motor do Safari) no computador; falta o celular de verdade, principalmente o modo offline, que o WebKit do Playwright não consegue testar.

## Distribuidoras de energia (fator de demanda, N18)

- [ ] **Baixar o PDF da norma da Copel (PR) e da Energisa** (MT/MS/TO/PB/SE/MG/RO/AC e outros). Os sites das duas bloquearam o download desta rede (erro 403/503, inclusive na página inicial) — precisa ser feito do seu computador. Copel: procure "NTC 901100" no site da Copel. Energisa: procure "NDU-001" no site da Energisa. Me manda os PDFs.
- [ ] **Se você tiver acesso à ABNT Catálogo (ou outro canal oficial), a NBR 10676:2011** ("Fornecimento de energia a edificações individuais em tensão secundária"). Três distribuidoras (CPFL, EDP São Paulo, Neoenergia) têm a mesma tabela de fator de demanda e citam essa norma; a cópia de 1999 que você tinha não é a mesma edição e não traz essa tabela. Não é obrigatório — hoje a ferramenta já usa a tabela de cada distribuidora direto do PDF dela, que é uma fonte válida por si só.
- [ ] Se a sua instalação for de uma distribuidora que ainda não está na lista (além das 9 já cobertas e da Copel/Energisa pendentes), me diga qual — arrumo o PDF dela também.

## Entregas da disciplina (08/12)

- [ ] **Relatório técnico:** o rascunho está em `docs/relatorio-tecnico.md`, com os números da casa-modelo tirados do motor. Falta completar equipe, professor e links, revisar o texto e passar para o modelo da disciplina.
  - **Conferir o formato das referências (seção 8)** pelo modelo exigido pela disciplina (ABNT NBR 6023?) — a estrutura usada (autor, título em negrito, edição, cidade, editora, ano) segue o padrão geral da 6023, mas não foi conferida contra o modelo específico da disciplina.
  - Título e ano das normas de produto (NBR NM 60898, NM 247-3, 7286, 7287, 15465) já foram conferidos por busca em 30/09/2026 (ver `QA/referencias/fontes-externas.md`) — mas só contra descrições de sites de revenda de normas, não o texto comprado no Catálogo ABNT. Se você tiver acesso, uma conferência final é mais segura antes da entrega.
- [ ] **Seminário (15 min):** o roteiro, com tempos, demonstração e plano B, está em `docs/roteiro-seminario.md`. Falta montar os slides, ensaiar e gerar o QR code do site publicado.
- [ ] **UAT com pessoas de fora da equipe:** pedir a 2 ou 3 colegas que façam um projeto do zero sem ajuda e anotar onde travam.
