# Diseño de los 40 niveles

`js/levels.js` contiene exactamente 40 configuraciones de nivel. Cada una
define su patrón, velocidad inicial, ancho de plataforma, máximo de bolas,
frecuencias independientes de premios y castigos, paleta y duración objetivo.
Los patrones son datos literales: no se generan proceduralmente.

## Vocabulario de bloques

| Símbolo | Tipo | Resistencia | Rompible |
|---|---|---:|---|
| `0` | Vacío | 0 | No aplica |
| `1` | Normal | 1 | Sí |
| `2` | Reforzado | 2 | Sí |
| `3` | Blindado | 3 | Sí |
| `X` | Indestructible | 0 | No |
| `E` | Explosivo | 1 | Sí |
| `M` | Móvil | 1 | Sí |
| `G` | Regenerativo | 2 | Sí |
| `S` | Sorpresa | 1 | Sí |
| `B` | Jefe | 12 | Sí |

## Fórmula de dificultad

La puntuación se calcula a partir de los datos del nivel, no se escribe a mano:

```text
difficultyScore =
  bloquesRompibles × 0.55
  + resistenciaTotal × 0.85
  + max(0, velocidad − 220) × 0.11
  + max(0, 100 − anchoPlataforma) × 0.70
  + bloquesMóviles × 2.40
  + bloquesIndestructibles × 1.70
  + frecuenciaCastigos × 45
  − frecuenciaPremios × 28
  + complejidadPatrón × 3
```

La complejidad del patrón se normaliza entre 0 y 10. Combina transiciones entre
espacios y bloques (35 %), variedad de filas (20 %), proporción útil de
espacios (20 %) y ruptura de simetría horizontal (25 %). La resistencia total
es la suma de los puntos de resistencia de todos los bloques rompibles.

## Curva

| Niveles | Objetivo de diseño |
|---|---|
| 1–5 | Aprendizaje, patrones legibles, bola lenta y plataforma ancha |
| 6–10 | Bloques reforzados, huecos y más filas |
| 11–15 | Blindados, explosivos, sorpresa e indestructibles |
| 16–20 | Diagonales y primeros bloques móviles |
| 21–25 | Regenerativos, blindaje alto y corredores |
| 26–30 | Movimiento, zonas estrechas y patrones combinados |
| 31–35 | Alta resistencia, protección y menor margen de reacción |
| 36–39 | Patrones avanzados, más castigos y menos premios |
| 40 | Patrón final único con núcleo jefe y puntuación máxima |

Los `difficultyScore` resultantes son:

| Nivel | Score | Nivel | Score | Nivel | Score | Nivel | Score |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 44.2 | 11 | 83.1 | 21 | 135.4 | 31 | 189.1 |
| 2 | 39.7 | 12 | 80.6 | 22 | 130.9 | 32 | 194.4 |
| 3 | 44.6 | 13 | 102.6 | 23 | 127.9 | 33 | 191.6 |
| 4 | 45.0 | 14 | 115.9 | 24 | 129.4 | 34 | 192.0 |
| 5 | 50.2 | 15 | 111.3 | 25 | 156.6 | 35 | 197.6 |
| 6 | 53.1 | 16 | 118.5 | 26 | 158.9 | 36 | 193.8 |
| 7 | 55.7 | 17 | 113.5 | 27 | 156.4 | 37 | 189.7 |
| 8 | 58.7 | 18 | 113.6 | 28 | 162.9 | 38 | 197.0 |
| 9 | 64.2 | 19 | 121.9 | 29 | 167.2 | 39 | 220.3 |
| 10 | 81.9 | 20 | 134.0 | 30 | 173.5 | 40 | 252.8 |

Se permiten descensos pequeños para dar ritmo a la campaña. La prueba rechaza
cualquier nivel cuyo score quede más de 5 puntos por debajo del nivel situado
cinco posiciones antes. También exige que el nivel 40 sea el máximo absoluto.

## Integración

`LevelManager` transforma cada símbolo ocupado en una entidad `Brick` y
conserva su tipo, resistencia, fila, columna y condición rompible. Los
indestructibles no cuentan para completar un nivel. El juego usa las
probabilidades separadas para decidir si una caída será premio o castigo y
aplica el ancho y máximo de bolas definidos por cada nivel.

La resistencia se consume impacto por impacto. Los móviles oscilan
horizontalmente conservando la separación de su fila; los explosivos dañan
vecinos; los regenerativos recuperan como máximo dos puntos, con una espera de
cuatro segundos; los sorpresa fuerzan una caída; y el jefe cambia de fase
visual al cruzar dos tercios y un tercio de su resistencia. Tipo y resistencia
se muestran con letras y números, por lo que no dependen únicamente del color.
