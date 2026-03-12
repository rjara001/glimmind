📑 Glimmind Engine Technical Specification (v2.1)
Objetivo: Motor de aprendizaje asociativo basado en 4 ciclos de repetición con descarte progresivo.

1. Modelo de Datos (Schema)
Cada objeto Association debe contener obligatoriamente:

id (string): Identificador único.

term / definition (string): Par de aprendizaje.

currentCycle (int): Rango [1-5]. Inicializar en 1.

status (enum): ['pending', 'correct']. Inicializar en 'pending'.

isLearned (boolean): Inicializar en false.

2. Variables de Estado del Motor
globalCycle (int): Ciclo de ejecución actual. Inicializar en 1.

activeQueue (Array): Lista de IDs de asociaciones que cumplen:

association.currentCycle === globalCycle AND association.status === 'pending'.

3. Máquina de Estados (Lógica de Botones)
Acción: CORRECTO
Update: association.status = 'correct'.

Conditional: IF globalCycle === 1 THEN association.isLearned = true.

Flow: Eliminar de activeQueue. Cargar siguiente elemento en cola.

Acción: PASAR
Update: association.currentCycle += 1.

Flow: Eliminar de activeQueue inmediatamente. Cargar siguiente elemento en cola.

4. Gestión de Flujo y Ciclos (Workflow)
El motor debe evaluar la activeQueue después de cada acción.

Check Queue: ¿Está la activeQueue vacía?

NO: Mostrar la siguiente asociación de la lista.

SÍ: Intentar avanzar de ciclo.

Avanzar Ciclo (Transition):

IF globalCycle < 4:

Incrementar globalCycle += 1.

Regenerar activeQueue con asociaciones donde currentCycle === globalCycle y status === 'pending'.

IF activeQueue está vacía: FIN DEL JUEGO (Éxito Total).

ELSE: Iniciar nuevo ciclo.

ELSE (si globalCycle === 4):

FIN DEL JUEGO.

5. Criterios de Finalización (Endgame)
El motor debe declarar el fin de la sesión cuando:

Escenario A: Todas las asociaciones tienen status: 'correct'.

Escenario B: El globalCycle termina su recorrido (completado el ciclo 4) y no quedan tarjetas pendientes que pertenezcan a ese ciclo.

6. Output Esperado (Resultados)
Al finalizar, el motor debe retornar un resumen con:

Total Learned: Conteo de asociaciones con isLearned: true.

Review Success: Conteo de asociaciones con status: 'correct' pero isLearned: false.

Forgotten/Passed: Conteo de asociaciones con currentCycle === 5.