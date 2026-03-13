
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

1.  **Nivel "Aprendida" (`isLearned`)**
    - **Definición:** Estado de dominio. Se alcanza al acertar una tarjeta en `globalCycle === 1`.
    - **Prioridad:** Máxima. Si `isLearned` es `true`, la tarjeta es "Aprendida".

2.  **Nivel "Conocida"**: `currentCycle >= 4` (y no `isLearned`).
3.  **Nivel "Reconocida"**: `currentCycle === 3` (y no `isLearned`).
4.  **Nivel "Vista"**: `currentCycle === 2` (y no `isLearned`).

---

### 2. Variables de Estado del Motor

- **`globalCycle`** (number): Ciclo de ejecución general de la partida. Rango `[1-4]`.
- **`activeQueue`** (Array<string>): IDs de las asociaciones a repasar en el ciclo actual.

---

### 3. Máquina de Estados (Lógica de Acciones)

- #### Acción: `CORRECT` (Acertar)
  - **Update:** `status` = `'correct'`. `isLearned` = `true` **solo si** `globalCycle === 1`.

- #### Acción: `PASS` (Pasar)
  - **Update:** `currentCycle` se incrementa en `1`.

---

### 4. Gestión de Flujo y Ciclos (Workflow)

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
3.  Si acepta, para estas tarjetas se establece `isArchived = true`.

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
