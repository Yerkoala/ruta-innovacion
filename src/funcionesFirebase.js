import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "./firebaseConfig";

/**
 * Sube una evaluación a Firestore.
 * @param {Object} tema - Datos del proyecto evaluado.
 * @param {string} juez - Nombre o correo del juez.
 * @param {Object} categoria - Puntajes de la evaluación.
 */

/* MATRIZ PARA DEFINIR EL LA COLECCIÓN */
/**
 * Retorna el nombre de la colección en Firestore según la rúbrica y categoría.
 * @param {string} rubrica - Tipo de rúbrica ("Neg", "Met", "TI").
 * @param {string} categoria - Nombre de la categoría.
 * @returns {string} - Nombre de la colección.
 */
export const getNombreColeccion = (rubrica, categoria) => {
  const siglasCategoria = {
    "Mejora Continua": "MC",
    "Sandía Calá": "SC",
    "Pinta Pa' Bueno": "PPB"
  };

  const siglasRubrica = {
    "interno": "Neg",
    "externo": "Met",
    "ti": "TI",
    "ia": "IA"
  };

  const rubricaFinal = siglasRubrica[rubrica];
  const categoriaFinal = siglasCategoria[categoria];

  if (!rubricaFinal || !categoriaFinal) {
    throw new Error(`Rubrica o categoría no reconocida: ${rubrica}, ${categoria}`);
  }

  const nombreColeccion = `rubrica${rubricaFinal}${categoriaFinal}`;
  return nombreColeccion;
};



/* ENVIAR VALORACIONES DE JUECES */

export const enviarEvaluacion = async (proyecto, juez, categoria, calificaciones, coleccion) => {
  try {
    const docRef = doc(db, coleccion, proyecto.id.toString());

    const nuevaEvaluacion = {
      juez: juez,
      calificaciones: calificaciones
    };

    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const dataActual = docSnap.data();
      let evaluacionesActuales = dataActual.evaluaciones || [];

      // Verificar si el juez ya evaluó
      const indexExistente = evaluacionesActuales.findIndex(e => e.juez === juez);

      if (indexExistente !== -1) {
        // Actualizar evaluación existente
        evaluacionesActuales[indexExistente] = nuevaEvaluacion;
      } else {
        // Agregar nueva evaluación
        evaluacionesActuales.push(nuevaEvaluacion);
      }

      const dataActualizada = {
        ...dataActual,
        evaluaciones: evaluacionesActuales
      };

      await setDoc(docRef, dataActualizada);
    } else {
      // Crear nuevo documento si no existe
      const dataNueva = {
        id: proyecto.id,
        tema: proyecto.Tema,
        categoria: categoria,
        evaluaciones: [nuevaEvaluacion],
        hora: new Date().toLocaleString()
      };

      await setDoc(docRef, dataNueva);
    }
  } catch (error) {
    console.error("❌ Error al enviar la evaluación:", error);
  }
};



/* ENVIAR VALORACIONES DE JUECES METODOLOGICA */

export const aliasCamposMetodologicos = {
  "Se identifica claramente un SPONSOR de proyecto (al menos Subgerente).": "sponsor",
  "Se identifica un líder de proyecto.": "lider",
  "El equipo está conformado por al menos tres personas con funciones claras.": "equipo",
  "La carta de compromiso fue debidamente firmada por el Sponsor.": "carta",
  "Se explican claramente las variables críticas del FUV (Factibilidad, Utilidad, Valor).": "fuv_variables",
  "Se evidencia validación de al menos el 60% de las variables del FUV.": "fuv_validacion",
  "Se evidencian aprendizajes del proceso en la lámina de Anexo.": "anexo_aprendizajes",
  "Se presentó un prototipo visual o funcional del proyecto.": "prototipo",
  "La presentación duró dentro de los 7 minutos.": "tiempo_presentacion",
  "Se cumplió con los tiempos de entrega de documentación.": "documentacion"
};

