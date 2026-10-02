// F15 — reconhecimento automático de cômodos numa planta (experimental). Sem IA nem servidor:
// processamento de imagem simples, no navegador.
//  1. pixel escuro = parede;
//  2. as paredes são engrossadas por `raioFechamentoPx`, o que fecha vãos de porta (senão dois
//     cômodos ligados por uma porta viram uma região só);
//  3. regiões claras conectadas = candidatos a cômodo; as que tocam a borda da imagem são a área
//     externa e saem;
//  4. cada região vira o retângulo que a envolve, devolvido ao tamanho original (desfazendo o
//     engrossamento).
// O resultado é só sugestão: o usuário confere e edita cada retângulo antes de virar cômodo.

function luminancia(data, i) {
  return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
}

// Máximo deslizante 1D (dilatação por uma janela de 2r+1), linha a linha e depois coluna a coluna
// — separável, então custa O(pixels) por passada em vez de O(pixels × r²).
function dilatar(mascara, largura, altura, raio) {
  if (raio <= 0) return mascara
  const temp = new Uint8Array(mascara.length)
  const saida = new Uint8Array(mascara.length)
  for (let y = 0; y < altura; y++) {
    let contagem = 0
    const base = y * largura
    for (let x = -raio; x < largura; x++) {
      const entra = x + raio
      if (entra < largura && mascara[base + entra]) contagem++
      const sai = x - raio - 1
      if (sai >= 0 && mascara[base + sai]) contagem--
      if (x >= 0) temp[base + x] = contagem > 0 ? 1 : 0
    }
  }
  for (let x = 0; x < largura; x++) {
    let contagem = 0
    for (let y = -raio; y < altura; y++) {
      const entra = y + raio
      if (entra < altura && temp[entra * largura + x]) contagem++
      const sai = y - raio - 1
      if (sai >= 0 && temp[sai * largura + x]) contagem--
      if (y >= 0) saida[y * largura + x] = contagem > 0 ? 1 : 0
    }
  }
  return saida
}

export function detectarComodos(
  { width: largura, height: altura, data },
  { limiar = 128, raioFechamentoPx = 3, areaMinimaFracao = 0.004, areaMaximaFracao = 0.6 } = {},
) {
  const total = largura * altura
  const parede = new Uint8Array(total)
  for (let p = 0; p < total; p++) {
    const i = p * 4
    const opaco = data[i + 3] > 0
    parede[p] = opaco && luminancia(data, i) < limiar ? 1 : 0
  }
  const bloqueio = dilatar(parede, largura, altura, Math.round(raioFechamentoPx))

  const rotulo = new Int32Array(total)
  const pilha = new Int32Array(total)
  const regioes = []
  for (let inicio = 0; inicio < total; inicio++) {
    if (bloqueio[inicio] || rotulo[inicio]) continue
    const id = regioes.length + 1
    let topo = 0
    pilha[topo++] = inicio
    rotulo[inicio] = id
    let area = 0
    let minX = largura
    let minY = altura
    let maxX = 0
    let maxY = 0
    let tocaBorda = false
    while (topo > 0) {
      const p = pilha[--topo]
      const x = p % largura
      const y = (p - x) / largura
      area++
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
      if (x === 0 || y === 0 || x === largura - 1 || y === altura - 1) tocaBorda = true
      const vizinhos = [x > 0 ? p - 1 : -1, x < largura - 1 ? p + 1 : -1, y > 0 ? p - largura : -1, y < altura - 1 ? p + largura : -1]
      for (const v of vizinhos) {
        if (v >= 0 && !bloqueio[v] && !rotulo[v]) {
          rotulo[v] = id
          pilha[topo++] = v
        }
      }
    }
    regioes.push({ area, minX, minY, maxX, maxY, tocaBorda })
  }

  const r = Math.round(raioFechamentoPx)
  return regioes
    .filter((regiao) => !regiao.tocaBorda && regiao.area >= areaMinimaFracao * total && regiao.area <= areaMaximaFracao * total)
    .map((regiao) => {
      const x = Math.max(0, regiao.minX - r)
      const y = Math.max(0, regiao.minY - r)
      const w = Math.min(largura - 1, regiao.maxX + r) - x + 1
      const h = Math.min(altura - 1, regiao.maxY + r) - y + 1
      const areaCaixa = (regiao.maxX - regiao.minX + 1) * (regiao.maxY - regiao.minY + 1)
      // Quanto da caixa a região preenche: perto de 1 = cômodo retangular; baixo = forma em L etc.
      return { x, y, w, h, retangular: regiao.area / areaCaixa >= 0.85 }
    })
    .sort((a, b) => a.y - b.y || a.x - b.x)
}

// Retângulo em pixels → área e perímetro em metros, pela escala (metros por pixel).
export function medirRetangulo({ w, h }, metrosPorPixel) {
  const larguraM = w * metrosPorPixel
  const alturaM = h * metrosPorPixel
  return { areaM2: larguraM * alturaM, perimetroM: 2 * (larguraM + alturaM), larguraM, alturaM }
}
