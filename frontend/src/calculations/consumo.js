// F12 — consumo mensal estimado: potência × horas de uso por dia × dias no mês, com horas, dias e
// tarifa sempre informados pelo usuário (nada é presumido). Só entram cargas de potência real
// conhecida: equipamentos (TUE) e luminárias informadas. A carga mínima de iluminação e de
// tomadas da norma é para dimensionar, não mede uso — fica de fora.
function positivo(valor) {
  const numero = Number(valor)
  return valor !== '' && valor !== null && valor !== undefined && Number.isFinite(numero) && numero >= 0 ? numero : null
}

export function listarCargasConsumo(comodos) {
  return comodos.flatMap((comodo) => {
    const itens = (comodo.tue ?? [])
      .filter((equipamento) => Number(equipamento.potenciaW) > 0)
      .map((equipamento) => ({
        id: `tue:${comodo.id}:${equipamento.id}`,
        nome: `${equipamento.nome || 'Equipamento'} (${comodo.nome || 'cômodo'})`,
        potenciaW: Number(equipamento.potenciaW) * (Number(equipamento.quantidade) || 1),
      }))
    const luminarias = Number(comodo.iluminacaoQuantidade) * Number(comodo.iluminacaoPotenciaUnitariaW)
    if (luminarias > 0) itens.unshift({ id: `luz:${comodo.id}`, nome: `Iluminação (${comodo.nome || 'cômodo'})`, potenciaW: luminarias })
    return itens
  })
}

export function simularConsumo(comodos, { dias, tarifa, horas = {} } = {}) {
  const diasMes = positivo(dias)
  const tarifaKWh = positivo(tarifa)
  const itens = listarCargasConsumo(comodos).map((item) => {
    const horasDia = positivo(horas[item.id])
    const kWhMes = horasDia !== null && diasMes !== null ? (item.potenciaW * horasDia * diasMes) / 1000 : null
    return { ...item, horasDia, kWhMes }
  })
  const calculados = itens.filter((item) => item.kWhMes !== null)
  const totalKWh = calculados.reduce((soma, item) => soma + item.kWhMes, 0)
  return {
    itens,
    diasMes,
    totalKWh: calculados.length ? totalKWh : null,
    custo: calculados.length && tarifaKWh !== null ? totalKWh * tarifaKWh : null,
    semHoras: itens.length - calculados.length,
  }
}
