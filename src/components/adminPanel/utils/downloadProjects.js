import * as XLSX from 'xlsx';

/**
 * Descarga una plantilla vacía en formato Excel con todas las columnas necesarias
 */
export const descargarPlantillaFormato = () => {
    // Crear workbook y worksheet
    const wb = XLSX.utils.book_new();
    
    // Definir las columnas de la plantilla (todas las columnas soportadas)
    const headers = ['N°', 'Proyecto', 'Gerencia', 'Categoría', 'Grupo', 'Líder', 'Descripción', 'Problema', 'Impacto', 'Juez', 'Costo_implementacion', 'Costo_piloto', 'Casos', 'Empresa', 'Ficha'];
    
    // Crear datos de ejemplo (opcional: puedes dejar solo headers)
    const data = [
        headers,
        [1, 'Ejemplo de Proyecto', 'Gerencia Ejemplo', 'chispeza', 'Grupo A', 'Juan Pérez', 'Descripción del proyecto de ejemplo', 'Problema que resuelve el proyecto', 'Impacto esperado del proyecto', 'Juez1, Juez2', '$50.000', '$10.000', '100 casos', 'Empresa A', 'https://ejemplo.com/ficha.pdf'],
        [2, '', '', '', '', '', '', '', '', '', '', '', '', '', '']
    ];
    
    // Crear worksheet desde el array
    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // Establecer anchos de columnas
    ws['!cols'] = [
        { wch: 5 },   // N°
        { wch: 30 },  // Proyecto
        { wch: 20 },  // Gerencia
        { wch: 15 },  // Categoría
        { wch: 12 },  // Grupo
        { wch: 20 },  // Líder
        { wch: 50 },  // Descripción
        { wch: 50 },  // Problema
        { wch: 50 },  // Impacto
        { wch: 25 },  // Juez
        { wch: 18 },  // Costo_implementacion
        { wch: 15 },  // Costo_piloto
        { wch: 15 },  // Casos
        { wch: 18 },  // Empresa
        { wch: 40 }   // Ficha
    ];
    
    // Agregar worksheet al workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Proyectos');
    
    // Descargar el archivo
    XLSX.writeFile(wb, 'plantilla_proyectos.xlsx');
};

/**
 * Descarga todos los proyectos guardados en Firebase en formato Excel
 * @param {Array} proyectos - Array de proyectos desde Firebase
 * @param {string} nombreFinal - Nombre de la final para el archivo
 * @returns {boolean} - true si se descargó correctamente, false si hay error
 */
export const descargarProyectosFirebase = (proyectos, nombreFinal = 'proyectos') => {
    if (!proyectos || proyectos.length === 0) {
        return false;
    }

    try {
        // Crear workbook y worksheet
        const wb = XLSX.utils.book_new();
        
        // Definir las columnas de la plantilla
        const headers = ['N°', 'Proyecto', 'Gerencia', 'Categoría', 'Grupo', 'Líder', 'Descripción', 'Problema', 'Impacto', 'Juez', 'Costo_implementacion', 'Costo_piloto', 'Casos', 'Empresa', 'Ficha'];
        
        // Mapear los proyectos guardados al formato de la plantilla
        const data = [headers];
        
        proyectos.forEach((proyecto) => {
            data.push([
                proyecto.numero || '',
                proyecto.proyecto || '',
                proyecto.gerencia || '',
                proyecto.categoria || '',
                proyecto.grupo || '',
                proyecto.lider || '',
                proyecto.descripcion || '',
                proyecto.problema || '',
                proyecto.impacto || '',
                proyecto.juez || '',
                proyecto.Costo_implementacion || '',
                proyecto.Costo_piloto || '',
                proyecto.Casos || '',
                proyecto.Empresa || '',
                proyecto.Ficha || ''
            ]);
        });
        
        // Crear worksheet desde el array
        const ws = XLSX.utils.aoa_to_sheet(data);
        
        // Establecer anchos de columnas
        ws['!cols'] = [
            { wch: 5 },   // N°
            { wch: 30 },  // Proyecto
            { wch: 20 },  // Gerencia
            { wch: 15 },  // Categoría
            { wch: 12 },  // Grupo
            { wch: 20 },  // Líder
            { wch: 50 },  // Descripción
            { wch: 50 },  // Problema
            { wch: 50 },  // Impacto
            { wch: 25 },  // Juez
            { wch: 18 },  // Costo_implementacion
            { wch: 15 },  // Costo_piloto
            { wch: 15 },  // Casos
            { wch: 18 },  // Empresa
            { wch: 40 }   // Ficha
        ];
        
        // Agregar worksheet al workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Proyectos');
        
        // Descargar el archivo con nombre descriptivo
        const fileName = `${nombreFinal}_proyectos_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
        
        return true;
    } catch (error) {
        console.error('Error al descargar proyectos:', error);
        return false;
    }
};
