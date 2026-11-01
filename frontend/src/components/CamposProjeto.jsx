import Campo from './Campo.jsx'
import { validarNumero } from './validacao.js'
import { useProjeto } from '../context/useProjeto.js'

// Campos ligados direto a uma chave do projeto (setCampo), para os painéis do compilado (semanas 3 a 8):
// evitam um setter por campo.

export function CampoNumero({ chave, label, unidade, ajuda, min = 0, maiorQueMin = true, inteiro = false, passo = 'any' }) {
  const { projeto, setCampo } = useProjeto()
  return (
    <Campo label={label} unidade={unidade} ajuda={ajuda} erro={validarNumero(projeto[chave], { min, maiorQueMin, inteiro })}>
      <input type="number" inputMode="decimal" min={min} step={passo} className="campo" value={projeto[chave] ?? ''} onChange={(evento) => setCampo(chave, evento.target.value)} />
    </Campo>
  )
}

export function CampoTexto({ chave, label, ajuda }) {
  const { projeto, setCampo } = useProjeto()
  return (
    <Campo label={label} ajuda={ajuda}>
      <input type="text" className="campo" value={projeto[chave] ?? ''} onChange={(evento) => setCampo(chave, evento.target.value)} />
    </Campo>
  )
}

// opcoes: [[valor, rótulo], ...]
export function CampoSelecao({ chave, label, ajuda, opcoes }) {
  const { projeto, setCampo } = useProjeto()
  return (
    <Campo label={label} ajuda={ajuda}>
      <select className="campo" value={projeto[chave] ?? ''} onChange={(evento) => setCampo(chave, evento.target.value)}>
        {opcoes.map(([valor, rotulo]) => (
          <option key={valor} value={valor}>
            {rotulo}
          </option>
        ))}
      </select>
    </Campo>
  )
}

export function CampoMarcar({ chave, children }) {
  const { projeto, setCampo } = useProjeto()
  return (
    <label className="campo-checkbox">
      <input type="checkbox" checked={Boolean(projeto[chave])} onChange={(evento) => setCampo(chave, evento.target.checked)} />
      {children}
    </label>
  )
}

// Campo de um mapa {id: valor} do projeto (ex.: impedancias, secoesRetorno, areasCabo).
export function CampoMapa({ mapa, id, label, unidade, ajuda, aria }) {
  const { projeto, setMapa } = useProjeto()
  const valor = projeto[mapa]?.[id] ?? ''
  return (
    <Campo label={label} unidade={unidade} ajuda={ajuda} erro={validarNumero(valor, { maiorQueMin: true })}>
      <input type="number" inputMode="decimal" min="0" step="any" className="campo" aria-label={aria} value={valor} onChange={(evento) => setMapa(mapa, id, evento.target.value)} />
    </Campo>
  )
}
