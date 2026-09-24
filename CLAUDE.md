# TerraSense — contexto obligatorio

Monorepo de un instrumento de medición de suelo: sonda RS-485 → ESP32 → BLE → app móvil → Supabase → consola web, más el modelo financiero del proyecto. `App/` (React Native + Expo), `Web/` (React + Vite), `supabase/` (PostgreSQL + RLS + Edge Functions), `PCB/` (KiCad), `finanzas/` (Python), `docs/`.

Lo que sigue no se puede deducir leyendo el código. Léelo antes de editar.

## 1. El entregable no lleva referencias al repositorio

`Evaluacion/Evaluacion 1/INFORME 1 .docx.pdf` es **el informe académico que se entrega**. Es una exportación binaria: no se edita desde el repositorio. La regla vale para cualquier versión editable de ese documento que vuelva a existir, porque debe leerse sin acceso al repositorio: **nunca** insertes en ella rutas de archivos, nombres de scripts, enlaces locales, identificadores de código ni comandos, y consérvale el CRLF al editarla. Sus cifras están cerradas y replicadas a propósito.

`docs/INFORME 1 .docx.md` es su contraparte **interna**: ahí sí van todas las referencias al repo. Tiene un mapa de trazabilidad al inicio; consúltalo para saber qué archivo es fuente de verdad de cada tema.

## 2. Archivos generados: no editar a mano

Los reescribe `python finanzas/modelo.py`. Si los editas, tu cambio se pierde en la próxima ejecución:

- `docs/RESULTADOS_FINANCIEROS.md` (archivo completo)
- `Flujo de caja y financiamiento - TerraSense.xlsx`
- `PCB/BOM_TerraSense.xlsx`
- `docs/INFORME 1 .docx.md`, solo entre marcadores `<!-- INFORME:*:INICIO -->` y `<!-- INFORME:*:FIN -->`
- `README.md`, solo entre `<!-- FINANZAS:INICIO -->` y `<!-- FINANZAS:FIN -->`
- `docs/SECCION_ECONOMICA_REFORMULADA.md` y `docs/_cuadros_economicos.md` (archivos completos)
- `Evaluacion/Evaluacion 1/INFORME 1 CORREGIDO.md` (archivo completo: el PDF entregable con todas las correcciones aplicadas). Como vive junto al entregable, **no debe contener referencias al repositorio**; `finanzas/espejo.py` lo reconstruye desde el PDF en un archivo temporal que se descarta

Para cambiar una **cifra**, edita `finanzas/supuestos.json` y regenera.
Para cambiar la **redacción** de un bloque generado, edita `finanzas/informe.py` (informe interno), `finanzas/documentacion.py` (README), `finanzas/cuadros.py` y `finanzas/seccion_economica.py` (sección económica) o `finanzas/corregir_informe.py` (informe corregido), nunca el resultado.

`supabase/schema.sql` es un volcado de `pg_dump`, no una fuente: el esquema real son las 43 migraciones de `supabase/migrations/`.

## 3. Decisiones cerradas del proyecto

No las "optimices" ni las reabras sin que el usuario lo pida:

- **Financiamiento:** el pie de los socios se entrega al banco como **condición de entrada** y el crédito financia el **100 % de la inversión inicial**. Pie y crédito **no se suman** como fuentes: hacerlo cuenta dos veces el mismo dinero. El pie equivale al 30 % del crédito. El modelo **sí** dimensiona el principal, porque la inversión inicial se construye de abajo hacia arriba.
- **Precio:** **se deriva** del costo total exigiendo un 30 % de utilidad; no es un dato de entrada ni un techo estratégico. Fijarlo antes de conocer el costo es el error metodológico que el estudio corrige. Al precio de $349.990 de versiones anteriores el proyecto arroja VAN negativo.
- **Horizonte:** evaluación principal a **10 años** (2027–2036), con comparación a cinco.
- **Contrato BLE:** trama única de **20 bytes** con suelo, ambiente y batería. Los 16 bytes son solo tolerancia del decodificador para prototipos sin BME280, no un modo de operación.

## 4. Fuentes de verdad cuando el texto y el código difieren

Manda el código:

| Tema | Fuente |
| --- | --- |
| Decodificación BLE | `App/src/services/probeService.ts` (transporte: `bleService.ts`) |
| Motor agronómico y umbrales | `App/src/engine/agronomyEngine.ts`, `stageEvaluator.ts`, `contextualAdvice.ts` |
| Pronóstico y su degradación sin red | `App/src/services/weatherService.ts` |
| Esquema, RLS y perímetros | `supabase/migrations/*.sql` |
| Cifras económicas | `finanzas/supuestos.json` + `finanzas/modelo.py` |

**No hay firmware del ESP32 en este repositorio.** Si un documento lo da por existente, el documento está equivocado.

## 5. Documentación

- **No crear changelogs** ni archivos de registro fechados (`INTEGRACION_<fecha>.md`, `CAMBIOS_*.md`). La documentación describe el estado vigente, no su historia; para eso está git.
- **Una cifra vive en un solo lugar.** Si aparece en dos documentos, uno la genera y el otro la enlaza. Única excepción deliberada: el informe entregable.
- No agregues documentos nuevos salvo que se pidan; actualiza los existentes.
- Español de Chile. Se dice **campo**, no "predio" ni "potrero". El mapa y la extensión PostGIS se retiraron del producto en la migración `20260920140000_retirar_mapa_y_postgis.sql`: ya no existen `predial_quadrants`, `field_perimeters` ni geometrías. La medición **sí** se sigue georreferenciando (`latitude`, `longitude`, `gps_accuracy_m` se conservan y se muestran como texto), así que no confundas «retirar el mapa» con «perder la georreferenciación».
- Al citar siglas económicas (TAM, SAM, SOM, VAN, TIR, TCO, BOM), explica su significado entre paréntesis la primera vez.
- **No uses EBITDA, FCFF, FCFE, DSCR ni FTE.** Se retiraron deliberadamente del informe: son válidos pero exceden el nivel de una evaluación de viabilidad económica y el equipo no los maneja. La dotación se expresa en personas, no en FTE.

## 6. Verificación antes de dar algo por terminado

```bash
python finanzas/modelo.py                                  # regenera cifras y planillas
python -m unittest discover -s finanzas -p "test_*.py"     # 20 pruebas del modelo financiero
python docs/verificar_documentacion.py                     # enlaces locales y diagramas: debe dar 0 errores
cd App && npm test                                         # pruebas de la app
cd Web && npm test                                         # pruebas de la consola web
```

Si tocas cifras económicas, ejecuta los tres primeros. Si tocas documentación, el tercero. Estas comprobaciones son las que impiden que el repositorio se desincronice: valen más que cualquier descripción en prosa de la arquitectura.

## 7. Convenciones

- Documentación y mensajes de commit en español.
- Puede haber varios agentes trabajando en paralelo. Antes de borrar o reescribir algo que no creaste tú, verifica si es trabajo en curso de otro.
