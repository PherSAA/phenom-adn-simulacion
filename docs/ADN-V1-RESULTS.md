# Resultados observados — primera entrega

Ejecución local el 9 de noviembre de 2026, Linux, Node 24.22.1, 3 CPU visibles.

| Comprobación | Resultado |
|---|---|
| Suite ADN histórica | 22/22 aprobadas |
| Nuevas pruebas del laboratorio | 6/6 aprobadas |
| API histórica: `npm test` | No arranca la suite con la ruta `test/` en Node 24 |
| API histórica: `node --test test/*.test.js` | 90/91 aprobadas; falla `SDN: mainnet sin lista generada no arranca; ALLOW_EMPTY_SDN lo permite`, con antigüedad de lista 22,27 días frente al máximo de 7. Solo comprobaciones locales/mocks, sin envío de pagos. |
| Benchmark Python histórico | No arranca: falta `crypto_analysis` |
| Safari/iPhone físico | Pendiente |
| GitHub Actions | Workflow añadido; consultar estado real en el PR. Estas cifras corresponden a ejecución local. |

Experimento reproducible nuevo: `node adn-v1/benchmark.cjs results.json`.

- 30 tareas solicitadas, 30 terminadas, todas las sumas verificadas.
- Tres workers configurados; tras el fallo inducido, dos siguen trabajando.
- 31 asignaciones: una tarea tuvo dos intentos.
- 665 eventos persistidos.
- Tiempo observado: 3019,35 ms.
- Throughput acumulado observado: 9,94 tareas/s.
- Latencia media de creación a finalización: 1597,67 ms.
- Pendientes y en curso al cierre de medición: 0.
- Tareas no contabilizadas: 0. Registros de resultado duplicados: 0. No mide ejecuciones duplicadas ni pérdida de paquetes.

El reporte completo está en [evidence/local-run.json](evidence/local-run.json); la salida de pruebas en [evidence/adn-tests.txt](evidence/adn-tests.txt). Son evidencia de una corrida, no objetivos de rendimiento. Las pruebas y el workflow regeneran evidencia con una base temporal nueva.
