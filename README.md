# Phenom · ADN / La Llave / Split Run

Dos laboratorios locales, en español, en el mismo repositorio. No usan npm ni servicios externos.

| Plano | Abrir |
| --- | --- |
| Laboratorio de 24 células, llaves y tareas | [`adn_datos_reales.html`](adn_datos_reales.html) |
| Teletransporte cuántico Split Run v02.7 | [`teletransporte/index.html`](teletransporte/index.html) |

`index.html` es la puerta de los dos. El laboratorio de células queda como estaba: `engine.js`, `app.js`, `styles.css` y el video no se movieron.

**Ambas piezas son simulaciones en JavaScript.** La energía, la fidelidad y la disposición ADN usan unidades ficticias. No hay sensores, pagos, criptomonedas ni un mecanismo biológico o físico real.

## Teletransporte Split Run

Plano técnico del protocolo de cinco pasos: escaneo, conversión por merkaba, rayo entrelazado, túnel Einstein-Rosen y rematerialización. La ventana nominal es 4.2 PW y 9.8 T (fidelidad 99.999 %, riesgo 0.001 %). **Forzar límite** (7.6 PW / 1.2 T) deja la reconstrucción en decoherencia.

Abre `teletransporte/index.html` junto con `draw.js`, `app.js` y `styles.css` de esa carpeta. También sirve por el mismo servidor estático, en `http://localhost:8000/teletransporte/`. Espacio o Enter ejecutan, flecha derecha avanza un paso y Escape aborta. No hace falta internet: las fuentes son del sistema.

```bash
node --test tests/teleport.test.cjs
```

## Abrir y probar

### Desde el teléfono con GitHub Codespaces

1. Abre este repositorio, pulsa **Code → Codespaces** y abre o crea un Codespace en `main`.
2. En la terminal del repositorio ejecuta:

   ```bash
   python3 -m http.server 8000 --bind 0.0.0.0
   ```

3. En **Ports / Puertos**, abre el puerto **8000** en el navegador y mantenlo **Private / Privado**.
4. Entra por la puerta o abre directo el laboratorio de células. Pulsa **Iniciar**. Usa **+100 tareas** y prueba **5×** o **20×**.

La pestaña **Code** muestra archivos, no ejecuta HTML. El puerto privado permite probar
la interfaz sin activar GitHub Pages. Esta actualización no configura hosting ni cambia
la visibilidad del repositorio. El Codespace debe permanecer encendido; revisa su tiempo
incluido antes de dejarlo funcionando durante periodos largos.

### En una computadora

Descarga el ZIP del repositorio y descomprímelo completo. Abre `index.html`,
`adn_datos_reales.html` o `teletransporte/index.html`. También puedes usar
el servidor anterior y abrir `http://localhost:8000`.

No requiere npm, compilación, claves API ni conexión a internet para ejecutar el modelo.
La sesión vive en memoria: al recargar se reinicia. **Exportar informe**, en el laboratorio
de células, descarga los resultados en JSON; ese informe no es una copia restaurable de la sesión.

## Controles del laboratorio de células

| Función | Comportamiento |
| --- | --- |
| Iniciar / Pausar | Controla movimiento, paquetes, procesamiento y recuperación con un único reloj. |
| Paso +0,1 s | Avanza exactamente una décima de segundo simulado mientras está pausada. |
| 0,25× / 1× / 2× / 5× / 20× | Cambia el tiempo simulado por segundo real. No cambia la potencia del dispositivo. |
| Reiniciar | Tras confirmar, limpia la sesión y restablece la misma semilla y configuración inicial. |
| ADN / La Llave | Dos vistas del mismo estado, sin reiniciar los datos. |
| C1–C24 | Inspecciona una célula desde el gráfico o los botones accesibles. |
| Permisos de llave | Datos + energía, solo datos, solo energía o cerrada. Se aplican al elegir. |
| Canal 1–4 | Las transferencias requieren un canal común; las tareas se procesan en su canal. |
| Sincronizar llaves | Copia permisos y canal de la célula seleccionada a las demás. |
| E → +15 u. | Envía hasta 15 unidades desde una reserva finita; respeta permisos y capacidad. |
| Mensaje de prueba | Envía texto local entre dos células; muestra entrega o bloqueo en el registro. |
| +100 / +1.000 / +1 urgente | Crea tareas en el canal seleccionado. Las urgentes toman el siguiente hueco libre. |
| Fragmentos por tarea | Reparte cada nueva tarea en 1, 2 o 4 partes y reúne sus resultados. |
| Capacidad por célula | Permite 1, 2 o 4 fragmentos simultáneos. Al reducirla, termina los ya activos. |
| Fallar / Recuperar | Reencola el trabajo desde su último punto de guardado; las demás células continúan. |
| Fallar hasta 12 | Prueba un fallo de hasta doce células que sigan activas. |
| Recuperación automática | Recupera una célula a los 6 segundos simulados. Desactivarla cancela ese plazo. |
| Tráfico de ejemplo | Genera mensajes sintéticos y transferencias de energía dentro del modelo. |
| Exportar informe | Guarda métricas, configuración, llaves, 100 eventos y 20 resultados recientes. |

