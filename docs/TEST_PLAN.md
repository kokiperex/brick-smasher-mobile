# Plan de pruebas

## Datos de niveles

La suite automatizada en `tests/run-tests.js` comprueba:

- existencia de exactamente 40 niveles;
- al menos un bloque rompible en cada nivel;
- ausencia de geometrías duplicadas, ignorando el tipo concreto de bloque;
- símbolos válidos y parámetros dentro de sus rangos;
- coincidencia de cada `difficultyScore` con la fórmula;
- impresión del score de los 40 niveles;
- ausencia de retrocesos mayores a 5 puntos frente a cinco niveles antes;
- nivel 40 como máximo absoluto;
- creación de entidades con tipo, resistencia y condición rompible.

## Automatizadas

Ejecutar:

```bash
node tests/run-tests.js
```

La suite debe validar:

1. Catálogo exacto de cinco premios y cinco castigos.
2. Generación individual de cada cápsula.
3. Recogida con la plataforma y eliminación fuera del área.
4. Inicio de efectos temporales.
5. Renovación sin acumulación.
6. Incompatibilidad grande/pequeña.
7. Incompatibilidad lenta/aceleración.
8. Expiración y callback único.
9. Limpieza completa de efectos.
10. Multibola de una a tres bolas y límite de cinco.
11. Velocidades finitas para varias bolas.
12. Movimiento y colisión de proyectiles.
13. Rechazo de impactos cuando la bola ya se aleja.
14. Componente vertical mínima después de impactos de esquina.
15. Rechazo de colisiones por debajo de la plataforma.
16. Daño, fases, movimiento, regeneración, explosión y sorpresa.
17. Sustitución global de castigos para impedir combinaciones imposibles.
18. Recuperación después de `lostpointercapture` y escalas transitorias.
19. Flechas, A/D y Espacio.
20. Validación, persistencia y fallo seguro de localStorage.
21. El menú de pausa presenta las acciones **Continuar** y **Reiniciar nivel**.
22. Reiniciar desde pausa restablece el nivel actual, elimina efectos, objetos y proyectiles, y conserva puntuación y vidas.
23. El selector de nivel desde pausa permite todos los niveles desbloqueados hasta el actual, incluido el no finalizado; una selección válida inicia con tres vidas y puntuación cero.
24. En móviles, horizontal muestra el bloqueo de orientación y pausa `playing`/`ready`; al volver a vertical reanuda sólo la partida pausada por el bloqueo. En escritorio, horizontal sigue disponible.

## Manual desde debug

Abrir `index.html?debug=1`, pulsar cada generador y comprobar:

- `P`: la bola se adhiere y vuelve a lanzarse al tocar.
- `G`: la plataforma aumenta de ancho.
- `3`: el contador pasa de una a tres bolas.
- `D`: aparece **FUEGO** y genera dos proyectiles.
- `L`: todas las bolas reducen su velocidad.
- `p`: la plataforma se reduce y cancela `G`.
- `A`: todas las bolas aceleran y cancela `L`.
- `↔`: el movimiento horizontal se invierte.
- `O`: el campo se oscurece sin ocultar las bolas.
- `R`: la plataforma adquiere inercia.

Durante una partida, pulsar pausa y comprobar que el panel muestra el nivel,
vidas y puntos actuales. Pulsar **Reiniciar nivel**: la bola debe volver adherida,
los bloques deben reaparecer y los efectos, cápsulas y proyectiles deben desaparecer,
sin alterar la puntuación ni las vidas.

Después de finalizar al menos un nivel, pulsar **Elegir nivel** en pausa: deben
aparecer los niveles desbloqueados hasta el actual, incluido el nivel aún no
finalizado, mientras que los posteriores permanecen bloqueados. Elegir un nivel
disponible debe limpiar la partida anterior, mostrar tres vidas, reiniciar la
puntuación y dejar la bola adherida. Tras un **GAME OVER**, **Continuar nivel**
debe reiniciar el nivel actual con tres vidas, y **Elegir nivel** debe ofrecer la
misma lista. **Volver** debe restaurar el menú anterior sin iniciar un nivel.

Volver a generar un efecto debe restaurar su duración completa. Finalmente,
activar varios efectos y pulsar **Completar nivel**: el HUD de efectos, las
cápsulas, los proyectiles y el botón **FUEGO** deben desaparecer.

## Auditoría mobile-first

Probar `320×568`, `375×667`, `390×844`, `430×932` y `844×390`:

- el documento no debe tener scroll ni elementos recortados;
- todos los botones deben medir al menos 44 × 44 px;
- el HUD, la pantalla inicial y los ajustes deben permanecer completos;
- abrir ajustes durante la partida debe pausarla;
- los modos directo y relativo deben mover la plataforma de forma distinta;
- el modo relativo no debe saltar a la posición inicial del dedo;
- sonido y vibración deben poder desactivarse, reactivarse y persistir;
- el contexto de audio no debe crearse antes de una interacción;
- ocultar la pestaña o perder el foco debe pausar;
- `?debug=1` debe mostrar un FPS finito.
- En un móvil, rotar a `844×390` debe mostrar **GIRA TU DISPOSITIVO** y pausar la partida; volver a vertical debe retirar el aviso y reanudarla.
- En escritorio, `844×390` debe conservar el juego funcional sin mostrar el bloqueo.

La evidencia dimensional y las correcciones se documentan en
`docs/MOBILE_AUDIT.md`.

## Base PWA

La suite también valida de forma estática que `manifest.webmanifest` exista,
sea JSON válido, use `start_url` y `scope` relativos, declare modo
`standalone`, colores de tema y fondo, y apunte a iconos PNG locales de 192 y
512 píxeles, incluida una variante `maskable`. También confirma que
`index.html` enlaza el manifiesto y los iconos instalables. La validación PWA
comprueba además que no haya query strings en recursos locales, que
`service-worker.js`
precachee el HTML, CSS, scripts, manifiesto e iconos, use un caché versionado
y se registre solo en un contexto seguro para preservar `file://`. También
comprueba que las rutas precacheadas existan, no contengan query strings y que
el worker solo gestione la navegación de la aplicación y recursos cacheados;
las APIs y el audio quedan fuera de su interceptación. Los recursos se derivan
de las referencias reales de `index.html` y del manifiesto, sin navegador.

Limitación del entorno: Node puede comprobar archivos, rutas y cabeceras PNG,
pero no puede confirmar la instalación real de una PWA, el contenido de Cache
Storage, el ciclo de vida del service worker ni el comportamiento de Safari.
Esas comprobaciones requieren una prueba manual servida mediante HTTPS o
`localhost`, seguida de una recarga en modo avión.

## Pantallas de estado

- **NEON BREAKER** debe conservar el título grande en dos líneas.
- **COMPLETADO** debe usar la variante compacta y permanecer dentro del panel.
- **GAME OVER**, **PAUSA** y **¡BIEN HECHO!** no deben desbordar.
- Repetir la validación en vertical y horizontal.
