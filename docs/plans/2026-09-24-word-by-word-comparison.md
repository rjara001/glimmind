# Plan: Comparación palabra por palabra en AttemptAnalysisModal

## Fecha
2026-09-24

## Objetivo
Reemplazar la comparación carácter por carácter actual en `AttemptAnalysisModal` por una tabla de comparación palabra por palabra con filas expandibles que muestren el detalle letra por letra solo para palabras con errores. Mantener el desglose del puntaje sin cambios.

## Archivos a modificar
| Archivo | Cambio |
|---------|--------|
| `src/components/modals/AttemptAnalysisModal.tsx` | Reemplazar la sección "COMPARACIÓN CARÁCTER POR CARÁCTER" por tabla palabra por palabra con filas expandibles; agregar estado para rastrear fila expandida; importar utilidades de `wordAlignment.ts`; añadir null check en useMemo y early return |
| `src/utils/wordAlignment.ts` (NUEVO) | Crear módulo con `alignWords`, `diffChars`, `getHint` y tipos `AlignedWord`, `CharDiff`, `AlignmentResult`; implementar backtracking de Levenshtein en `diffChars`; manejar múltiples diferencias en `getHint` |
| `tests/utils/wordAlignment.test.ts` (NUEVO) | Tests unitarios para `alignWords`, `diffChars`, `getHint` (incluyendo backtracking, múltiples diferencias) |
| `tests/components/modals/AttemptAnalysisModal.test.tsx` | Actualizar tests existentes para reflejar nueva UI; añadir test de regresión del desglose del puntaje |

## Diseño

### 1. Algoritmo de alineación palabra por palabra
1. **Normalizar ambos strings**: usar la función `normalize` existente de `similarity.ts` (lowercase, trim, quitar acentos, signos de puntuación, guiones → espacios)
2. **Dividir por espacios**: `split(/\s+/)` y filtrar strings vacíos → arrays `userWords[]`, `systemWords[]`
3. **Alinear por índice (v1)**: iterar `i` de `0` a `max(userWords.length, systemWords.length) - 1`
   - `userWord = userWords[i] || ''`
   - `systemWord = systemWords[i] || ''`
   - **Nota**: Esta es la Opción A (simple). Si una palabra falta en medio, las siguientes se desalinean. La Opción B (alineación por similitud con Needleman-Wunsch adaptado a palabras) queda para v2.
4. **Calcular similitud por palabra**: usar `calculateSimilarity(userWord, systemWord)` (importada de `similarity.ts`)
5. **Clasificar estado**:
   - `similarity === 1.0` → ✅ `correct`
   - `similarity >= 0.80` → ⚠️ `similar`
   - `similarity < 0.80` → ❌ `wrong`
   - Si una palabra falta (`userWord === ''` o `systemWord === ''`) → ❌ `wrong`
6. **Detectar diferencias por carácter** (solo para palabras con estado `similar` o `wrong`):
   - Llamar `diffChars(userWord, systemWord)` → `CharDiff[]` (usa backtracking, ver sección abajo)
7. **Generar hint descriptivo** (solo para `similar`/`wrong`):
   - Llamar `getHint(charDiff)` → string (maneja múltiples diferencias, ver sección abajo)

### 1.1 Algoritmo de backtracking para diffChars
Para obtener la lista de operaciones (match, diff, missing, extra) desde la matriz de Levenshtein:

1. **Construir matriz dp** de `(m+1) x (n+1)` donde `m = userWord.length`, `n = systemWord.length`
2. **Llenar dp[i][j]** con distancia de edición estándar:
   - `dp[0][j] = j` (inserts)
   - `dp[i][0] = i` (deletes)
   - `dp[i][j] = min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1] + cost)` donde `cost = 0` si `userWord[i-1] === systemWord[j-1]` else `1`
3. **Backtracking** desde `dp[m][n]` hasta `dp[0][0]`:
   - Si `i > 0` y `j > 0` y `dp[i][j] === dp[i-1][j-1]` → **match** (char = `userWord[i-1]`)
   - Si `i > 0` y `j > 0` y `dp[i][j] === dp[i-1][j-1] + 1` → **diff** (substitute: user=`userWord[i-1]`, system=`systemWord[j-1]`)
   - Si `i > 0` y `dp[i][j] === dp[i-1][j] + 1` → **missing** (delete: char = `userWord[i-1]`, el usuario omitió esta letra)
   - Si `j > 0` y `dp[i][j] === dp[i][j-1] + 1` → **extra** (insert: char = `systemWord[j-1]`, el usuario escribió letra extra)
   - En empates, priorizar: match > diff > missing > extra
