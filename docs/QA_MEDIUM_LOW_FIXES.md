# Correcciones de hallazgos medios y bajos

Fecha: 27 de julio de 2026

## Alcance

Esta tanda corrige o confirma todos los hallazgos clasificados como medios y
bajos en la auditoría adversarial. No añade mecánicas nuevas.

## Hallazgos medios

| Hallazgo | Corrección | Verificación |
| --- | --- | --- |
| `maxBalls` ignorado | El límite se toma de la configuración del nivel y nunca supera el máximo global. | Pruebas de multibola con límites de nivel menores. |
| Multibolas pegadas superpuestas | Las bolas pegadas se separan al crear copias y conservan posiciones válidas. | Prueba con varias bolas pegadas. |
| `GameLoop` podía duplicar ciclos tras detener y reiniciar | Cada ciclo tiene una generación; se cancela el frame pendiente y los callbacks obsoletos se descartan. | Pruebas de cancelación, reinicio y detención dentro de `update`. |
| Reinicializar el juego duplicaba listeners | Todos los listeners de interfaz tienen referencias estables, existe `destroy()` idempotente y `main.js` destruye la instancia anterior. | Prueba de destrucción completa e idempotente. |
| Render continuo en inicio, pausa y finales | El loop solo corre en `ready`/`playing`; se detiene en inicio, pausa, nivel completado, final y game over. Un `resize` detenido repinta una sola vez. | Prueba de pausa/reanudación y pruebas de `GameLoop`. |
| Escala transitoria inválida al orientar | Se conserva una escala finita anterior y el input rechaza coordenadas con escala no válida. | Prueba de escala transitoria e input. |
| Panel debug superpuesto a 648 px de ancho | El modo acoplado inferior en retrato ahora se activa hasta 760 px y reserva espacio en la aplicación. | Prueba estática del breakpoint y revisión de reglas CSS. |
| Overlay y ajustes con foco/accesibilidad incompletos | El overlay tiene semántica de diálogo, el fondo queda `inert`, los ajustes aíslan el resto de la aplicación, `Tab` queda contenido y `Escape` cierra. | Prueba de contratos ARIA y revisión de los manejadores de foco. |
| Pruebas de niveles insuficientes | La suite crea los bloques reales de los 40 niveles, verifica metadatos, bloques rompibles, geometrías únicas y progresión. | Suite completa de niveles y dificultad. |

## Hallazgos bajos

| Hallazgo | Corrección | Verificación |
| --- | --- | --- |
| El lector de pantalla recibía el contador de efectos cada segundo | El HUD visual dejó de ser una región viva. Se añadió una región oculta que anuncia únicamente inicio, renovación y expiración. | Prueba del marcado accesible. |
| Texto demasiado pequeño en efectos, fuego y debug | Los tamaños mínimos de efectos y fuego subieron a `0.75rem`; los botones debug también usan `0.75rem`. | Prueba de reglas CSS. |
| Botón de pausa activo en inicio | Permanece deshabilitado hasta cargar un nivel. | Estado inicial y suite existente. |
| Reglas de efectos duplicadas por identificador | El catálogo declara `behavior` y el juego resuelve estrategias por tipo de comportamiento. Una estrategia desconocida ahora lanza un error explícito. | Prueba que recorre todo el catálogo y rechaza tipos desconocidos. |
| Getter `ball` sin uso | Se eliminó el getter; el juego usa directamente la colección `balls`. | Búsqueda estática sin referencias. |
| Limpieza de audio incompleta | Oscilador y ganancia se desconectan al terminar; `destroy()` libera nodos y cierra el contexto; rechazos de `resume()`/`close()` quedan controlados. | Pruebas de finalización, desconexión, cierre y rechazo. |
| Estilo del texto secundario sobrescribía el eyebrow | El selector del mensaje excluye explícitamente `.panel-eyebrow`. | Revisión de CSS y sintaxis. |

## Resultado de verificación

- 56 pruebas automatizadas superadas.
- Todos los archivos JavaScript pasan la comprobación de sintaxis.
- Se verificaron de forma automatizada los contratos de ARIA, tamaños mínimos de
  texto y breakpoint del panel debug.
- No se pudo repetir en esta tanda la navegación automatizada a
  `file://.../index.html`: el navegador integrado bloqueó las URL locales por
  política de seguridad. No se intentó eludir esa restricción.

## Ejecución

El juego continúa siendo autocontenido y se abre directamente desde
`index.html`. La suite se ejecuta con:

```text
node tests/run-tests.js
```
