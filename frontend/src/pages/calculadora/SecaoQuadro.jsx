import { useProjeto } from '../../context/useProjeto.js'
import DiagramaUnifilar from '../../components/DiagramaUnifilar.jsx'
import VistaQuadro from '../../components/VistaQuadro.jsx'
import { ClausulaInfo } from '../../components/RefNorma.jsx'

export default function SecaoQuadro() {
  const { projeto, calculo } = useProjeto()
  return (
    <>
      <h2>Diagrama unifilar</h2>
      <p className="texto-fraco">
        Gerado do dimensionamento (§6.1.8.1)
        <ClausulaInfo clausula="§6.1.8.1">
          A documentação da instalação deve incluir um diagrama (unifilar ou multifilar) mostrando os circuitos, os
          dispositivos de proteção e comando, e as características de cada trecho — para que qualquer pessoa
          qualificada consiga entender a instalação sem precisar abrir o quadro para descobrir.
        </ClausulaInfo>
        . Numeração dos circuitos igual à do quadro.
      </p>
      <DiagramaUnifilar projeto={projeto} calculo={calculo} />
      <h2>Quadro de distribuição</h2>
      <VistaQuadro calculo={calculo} />
    </>
  )
}