4. **Revertir la lista** de operaciones (se construye al revés durante backtracking)
5. **Retornar** `CharDiff[]` con `{ type, char, index }` donde `index` es posición en la palabra resultante alineada (0-based)

### 1.2 Manejo de múltiples diferencias en getHint
Analizar `charDiff[]` y generar mensaje en español:

- **Contar por tipo**: `missingCount`, `extraCount`, `diffCount`
- **Si todas son del mismo tipo** (solo missing, o solo extra, o solo diff):
  - `missingCount > 1`: `"Faltan ${missingCount} letras: 'X' en posición N, 'Y' en posición M..."`
  - `extraCount > 1`: `"Letras extra: 'X' en posición N, 'Y' en posición M..."`
  - `diffCount > 1`: `"${diffCount} sustituciones: 'A'→'B' en posición N, 'C'→'D' en posición M..."`
- **Si son de tipos distintos** → `"Múltiples diferencias. Ver detalle abajo."`
- **Si total de diferencias > 3** → `"Demasiadas diferencias. Ver detalle abajo."`
- **Si una sola diferencia** → formato simple: `"Falta la letra 'X' en posición N"` / `"Letra extra 'X' en posición N"` / `"Letra 'X' → 'Y' en posición N"`

**Ejemplos concretos:**
- `"mountain"` vs `"montain"` (falta 'u' en pos 5) → `"Falta la letra 'u' en posición 5"`
- `"mountain"` vs `"motain"` (faltan 'u' pos 5 y 'n' pos 7) → `"Faltan 2 letras: 'u' en posición 5, 'n' en posición 7"`
- `"casa"` vs `"caza"` (sustitución 's'→'z' pos 3) → `"Letra 's' → 'z' en posición 3"`

### 2. Estructura de datos
```typescript
// src/utils/wordAlignment.ts

export type WordStatus = 'correct' | 'similar' | 'wrong';

export interface CharDiff {
  type: 'match' | 'missing' | 'extra' | 'diff';
  char: string;      // para match/extra: la letra; para missing: la letra que falta; para diff: "a→b"
  userChar?: string; // para diff: letra del usuario
  systemChar?: string; // para diff: letra del sistema
  index: number;     // posición en la palabra alineada (0-based), útil para el hint
}

export interface AlignedWord {
  index: number;
  userWord: string;
  systemWord: string;
  status: WordStatus;
  similarity: number; // 0-1
  charDiff: CharDiff[];
  hint: string;
}

export interface AlignmentResult {
  words: AlignedWord[];
  stats: {
    correct: number;
    similar: number;
    wrong: number;
    total: number;
  };
}
```