/**
 * Guarda o actualiza la evaluación metodológica de un juez para un proyecto.
 * @param {Object} proyecto - Datos del proyecto.
 * @param {string} juez - Nombre del juez.
 * @param {string} categoria - Categoría del proyecto.
 * @param {Object} calificaciones - Evaluaciones metodológicas.
 * @param {string} coleccion - Nombre de la colección en Firestore.
 */
export const enviarEvaluacionMetodologica = async (proyecto, juez, categoria, calificaciones, coleccion) => {
  try {
    const docRef = doc(db, coleccion, proyecto.id.toString());

    const nuevaEvaluacion = {
      juez: juez,
      calificaciones: calificaciones
    };

    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const dataActual = docSnap.data();
      let evaluacionesActuales = dataActual.evaluaciones || [];

      const indexExistente = evaluacionesActuales.findIndex(e => e.juez === juez);

      if (indexExistente !== -1) {
        evaluacionesActuales[indexExistente] = nuevaEvaluacion;
      } else {
        evaluacionesActuales.push(nuevaEvaluacion);
      }

      const dataActualizada = {
        ...dataActual,
        evaluaciones: evaluacionesActuales
      };

      await setDoc(docRef, dataActualizada);
    } else {
      const dataNueva = {
        id: proyecto.id,
        tema: proyecto.Tema,
        categoria: categoria,
        evaluaciones: [nuevaEvaluacion]
      };

      await setDoc(docRef, dataNueva);
    }
  } catch (error) {
    console.error("❌ Error al enviar la evaluación metodológica:", error);
  }
};


/* ENVIAR VALORACIONES DE JUECES TI */

export const aliasCamposTecnicos = {
  "¿El proyecto involucró activamente a los equipos de Transformación Digital de la unidad de negocio?": "transformacion_digital",
  "¿Se involucraron adecuadamente los equipos de Tecnología y Datos responsables de la iniciativa?": "tecnologia_datos",
  "¿La solución propuesta representa una innovación o no existe actualmente en la organización?": "innovacion",
  "¿La solución fue validada conforme a los estándares del equipo de Ciberseguridad?": "ciberseguridad",
  "¿La solución considera los cinco atributos de gobierno de datos y utiliza la arquitectura definida por TI?": "gobierno_datos",
  "¿La arquitectura fue validada por el líder de Arquitectura de Tecnología y Datos?": "validacion_arquitectura",
  "¿Existe un sistema de contingencia definido?": "contingencia",
  "¿El uso de IA cumple con las políticas definidas por Tecnología y Datos?": "uso_ia",
  "¿La solución utiliza datos confidenciales o personales?": "datos_sensibles",
  "¿Cuenta con soporte funcional desde el negocio?": "soporte_funcional",
  "¿El soporte está acordado con el proveedor?": "soporte_proveedor"
};

export const enviarEvaluacionTI = async (proyecto, juez, categoria, calificaciones, coleccion) => {
  try {
    const docRef = doc(db, coleccion, proyecto.id.toString());

    const nuevaEvaluacion = {
      juez: juez,
      calificaciones: calificaciones
    };

    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const dataActual = docSnap.data();

      let evaluacionesActuales = dataActual.evaluaciones || [];

      const indexExistente = evaluacionesActuales.findIndex(e => e.juez === juez);

      if (indexExistente !== -1) {
        evaluacionesActuales[indexExistente] = nuevaEvaluacion;
      } else {
        evaluacionesActuales.push(nuevaEvaluacion);
      }

      const dataActualizada = {
        ...dataActual,
        evaluaciones: evaluacionesActuales
      };

      await setDoc(docRef, dataActualizada);
    } else {
      const dataNueva = {
        id: proyecto.id,
        tema: proyecto.Tema,
        categoria: categoria,
        evaluaciones: [nuevaEvaluacion]
      };

      await setDoc(docRef, dataNueva);
    }
  } catch (error) {
    console.error("❌ Error al enviar la evaluación técnica:", error);
  }
};