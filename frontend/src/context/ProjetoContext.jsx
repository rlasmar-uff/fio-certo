import { useEffect, useMemo, useState } from 'react'
import { ProjetoContext } from './useProjeto.js'
import { calcularProjetoCompleto } from '../calculations/projeto.js'
import { resolverConfigInstalacao } from '../calculations/constantes.js'
import { ESTADO_INICIAL, gerarId, normalizarProjeto } from '../projetos/estado.js'

// Biblioteca de projetos: { ativoId, projetos: [{ id, nome, criadoEm, atualizadoEm, dados }] }.
// Sempre há pelo menos um projeto — o ativo é o que a calculadora edita.
const CHAVE_BIBLIOTECA = 'fio-certo:v2:projetos'
// Chave de antes da lista de projetos: o projeto único vira o primeiro da biblioteca.
const CHAVE_ANTIGA = 'fio-certo:projeto'

const agora = () => new Date().toISOString()
const dataValida = (valor) => (typeof valor === 'string' && !Number.isNaN(Date.parse(valor)) ? valor : agora())

function novoRegistro(nome, dados = ESTADO_INICIAL) {
  const data = agora()
  return { id: gerarId(), nome, criadoEm: data, atualizadoEm: data, dados }
}

function bibliotecaCom(registro) {
  return { ativoId: registro.id, projetos: [registro] }
}

function carregarBiblioteca() {
  try {
    const bruto = window.localStorage.getItem(CHAVE_BIBLIOTECA)
    if (bruto) {
      const salva = JSON.parse(bruto)
      const projetos = (Array.isArray(salva?.projetos) ? salva.projetos : []).flatMap((registro) => {
        try {
          // Registro vindo do armazenamento: id, nome e datas são conferidos como o resto do projeto.
          return [
            {
              id: typeof registro.id === 'string' && registro.id ? registro.id : gerarId(),
              nome: String(registro.nome || 'Projeto'),
              criadoEm: dataValida(registro.criadoEm),
              atualizadoEm: dataValida(registro.atualizadoEm),
              dados: normalizarProjeto(registro.dados),
            },
          ]
        } catch {
          return []
        }
      })
      if (projetos.length > 0) {
        const ativoId = projetos.some((registro) => registro.id === salva.ativoId) ? salva.ativoId : projetos[0].id
        return { ativoId, projetos }
      }
    }
    const antigo = window.localStorage.getItem(CHAVE_ANTIGA)
    if (antigo) return bibliotecaCom(novoRegistro('Meu projeto', normalizarProjeto(JSON.parse(antigo))))
  } catch {
    // armazenamento corrompido ou indisponível — começa do zero
  }
  return bibliotecaCom(novoRegistro('Meu projeto'))
}

