
import { GoogleGenAI, Type } from "@google/genai";
import { Association } from "../types";

export const aiService = {
  groupAssociations: async (associations: Association[], concept: string) => {
    // Verificamos si ya existe una key seleccionada en el entorno (específicamente para AI Studio/Entornos de Preview)
    if (typeof window !== 'undefined' && (window as any).aistudio) {
      try {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKey) {
          await (window as any).aistudio.openSelectKey();
        }
      } catch (e) {
        console.warn("No se pudo verificar la API Key a través de window.aistudio", e);
      }
    }

    // Inicialización del cliente. Se crea una nueva instancia para capturar la key más reciente.
    // process.env.API_KEY se inyecta automáticamente tras la selección en el diálogo.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

    const dataToProcess = associations
      .slice(0, 1500)
      .map((a, index) => `${index}: ${a.term} || ${a.definition}`)
      .join('\n');

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Actúa como un experto en pedagogía.
        Analiza esta lista de asociaciones de ${concept}.
        OBJETIVO: Agrupar estos elementos en categorías lógicas (máximo 12 grupos).
        REGLA: Usa los índices proporcionados.
        
        LISTA:
        ${dataToProcess}

        Genera una estructura de grupos JSON válida.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                groupName: {
                  type: Type.STRING,
                  description: "Nombre de la categoría creativa"
                },
                indices: {
                  type: Type.ARRAY,
                  items: { type: Type.INTEGER },
                  description: "Índices de la lista original"
                }
              },
              required: ["groupName", "indices"]
            }
          }
        }
      });

      if (!response.text) {
        throw new Error("La IA no devolvió texto.");
      }

      return JSON.parse(response.text.trim());
    } catch (error: any) {
      console.error("Detalle del error en aiService:", error);
      
      // Si el error indica que la key no es válida o la entidad no fue encontrada
      const isKeyError = error.message?.includes("Requested entity was not found") || 
                         error.message?.includes("API key not valid") ||
                         error.message?.includes("API_KEY_INVALID");

      if (isKeyError) {
         if (typeof window !== 'undefined' && (window as any).aistudio) {
            await (window as any).aistudio.openSelectKey();
            throw new Error("La conexión falló. Por favor, selecciona una API Key válida de un proyecto con facturación activa en el diálogo.");
         }
      }
      
      throw new Error(error.message || "Error al conectar con Gemini. Verifica tu conexión a internet.");
    }
  }
};
