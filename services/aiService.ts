
import { GoogleGenAI, Type } from "@google/genai";
import { Association } from "../types";

interface ImportMetaEnv {
  readonly VITE_API_KEY?: string;
}

declare global {
  interface Window {
    __env__?: ImportMetaEnv;
  }
}

/**
 * Servicio de IA para Glimmind.
 * Gestiona la comunicación con Gemini siguiendo las directrices oficiales.
 */
export const aiService = {
  groupAssociations: async (associations: Association[], concept: string) => {
    let apiKey: string | undefined;

    console.log("--- 🔍 INVESTIGACIÓN DE ENTORNO ---");
    try {
      console.log("1. ¿Existe 'import.meta.env'?:", !!(import.meta as any).env);
      apiKey = (import.meta as any).env?.VITE_API_KEY || window.__env__?.VITE_API_KEY;
      console.log("2. ¿Valor de API_KEY detectado?:", !!apiKey);
      console.log("3. Longitud de la cadena:", apiKey?.length || 0);
    } catch (e) {
      console.error("❌ Error crítico accediendo a variables de entorno:", e);
    }
    console.log("----------------------------------");

    if (!apiKey || apiKey.length < 5) {
      throw new Error(
        "No se pudo detectar la API_KEY en import.meta.env. " +
        "Verifica que la variable API_KEY esté en tu archivo .env"
      );
    }

    // Se crea la instancia justo antes de la llamada para asegurar frescura de la Key
    const ai = new GoogleGenAI({ apiKey });

    const dataToProcess = associations
      .map((a, index) => `${index}|${a.term}|${a.definition}`)
      .join('\n');

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Actúa como un experto en mnemotecnia. Analiza estas asociaciones de "${concept}" y agrúpalas en categorías lógicas para facilitar su memorización.
        
        DATOS DE ENTRADA:
        ${dataToProcess}

        REQUISITOS:
        - Devuelve un array JSON.
        - Estructura: [{"groupName": "nombre", "indices": [0, 1, ...]}]`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                groupName: { type: Type.STRING },
                indices: {
                  type: Type.ARRAY,
                  items: { type: Type.INTEGER }
                }
              },
              required: ["groupName", "indices"]
            }
          }
        }
      });

      // Acceso mediante la propiedad .text (no método) según las guías
      const jsonStr = response.text;
      
      if (!jsonStr) {
        throw new Error("Respuesta vacía de la IA.");
      }
      
      return JSON.parse(jsonStr.trim());
    } catch (error: any) {
      console.error("❌ Fallo en la llamada a Gemini:", error);
      throw new Error(error.message || "Error al procesar la lista con IA.");
    }
  }
};
