# Requisito Funcional: Modos de Práctica

## 1. Resumen

El usuario puede elegir **cómo** quiere practicar un ejercicio al crearlo, y ese modo define el comportamiento durante la práctica, qué datos se registran, y qué campos se muestran en el formulario de creación.

Cada ejercicio tiene un modo. El modo se elige al crear el ejercicio, pero se puede cambiar al momento de practicarlo.

---

## 2. Modos

### 2.1 Timer (actual, con mejora)

**Comportamiento**: Cuenta regresiva desde `durationSec`. Al llegar a 0, el ejercicio se completa. Si tiene `statisticName`, se muestra el `StatInputModal` para ingresar el valor.

**Cuándo usarlo**: Calentamiento, resistencia, práctica rítmica con metrónomo, o cualquier ejercicio donde el tiempo sea la métrica principal.

**Campos en creación**: título, BPM, duración, reps, autostart, stat (opcional).

**Datos registrados**:
| Campo | Valor |
|---|---|
| `durationSec` | Duración target |
| `actualSec` | Tiempo real si se extendió |
| `repsCompleted` | Reps completadas |
| `statValue` | Valor de estadística si aplica |

**UI de práctica**: Timer count-down, al llegar a 0 se completa. Opcional: modal stat al finalizar si el ejercicio tiene `statisticName`.

---

### 2.2 Perfectas (nuevo) ⭐

**Comportamiento**: El usuario debe lograr N repeticiones perfectas para completar el ejercicio. No hay timer que limite — se sigue intentando hasta alcanzar el target.

**Cuándo usarlo**: Práctica deliberada de precisión. Escalas, pasajes difíciles, cambios de acorde. Cualquier cosa donde la calidad importe más que la cantidad.

**Campos en creación**: título, target perfectas (número), BPM (opcional, solo informativo para el metrónomo).

**Flujo en práctica**:

1. Usuario toca **Play**
2. Practica el pasaje una vez
3. Toca **✅ Perfecta** o **❌ Fallé**
4. El contador se actualiza
5. Si `perfectas acumuladas >= target` → ejercicio completado automáticamente
6. Si no, vuelve al paso 2

Se muestra un **contador de tiempo count-up informativo** para saber cuánto tomó lograr el target, pero no afecta la completación.

**Datos registrados**:

| Campo | Valor |
|---|---|
| `durationSec` | 0 (no aplica timer) |
| `actualSec` | Tiempo total count-up al completar |
| `repsPlanned` | Target de perfectas (lo que el usuario configuró) |
| `repsActual` | Total de intentos (perfectas + fallos) |
| `perfectCount` | Perfectas logradas |
| `repsCompleted` | perfectCount (igual que perfectCount — compatibilidad) |

**UI de práctica**:

```
┌──────────────────────────────────┐
│  Escala de Mi                     │
│  ✔ Perfectas                     │
│                                   │
│   ⏱ 01:23                        │ ← count-up, solo informativo
│                                   │
│   ┌─ PERFECTAS ──┐               │
│   │  ■■□  2/5    │               │ ← progreso visual
│   └───────────────┘               │
│                                   │
│   [✅ Perfecta]  [❌ Fallé]       │
│                                   │
│   [◀ Done]     [↺ Repeat]        │
└──────────────────────────────────┘
```

---

### 2.3 Contador (nuevo)

**Comportamiento**: El usuario debe completar N repeticiones totales (sin calidad). Sirve para ejercicios de volumen o memoria muscular donde la cantidad es el objetivo.

**Cuándo usarlo**: Repeticiones de cambios de acorde sin métrica de calidad, calentamiento de dedos, ejercicios de fluidez.

**Campos en creación**: título, target reps.

**Flujo en práctica**:

1. Usuario toca **Play**
2. Practica una vez
3. Toca **+1** (o **Listo**)
4. Si `reps >= target` → ejercicio completado
5. Si no, vuelve al paso 2

**Datos registrados**:

| Campo | Valor |
|---|---|
| `durationSec` | 0 (no aplica timer) |
| `actualSec` | Tiempo total count-up |
| `repsPlanned` | Target de repeticiones |
| `repsActual` | Repeticiones realizadas |

---

### 2.4 Libre (nuevo)

**Comportamiento**: Sin timer, sin target, sin contador. El usuario practica lo que quiere, cuando quiere. Marca "Listo" manualmente cuando termina.

**Cuándo usarlo**: Improvisación, exploración de sonidos, práctica creativa, lectura a primera vista sin presión de tiempo.

**Campos en creación**: solo título (opcional: duración estimada como referencia).

**Flujo en práctica**:

1. Usuario toca **Play**
2. Aparece un timer count-up informativo (opcional, se puede ocultar)
3. Cuando el usuario decide que terminó, toca **Listo**
4. El ejercicio se completa

**Datos registrados**:

| Campo | Valor |
|---|---|
| `durationSec` | 0 |
| `actualSec` | Tiempo real si el usuario mantuvo el count-up visible |
| `repsCompleted` | 1 |

---

## 3. Formulario de creación

Cada modo muestra SOLO los campos relevantes:

| Modo | Campos visibles |
|---|---|
| **Timer** | Título, BPM, Duración, Reps, Auto-start, Stat (opcional) |
| **Perfectas** | Título, Target perfectas, BPM (opcional) |
| **Contador** | Título, Target reps |
| **Libre** | Título |

Selectores de modo con íconos e ilustraciones. Máximo un toque para seleccionar.

---

## 4. Cambio de modo al practicar

Al tocar un ejercicio desde el listado (Dashboard), el usuario puede cambiar el modo antes de empezar:

- Si el ejercicio se creó como "Timer" pero hoy quiere practicarlo en "Perfectas" → puede cambiar el modo en el momento
- El cambio es temporal para esa sesión de práctica, no altera la definición del ejercicio
- Si al cambiar de modo faltan datos (ej: modo Timer necesita duración pero el ejercicio no tiene una definida), se pide completar antes de empezar

---

## 5. Compatibilidad con datos existentes

- Todos los ejercicios existentes se consideran modo **Timer** por defecto
- Los campos opcionales (`mode`, `targetPerfect`) tienen valor `undefined` en ejercicios viejos
- El código trata `mode` ausente como `'timer'`

---

## 6. Lo que NO cambia

- El snapshot en `sessionExercises` ya soporta todos los modos (tiene `actualSec`, `repsPlanned`, `repsActual`, `perfectCount`, `statValue`)
- El player y timer existentes para modo Timer siguen funcionando igual
- Las rutinas default no se tocan (son modo Timer)
- El metrónomo y audio no cambian

---

## 7. Criterios de aceptación

1. Un usuario puede crear un ejercicio en modo Perfectas con target 5
2. Al practicar ese ejercicio, ve los botones ✅/❌ y el contador de perfectas
3. Llega a 5 perfectas → ejercicio se completa automáticamente
4. El snapshot guarda: target 5, intentos totales N, perfectas 5, tiempo count-up
5. Un ejercicio Timer existente (sin mode) funciona exactamente como antes
6. El usuario puede cambiar el modo al practicar sin modificar el ejercicio original
7. El formulario de creación muestra solo los campos relevantes para el modo seleccionado
