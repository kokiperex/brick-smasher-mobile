# Prompt reutilizable: orientación vertical en móviles

Implementa en Neon Breaker una restricción de orientación que aplique sólo a
dispositivos móviles. En teléfonos y tabletas, el juego debe ser jugable
únicamente en modo vertical: si el viewport móvil pasa a horizontal, muestra
una pantalla accesible que indique “Gira tu dispositivo”, cubre la partida y
pausa automáticamente los estados `playing` y `ready`. Al volver a vertical,
oculta el aviso y reanuda únicamente la partida que fue pausada por esta
restricción. No cambies el comportamiento de escritorio, que debe seguir
admitiendo vertical y horizontal.

Declara también `orientation: "portrait"` en el manifiesto PWA, precachea
cualquier script nuevo y actualiza las pruebas automatizadas y la auditoría
móvil. Conserva el funcionamiento directo desde `index.html`, las safe areas,
la accesibilidad del aviso y ejecuta `node tests/run-tests.js` después del
cambio.
