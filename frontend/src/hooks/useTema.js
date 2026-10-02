import { useCallback, useEffect, useState } from 'react'

const CHAVE_ARMAZENAMENTO = 'fio-certo:tema'
const TEMAS_VALIDOS = ['sistema', 'claro', 'escuro']

function lerTemaSalvo() {
  try {
    const salvo = localStorage.getItem(CHAVE_ARMAZENAMENTO)
    return TEMAS_VALIDOS.includes(salvo) ? salvo : 'sistema'
  } catch {
    return 'sistema'
  }
}

function aplicarTema(tema) {
  const raiz = document.documentElement
  if (tema === 'sistema') {
    raiz.removeAttribute('data-theme')
  } else {
    raiz.setAttribute('data-theme', tema === 'escuro' ? 'dark' : 'light')
  }

  // Lê a cor já resolvida do body: o token --bg é um light-dark(...), e o valor bruto de uma
  // variável CSS não é uma cor válida para o theme-color.
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    const corFundo = getComputedStyle(document.body).backgroundColor
    if (corFundo) meta.setAttribute('content', corFundo)
  }
}

// 'sistema' acompanha o prefers-color-scheme do dispositivo (padrão); 'claro'/'escuro'
// são escolhas explícitas do usuário, guardadas em localStorage e reaplicadas a cada visita.
export function useTema() {
  const [tema, setTemaState] = useState(lerTemaSalvo)

  useEffect(() => {
    aplicarTema(tema)
  }, [tema])

  const setTema = useCallback((novoTema) => {
    setTemaState(novoTema)
    try {
      localStorage.setItem(CHAVE_ARMAZENAMENTO, novoTema)
    } catch {
      // localStorage indisponível (ex: navegação privada) — o tema ainda funciona nesta sessão.
    }
  }, [])

  return { tema, setTema }
}
