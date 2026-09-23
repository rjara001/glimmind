# Reglas de Exposición Progresiva

## Sistema de ciclos

El sistema de memorización funciona mediante ciclos de exposición progresiva. Cada item pasa por etapas según la capacidad para recordarlo.

### Definición de etapas
- **NUEVA** (Cycle 1): Item presentado por primera vez
- **VISTA** (Cycle 2): Item visto pero no dominado
- **RECONOCIDA** (Cycle 3): Item reconocido con cierta familiaridad
- **FRECUENTE** (Cycle 4): Item en exposición reforzada hasta retención
- **APRENDIDAS**: Item memorizado y eliminado del juego

### Reglas de transición

1. **NUEVA**
   - Si aciertas → **APRENDIDAS** ✅ (desaparece del juego)
   - Si fallas → **VISTA** (Cycle 2)

2. **VISTA** (Cycle 2)
   - Si aciertas → **se queda en VISTA** (marcada como correcta, sale de la cola temporalmente)
   - Si falla → **RECONOCIDA** (Cycle 3)

3. **RECONOCIDA** (Cycle 3)
   - Si aciertas → **se queda en RECONOCIDA** (marcada como correcta, sale de la cola temporalmente)
   - Si falla → **FRECUENTE** (Cycle 4)

4. **FRECUENTE** (Cycle 4)
   - No hay castigo: acierto o fallo → **se queda en FRECUENTE** (marcada como correcta, sale de la cola)
   - Una vez en FRECUENTE, el item se considera validado y no reaparece

5. **APRENDIDAS**
   - Acierto en el primer ciclo (NUEVA) → se mueve a bolsa de aprendidas y ya no aparece
   - Solo los items aprendidos en el primer ciclo (NUEVA→acierto directo) pasan a APRENDIDAS

### Reglas clave
- Un item solo se considera APRENDIDO si se acierta en el primer ciclo (NUEVA→acierto directo)
- Items que fallan en NUEVA pasan a VISTA, no se eliminan
- Items en VISTA y RECONOCIDA que aciertan se marcan como `status: "correct"` (salen de la cola para ese ciclo global)
- Items que fallan progresivamente suben de ciclo: NUEVA→VISTA→RECONOCIDA→FRECUENTE
- **Gating por globalCycle: Un item nunca puede estar más de 1 ciclo por delante del globalCycle actual**
  - globalCycle=1 (NUEVA) → items max en cycle 2 (VISTA)
  - globalCycle=2 (VISTA) → items max en cycle 3 (RECONOCIDA)
  - globalCycle=3 (RECONOCIDA) → items max en cycle 4 (FRECUENTE)
  - globalCycle=4 (FRECUENTE) → items en cycle 4
- En FRECUENTE, tanto aciertos como fallos marcan `status: "correct"` (validado)
- El juego termina cuando ya no hay items pendientes en la cola activa
- Al terminar, se presenta el resumen de items aprendidos, conocidos, reconocidos y vistos

### Implementación técnica
- `CORRECT`: Marca `status: "correct"`. Si `globalCycle === 1` → `isLearned=true`. No cambia `currentCycle`.
- `PASS`: Sube `currentCycle +1` **hasta un máximo de `globalCycle + 1`** (máximo absoluto 4). Si llega a cycle 4, marca `status: "correct"` automáticamente.
- `_generateActiveQueue`: Incluye items no archivados, no aprendidos y con `status: "pending"`.
- `_checkForNextCycle`: Avanza `globalCycle` (máximo 4) y regenera la cola. Juego termina cuando cola está vacía.
- `normalizeAssociations`: Al fusionar duplicados, usa el **MIN** `currentCycle` (no MAX) para evitar saltar fases.
- `restore()`: Al restaurar partida, limita `currentCycle` a `savedState.globalCycle + 1`.
- `_initializeGame()`: Al inicializar, limita todos los `currentCycle` a `globalCycle + 1` calculado.

### Correspondencia entre ciclos y estados
| Current Cycle | Nombre | Comportamiento |
|---------------|--------|----------------|
| 1 | NUEVA | Si aciertas → APRENDIDAS. Si falla → VISTA |
| 2 | VISTA | Si aciertas → se queda (correcta). Si falla → RECONOCIDA |
| 3 | RECONOCIDA | Si aciertas → se queda (correcta). Si falla → FRECUENTE |
| 4 | FRECUENTE | Acierto/fallo → se queda (correcta, validado) |
| - | APRENDIDAS | `isLearned=true`, eliminada del juego |

### Ejemplo de gating
```
globalCycle=1 (jugando NUEVA):
  - Usuario falla tarjeta A → tarjeta A pasa a cycle 2 (VISTA) ✓
  - Usuario falla tarjeta A DE NUEVO → tarjeta A se QUEDA en cycle 2 (VISTA) ✓
  - NO puede ir a cycle 3 (RECONOCIDA) hasta que globalCycle avance a 2

globalCycle=2 (jugando VISTA):
  - Usuario falla tarjeta A (ya en cycle 2) → tarjeta A pasa a cycle 3 (RECONOCIDA) ✓
  - Usuario falla tarjeta A DE NUEVO → tarjeta A se QUEDA en cycle 3 (RECONOCIDA) ✓
  - NO puede ir a cycle 4 (FRECUENTE) hasta que globalCycle avance a 3
```