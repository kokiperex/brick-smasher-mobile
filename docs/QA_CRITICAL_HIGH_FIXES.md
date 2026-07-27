# Correcciones críticas y altas de QA

## Alcance

Se corrigieron todos los hallazgos críticos y altos de la auditoría adversarial:

- trayectorias horizontales permanentes;
- impactos duplicados cuando la bola se aleja;
- rebotes desde debajo de la plataforma;
- resistencia y comportamientos de bloques avanzados;
- combinaciones imposibles de castigos;
- progreso de campaña no persistente;
- pérdida de control tras abandonar la captura táctil;
- ausencia de teclado y bloqueo del zoom;
- fallo de arranque cuando localStorage no está disponible.

## Cambios

La resolución de colisiones ahora comprueba la dirección del impacto, limita la
componente vertical mínima y acepta la plataforma únicamente por su cara
superior. Los bloques consumen resistencia real; los móviles, explosivos,
regenerativos, sorpresa y jefe ejecutan su comportamiento desde la entidad y
el juego, sin lógica duplicada en los 40 niveles.

Los castigos comparten un grupo exclusivo: recoger uno expira el anterior antes
de aplicar el nuevo. Multibola usa el límite del nivel y separa físicamente las
copias pegadas.

El progreso guardado incluye versión de esquema, máximo nivel desbloqueado,
récord y última partida. Todos los valores se normalizan antes de usarse y el
juego continúa sin almacenamiento cuando el acceso lanza `SecurityError`.

Los eventos `lostpointercapture`, `blur` y `orientationchange` liberan el gesto
activo. Flechas o A/D mueven la plataforma y Espacio lanza. El zoom del
navegador vuelve a estar disponible, mientras el Canvas mantiene bloqueado el
scroll accidental mediante `touch-action`.

## Verificación

- 47 pruebas automatizadas superadas.
- Los 40 niveles y su curva de dificultad permanecen válidos.
- Lanzamiento con Espacio comprobado en navegador.
- Avance al nivel 2 restaurado correctamente después de recargar.
- Los cinco castigos generados en secuencia dejaron activo únicamente el último.
- Viewports comprobados: 320×568, 375×667, 390×844, 430×932 y 844×390.
- Sin scroll en los cinco tamaños.
- Sin errores ni advertencias en consola durante inicio, partida, rotación,
  debug, cambio de nivel y recarga.
