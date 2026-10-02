// '' = não preenchido. Devolve a mensagem de erro para o `Campo`, ou null.
export function validarNumero(valor, { obrigatorio = false, min = 0, maiorQueMin = false, max, inteiro = false } = {}) {
  if (valor === '' || valor === null || valor === undefined) return obrigatorio ? 'Obrigatório.' : null
  const numero = Number(valor)
  if (!Number.isFinite(numero)) return 'Número inválido.'
  if (maiorQueMin ? numero <= min : numero < min) return maiorQueMin ? `Precisa ser maior que ${min}.` : `Mínimo: ${min}.`
  if (max !== undefined && numero > max) return `Máximo: ${max}.`
  if (inteiro && !Number.isInteger(numero)) return 'Use um número inteiro.'
  return null
}
