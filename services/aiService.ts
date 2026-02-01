
import { GoogleGenAI, Type } from "@google/genai";
import { Association } from "../types";

/**
 * Servicio de IA optimizado para Glimmind.
 * Maneja la lógica de agrupación utilizando el modelo Gemini 3 Flash.
 * Diseñado para entornos de navegador con inyección dinámica de API Keys.
 */
export const aiService = {
  groupAssociations: async (associations: Association[], concept: string) => {
    // 1. Gestión proactiva de la API Key en el navegador
    if (typeof window !== 'undefined' && (window as any).aistudio) {
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      if (!hasKey) {
        // Obliga al usuario a elegir una llave si no hay ninguna activa
        await (window as any).aistudio.openSelectKey();
      }
    }

    // 2. Inicialización Crítica: Creamos la instancia justo antes del uso.
    // Esto garantiza que tome el valor más reciente de process.env.API_KEY
    // inyectado por el sistema después de que el usuario interactúa con el diálogo.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

    // Preparamos los datos para que la IA entienda los índices originales
    const dataToProcess = associations
      .slice(0, 1500) // Límite de seguridad para el contexto
      .map((a, index) => `${index}: ${a.term} || ${a.definition}`)
      .join('\n');

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Actúa como un experto en diseño instruccional y pedagogía.
        
        CONTEXTO: El usuario está estudiando ${concept}.
        TAREA: Agrupar los elementos de la lista en categorías temáticas lógicas para facilitar la memorización por bloques (chunking).
        
        REGLAS:
        - Máximo 10 grupos.
        - Usa nombres de grupos breves y descriptivos.
        - Devuelve EXCLUSIVAMENTE los índices numéricos de la lista original.
        
        LISTA DE ENTRADA:
        ${dataToProcess}

        RESPUESTA ESPERADA: Un array JSON de objetos con "groupName" e "indices".`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                groupName: { 
                  type: Type.STRING,
                  description: "Nombre sugerido para la sub-lista"
                },
                indices: {
                  type: Type.ARRAY,
                  items: { type: Type.INTEGER },
                  description: "Lista de IDs numéricos que pertenecen a este grupo"
                }
              },
              required: ["groupName", "indices"]
            }
          }
        }
      });

      const text = response.text;
      if (!text) throw new Error("La IA no pudo procesar la solicitud.");

      return JSON.parse(text.trim());
    } catch (error: any) {
      console.error("Error en AI Service:", error);

      // Manejo inteligente de errores de acceso/facturación
      const isAuthError = 
        error.message?.includes("Requested entity was not found") || 
        error.message?.includes("API_KEY_INVALID") ||
        error.message?.includes("403") ||
        error.message?.includes("404");

      if (isAuthError && typeof window !== 'undefined' && (window as any).aistudio) {
        // Si la llave falló, reseteamos el estado para que el usuario elija una nueva
        await (window as any).aistudio.openSelectKey();
        throw new Error("La conexión falló. Asegúrate de seleccionar una API Key de un proyecto de Google Cloud con facturación activa (Pay-as-you-go).");
      }

      throw new Error(error.message || "No se pudo conectar con Gemini.");
    }
  }
};
