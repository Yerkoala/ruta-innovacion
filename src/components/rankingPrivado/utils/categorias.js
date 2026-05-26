// Función para normalizar strings
export const normalizarTexto = (texto) => {
  if (!texto) return '';
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
};

// Mapear categoría normalizada al ID de ponderación en Firebase
export const categoriaToPonderacionId = (categoriaNormalizada) => {
  const mapeo = {
    "chispeza": "chispeza",
    "mejora continua": "mejora-continua",
    "sandia cala": "sandia-cala",
    "pinta pa bueno": "pinta-pa-bueno",
    "eureka": "eureka"
  };
  return mapeo[categoriaNormalizada] || categoriaNormalizada;
};

// Diccionario de estilos centralizado (consistente con EvaluacionProyectos)
export const categoriaEstilos = {
  "mejora continua": { color: "#a114c4", icono: "📈" },
  "sandia cala": { color: "#28aa1d", icono: "🍉" },
  "pinta pa bueno": { color: "#f96703", icono: "🖌️" },
  "chispeza": { color: "#ffc64c", icono: "💡" },
  "eureka": { color: "#2196f3", icono: "💡" },
  "default": { color: "#6c757d", icono: "📁" }
};

// Función para obtener colores derivados del color principal
export const getCategoryColors = (categoria) => {
  const catNormalizada = normalizarTexto(categoria);
  const estilo = categoriaEstilos[catNormalizada];
  
  if (!estilo) {
    // Fallback a default (gris)
    return {
      bg: '#f5f5f5',
      text: categoriaEstilos["default"].color,
      border: '#dee2e6'
    };
  }
  
  // Generar colores de fondo claros basados en el color principal
  const colorMap = {
    "#a114c4": { bg: '#F3E5F5', border: '#BA68C8' }, // mejora continua
    "#28aa1d": { bg: '#E8F5E9', border: '#81C784' }, // sandia cala
    "#f96703": { bg: '#FFF3E0', border: '#FFB74D' }, // pinta pa bueno
    "#ffc64c": { bg: '#FFF8E1', border: '#FFD54F' }, // chispeza
    "#2196f3": { bg: '#E3F2FD', border: '#64B5F6' }, // eureka
    "#6c757d": { bg: '#f5f5f5', border: '#dee2e6' }  // default
  };
  
  const colors = colorMap[estilo.color] || { bg: '#f5f5f5', border: '#e0e0e0' };
  
  return {
    bg: colors.bg,
    text: estilo.color,
    border: colors.border
  };
};
