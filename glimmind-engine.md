# 📑 Glimmind Engine Technical Specification (v4.0)

**Objetivo:** Motor de aprendizaje asociativo basado en 4 ciclos de repetición progresiva, con un sistema de archivo para tarjetas dominadas.

---

### 1. Modelo de Datos (Schema)

Cada `Association` dentro del motor debe contener:
- **`id`** (string): Identificador único.
- **`term` / `definition`** (string): Par de conceptos a aprender.
- **`currentCycle`** (number): Ciclo de repaso actual de la tarjeta. Rango `[1-5]`.
- **`status`** (enum): `'pending'` | `'correct'`.
- **`isLearned`** (boolean): Indica si la tarjeta ha sido dominada (graduada).
- **`isArchived`** (boolean): Indica si la tarjeta está congelada y fuera del ciclo de aprendizaje. Se inicializa en `false`.

#### 1.1. Niveles de Familiaridad y Clasificación Final

La clasificación de una tarjeta en el resumen final sigue una jerarquía estricta.

1.  **Aprendida (`isLearned: true`):** Dominada en el ciclo 1. Es el nivel más alto.
2.  **Conocida (`currentCycle >= 4`):** Requiere varios repasos. Sugiere familiaridad.
3.  **Reconocida (`currentCycle === 3`):** Se reconoce tras un par de intentos.
4.  **Vista (`currentCycle === 2`):** Se ha visto, pero no se recuerda bien.

---

### 2. Estado del Juego (GameState)

El motor mantiene el estado de la sesión actual:
- **`listId`**: ID de la lista en juego.
- **`associations`**: Array completo de asociaciones *activas* para la sesión.
- **`globalCycle`**: Ciclo de repaso global. Rango `[1-4]`.
- **`activeQueue`**: Array de IDs de las tarjetas a repasar en el ciclo actual.
- **`currentIndex`**: Puntero a la tarjeta actual en la `activeQueue`.
- **`isFinished`**: Flag que indica el fin de la sesión.
- **`summary`**: Objeto con el resumen final.

---

### 3. Acciones del Jugador

- **`CORRECT`**: Marca la tarjeta actual como `'correct'` y la saca del ciclo actual.
- **`PASS`**: No la marca como correcta y la mueve al siguiente ciclo de repaso (`currentCycle + 1`).

---

### 4. Ciclo de Vida del Juego (Game Loop)

1.  **Carga Inicial:** Al comenzar una sesión, el motor debe cargar **únicamente** las asociaciones donde `isArchived === false`.
2.  **Inicio:** El juego se inicializa en `globalCycle = 1`.
3.  **Transición:** Cuando la `activeQueue` se vacía, se intenta avanzar. Si `globalCycle < 4`, se incrementa y se genera una nueva `activeQueue`.

---

### 5. Criterios de Finalización (Endgame)

La sesión termina si al intentar avanzar de ciclo, la `activeQueue` resultante está vacía, o si se completa el `globalCycle = 4`.

---

### 6. Archivo y Restauración de Asociaciones (Congelador)

**Concepto:** Permite a los usuarios "congelar" tarjetas dominadas para que no aparezcan en futuras sesiones, sin borrarlas permanentemente.

**Flujo de Archivo:**
1.  Al finalizar una sesión, se identifican las tarjetas con `isLearned: true`.
2.  Se ofrece al usuario la opción de moverlas al Archivo.
3.  Si acepta, para estas tarjetas se establece `isArchived = true` y se resetean sus propiedades de sesión (`isLearned = false`, `currentCycle = 1`).
4.  Las asociaciones archivadas **permanecen** en el array de la lista, pero serán **ignoradas** por el motor al iniciar una nueva sesión (ver punto 4.1). Esto asegura que no se pierdan y puedan ser restauradas en el futuro.

**Flujo de Restauración:**
1.  El usuario debe tener una interfaz para ver las tarjetas archivadas.
2.  Al "restaurar" una tarjeta, sus propiedades deben ser reseteadas a su estado de fábrica:
    - `isArchived = false`
    - `isLearned = false`
    - `currentCycle = 1`
    - `status = 'pending'`

---

### 7. Output Esperado (Resultados del Resumen)

Al finalizar, el motor genera un `GameSummary` contando las tarjetas según la jerarquía de la sección 1.1.

- **`learned`**: Conteo de tarjetas donde `isLearned === true`.
- **`known`**: Conteo de tarjetas no aprendidas con `currentCycle >= 4`.
- **`recognized`**: Conteo de tarjetas no aprendidas con `currentCycle === 3`.
- **`seen`**: Conteo de tarjetas no aprendidas con `currentCycle === 2`.
