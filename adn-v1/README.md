# PHERSAA ADN V1 — laboratorio

Necesita Node 24. Desde la raíz del repositorio:

```sh
node --test tests/*.cjs
node adn-v1/server.cjs
```

Abrir `http://127.0.0.1:8788`. Seleccionar **Simulación** para el motor ADN original o **Procesos reales** para tres procesos Node y SQLite. Enviar tareas, iniciar, seleccionar una célula, inducir fallo y recuperar. Repetir un ID de tarea en modo real verifica idempotencia; usar otro ID crea trabajo nuevo. Detener mata los workers y conserva tareas/checkpoints; Iniciar las retoma. Cambiar de modo de UI no detiene procesos del servidor.

Los permisos y canales se conservan en `adn-v1/lab.sqlite`; cada proceso tiene capacidad 1. C1–C3 pueden ejecutar trabajo real por defecto, en canal 1; las otras identidades indican «Sin proceso». La Llave es autorización lógica local. No hay wallet ni pagos.

## Revisión móvil

La interfaz está preparada para ancho de iPhone; falta prueba en Safari físico. No se ha publicado un panel. `127.0.0.1` en el teléfono apunta al teléfono, no a este laboratorio.

Para revisar la simulación sin backend:

```sh
node adn-v1/package-mobile.cjs phersaa-adn-mobile.html
```

El HTML resultante contiene CSS, motor y UI. También se genera como artefacto `phersaa-adn-v1-review` del workflow. Para abrirlo en Safari, servirlo en un entorno privado/autorizado accesible por el teléfono; la app Archivos puede limitar la ejecución de HTML local. No atribuir a ese HTML procesos reales: ese modo requiere el servidor local, no está conectado desde el artefacto.

## Experimento reproducible

```sh
node adn-v1/benchmark.cjs results.json
```

Crea una base temporal, configura tres workers, envía 30 tareas, espera un checkpoint, mata una célula y espera la reasignación. Verifica matemáticamente las sumas, exporta resultados con PID/eventos/intentos y elimina la base temporal. El workflow `.github/workflows/adn-v1.yml` ejecuta las pruebas históricas y nuevas, ese experimento y el empaquetado móvil. Un runner sigue siendo una máquina; no prueba alta disponibilidad.

Ver [auditoría y arquitectura](../docs/ADN-V1-AUDIT.md) y [resultados](../docs/ADN-V1-RESULTS.md). No exponer el servidor fuera de loopback sin una etapa de autenticación y revisión de acceso.
