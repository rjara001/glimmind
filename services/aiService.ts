
import { GoogleGenAI, Type } from "@google/genai";
import { Association } from "../types";

// Always use the API key from process.env.API_KEY directly as per guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const aiService = {
  groupAssociations: async (associations: Association[], concept: string) => {
    // Tomamos una muestra representativa si es demasiado grande para el prompt inicial, 
    // aunque Gemini maneja contextos amplios, optimizamos enviando texto plano con índices.
    const dataToProcess = associations.map((a, index) => `${index}: ${a.term} || ${a.definition}`).join('\n');

    // Use gemini-3-pro-preview for complex reasoning tasks like logical grouping and categorization.
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
      // Accessing the .text property of GenerateContentResponse directly.
      const jsonStr = response.text || "[]";
      const result = JSON.parse(jsonStr.trim());
      return result;
    } catch (e) {
      console.error("Error parsing AI response", e);
      return [];
    }
  }
};
