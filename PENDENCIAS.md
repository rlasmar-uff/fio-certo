# O que falta você fazer

Coisas que dependem de você, não do código. Atualizado a cada sprint. Marque com `[x]` o que for resolvendo.

## Publicação (GitHub)

- [ ] **Criar o repositório no GitHub** e enviar o projeto (`git init`, `git add .`, `git commit`, `git push`).
  - Antes do primeiro commit, confira que o `NBR-5410.pdf` **não** entrou (`git status` não pode listá-lo). O `.gitignore` da raiz já o exclui, mas vale checar. É um exemplar licenciado da ABNT e não pode ficar num repositório público.
  - Decida se o `GP do Projeto de Extensão.pdf` (guia da disciplina) vai para o repositório. Ele não está no `.gitignore`. Se não quiser publicá-lo, acrescente-o ao `.gitignore`.
- [ ] **Ligar o GitHub Pages:** no repositório, abra Settings → Pages → Source e escolha **GitHub Actions**. O workflow `.github/workflows/publicar.yml` já roda o harness, o lint, o build e o Playwright, e publica o site.
- [ ] Depois do primeiro deploy, me passe:
  - a **URL do repositório**, para eu colocar o link na página Sobre;
  - a **URL do site publicado**, para conferir se links compartilhados e rotas abrem certo.

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
