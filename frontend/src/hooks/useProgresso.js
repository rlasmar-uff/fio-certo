import { useMemo } from 'react'
import { useProjeto } from '../context/useProjeto.js'
import { TIPOS_COMODO } from '../calculations/constantes.js'
import { situacaoCircuito } from '../calculations/veredito.js'

const ok = { status: 'ok', falta: null }
const pendente = (falta) => ({ status: 'pendente', falta })
const erro = (falta) => ({ status: 'erro', falta })

function comodoIncompleto(comodo) {
  if (!(Number(comodo.area) > 0)) return true
  return TIPOS_COMODO[comodo.tipo]?.tugFixa === undefined && !(Number(comodo.perimetro) > 0)
}

// Situação de cada etapa para o stepper: ✓ pronta · "falta X" · erro que a etapa precisa resolver.
export function useProgresso() {
  const { projeto, calculo } = useProjeto()

  return useMemo(() => {
    const { dimensionados, protecaoGeral } = calculo
    if (projeto.comodos.length === 0) {
      return {
        instalacao: projeto.comprimentoRamalEntrada === '' ? pendente('falta o ramal') : ok,
        comodos: pendente('nenhum cômodo'),
        circuitos: pendente(null),
        dimensionamento: pendente(null),
        resultado: pendente(null),
      }
    }

    const incompletos = projeto.comodos.filter(comodoIncompleto).length
    const bancadaAbaixo = calculo.complementares.bancadas.filter((bancada) => bancada.conforme === false).length
    const semComprimento = dimensionados.filter((circuito) => !circuito.comprimentoInformado).length
    const inviaveis = dimensionados.filter((circuito) => situacaoCircuito(circuito)[0] === 'alerta').length
    const { condutorFase, verificacaoNeutro, curtoCircuito } = protecaoGeral
    const protecaoComErro =
      condutorFase.erro ||
      (verificacaoNeutro.ampacidadeA !== null && !verificacaoNeutro.conforme) ||
      (curtoCircuito.verificado && !curtoCircuito.conforme) ||
      calculo.complementares.pen?.conforme === false ||
      calculo.seccionamento.tt?.conforme === false ||
      calculo.seccionamento.alimentador?.conforme === false ||
      protecaoGeral.sobrecarga?.conforme === false

    const etapas = {
      instalacao: projeto.comprimentoRamalEntrada === '' ? pendente('falta o ramal') : ok,
      comodos: bancadaAbaixo
        ? erro('tomadas da bancada')
        : incompletos
          ? pendente(`${incompletos} incompleto(s)`)
          : ok,
      circuitos: semComprimento ? pendente(`${semComprimento} sem comprimento`) : ok,
      dimensionamento: inviaveis
        ? erro(`${inviaveis} não conforme(s)`)
        : semComprimento
          ? pendente('queda não verificada')
          : ok,
    }
    // O resultado só fica ✓ quando todas as etapas anteriores estão prontas.
    const anterioresProntas = Object.values(etapas).every((etapa) => etapa.status === 'ok')
    etapas.resultado = protecaoComErro ? erro('rever alimentador') : anterioresProntas ? ok : pendente(null)
    return etapas
  }, [projeto, calculo])
}
