// Equipamentos comuns para preencher o cadastro de TUE mais rápido. As potências são típicas de
// mercado, NÃO dados da NBR 5410 nem de um fabricante: a interface marca "potência típica —
// confira a placa" até o usuário mexer no valor. `faseFase` = aparelho de 220 V: entre fases em
// rede 127/220 V, fase-neutro em rede 220/380 V.
export const PRESETS_EQUIPAMENTOS = [
  { chave: 'chuveiro', nome: 'Chuveiro elétrico', potenciaW: 5500, tipoCarga: 'resistiva', faseFase: true },
  { chave: 'torneira', nome: 'Torneira elétrica', potenciaW: 5500, tipoCarga: 'resistiva', faseFase: true },
  { chave: 'boiler', nome: 'Aquecedor de água (boiler)', potenciaW: 2000, tipoCarga: 'resistiva', faseFase: true },
  { chave: 'forno', nome: 'Forno elétrico de embutir', potenciaW: 2500, tipoCarga: 'resistiva', faseFase: true },
  { chave: 'cooktop', nome: 'Cooktop de indução', potenciaW: 7000, tipoCarga: 'resistiva', faseFase: true },
  { chave: 'lava-loucas', nome: 'Lava-louças', potenciaW: 1500, tipoCarga: 'resistiva', faseFase: false },
  { chave: 'secadora', nome: 'Secadora de roupas', potenciaW: 2500, tipoCarga: 'resistiva', faseFase: true },
  { chave: 'ar-9000', nome: 'Ar-condicionado 9.000 BTU/h', potenciaW: 1000, tipoCarga: 'indutiva', faseFase: true },
  { chave: 'ar-12000', nome: 'Ar-condicionado 12.000 BTU/h', potenciaW: 1300, tipoCarga: 'indutiva', faseFase: true },
  { chave: 'ar-18000', nome: 'Ar-condicionado 18.000 BTU/h', potenciaW: 1900, tipoCarga: 'indutiva', faseFase: true },
  { chave: 'bomba-piscina', nome: 'Bomba de piscina (½ cv)', potenciaW: 600, tipoCarga: 'indutiva', faseFase: false },
  { chave: 'sauna', nome: 'Aquecedor de sauna', potenciaW: 4500, tipoCarga: 'resistiva', faseFase: true },
]
