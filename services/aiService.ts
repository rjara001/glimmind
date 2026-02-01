
import { GoogleGenAI, Type } from "@google/genai";
import { Association } from "../types";

/**
 * Servicio de IA para Glimmind.
 * Utiliza Gemini 3 Flash para agrupar términos por afinidad temática.
 */
export const aiService = {
  groupAssociations: async (associations: Association[], concept: string) => {
    // DIAGNÓSTICO DE KEY (Para depuración local)
    const apiKey = process.env.API_KEY;
    
    console.log("--- DIAGNÓSTICO GEMINI ---");
    console.log("¿Key presente?:", !!apiKey);
    console.log("Longitud de Key:", apiKey?.length || 0);
    if (apiKey && apiKey.length > 4) {
      console.log("Prefijo de Key:", apiKey.substring(0, 4) + "...");
    }
    console.log("--------------------------");

    if (!apiKey || apiKey.length < 5) {
      throw new Error("API_KEY no detectada o es demasiado corta. Revisa la consola para más detalles.");
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

      const jsonStr = response.text;
      
      if (!jsonStr) {
        throw new Error("La IA no devolvió una respuesta válida.");
      }
      
      return JSON.parse(jsonStr.trim());
    } catch (error: any) {
      console.error("Error detallado de Gemini:", error);
      
      if (error.message?.includes("API_KEY")) {
        throw new Error("Problema con la API Key. Verifica que sea válida en tu entorno.");
      }
      
      throw new Error("Error al organizar la lista: " + (error.message || "Error desconocido"));
    }
  }
};
