import { normalizarTexto, categoriaToPonderacionId } from './categorias';

// Calcular nota de una evaluación individual
export const calcularNotaEvaluacion = (evaluacion, categoria, ponderaciones) => {
  const catNormalizada = normalizarTexto(categoria);
  const ponderacionId = categoriaToPonderacionId(catNormalizada);
  const ponderacion = ponderaciones[ponderacionId] || {};
  
  // Obtener campos dinámicamente desde las ponderaciones de Firebase
  const campos = Object.keys(ponderacion).filter(key => 
    key !== 'fechaActualizacion' && typeof ponderacion[key] === 'number'
  );

  let notaFinal = 0;

  campos.forEach(campo => {
    const valor = evaluacion.calificaciones?.[campo];
    if (valor !== undefined && valor !== null) {
      const peso = ponderacion[campo];
      const notaPonderada = (Number(valor) * peso) / 100;
      notaFinal += notaPonderada;
    }
  });

  return notaFinal;
};

// Calcular promedios por proyecto
export const calcularPromedioProyecto = (proyectoId, categoria, evaluaciones, ponderaciones) => {
  const evaluacionesProyecto = evaluaciones.filter(e => e.proyectoId === proyectoId);
  
  if (evaluacionesProyecto.length === 0) return null;

  const catNormalizada = normalizarTexto(categoria);
  const ponderacionId = categoriaToPonderacionId(catNormalizada);
  const ponderacion = ponderaciones[ponderacionId] || {};
  
  // Obtener campos dinámicamente desde las ponderaciones de Firebase
  const campos = Object.keys(ponderacion).filter(key => 
    key !== 'fechaActualizacion' && typeof ponderacion[key] === 'number'
  );

  let notaFinal = 0;
  const detallesCampos = {};

  campos.forEach(campo => {
    const valoresCampo = evaluacionesProyecto
      .map(e => e.calificaciones?.[campo])
      .filter(v => v !== undefined && v !== null);
    
    if (valoresCampo.length > 0) {
      const promedioCampo = valoresCampo.reduce((sum, val) => sum + Number(val), 0) / valoresCampo.length;
      const peso = ponderacion[campo];
      const notaPonderada = (promedioCampo * peso) / 100;
      
      detallesCampos[campo] = {
        promedio: promedioCampo,
        peso: peso,
        notaPonderada: notaPonderada
      };
      
      notaFinal += notaPonderada;
    }
  });

  return {
    nota: notaFinal,
    cantidadEvaluaciones: evaluacionesProyecto.length,
    detalles: detallesCampos,
    evaluacionesIndividuales: evaluacionesProyecto
  };
};
