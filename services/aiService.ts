
import { GoogleGenAI, Type } from "@google/genai";
import { Association } from "../types";

export const aiService = {
  groupAssociations: async (associations: Association[], concept: string) => {
    // Inicialización siguiendo estrictamente la directriz de usar process.env.API_KEY directamente.
    // El entorno inyectará esta variable automáticamente.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // Preparamos los datos con índices para reducir el ruido y tokens innecesarios.
    // Si la lista es gigantesca (>1000), enviamos solo una parte representativa para evitar timeouts,
    // pero para 3,000 elementos Gemini 3 Flash maneja el contexto sin problemas.
    const dataToProcess = associations
      .slice(0, 1500) // Procesamos bloques de hasta 1500 para mayor estabilidad en la respuesta
      .map((a, index) => `${index}: ${a.term} || ${a.definition}`)
      .join('\n');

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Actúa como un experto en pedagogía y organización del aprendizaje.
        Analiza esta lista de asociaciones de ${concept}.
        OBJETIVO: Agrupar estos elementos en categorías lógicas (máximo 12 grupos).
        REGLA: Usa los índices proporcionados para identificar los elementos.
        
        LISTA:
        ${dataToProcess}

        Genera una estructura de grupos útil para memorizar.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                groupName: {
                  type: Type.STRING,
                  description: "Nombre creativo de la categoría (ej: Verbos de Acción Diaria)"
                },
                indices: {
                  type: Type.ARRAY,
                  items: { type: Type.INTEGER },
                  description: "Los índices de la lista original que pertenecen a este grupo"
                }
              },
              required: ["groupName", "indices"]
            }
          }
        }
      });

      if (!response.text) {
        throw new Error("La IA devolvió una respuesta vacía.");
      }

      const result = JSON.parse(response.text.trim());
      return result;
    } catch (error: any) {
      console.error("Detalle del error en aiService:", error);
      // Re-lanzamos el error con un mensaje más descriptivo para el usuario
      throw new Error(error.message || "Error desconocido al contactar con Gemini");
    }
  }
};
