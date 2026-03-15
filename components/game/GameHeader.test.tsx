
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GameHeader } from './GameHeader';

// Creamos "mocks" (simulacros) de las funciones que se le pasan al componente.
// Esto nos permite comprobar si se llaman correctamente sin ejecutar su lógica real.
declare const jest: any;
const mockOnBack = jest.fn();
const mockOnSettingsClick = jest.fn();

// `describe` agrupa pruebas relacionadas para un mismo componente.
describe('GameHeader component', () => {

  // Antes de cada prueba, reseteamos los contadores de los mocks.
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test 1: Comprueba que la información básica se renderiza.
  test('renders list name, progress, and other info correctly', () => {
    render(
      <GameHeader
        listName="Verbos Compuestos"
        currentIndex={0}
        queueLength={52}
        cycle4Count={0}
        gameMode="real"
        onBack={mockOnBack}
        onSettingsClick={mockOnSettingsClick}
      />
    );

    // `expect` comprueba si una condición es verdadera.
    // `screen.getByText` busca un elemento que contenga el texto especificado.
    expect(screen.getByText('Verbos Compuestos')).toBeInTheDocument();
    expect(screen.getByText('Fila 1/52')).toBeInTheDocument();
    expect(screen.getByText('0 en Ciclo 4')).toBeInTheDocument();
    expect(screen.getByText('Modo Real')).toBeInTheDocument();
  });

  // Test 2: La prueba crucial que nos hubiera salvado.
  test('renders the settings button and calls onSettingsClick when clicked', () => {
    render(
      <GameHeader
        listName="Test"
        currentIndex={0}
        queueLength={10}
        cycle4Count={0}
        gameMode="real"
        onBack={mockOnBack}
        onSettingsClick={mockOnSettingsClick}
      />
    );

    // Los botones de icono no tienen texto, así que los buscamos por su "rol" en la página.
    // El componente tiene dos botones: "Atrás" y "Configuración".
    const buttons = screen.getAllByRole('button');
    // Asumimos que el segundo botón es el de configuración.
    const settingsButton = buttons[1];

    // 1. Comprobamos que el botón existe en el documento.
    expect(settingsButton).toBeInTheDocument();

    // 2. Simulamos un clic en el botón.
    fireEvent.click(settingsButton);

    // 3. Comprobamos que la función que debía llamarse, se ha llamado exactamente 1 vez.
    expect(mockOnSettingsClick).toHaveBeenCalledTimes(1);
  });

  test('calls onBack when the back button is clicked', () => {
    render(
        <GameHeader
            listName="Test"
            currentIndex={0}
            queueLength={10}
            cycle4Count={0}
            gameMode="real"
            onBack={mockOnBack}
            onSettingsClick={mockOnSettingsClick}
        />
    );

    const backButton = screen.getAllByRole('button')[0];
    fireEvent.click(backButton);
    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });
});
