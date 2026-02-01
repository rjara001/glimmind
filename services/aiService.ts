
import { GoogleGenAI, Type } from "@google/genai";
import { Association } from "../types";

/**
 * Servicio de IA para Glimmind.
 * Utiliza Gemini 3 Flash para agrupar términos por afinidad temática.
 */
export const aiService = {
  groupAssociations: async (associations: Association[], concept: string) => {
    // Verificación de seguridad de la API Key en el entorno
    const apiKey = process.env.API_KEY;
    
    if (!apiKey) {
      throw new Error("API_KEY no detectada. Si estás en local, asegúrate de configurar la variable de entorno. Si estás en la plataforma, verifica tu configuración de proyecto.");
    }

    // Inicialización siguiendo las guías de @google/genai
    const ai = new GoogleGenAI({ apiKey });

    // Preparar los datos para el prompt de forma eficiente
    const dataToProcess = associations
      .map((a, index) => `${index}|${a.term}|${a.definition}`)
      .join('\n');

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Actúa como un experto en mnemotecnia. Analiza estas asociaciones de "${concept}" y agrúpalas en categorías lógicas (máximo 8) para facilitar su memorización.
        
        DATOS DE ENTRADA (ID|Término|Definición):
        ${dataToProcess}

        REQUISITOS DE SALIDA:
        - Devuelve ÚNICAMENTE un array JSON.
        - Cada objeto debe tener: "groupName" (nombre sugerente) e "indices" (IDs numéricos de la entrada).`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                groupName: { 
                  type: Type.STRING,
                  description: "Nombre descriptivo de la categoría temática."
                },
                indices: {
                  type: Type.ARRAY,
                  items: { type: Type.INTEGER },
                  description: "Lista de IDs que pertenecen a este grupo."
                }
              },
              required: ["groupName", "indices"]
            }
          }
        }
      });

      // Acceso correcto a la propiedad .text (no es un método)
      const jsonStr = response.text;
      
      if (!jsonStr) {
        throw new Error("La IA no devolvió una respuesta válida.");
      }
      
      return JSON.parse(jsonStr.trim());
    } catch (error: any) {
      console.error("Error detallado de Gemini:", error);
      
      // Mensaje de error amigable según el tipo de fallo común
      if (error.message?.includes("API_KEY")) {
        throw new Error("Problema con la API Key. Verifica que sea válida.");
      }
      if (error.message?.includes("billing")) {
        throw new Error("El proyecto de Google Cloud requiere facturación habilitada para usar Gemini 3.");
      }
      
      throw new Error("Error al organizar la lista: " + (error.message || "Error desconocido"));
    }
  }
};