### 3. Componente de tabla
- **Tabla** con columnas: `#`, `Tu respuesta`, `Sistema`, `Estado`
- **Filas**: una por `AlignedWord` (índice 1-based en columna #)
- **Columna "Tu respuesta"**: muestra `userWord` o `—` si vacío
- **Columna "Sistema"**: muestra `systemWord` o `—` si vacío
- **Columna "Estado"**: badge con ícono y color:
  - ✅ verde: `bg-emerald-100 text-emerald-700`
  - ⚠️ amarillo: `bg-amber-100 text-amber-700`
  - ❌ rojo: `bg-rose-100 text-rose-700`
- **Botón `[▼]`** en columna Estado (o al final de fila) solo si `status !== 'correct'`
- **Fila de detalle expandible**: se renderiza inmediatamente después de la fila principal cuando está expandida; `colSpan={4}`

### 4. Componente de detalle (expandible)
- **Contenedor** con fondo `bg-slate-50` y borde superior
- **Tabla interna** letra por letra: columnas `Pos`, `Tu letra`, `Sistema`, `Tipo`
- **Colores por tipo de letra**:
  - `match` → verde: `bg-emerald-100 text-emerald-800`
  - `diff` → amarillo: `bg-amber-100 text-amber-800`
  - `extra` → rojo: `bg-rose-100 text-rose-800` (letra que usuario escribió pero sistema no)
  - `missing` → rojo punteado: `bg-rose-50 text-rose-600 border-b-2 border-dotted border-rose-400` (letra que sistema tiene pero usuario omitió)
- **Hint descriptivo** debajo de la tabla: texto generado por `getHint` (ej: "Falta la letra 'd' antes de la 's' final", "Faltan 2 letras: 'u' en posición 5, 'a' en posición 7", "Múltiples diferencias. Ver detalle abajo.")

### 5. Estilos
- **Tailwind CSS** exclusivamente
- **Tabla responsive**: `overflow-x-auto` en contenedor
- **Colores consistentes** con diseño actual (emerald/amber/rose)
- **Animación** suave al expandir: `animate-in slide-down-2 duration-200`
- **Resumen** al final de la tabla: "X / Y palabras correctas" (ej: "7 / 10 palabras correctas")

## Implementación (paso a paso)

### Paso 1: Crear `src/utils/wordAlignment.ts`
- Exportar `normalize` desde `similarity.ts` (re-export o importar)
- Exportar `calculateSimilarity` y `levenshteinDistance` desde `similarity.ts`
- Implementar `alignWords(userInput: string, expectedAnswer: string): AlignmentResult`
- Implementar `diffChars(userWord: string, systemWord: string): CharDiff[]`
  - **Usar algoritmo de backtracking** (ver sección 1.1)
  - Construir matriz dp, backtracking desde dp[m][n], revertir lista
- Implementar `getHint(charDiff: CharDiff[]): string`
  - **Usar lógica de múltiples diferencias** (ver sección 1.2)
  - Analizar charDiff, contar por tipo, generar mensaje según reglas

### Paso 2: Modificar `AttemptAnalysisModal.tsx`
- Importar: `alignWords`, `AlignmentResult`, `AlignedWord`, `WordStatus` desde `wordAlignment.ts`
- Agregar estado: `const [expandedIndex, setExpandedIndex] = useState<number | null>(null)`
- En `useMemo`, calcular con null check (usar `attempt` en deps para evitar warning ESLint):
  ```tsx
  const alignment = useMemo(
    () => attempt ? alignWords(attempt.userInput, attempt.expectedAnswer) : null,
    [attempt]
  )
  ```
- **Early return** si no hay alignment:
  ```tsx
  if (!alignment) return null;
  ```
- Reemplazar sección "🔬 Comparación carácter por carácter" (líneas 224-283) por:
  - Título: "🔬 Comparación palabra por palabra"
  - Tabla con filas `alignment.words.map((word, i) => ...)`
  - Fila expandible condicional: `{expandedIndex === i && <DetailRow word={word} />}`
  - Resumen: `{alignment.stats.correct} / {alignment.stats.total} palabras correctas`
- Handler para toggle: `const handleToggleRow = (index: number) => setExpandedIndex(expandedIndex === index ? null : index)`
- **NO tocar** la sección "📊 Desglose del puntaje" (líneas 285-344)

### Paso 3: Componente de fila de detalle (inline o extraído)
- Función `DetailRow({ word }: { word: AlignedWord })` renderiza la tabla letra por letra + hint
- Usar `word.charDiff.map((diff, j) => ...)`

### Paso 4: Tests unitarios
- Crear `tests/utils/wordAlignment.test.ts`
- Casos: misma cantidad palabras, distinta cantidad, palabras idénticas, con typo, con letra faltante, con letra extra
- **Tests de backtracking**: `diffChars` reconstruye operaciones correctamente (match, diff, missing, extra)
- **Tests de hint múltiples**: `getHint` genera mensaje correcto para 1 diff, múltiples same-type, mixed types, >3 diffs

### Paso 5: Actualizar test de componente
- En `AttemptAnalysisModal.test.tsx`: cambiar `expect(screen.getByText('🔬 Comparación carácter por carácter'))` por `'🔬 Comparación palabra por palabra'`
- Verificar que la tabla se renderiza con filas correctas
- **Añadir test de regresión**: el desglose del puntaje (Distancia, Caracteres, Diferencias, Umbral) muestra los MISMOS valores que antes del cambio

### Paso 6: Verificación
```bash
npx tsc --noEmit 2>&1 | grep -E "AttemptAnalysisModal|wordAlignment"
npx vitest run tests/utils/wordAlignment.test.ts
npx vitest run tests/components/modals/AttemptAnalysisModal.test.tsx
```

## Criterios de aceptación
- [ ] La tabla muestra una fila por palabra alineada
- [ ] Cada palabra tiene estado: ✅ (correct) / ⚠️ (similar ≥ 0.80) / ❌ (wrong)
- [ ] Las palabras con error (similar/wrong) tienen botón `[▼]`
- [ ] Al hacer clic en `[▼]`, se expande el detalle letra por letra de ESA palabra
- [ ] Los colores en detalle: verde (match), amarillo (diff), rojo (extra), rojo punteado (falta)
- [ ] El hint describe la diferencia (ej: "Falta la letra 'd' antes de la 's' final", "Faltan 2 letras: 'u' en posición 5, 'a' en posición 7", "Múltiples diferencias. Ver detalle abajo.")
- [ ] El resumen muestra "X / Y palabras correctas"
- [ ] El desglose del puntaje (Distancia, Caracteres, Diferencias, Umbral) **no cambió**
- [ ] **El desglose del puntaje muestra los MISMOS valores que antes del cambio**
- [ ] `tsc --noEmit` sin errores en archivos modificados
- [ ] El resto del modal (typo alert, frase completa, corregir respuesta) no cambió

## Riesgos
| Riesgo | Mitigación |
|--------|------------|
| Romper el cálculo de similitud global | No tocar `calculateSimilarity` ni `similarity` del `attempt`; solo usar `calculateSimilarity` por palabra |
| Romper el desglose del puntaje | No tocar esa sección del modal (líneas 285-344); test de regresión |
| Alineación incorrecta con distinta cantidad de palabras | Documentado como limitación v1 (Opción A); Opción B para v2; tests unitarios cubriendo casos edge |
| Performance con frases muy largas | Limitar a 100 palabras; `useMemo` para `alignment` |
| Levenshtein duplicado | Re-exportar `levenshteinDistance` y `calculateSimilarity` desde `similarity.ts` |
| Backtracking incorrecto | Tests unitarios exhaustivos para `diffChars` |
| Hint confuso con múltiples diffs | Lógica explícita en `getHint` con umbrales |

## Tests
| Test | Archivo | Prioridad |
|------|---------|-----------|
| `alignWords` con misma cantidad de palabras idénticas | `tests/utils/wordAlignment.test.ts` | Alta |
| `alignWords` con misma cantidad, una con typo | `tests/utils/wordAlignment.test.ts` | Alta |
| `alignWords` con distinta cantidad (usuario faltan palabras) | `tests/utils/wordAlignment.test.ts` | Alta |
| `alignWords` con distinta cantidad (usuario palabras extra) | `tests/utils/wordAlignment.test.ts` | Alta |
| `diffChars` detecta letra faltante (mountain vs montain) | `tests/utils/wordAlignment.test.ts` | Alta |
| `diffChars` detecta letra extra (montains vs mountain) | `tests/utils/wordAlignment.test.ts` | Alta |
| `diffChars` detecta sustitución (casa vs caso) | `tests/utils/wordAlignment.test.ts` | Alta |
| `diffChars` backtracking reconstruye operaciones correctamente | `tests/utils/wordAlignment.test.ts` | Alta |
| `getHint` genera mensaje para missing (1) | `tests/utils/wordAlignment.test.ts` | Media |
| `getHint` genera mensaje para extra (1) | `tests/utils/wordAlignment.test.ts` | Media |
| `getHint` genera mensaje para diff (1) | `tests/utils/wordAlignment.test.ts` | Media |
| `getHint` genera mensaje para múltiples missing | `tests/utils/wordAlignment.test.ts` | Media |
| `getHint` genera mensaje para mixed types | `tests/utils/wordAlignment.test.ts` | Media |
| `getHint` genera mensaje para >3 diferencias | `tests/utils/wordAlignment.test.ts` | Media |
| Componente renderiza tabla palabra por palabra | `tests/components/modals/AttemptAnalysisModal.test.tsx` | Alta |
| Expandir fila muestra detalle letra por letra | `tests/components/modals/AttemptAnalysisModal.test.tsx` | Media |
| **El desglose del puntaje no cambió (Distancia, Caracteres, Diferencias, Umbral)** | `tests/components/modals/AttemptAnalysisModal.test.tsx` | **Crítica** |

## Notas
- **NO usar `any`** — tipar todo explícitamente
- **NO duplicar lógica de Levenshtein** — importar desde `src/utils/similarity.ts`
- **Seguir AGENTS.md**: hooks para estado, tipos en `src/types/` o en el mismo archivo de utilidad, early returns, `useMemo` para cómputos
- **NO declarar éxito sin output de `tsc --noEmit` y tests pasando**
- El archivo `wordAlignment.ts` debe ir en `src/utils/` (no en `src/types/`)
- Los tipos `AlignedWord`, `CharDiff`, `AlignmentResult`, `WordStatus` pueden ir en `src/utils/wordAlignment.ts` o en `src/types/word-alignment.ts` (preferible en el utils para colocalización)
- **Alineación por índice es v1**; Opción B (Needleman-Wunsch a nivel palabra) documentada para v2