export function ProjetoProvider({ children }) {
  const [biblioteca, setBiblioteca] = useState(carregarBiblioteca)
  const registroAtivo = biblioteca.projetos.find((registro) => registro.id === biblioteca.ativoId)
  const projeto = registroAtivo.dados

  useEffect(() => {
    try {
      window.localStorage.setItem(CHAVE_BIBLIOTECA, JSON.stringify(biblioteca))
      window.localStorage.removeItem(CHAVE_ANTIGA)
    } catch {
      // localStorage indisponível (ex.: navegação privada) ou cheio — segue apenas em memória.
    }
  }, [biblioteca])

  const acoes = useMemo(() => {
    // Todas as ações de edição mexem só no projeto ativo.
    const setProjeto = (atualizar) =>
      setBiblioteca((atual) => ({
        ...atual,
        projetos: atual.projetos.map((registro) =>
          registro.id === atual.ativoId ? { ...registro, dados: atualizar(registro.dados), atualizadoEm: agora() } : registro,
        ),
      }))

    return {
      setTipoInstalacao(tipoInstalacao) {
        setProjeto((atual) => ({ ...atual, tipoInstalacao }))
      },

      setTensaoFaseNeutro(tensaoFaseNeutro) {
        setProjeto((atual) => ({ ...atual, tensaoFaseNeutro: Number(tensaoFaseNeutro) }))
      },

      addComodo() {
        setProjeto((atual) => ({
          ...atual,
          comodos: [
            ...atual.comodos,
            {
              id: gerarId(),
              nome: '',
              tipo: 'social',
              area: '',
              perimetro: '',
              iluminacaoQuantidade: '',
              iluminacaoPotenciaUnitariaW: '',
              tugPontos: '',
              tue: [],
            },
          ],
        }))
      },

      // F9 — cômodos medidos na planta: entram no fim da lista com área e perímetro preenchidos.
      importarComodos(lista) {
        setProjeto((atual) => ({
          ...atual,
          comodos: [
            ...atual.comodos,
            ...lista.map((comodo) => ({
              id: gerarId(),
              iluminacaoQuantidade: '',
              iluminacaoPotenciaUnitariaW: '',
              tugPontos: '',
              tue: [],
              ...comodo,
            })),
          ],
        }))
      },

      updateComodo(id, patch) {
        setProjeto((atual) => ({
          ...atual,
          comodos: atual.comodos.map((comodo) => (comodo.id === id ? { ...comodo, ...patch } : comodo)),
        }))
      },

      removeComodo(id) {
        setProjeto((atual) => ({
          ...atual,
          comodos: atual.comodos.filter((comodo) => comodo.id !== id),
        }))
      },

      addTue(comodoId) {
        setProjeto((atual) => ({
          ...atual,
          comodos: atual.comodos.map((comodo) =>
            comodo.id === comodoId
              ? {
                  ...comodo,
                  tue: [
                    ...(comodo.tue ?? []),
                    {
                      id: gerarId(),
                      nome: '',
                      quantidade: 1,
                      potenciaW: '',
                      ligacao: 'fase-neutro',
                      tipoCarga: 'resistiva',
                      cosPhi: 1,
                    },
                  ],
                }
              : comodo,
          ),
        }))
      },

      updateTue(comodoId, tueId, patch) {
        setProjeto((atual) => ({
          ...atual,
          comodos: atual.comodos.map((comodo) =>
            comodo.id === comodoId
              ? {
                  ...comodo,
                  tue: (comodo.tue ?? []).map((equipamento) =>
                    equipamento.id === tueId ? { ...equipamento, ...patch } : equipamento,
                  ),
                }
              : comodo,
          ),
        }))
      },

      removeTue(comodoId, tueId) {
        setProjeto((atual) => ({
          ...atual,
          comodos: atual.comodos.map((comodo) =>
            comodo.id === comodoId
              ? { ...comodo, tue: (comodo.tue ?? []).filter((equipamento) => equipamento.id !== tueId) }
              : comodo,
          ),
        }))
      },

      setComprimento(circuitoId, metros) {
        setProjeto((atual) => ({
          ...atual,
          comprimentos: { ...atual.comprimentos, [circuitoId]: metros },
        }))
      },

      setComprimentoRamalEntrada(metros) {
        setProjeto((atual) => ({ ...atual, comprimentoRamalEntrada: metros }))
      },

      setTemperaturaAmbienteC(temperaturaC) {
        setProjeto((atual) => ({ ...atual, temperaturaAmbienteC: temperaturaC }))
      },

      setTemperaturaSoloC(temperaturaC) {
        setProjeto((atual) => ({ ...atual, temperaturaSoloC: temperaturaC }))
      },

      setResistividadeTermicaSoloKmW(valor) {
        setProjeto((atual) => ({ ...atual, resistividadeTermicaSoloKmW: valor }))
      },

      setIsolacaoCondutor(isolacao) {
        setProjeto((atual) => ({ ...atual, isolacaoCondutor: isolacao }))
      },

      setIsolacaoAlimentador(isolacao) {
        setProjeto((atual) => ({ ...atual, isolacaoAlimentador: isolacao }))
      },

      setNumeroCircuitosAgrupadosManual(numero) {
        setProjeto((atual) => ({ ...atual, numeroCircuitosAgrupadosManual: numero }))
      },

      setMetodoInstalacao(circuitoId, metodo) {
        setProjeto((atual) => ({
          ...atual,
          metodosInstalacao: { ...atual.metodosInstalacao, [circuitoId]: metodo },
        }))
      },

      setMetodoInstalacaoAlimentador(metodo) {
        setProjeto((atual) => ({ ...atual, metodoInstalacaoAlimentador: metodo }))
      },

      setNeutroReduzidoDeclarado(declarado) {
        setProjeto((atual) => ({ ...atual, neutroReduzidoDeclarado: declarado }))
      },

      setAplicarAlternativa600VA(aplicar) {
        setProjeto((atual) => ({ ...atual, aplicarAlternativa600VA: aplicar }))
      },

      setTerceiraHarmonica(taxa) {
        setProjeto((atual) => ({ ...atual, terceiraHarmonica: taxa }))
      },

      setIccPresumidaA(valor) {
        setProjeto((atual) => ({ ...atual, iccPresumidaA: valor }))
      },

      setIccFaseNeutroA(valor) {
        setProjeto((atual) => ({ ...atual, iccFaseNeutroA: valor }))
      },

      setDistribuidoraId(id) {
        setProjeto((atual) => ({ ...atual, distribuidoraId: id }))
      },

      setCurvaDisjuntorGeral(curva) {
        setProjeto((atual) => ({ ...atual, curvaDisjuntorGeral: curva }))
      },

      setAlimentacaoAerea(valor) {
        setProjeto((atual) => ({ ...atual, alimentacaoAerea: valor }))
      },

      setRegiaoAltoIndiceDescargas(valor) {
        setProjeto((atual) => ({ ...atual, regiaoAltoIndiceDescargas: valor }))
      },

      setExposicaoDescargaDireta(valor) {
        setProjeto((atual) => ({ ...atual, exposicaoDescargaDireta: valor }))
      },

      setEsquemaAterramento(valor) {
        setProjeto((atual) => ({ ...atual, esquemaAterramento: valor }))
      },

      setCondicaoAterramento(valor) {
        setProjeto((atual) => ({ ...atual, condicaoAterramento: valor }))
      },

      setResistenciaAterramentoOhm(valor) {
        setProjeto((atual) => ({ ...atual, resistenciaAterramentoOhm: valor }))
      },

      setModoDR(valor) {
        setProjeto((atual) => ({ ...atual, modoDR: valor }))
      },

      setGrupoDR(circuitoId, numero) {
        setProjeto((atual) => ({ ...atual, grupoDR: { ...atual.grupoDR, [circuitoId]: Number(numero) } }))
      },

      setDrMontante(valor) {
        setProjeto((atual) => ({ ...atual, drMontante: valor }))
      },

      setExistente(circuitoId, patch) {
        setProjeto((atual) => ({
          ...atual,
          existentes: { ...atual.existentes, [circuitoId]: { ...atual.existentes[circuitoId], ...patch } },
        }))
      },

      setConsumo(patch) {
        setProjeto((atual) => ({ ...atual, consumo: { ...atual.consumo, ...patch } }))
      },

      setHorasConsumo(cargaId, horas) {
        setProjeto((atual) => ({
          ...atual,
          consumo: { ...atual.consumo, horas: { ...atual.consumo.horas, [cargaId]: horas } },
        }))
      },

      addTrecho(circuitoId) {
        setProjeto((atual) => ({
          ...atual,
          percursos: {
            ...atual.percursos,
            [circuitoId]: [...(atual.percursos[circuitoId] ?? []), { id: gerarId(), comprimentoM: '', curvas: '0', externo: false }],
          },
        }))
      },

      updateTrecho(circuitoId, trechoId, patch) {
        setProjeto((atual) => ({
          ...atual,
          percursos: {
            ...atual.percursos,
            [circuitoId]: (atual.percursos[circuitoId] ?? []).map((trecho) => (trecho.id === trechoId ? { ...trecho, ...patch } : trecho)),
          },
        }))
      },

      removeTrecho(circuitoId, trechoId) {
        setProjeto((atual) => ({
          ...atual,
          percursos: { ...atual.percursos, [circuitoId]: (atual.percursos[circuitoId] ?? []).filter((trecho) => trecho.id !== trechoId) },
        }))
      },

      setFolgaMateriaisPercentual(valor) {
        setProjeto((atual) => ({ ...atual, folgaMateriaisPercentual: valor }))
      },

      // --- Biblioteca de projetos ---
      criarProjeto(nome = 'Novo projeto', dados = ESTADO_INICIAL) {
        const registro = novoRegistro(nome, dados)
        // O projeto em branco que nunca foi mexido (o criado ao abrir o site) é substituído, em
        // vez de ficar sobrando vazio na lista.
        const intocado = (item) => item.criadoEm === item.atualizadoEm && item.dados.comodos.length === 0
        setBiblioteca((atual) => ({
          ativoId: registro.id,
          projetos: [registro, ...atual.projetos.filter((item) => !(item.id === atual.ativoId && intocado(item)))],
        }))
        return registro.id
      },

      abrirProjeto(id) {
        setBiblioteca((atual) => (atual.projetos.some((registro) => registro.id === id) ? { ...atual, ativoId: id } : atual))
      },

      renomearProjeto(id, nome) {
        setBiblioteca((atual) => ({
          ...atual,
          projetos: atual.projetos.map((registro) => (registro.id === id ? { ...registro, nome, atualizadoEm: agora() } : registro)),
        }))
      },

      duplicarProjeto(id) {
        setBiblioteca((atual) => {
          const indice = atual.projetos.findIndex((registro) => registro.id === id)
          if (indice < 0) return atual
          const original = atual.projetos[indice]
          const copia = novoRegistro(`${original.nome} (cópia)`, original.dados)
          return { ...atual, projetos: [...atual.projetos.slice(0, indice + 1), copia, ...atual.projetos.slice(indice + 1)] }
        })
      },

      excluirProjeto(id) {
        setBiblioteca((atual) => {
          const restantes = atual.projetos.filter((registro) => registro.id !== id)
          if (restantes.length === 0) return bibliotecaCom(novoRegistro('Meu projeto'))
          return { ativoId: atual.ativoId === id ? restantes[0].id : atual.ativoId, projetos: restantes }
        })
      },
    }
  }, [])

  // Calculado uma vez por mudança do projeto e compartilhado — a página e o stepper (progresso)
  // leem o mesmo resultado em vez de cada um recalcular.
  const calculo = useMemo(() => {
    const configInstalacao = resolverConfigInstalacao(projeto.tipoInstalacao, projeto.tensaoFaseNeutro)
    return { configInstalacao, ...calcularProjetoCompleto(projeto, configInstalacao) }
  }, [projeto])

  const valor = useMemo(
    () => ({ projeto, calculo, biblioteca, projetoAtivo: registroAtivo, ...acoes }),
    [projeto, calculo, biblioteca, registroAtivo, acoes],
  )

  return <ProjetoContext.Provider value={valor}>{children}</ProjetoContext.Provider>
}
