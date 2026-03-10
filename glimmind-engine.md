# Glimmind Game Engine — Algoritmo

## Estructuras de datos

```
Card {
  id: string
  status: DESCONOCIDA | DESCUBIERTA | RECONOCIDA | CONOCIDA
  cycleResult: pending | correct
}

GameState {
  cards: Card[]
  currentCycle: 1 | 2 | 3 | 4
  queue: string[]        // ids de cartas pendientes en el ciclo actual
  currentIndex: number
  isFinished: boolean
}
```

---

## Mapa ciclo → status

```
Ciclo 1 → DESCONOCIDA
Ciclo 2 → DESCUBIERTA
Ciclo 3 → RECONOCIDA
Ciclo 4 → CONOCIDA
```

---

## INIT

```
1. Crear N cartas con status=DESCONOCIDA, cycleResult=pending
2. startCycle(1)
```

---

## startCycle(cycle)

```
1. Si cycle > 4:
     a. Si todas las cartas tienen status=CONOCIDA y cycleResult=correct
          → isFinished = true, FIN
     b. Si no:
          → resetear cycleResult=pending en todas las cartas
          → startCycle(1)

2. queue = cartas donde status == CYCLE_STATUS[cycle] AND cycleResult == pending

3. Si queue está vacía:
     → startCycle(cycle + 1)

4. Si no:
     → currentCycle = cycle
     → currentIndex = 0
     → queue = queue (orden aleatorio)
```

---

## PASS

```
1. card = queue[currentIndex]
2. card.status = nextStatus(card.status)
3. card.cycleResult = pending
4. advance()
```

---

## CORRECT

```
1. card = queue[currentIndex]
2. card.status = sin cambio
3. card.cycleResult = correct   ← sale de la cola, no vuelve a aparecer en este ciclo
4. advance()
```

---

## advance()

```
1. currentIndex++
2. Si currentIndex < queue.length:
     → continuar con la siguiente carta
3. Si no (fin de cola):
     → startCycle(currentCycle + 1)
```

---

## nextStatus(status)

```
DESCONOCIDA → DESCUBIERTA
DESCUBIERTA → RECONOCIDA
RECONOCIDA  → CONOCIDA (tope)
```

---

## Reglas clave

- **PASS** siempre avanza el status, la carta entra en la cola del siguiente ciclo
- **CORRECT** no cambia el status, la carta queda marcada como `correct` y no vuelve a aparecer hasta el próximo reset
- **Un ciclo termina** cuando se han visto todas las cartas de la cola (PASS o CORRECT)
- **El juego termina** cuando todas las cartas están en `CONOCIDA correct`
- **Reset** ocurre cuando se termina el Ciclo 4 pero aún hay cartas sin completar — todas vuelven a `cycleResult=pending` y se reinicia desde Ciclo 1
