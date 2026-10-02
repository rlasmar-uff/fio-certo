import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjeto } from '../context/useProjeto.js'
import { casaModelo } from '../projetos/casaModelo.js'
import { codificarLink, gerarArquivo, lerArquivo, nomeArquivo } from '../projetos/arquivo.js'
import { ROUTES } from '../routes.js'

const formatoData = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

function baixar(nome, texto) {
  const url = URL.createObjectURL(new Blob([texto], { type: 'application/json' }))
  const ancora = Object.assign(document.createElement('a'), { href: url, download: nomeArquivo(nome) })
  ancora.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function Projetos() {
  const navigate = useNavigate()
  const { biblioteca, criarProjeto, abrirProjeto, renomearProjeto, duplicarProjeto, excluirProjeto } = useProjeto()
  const [mensagem, setMensagem] = useState(null)
  const [link, setLink] = useState(null)

  const abrirECalcular = (id) => {
    abrirProjeto(id)
    navigate(ROUTES.instalacao)
  }

  const importar = async (evento) => {
    const arquivo = evento.target.files?.[0]
    evento.target.value = ''
    if (!arquivo) return
    try {
      const { nome, dados } = lerArquivo(await arquivo.text())
      criarProjeto(nome, dados)
      setMensagem({ tipo: 'ok', texto: `“${nome}” importado e aberto.` })
    } catch (erro) {
      setMensagem({ tipo: 'alerta', texto: erro.message })
    }
  }

  const compartilhar = async (registro) => {
    const codigo = await codificarLink(registro.nome, registro.dados)
    const url = `${window.location.href.split('#')[0]}#${ROUTES.abrir}?p=${codigo}`
    setLink({ id: registro.id, url })
    try {
      await navigator.clipboard.writeText(url)
      setMensagem({ tipo: 'ok', texto: 'Link copiado. Quem abrir recebe uma cópia do projeto — nada fica num servidor.' })
    } catch {
      setMensagem({ tipo: 'ok', texto: 'Link gerado abaixo do projeto — copie e envie.' })
    }
  }

  return (
    <section className="pagina-projetos">
      <h1>Meus projetos</h1>
      <p className="texto-fraco">
        Ficam salvos só neste navegador. Para guardar uma cópia ou levar para outro computador, exporte o arquivo
        ou gere um link.
      </p>

      <div className="etapa-acoes">
        <button type="button" className="botao-principal" onClick={() => (criarProjeto(), navigate(ROUTES.instalacao))}>
          + Novo projeto
        </button>
        <label className="botao-secundario">
          Importar arquivo…
          <input type="file" accept=".json,application/json" className="visualmente-oculto" onChange={importar} />
        </label>
        <button
          type="button"
          className="botao-secundario"
          onClick={() => (criarProjeto('Casa-modelo (exemplo)', casaModelo()), navigate(ROUTES.resultado))}
        >
          Abrir casa-modelo
        </button>
      </div>

      {mensagem && (
        <p className={`etiqueta-status ${mensagem.tipo}`} role="status">
          {mensagem.texto}
        </p>
      )}

      <ul className="lista-projetos">
        {biblioteca.projetos.map((registro) => {
          const ativo = registro.id === biblioteca.ativoId
          const comodos = registro.dados.comodos.length
          return (
            <li key={registro.id} className={`cartao-projeto ${ativo ? 'ativo' : ''}`}>
              <div className="cartao-projeto-cabecalho">
                <input
                  className="campo entrada-nome-projeto"
                  aria-label="Nome do projeto"
                  value={registro.nome}
                  maxLength={80}
                  onChange={(evento) => renomearProjeto(registro.id, evento.target.value)}
                  onBlur={(evento) => !evento.target.value.trim() && renomearProjeto(registro.id, 'Projeto sem nome')}
                />
                {ativo && <span className="etiqueta-status ok">aberto</span>}
              </div>
              <p className="texto-fraco">
                {comodos} {comodos === 1 ? 'cômodo' : 'cômodos'} · alterado em {formatoData.format(new Date(registro.atualizadoEm))}
              </p>
              <div className="cartao-projeto-acoes">
                <button type="button" className="botao-secundario" onClick={() => abrirECalcular(registro.id)}>
                  {ativo ? 'Continuar' : 'Abrir'}
                </button>
                <button type="button" className="botao-texto" onClick={() => duplicarProjeto(registro.id)}>
                  Duplicar
                </button>
                <button type="button" className="botao-texto" onClick={() => baixar(registro.nome, gerarArquivo(registro.nome, registro.dados))}>
                  Exportar arquivo
                </button>
                <button type="button" className="botao-texto" onClick={() => compartilhar(registro)}>
                  Copiar link
                </button>
                <button
                  type="button"
                  className="botao-texto botao-perigo"
                  onClick={() => {
                    if (window.confirm(`Excluir “${registro.nome}”? Isto não pode ser desfeito.`)) excluirProjeto(registro.id)
                  }}
                >
                  Excluir
                </button>
              </div>
              {link?.id === registro.id && (
                <input
                  className="campo entrada-link"
                  readOnly
                  aria-label="Link do projeto"
                  value={link.url}
                  onFocus={(evento) => evento.target.select()}
                />
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
