import { useProjeto } from '../../context/useProjeto.js'
import { listarMateriais } from '../../calculations/materiais.js'
import Campo from '../../components/Campo.jsx'
import Nota from '../../components/Nota.jsx'
import { validarNumero } from '../../components/validacao.js'
import { ClausulaInfo } from '../../components/RefNorma.jsx'

const numero = (valor) => valor.toLocaleString('pt-BR')
const COLUNAS_NUMERICAS = new Set(['Seção', 'Metros', 'Quantidade'])

function Tabela({ colunas, linhas }) {
  return (
    <div className="tabela-scroll">
      <table className="tabela-resultado tabela-cartoes">
        <thead>
          <tr>
            {colunas.map((coluna) => (
              <th key={coluna}>{coluna}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha) => (
            <tr key={linha.join('|')}>
              {linha.map((celula, indice) => (
                <td key={colunas[indice]} data-label={colunas[indice]} className={COLUNAS_NUMERICAS.has(colunas[indice]) ? 'numerico' : 'celula-quebra'}>
                  {celula}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// F5 — lista de materiais. `editavel` mostra o campo de folga (no Memorial sai só a lista).
export default function SecaoMateriais({ editavel = true }) {
  const { projeto, calculo, setFolgaMateriaisPercentual } = useProjeto()
  const m = listarMateriais(projeto, calculo, { folgaPercentual: projeto.folgaMateriaisPercentual })

  return (
    <section className="secao-materiais">
      <h2>Lista de materiais</h2>
      <p className="texto-fraco">
        Quantidades tiradas do dimensionamento e dos comprimentos informados, sem marca e sem preço; a especificação cita a norma de produto.
        {m.folgaPercentual > 0 ? ` Cabos e eletrodutos com ${numero(m.folgaPercentual)}% de folga.` : ' Sem folga nos comprimentos.'}
      </p>
      {editavel && (
        <div className="grade-campos">
          <Campo
            label="Folga nos comprimentos"
            unidade="%"
            ajuda="Para sobras, subidas e ligações no quadro. Você decide; a ferramenta não assume nenhuma."
            erro={validarNumero(projeto.folgaMateriaisPercentual, { min: 0, max: 100 })}
          >
            <input
              type="number"
              inputMode="decimal"
              min="0"
              className="campo"
              value={projeto.folgaMateriaisPercentual}
              onChange={(evento) => setFolgaMateriaisPercentual(evento.target.value)}
            />
          </Campo>
        </div>
      )}

      {m.semComprimento.length > 0 && (
        <p className="etiqueta-status atencao">Fora da conta por falta de comprimento: {m.semComprimento.join(', ')}.</p>
      )}
      {m.semSecao.length > 0 && <p className="etiqueta-status alerta">Sem seção viável (fora da conta): {m.semSecao.join(', ')}.</p>}

      <h3>
        Cabos
        <ClausulaInfo clausula="§6.1.5.3">
          Cores exclusivas por função: neutro em azul-claro, condutor de proteção (terra) em verde-amarelo ou verde.
          As demais cores ficam livres, desde que usadas de forma consistente no mesmo projeto.
        </ClausulaInfo>
      </h3>
      <Tabela
        colunas={['Função', 'Cor (§6.1.5.3)', 'Especificação', 'Seção', 'Metros']}
        linhas={m.cabos.map((cabo) => [cabo.label, cabo.cor, cabo.especificacao, `${numero(cabo.secaoMm2)} mm²`, `${cabo.metros} m`])}
      />

      {m.eletrodutos.length > 0 && (
        <>
          <h3>Eletrodutos</h3>
          <Tabela
            colunas={['Diâmetro', 'Metros']}
            linhas={m.eletrodutos.map((eletroduto) => [`${eletroduto.referencia} (DN ${eletroduto.nominalMm})`, `${eletroduto.metros} m`])}
          />
          <Nota>
            Conta um eletroduto por circuito, do quadro ao ponto mais distante. Na obra, circuitos que dividem o mesmo trecho
            usam menos metros, mas o diâmetro desse trecho tem de ser recalculado com todos os condutores juntos (§6.2.11.1.6).
          </Nota>
        </>
      )}

      <h3>Quadro de distribuição</h3>
      <Tabela
        colunas={['Dispositivo', 'Quantidade']}
        linhas={[
          ...m.disjuntores.map((d) => [
            d.icnMinimoKA
              ? `${d.descricao} · Icn ${numero(d.icnPadronizadaKA ?? d.icnMinimoKA)} kA (mínimo ${numero(d.icnMinimoKA)} kA) · NBR NM 60898`
              : `${d.descricao} · NBR NM 60898 · Icn: informe a Icc na etapa de Instalação`,
            d.quantidade,
          ]),
          ...m.drs.map((d) => [`${d.descricao} · tipo A (IEC 61008-2-1)`, d.quantidade]),
          ...m.dps.map((d) => [`${d.descricao} · classe II (IEC 61643-1)${m.dpsExigido ? '' : ' — recomendado'}`, d.quantidade]),
          [`Espaço de reserva (Tabela 59)`, `${m.quadro.reserva} circuitos`],
          [`Largura estimada do quadro`, `≥ ${m.quadro.modulos} módulos DIN`],
        ]}
      />
      <Nota>
        Largura em módulos DIN de 18 mm, 1 por polo; DR e DPS podem ocupar mais, conforme o fabricante. A curva é a informada
        na etapa de Instalação para todos os disjuntores. A Icn sobe para o próximo valor padronizado da NBR NM 60898. O DR
        sugerido é o tipo A, que detecta também falta com componente contínua (§6.3.3.2.2), possível em aparelhos com
        eletrônica de potência; o tipo AC só serve onde não se prevê falta que não seja senoidal (§6.3.3.2.3).
      </Nota>

      <h3>Pontos</h3>
      <Tabela
        colunas={['Ponto', 'Quantidade']}
        linhas={[
          ['Tomadas de uso geral 2P+T (NBR 14136; com terra, §6.5.3.1)', m.pontos.tomadasUsoGeral],
          ['Pontos de uso específico (equipamentos)', m.pontos.pontosUsoEspecifico],
          ['Pontos de luz (≥ 1 por cômodo, §9.5.2.1.1)', m.pontos.pontosLuz],
        ]}
      />
      <p className="texto-fraco">
        §6.5.3.1
        <ClausulaInfo clausula="§6.5.3.1">
          Toda tomada de uso geral precisa ter contato de aterramento (pino/orifício de terra) ligado ao condutor de
          proteção — mesmo em cômodos "secos", não é opcional.
        </ClausulaInfo>{' '}
        · §9.5.2.1.1
        <ClausulaInfo clausula="§9.5.2.1.1">
          Todo cômodo precisa de pelo menos um ponto de luz fixo no teto ou na parede, mesmo que pequeno ou sem uso
          previsto — não conta iluminação de tomada.
        </ClausulaInfo>
      </p>
    </section>
  )
}
