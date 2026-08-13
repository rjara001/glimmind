Este documento describe los atajos de teclado disponibles en la vista de juego de Glimmind para agilizar el estudio.

### Modo Examen (`real`)

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
*   Ademas debemos mostrar lo siguiente
    -  Abajo del todo deben aparecer de forma ordenada y apiladacada uno de los intentos que ha realizado el usuario
    -  Cada intento debe mostrar:
        -  El texto introducido por el usuario.
        -  El porcentaje de similitud.
        -  El umbral de porcentaje requerido (`treshold`).

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

## Comportamiento

  - Al iniciar cada nueva tarjeta debe presentar la asociación
  - El valor a mostrar es el Adverso (si no ha hecho flip)
  - El reverso debe estar oculto por defecto (mostrando asteriscos `*`)
  - Al presionar el botón Revelar se debe mostrar el reverso
  - Al presionar el botón Correcta se debe marcar la tarjeta como correcta
  - Al presionar el botón Pasar se debe pasar a la siguiente tarjeta y el reverso debe volver a estar oculto (reseteado)
  - Al iniciar la sesión, la primera tarjeta también debe tener el reverso oculto.
  
No hay mensajes de feedback en este modo

## Tab Sequence
  - Modo Entrenamiento
    - Luego de tab debe posicionar el foco en el boton Correcta
    - Luego de tab debe posicionar el foco en el boton Revelar
    - Luego de tab debe posicionar el foco en el boton Pasar
    
*** CAMBIOS

- Todo cambio debe incluir un aumento de version

*** GUARDAR DATOS

- El estado debe mantenrse en localstorage
- Debe existir un boton para sincronizar los datos de la nube con el localstorage
- Antes de salir de la aplicacion se deben guardar los datos en la nube sin preguntar al usuario

*** Syncronizar datos

## Tab Sequence
  - Modo Real
    - Luego de que se presenta la asociacion debe posicionar el foco en el campo de texto de la respuesta
    - Luego de tab debe posicionar el foco en el boton de validar
    - Luego de tab debe posicionar el foco en el boton de revelar
    - Luego de tab debe posicionar el foco en el boton de pasar
    - Luego de que se presenta la asociacion debe posicionar el foco en el campo de texto de la respuesta


------

*** LÓGICA DE FINALIZACIÓN Y PROGRESIÓN DE CICLOS (MODO REAL)

Esta sección detalla cómo funciona la lógica del motor para determinar cuándo finaliza la sesión y cómo progresan las tarjetas a través de los ciclos.

Tomemos como ejemplo una lista de 10 tarjetas.

### Caso 1: Todas las respuestas son correctas en la primera pasada

*   **Se presenta la primera carta:**
    *   Pendientes: 10, Correctas: 0
    *   Ciclo 1 (Nueva): 10
*   El usuario escribe, valida y la respuesta es correcta.
*   **Se presenta la siguiente carta:**
    *   Pendientes: 9, Correctas: 1
    *   Ciclo 1 (Nueva): 10
*   El usuario escribe, valida y la respuesta es correcta.
*   **Se presenta la siguiente carta:**
    *   Pendientes: 8, Correctas: 2
    *   Ciclo 1 (Nueva): 10
*   ... esto continúa sucesivamente hasta comprobar todas.
*   **Se presenta la siguiente carta (última):**
    *   Pendientes: 0, Correctas: 10
    *   Ciclo 1 (Nueva): 10
*   **Resultado:** Como "Pendientes" llega a 0 y no hay cartas encoladas para el siguiente ciclo, **el proceso se da por finalizado**.

### Caso 2: Mezcla de respuestas correctas e incorrectas

*   **Se presenta la primera carta:**
    *   Pendientes: 10, Correctas: 0
    *   Ciclo 1 (Nueva): 10
*   El usuario escribe, valida y la respuesta es correcta.
*   **Se presenta la siguiente carta:**
    *   Pendientes: 9, Correctas: 1
    *   Ciclo 1 (Nueva): 10
*   El usuario escribe, valida y la respuesta es correcta.
*   **Se presenta la siguiente carta:**
    *   Pendientes: 8, Correctas: 2
    *   Ciclo 1 (Nueva): 10
*   ... esto continúa sucesivamente (ej. 5 correctas consecutivas):
*   **Se presenta la siguiente carta:**
    *   Pendientes: 5, Correctas: 5
    *   Ciclo 1 (Nueva): 10
*   ... esto continúa sucesivamente (ej. fallando las siguientes 5):
*   **Se presenta la siguiente carta:**
    *   Pendientes: 0, Correctas: 5
    *   Ciclo 1 (Nueva): 5 (Las 5 que se respondieron bien)
    *   Ciclo 2 (Vista): 5 (Las 5 que se respondieron mal)
*   **Resultado:** Aunque "Pendientes" es 0, hay 5 cartas que pasaron a formar parte del siguiente ciclo (Ciclo 2 - Vista). Por lo tanto, el juego avanza al ciclo 2.

*   **Arranca el Ciclo 2. Se presenta la primera carta del nuevo ciclo:**
    *   Pendientes: 5, Correctas: 0
    *   Ciclo 1 (Nueva): 5 (Las correctas del ciclo 1)
    *   Ciclo 2 (Vista): 5 (Las incorrectas del ciclo previo que ahora toca repasar)
*   ... esto continúa sucesivamente (ej. respondiendo las 5 de forma correcta de corrido).
*   **Se presenta la siguiente carta (última del ciclo 2):**
    *   Pendientes: 0, Correctas: 5
    *   Ciclo 1 (Nueva): 5 (Las 5 que se respondieron bien al inicio)
    *   Ciclo 2 (Vista): 5 (Las 5 que se respondieron bien ahora en este ciclo)
*   **Resultado:** "Pendientes" es 0 y **no hay más cartas** que deban pasar a un ciclo posterior. **El proceso se da por finalizado**.

Y así sucesivamente dependiendo de cuántos errores tenga el usuario, generando ciclos progresivos hasta vaciar los pendientes y no generar cola futura.