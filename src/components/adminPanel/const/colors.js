// Mapeo de colores por categoría
export const CATEGORY_COLOR_MAP = {
    'chispeza': { 
        bg: '#FFF5E0', 
        text: '#B38700', 
        border: '#ffc200', 
        main: '#ffc200' 
    },
    'pinta pa bueno': { 
        bg: '#FFF0E6', 
        text: '#B84800', 
        border: '#f96703', 
        main: '#f96703' 
    },
    'sandia cala': { 
        bg: '#E8F5E7', 
        text: '#1B6B15', 
        border: '#28aa1d', 
        main: '#28aa1d' 
    },
    'mejora continua': { 
        bg: '#F3E5F8', 
        text: '#6B0C8F', 
        border: '#a114c4', 
        main: '#a114c4' 
    },
};

// Colores por defecto para categorías no mapeadas
export const DEFAULT_COLORS = [
    { bg: '#E3F2FD', text: '#0D47A1', border: '#90CAF9', main: '#1976D2' },
    { bg: '#F3E5F5', text: '#4A148C', border: '#CE93D8', main: '#9C27B0' },
    { bg: '#FFF3E0', text: '#E65100', border: '#FFB74D', main: '#FF9800' },
    { bg: '#E0F7FA', text: '#006064', border: '#80DEEA', main: '#00BCD4' },
    { bg: '#FCE4EC', text: '#880E4F', border: '#F48FB1', main: '#E91E63' },
    { bg: '#FFF8E1', text: '#F57F17', border: '#FFE082', main: '#FFC107' },
];

// Función para normalizar texto (quitar tildes y convertir a lowercase)
const normalizar = (texto) => {
    return texto
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
};

// Función para obtener colores según la categoría
export const getCategoryColors = (categoria) => {
    const categoriaNormalizada = normalizar(categoria);

    // Buscar coincidencia exacta o parcial
    for (const [key, colors] of Object.entries(CATEGORY_COLOR_MAP)) {
        const keyNormalizado = normalizar(key);
        if (categoriaNormalizada.includes(keyNormalizado) || keyNormalizado.includes(categoriaNormalizada)) {
            return colors;
        }
    }

    // Usar un hash simple del nombre de categoría para asignar color consistente
    const hash = categoria.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return DEFAULT_COLORS[hash % DEFAULT_COLORS.length];
};
