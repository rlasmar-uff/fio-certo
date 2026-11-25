// Exigência de DR de alta sensibilidade (≤ 30 mA) por circuito. O DR é proteção ADICIONAL contra choques e
// não substitui as demais medidas nem o PE. Casos em que a NBR 5410 o exige, em habitação:
//  §5.1.3.2.2 a) circuitos que sirvam pontos de utilização de local com banheira ou chuveiro;
//  §5.1.3.2.2 b) circuitos que alimentem tomadas em áreas externas à edificação;
//  §5.1.3.2.2 c) circuitos de tomadas internas que possam alimentar equipamentos no exterior;
//  §5.1.3.2.2 d) cozinhas, copas-cozinhas, lavanderias, áreas de serviço, garagens e demais dependências
//     internas molhadas ou sujeitas a lavagens: todos os pontos — nota 3: admite-se excluir aparelhos de
//     iluminação a 2,50 m ou mais de altura;
//  §9.2.3.1.2 b) / §9.2.4.3.3 b) piscina, volume 2: equipamentos, tomadas e interruptores protegidos por DR
//     ≤ 30 mA (a norma admite também SELV ou separação elétrica, que esta ferramenta não dimensiona);
//  §5.1.2.2.4.3 a) esquema TT: o seccionamento automático é feito por DR — todo circuito.
// A exigência vale para tomadas de até 32 A (§5.1.3.2.2, nota 1).
export const ALTURA_ILUMINACAO_EXCLUIDA_M = 2.5

export function exigenciaDR(circuito, comodos, { esquemaAterramento = '' } = {}) {
  const motivos = []
  if (esquemaAterramento === 'TT') motivos.push('esquema TT: seccionamento automático por DR em todo circuito (5.1.2.2.4.3 a)')
  const ids = circuito.comodoIds ?? (circuito.comodoId ? [circuito.comodoId] : [])
  for (const id of ids) {
    const comodo = comodos.find((c) => c.id === id)
    if (!comodo) continue
    const ehIluminacao = circuito.tipo === 'iluminacao'
    const alturaM = Number(comodo.iluminacaoAlturaM)
    const iluminacaoExcluida = ehIluminacao && alturaM >= ALTURA_ILUMINACAO_EXCLUIDA_M
    if (comodo.piscina) motivos.push(`${comodo.nome}: local de piscina, circuitos do volume 2 (9.2.3.1.2 b, 9.2.4.3.3 b)`)
    if (comodo.tipo === 'banheiro') motivos.push(`${comodo.nome}: local com banheira ou chuveiro, todos os pontos (5.1.3.2.2 a)`)
    else if (comodo.tipo === 'externa') {
      if (!iluminacaoExcluida) motivos.push(`${comodo.nome}: área externa / dependência molhada (5.1.3.2.2 b e d)`)
    } else if (comodo.tipo === 'servico') {
      if (!iluminacaoExcluida) motivos.push(`${comodo.nome}: cozinha, lavanderia ou área de serviço, todos os pontos (5.1.3.2.2 d)`)
    } else if (comodo.tomadasAlimentamExterior && circuito.tipo === 'tug') {
      motivos.push(`${comodo.nome}: tomadas internas que podem alimentar equipamentos no exterior (5.1.3.2.2 c)`)
    }
  }
  return { exige: motivos.length > 0, motivos }
}
