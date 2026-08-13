
import type { Config } from 'jest';

const config: Config = {
  // El preset le dice a Jest que use ts-jest para manejar ficheros TypeScript
  preset: 'ts-jest',
  
  // El entorno de prueba que simula un navegador (DOM)
  testEnvironment: 'jest-environment-jsdom',
  
  // Un fichero que se ejecuta después de configurar el entorno. 
  // Aquí cargamos las utilidades de @testing-library/jest-dom
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  
  // Le indicamos a Jest cómo resolver los módulos, 
  // especialmente si usamos rutas absolutas en el futuro.
  modulePaths: ['<rootDir>'],
  
  // Mapeo para que Jest ignore los ficheros de estilos, 
  // ya que no puede procesarlos.
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
};

export default config;
