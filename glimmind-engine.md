    # Glimmind: Atajos de Teclado

Este documento describe los atajos de teclado disponibles en la vista de juego de Glimmind para agilizar el estudio.

## Modo Examen (`real`)

### Escribiendo la respuesta (tarjeta no revelada)

- **`Enter`**: Comprueba la respuesta que has escrito.
- **`Tab`**: Mueve el foco del campo de texto al botón de **Validar**.
- **Cualquier otra tecla (incluida `Espacio`)**: Escribe en el campo de respuesta.

### Tarjeta revelada (después de validar o de pulsar "Revelar")

- **`Enter` o `Espacio`**: Pasa a la siguiente tarjeta (acción "Pasar").

## Modo Entrenamiento (`training`)

- **`Enter` o `Espacio`**: Revela la respuesta o, si ya está revelada, pasa a la siguiente tarjeta.

## Validación de Intentos

Cuando un usuario envía un intento, la lógica de validación es la siguiente:

### Intento Incorrecto

Mensaje efimero: Mensaje que aparece un tiempo determinado

*   Aparece un mensaje efímero que muestra:
    *   El texto introducido por el usuario.
    *   El porcentaje de similitud.
    *   El umbral de porcentaje requerido (`treshold`).
*   El campo de texto de la respuesta se limpia automáticamente.
*   El foco vuelve al campo de texto.
*   Debe cambiar de color del marco de la tarjeta a rojo por unos instantes, dando a entender que el valor introducido es incorrecto

### Intento Correcto

*   Aparece un mensaje efímero que muestra:
    *   El texto esperado.
    *   El texto introducido por el usuario.
    *   El porcentaje de similitud.
    *   El umbral de porcentaje requerido (`treshold`).
*   Se avanza a la siguiente tarjeta.
*   El campo de texto de la respuesta se limpia automáticamente.
*   El foco vuelve al campo de texto.
*   Debe cambiar de color del marco de la tarjeta a verde por unos instantes, dando a entender que el valor introducido es correcto

## Camb
