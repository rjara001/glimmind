
import { GoogleGenAI, Type } from "@google/genai";
import { Association } from "../types";

export const aiService = {
  groupAssociations: async (associations: Association[], concept: string) => {
    // Se inicializa el cliente dentro de la función para cumplir con las directrices 
    // de obtener la clave más reciente y evitar errores de carga en el navegador.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

    // Preparamos los datos con índices para que la IA pueda referenciarlos fácilmente
    const dataToProcess = associations.map((a, index) => `${index}: ${a.term} || ${a.definition}`).join('\n');

    // Utilizamos gemini-3-pro-preview para tareas de razonamiento complejo como categorización
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Analiza esta lista de asociaciones de ${concept}. 
      Tu objetivo es dividir estos elementos en grupos lógicos y manejables (máximo 12 grupos). 
      Crea nombres de categorías creativos y útiles para el aprendizaje. 

      Lista de asociaciones (formato 'índice: término || definición'):
      ${dataToProcess}

      Devuelve los datos estrictamente en el formato JSON solicitado, utilizando los índices proporcionados.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              groupName: {
                type: Type.STRING,
                description: "Nombre representativo del grupo (ej: Verbos Irregulares de Uso Frecuente)"
              },
              indices: {
                type: Type.ARRAY,
                items: { type: Type.INTEGER },
                description: "Los índices de los elementos originales que pertenecen a este grupo"
              }
            },
            required: ["groupName", "indices"],
            propertyOrdering: ["groupName", "indices"]
          }
        }
      }
    });

    try {
      // Extraemos el texto directamente de la respuesta según las especificaciones del SDK
      const jsonStr = response.text || "[]";
      const result = JSON.parse(jsonStr.trim());
      return result;
    } catch (e) {
      console.error("Error al procesar la respuesta de la IA", e);
      return [];
    }
  }
};
