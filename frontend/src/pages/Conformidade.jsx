import { CONFORMIDADE } from '../conteudo/conformidade.js'

export default function Conformidade() {
  return (
    <section className="sobre pagina-conformidade">
      <h1>Conformidade com a NBR 5410</h1>
      <p>
        O que a ferramenta confere, o que confere só em parte e o que fica de fora. Cada regra calculada tem um
        teste automático no repositório (<code>QA/scripts/verificar.mjs</code>), rodado a cada alteração; os grupos
        aparecem na última coluna. Os valores das tabelas foram conferidos no texto da norma, não de memória.
      </p>

      {CONFORMIDADE.map((grupo) => (
        <section key={grupo.titulo} className="bloco-conformidade">
          <h2>
            <span className={`etiqueta-status ${grupo.status}`}>{grupo.itens.length}</span> {grupo.titulo}
          </h2>
          <p className="texto-fraco">{grupo.descricao}</p>
          <div className="tabela-scroll">
            <table className="tabela-resultado tabela-cartoes">
              <thead>
                <tr>
                  <th scope="col">Cláusula</th>
                  <th scope="col">Requisito</th>
                  <th scope="col">Testes</th>
                </tr>
              </thead>
              <tbody>
                {grupo.itens.map(([clausula, requisito, criterios]) => (
                  <tr key={requisito}>
                    <td data-label="Cláusula">{clausula}</td>
                    <td data-label="Requisito" className="celula-quebra">
                      {requisito}
                    </td>
                    <td data-label="Testes">{criterios}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <p className="texto-fraco">
        Referência: ABNT NBR 5410:2004, versão corrigida de 17.03.2008. A ferramenta não substitui o projeto
        assinado por profissional habilitado (ART).
      </p>
    </section>
  )
}