## Grupos de tres células

Hay ocho grupos de tres células (24 en total), además de E. C1–C16 conservan sus
identificadores y grupos; C17–C24 son la tercera célula de cada grupo, respectivamente.
Las tres orbitan con un desfase de 120° y llevan la misma llave integrada. Se conservan
las coordenadas de La Llave, el movimiento circular y las reglas de tareas y energía.
El escenario de fallo de la mitad se adapta a 12 células.

## Qué significa la llave

Se mantiene el cuadrado de −1,5 a +1,5, los puntos cardinales exteriores ±3 y el triángulo
desde (−3, 0) a (0, 3) y a la esquina inferior derecha (1,5; −1,5). Cada célula lleva una
miniatura fija de la llave. En la vista **La Llave**, las células orbitan los puntos con
desfase y la reserva E permanece en el centro. Los permisos y canales son una nueva regla
lógica de esta demo, **no criptografía ni autenticación de una red real**.

## Reglas del motor

- Paso temporal fijo de 1/60 s; los mismos segundos simulados producen los mismos resultados
  a 30, 60 o 120 fotogramas por segundo. Se limita el salto de tiempo tras una interrupción.
- Al ocultar la pestaña, la interfaz pausa la sesión y requiere reanudarla explícitamente.
- Una tarea calcula la suma de cuadrados de 1 a 100: **338.350**. Cada fragmento cubre un
  rango distinto y solo se contabiliza una tarea cuando todas sus partes han terminado.
- Los puntos de guardado se actualizan cada 0,25 s de progreso simulado. Son objetos en
  memoria del navegador, sin procesos independientes, persistencia SQLite ni servidor.
- Cerrar una llave o cambiar su canal devuelve sus fragmentos activos a la cola. Si no hay
  una célula elegible, la cola espera y la interfaz explica la causa.
- Una transferencia entregada se retira de la cola y cuenta una sola vez. Fallos,
  recuperaciones, bloqueos y cancelaciones no incrementan las entregas.
- Si falla una célula o cambia una llave durante un envío, se cancela ese envío. La energía
  en tránsito vuelve al origen; los fragmentos de tareas sí se reencolan por separado.
- La energía total incluye células, reserva E y paquetes en tránsito. No aumenta ni
  desaparece al transferirse o cancelar envíos. Se reserva espacio para posibles devoluciones.
- Límites: 24 células, 10.000 tareas pendientes, 128 envíos simultáneos, 100 eventos y
  20 resultados recientes. El ritmo se expresa por segundo **simulado**, no como benchmark
  de rendimiento real. El movimiento de una célula que falla se detiene en la vista La Llave;
  en ADN su posición también sigue la estructura visual global.

## Comprobación

Las pruebas del motor usan el ejecutor integrado de Node.js (18 o posterior):

```bash
node --test tests/engine.test.cjs tests/teleport.test.cjs
```

Las del laboratorio comprueban pausa completa, reloj independiente de fotogramas, velocidades
equivalentes, entregas únicas, permisos/canales, devolución y conservación de energía,
resultados reunidos, recuperación, fallos totales, prioridad urgente, límites y reporte JSON.
Las del teletransporte comprueban la ventana nominal y el límite de decoherencia.

También se verificaron los controles del laboratorio en un DOM de prueba: iniciar, pausa, paso,
velocidad, llaves, mensajes, exportación, reinicio y pausa al ocultar la pestaña. Esa
comprobación no renderiza el canvas.

La interfaz usa diseño adaptable, botones de selección alternativos al canvas, navegación
por teclado, etiquetas accesibles y un diálogo de confirmación para el reinicio. La revisión
visual en un teléfono físico queda pendiente; no equivale a las pruebas del motor.

## Archivos

- `index.html`: puerta a los dos laboratorios.
- `adn_datos_reales.html`: interfaz del laboratorio de células; mantiene la ruta original.
- `styles.css`, `engine.js`, `app.js`: diseño, motor y controles de ese laboratorio.
- `tests/engine.test.cjs`: pruebas del laboratorio.
- `teletransporte/`: plano Split Run. `index.html`, `app.js`, `styles.css`, `draw.js` y `model.cjs`.
- `tests/teleport.test.cjs`: pruebas de fidelidad del protocolo.
