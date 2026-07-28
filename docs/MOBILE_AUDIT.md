# Auditoría mobile-first

Auditoría realizada en navegador sobre la aplicación servida directamente
como sitio estático. Se revisaron la pantalla inicial, la partida activa y el
panel de ajustes.

## Viewports comprobados

| Viewport | Orientación | Área de juego | Resultado |
|---|---|---:|---|
| 320 × 568 | Vertical | 304 × 490 | Sin scroll, recortes ni controles fuera del área |
| 375 × 667 | Vertical | 359 × 589 | Sin scroll, recortes ni controles fuera del área |
| 390 × 844 | Vertical | 374 × 766 | Sin scroll, recortes ni controles fuera del área |
| 430 × 932 | Vertical | 414 × 854 | Sin scroll, recortes ni controles fuera del área |
| 844 × 390 | Horizontal | — | Bloqueo de orientación en móvil; escritorio conserva horizontal |

En los cuatro casos verticales el tamaño del documento coincide con el viewport y
`scrollX`/`scrollY` permanecen en cero. También se intentó desplazar la página
sobre el Canvas y no se produjo scroll.

## Problemas encontrados y correcciones

### Safe areas

- Se mantiene `viewport-fit=cover`.
- La aplicación y el panel de ajustes usan los cuatro valores
  `env(safe-area-inset-*)`.
- Los controles permanecen dentro del área útil en vertical y horizontal.

### Botones táctiles y texto

- Todos los botones visibles miden al menos 44 × 44 px.
- Los toggles de ajustes miden 48 px de alto.
- Las etiquetas del HUD ya no bajan de 11 px; los valores empiezan en
  12.16 px.
- El panel de ajustes es desplazable internamente si una pantalla excepcional
  no ofrece altura suficiente.

### Orientación

- Se eliminó el mínimo de 480 px que recortaba `844 × 390`.
- En móvil horizontal se muestra **GIRA TU DISPOSITIVO** y no se permite jugar.
- La partida se pausa al girar y se reanuda al volver a vertical.
- En escritorio horizontal se conserva el HUD lateral y la pantalla inicial
  compacta.

### Pérdida de foco

- La partida se pausa tanto con `visibilitychange` como con `window.blur`.
- Abrir ajustes durante una partida pausa el juego y cerrarlos lo reanuda.

### Rendimiento

- La física usa pasos fijos de 60 Hz y el render continúa con
  `requestAnimationFrame`.
- El fondo del Canvas se prepara una sola vez.
- Los bloques evitan crear degradados y sombras nuevos en cada frame.
- El device pixel ratio del Canvas se limita a 1.5.
- El HUD debug solo escribe en el DOM cuando cambian sus datos.
- `?debug=1` muestra el FPS medido por `GameLoop`.

El navegador integrado usado en la auditoría limita la cadencia observada a
aproximadamente 24 FPS incluso en primer plano. Por eso la validación final de
60 FPS debe repetirse en Safari de iPhone y Chrome de Android reales; el
contador debug queda disponible para hacerlo sin herramientas externas.

### Audio y vibración

- El audio se sintetiza con Web Audio API y el contexto solo se crea después
  de pulsar un control.
- Hay señales para interfaz, lanzamiento, rebote, bloque, premio, castigo,
  disparo, pérdida de vida y nivel completado.
- La vibración usa `navigator.vibrate` únicamente cuando está disponible.
- Sonido y vibración pueden activarse o desactivarse y se guardan en
  `localStorage`.

### Control táctil

- **Directo**: la plataforma sigue la coordenada horizontal del dedo.
- **Relativo**: el primer toque no desplaza la plataforma; cada arrastre suma
  su delta horizontal, por lo que el dedo puede mantenerse lejos de ella.
- En dispositivos con puntero táctil, el modo inicial recomendado es
  **Relativo**.
- La preferencia queda guardada y se restaura al recargar.

## Validación automatizada

La suite cubre el cálculo del movimiento relativo e invertido, persistencia de
preferencias, desbloqueo de audio, vibración disponible/no disponible y
cálculo del FPS, además de las pruebas existentes del juego.
