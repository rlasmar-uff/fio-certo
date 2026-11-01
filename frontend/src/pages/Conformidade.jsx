import { CONFORMIDADE } from '../conteudo/conformidade.js'
import { RASTREABILIDADE, REFERENCIAS_COMPILADO } from '../conteudo/rastreabilidade.js'

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

      <h2>Mapa de rastreabilidade</h2>
      <p className="texto-fraco">
        Do tema ao item da NBR 5410, à página e à seção do Creder, e ao ponto do site onde o requisito aparece. Nas
        referências à NBR, "página" é a numeração impressa; "PDF" é a posição no arquivo (página impressa = PDF − 8).
        O exemplar de Creder tem paginação de arquivo distinta da edição impressa; por isso se usam seção, tabela e posição no PDF.
      </p>
      {RASTREABILIDADE.map((mapa) => (
        <section key={mapa.titulo} className="bloco-conformidade">
          <h3>{mapa.titulo}</h3>
          <div className="tabela-scroll">
            <table className="tabela-resultado tabela-cartoes">
              <thead>
                <tr>
                  {mapa.colunas.map((coluna) => (
                    <th key={coluna} scope="col">{coluna}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mapa.linhas.map((linha) => (
                  <tr key={linha[0] + linha[1]}>
                    {linha.map((celula, indice) => (
                      <td key={mapa.colunas[indice]} data-label={mapa.colunas[indice]} className="celula-quebra">{celula}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      <ul className="texto-fraco">
        {REFERENCIAS_COMPILADO.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>

      <p className="texto-fraco">
        Referência: ABNT NBR 5410:2004, versão corrigida de 17.03.2008. A ferramenta não substitui o projeto
        assinado por profissional habilitado (ART).
      </p>
    </section>
  )
}
