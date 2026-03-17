Este documento describe los atajos de teclado disponibles en la vista de juego de Glimmind para agilizar el estudio.

## Modo Examen (`real`)

## Despliegue de botones

 - Boton "Pasar" o "Siguiente"
 - Boton "Validar"
 - Boton "Revelar"

Pasar: Buscar la siguiente tarjeta
Validar: Comprobar la respuesta
Revelar: Mostrar la respuesta y deshabilitar el botón "Validar"

## Validación de Intentos

Cuando un usuario envía un intento, la lógica de validación es la siguiente:

## Intento Incorrecto

Mensaje Toast: Mensaje que aparece un tiempo determinado (debe ser mensajes toast)

*   Aparece un mensaje toast que muestra:
    *   El texto introducido por el usuario.
    *   El porcentaje de similitud.
    *   El umbral de porcentaje requerido (`treshold`).
*   El campo de texto de la respuesta se limpia automáticamente.
*   El foco vuelve al campo de texto.
*   Debe cambiar de color del marco de la tarjeta a rojo por unos instantes, dando a entender que el valor introducido es incorrecto

## Intento Correcto

*   Aparece un mensaje efímero que muestra:
    *   El texto esperado.
    *   El texto introducido por el usuario.
    *   El porcentaje de similitud.
    *   El umbral de porcentaje requerido (`treshold`).
*   Se avanza a la siguiente tarjeta.
*   El campo de texto de la respuesta se limpia automáticamente.
*   El foco vuelve al campo de texto.
*   Debe cambiar de color del marco de la tarjeta a verde por unos instantes, dando a entender que el valor introducido es correcto

## Escribiendo la respuesta (tarjeta no revelada)

- **`Enter`**: Comprueba la respuesta que has escrito.
- **`Tab`**: Mueve el foco del campo de texto al botón de **Validar**.

### Modo Entrenamiento (`training`)

## Despliegue de botones

 - Boton "Pasar" o "Siguiente"
 - Boton "Revelar"
 - Boton "Correcta"

Pasar: Buscar la siguiente tarjeta
Revelar: Mostrar la respuesta
Correcta: Marcar la tarjeta como correcta

No hay mensajes de feedback en este modo

