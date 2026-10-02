import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useProjeto } from '../context/useProjeto.js'
import { decodificarLink } from '../projetos/arquivo.js'
import { TIPOS_INSTALACAO } from '../calculations/constantes.js'
import { ROUTES } from '../routes.js'

// Destino de um link compartilhado. Nunca sobrescreve nada: o projeto do link entra como um
// projeto novo na lista, e só depois de o usuário confirmar.
export default function AbrirLink() {
  const [parametros] = useSearchParams()
  const codigo = parametros.get('p')
  const navigate = useNavigate()
  const { criarProjeto } = useProjeto()
  const [estado, setEstado] = useState({ situacao: 'carregando' })

  useEffect(() => {
    let ativo = true
    decodificarLink(codigo)
      .then((conteudo) => ativo && setEstado({ situacao: 'pronto', ...conteudo }))
      .catch((erro) => ativo && setEstado({ situacao: 'erro', mensagem: erro.message }))
    return () => {
      ativo = false
    }
  }, [codigo])

  return (
    <section className="pagina-projetos">
      <h1>Abrir projeto compartilhado</h1>
      {estado.situacao === 'carregando' && <p className="texto-fraco">Lendo o link…</p>}
      {estado.situacao === 'erro' && (
        <>
          <p className="etiqueta-status alerta" role="alert">
            {estado.mensagem}
          </p>
          <p>
            <Link to={ROUTES.projetos}>Ir para meus projetos</Link>
          </p>
        </>
      )}
      {estado.situacao === 'pronto' && (
        <>
          <dl className="fatos">
            <div>
              <dt>Projeto</dt>
              <dd>{estado.nome}</dd>
            </div>
            <div>
              <dt>Instalação</dt>
              <dd>
                {TIPOS_INSTALACAO[estado.dados.tipoInstalacao]?.label ?? '—'} · {estado.dados.tensaoFaseNeutro} V
              </dd>
            </div>
            <div>
              <dt>Cômodos</dt>
              <dd>{estado.dados.comodos.map((comodo) => comodo.nome || 'sem nome').join(', ') || 'nenhum'}</dd>
            </div>
          </dl>
          <p className="texto-fraco">Ele entra como um projeto novo na sua lista; os que você já tem não mudam.</p>
          <div className="etapa-acoes">
            <button
              type="button"
              className="botao-principal"
              onClick={() => {
                criarProjeto(estado.nome, estado.dados)
                navigate(ROUTES.resultado)
              }}
            >
              Abrir como novo projeto →
            </button>
            <Link className="botao-secundario" to={ROUTES.home}>
              Cancelar
            </Link>
          </div>
        </>
      )}
    </section>
  )
}
