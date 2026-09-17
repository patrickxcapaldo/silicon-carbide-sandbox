export const equations = [
  { id: 'radiator-balance', label: 'Net radiator balance', latex: 'P_{compute,max}=\\min(P_{rad}-P_{solar}-P_{albedo}-P_{parasitic},\\;\\dot m c_p \\Delta T)', description: 'Compute heat is limited by radiator rejection and coolant transport capacity.' },
  { id: 'radiation', label: 'Radiative exchange', latex: 'P_{rad}=\\epsilon\\sigma A[(1-F_E)(T_r^4-T_s^4)+F_E(T_r^4-T_E^4)]', description: 'The Earth view factor diverts part of the radiator field of view away from deep space.' },
];
