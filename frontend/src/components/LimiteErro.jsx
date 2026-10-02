import { Component } from 'react'

// Um erro de renderização numa etapa mostra esta mensagem em vez de derrubar o site inteiro
// numa tela branca. O Layout troca a `key` a cada rota, então navegar para outra etapa já
// tenta renderizar de novo.
export default class LimiteErro extends Component {
  state = { erro: null }

  static getDerivedStateFromError(erro) {
    return { erro }
  }

  render() {
    if (!this.state.erro) return this.props.children
    return (
      <section className="not-found" role="alert">
        <h1>Algo deu errado nesta tela</h1>
        <p>
          O cálculo encontrou uma situação que a interface não soube mostrar. Seus dados continuam
          salvos neste navegador — tente voltar para a etapa anterior ou recarregar a página.
        </p>
        <p className="texto-fraco">{String(this.state.erro?.message ?? this.state.erro)}</p>
      </section>
    )
  }
}
