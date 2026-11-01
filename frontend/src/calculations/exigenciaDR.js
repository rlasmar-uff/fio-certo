// Exigência de DR de alta sensibilidade (≤ 30 mA) por circuito — NBR 5410 §5.1.3.2.2 (compilado, semana 8 §4).
// O DR é proteção ADICIONAL contra choques e não substitui as demais medidas nem o PE. É obrigatório, em
// habitação:
//  a) circuitos que sirvam pontos de utilização de local com banheira ou chuveiro (iluminação, tomadas, chuveiro);
//  b) circuitos que alimentem tomadas em áreas externas;
//  c) circuitos de tomadas internas que possam alimentar equipamentos no exterior;
//  d) cozinhas, copas-cozinhas, lavanderias, áreas de serviço, garagens e demais dependências internas molhadas
//     ou sujeitas a lavagens: todos os pontos de utilização — nota 3: admite-se excluir aparelhos de iluminação
//     instalados a 2,50 m ou mais de altura.
// A exigência vale para tomadas de até 32 A. Sala/dormitório "secos" não são exigência da norma: ficam sem DR
// (a menos que o projetista escolha o modo "DR em todos os circuitos").
export const ALTURA_ILUMINACAO_EXCLUIDA_M = 2.5

export function exigenciaDR(circuito, comodos) {
  const motivos = []
  const ids = circuito.comodoIds ?? (circuito.comodoId ? [circuito.comodoId] : [])
  for (const id of ids) {
    const comodo = comodos.find((c) => c.id === id)
    if (!comodo) continue
    const ehIluminacao = circuito.tipo === 'iluminacao'
    const alturaM = Number(comodo.iluminacaoAlturaM)
    const iluminacaoExcluida = ehIluminacao && alturaM >= ALTURA_ILUMINACAO_EXCLUIDA_M
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
