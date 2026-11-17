# Plan de trabajo: refresco de imagen de la app

> **Para quien ejecute este plan (persona o agente):** se implementa tarea por tarea y en el orden de las fases. Cada paso es una casilla (`- [ ]`) que se marca al terminarlo. Sub-skill recomendada para agentes: `superpowers:subagent-driven-development` o `superpowers:executing-plans`.

**Objetivo.** Llevar a la app el rediseño aprobado en la maqueta: una sola sonda de 5 pines en todas las ilustraciones, la ubicación pedida una sola vez, el resultado en una pantalla con el plan de acción primero y el refresco visual del resto de las pantallas.

**Enfoque.** Cuatro fases independientes, de menor a mayor riesgo; cada una deja la app funcionando y se puede publicar sola. La lógica nueva vive en módulos `.ts` puros con pruebas; las pantallas sólo dibujan. La funcionalidad existente no cambia salvo en dos puntos decididos: se elimina el paso «Todo listo» y el resultado deja de ser un carrusel de seis páginas.

**Tecnología.** React Native + Expo 57, `react-native-svg` 15, `react-native-reanimated` 4, TypeScript 6. Pruebas con `tsx --test` (sólo módulos puros; no hay pruebas de componentes).

**Especificación.** La maqueta: <https://claude.ai/artifact/XKbGnNtZ8cn7otQs1pnQ8S> (privada; se lee con la acción `read` de la herramienta Artifact, un archivo `project/<Pantalla>.dc.html` por pantalla). Las decisiones que la maqueta no muestra están en la sección 2 de este documento. Si la maqueta y este plan difieren, manda este plan.

## 1. Restricciones globales

Valen para todas las tareas.

- **Las pruebas se listan a mano.** `npm test` ejecuta sólo los archivos nombrados en el script `test` de `package.json`. Toda prueba nueva se agrega ahí o no corre.
- **No hay pruebas de componentes.** Un archivo `.tsx` no se importa desde `tests/`. La lógica que se quiera probar va en un `.ts` sin dependencias de React Native.
- **El motor agronómico manda.** Umbrales y estados salen de `src/engine/`; ninguna pantalla recalcula ni reinterpreta. Las lecturas guardadas conservan el texto con que se evaluaron: no se recalculan.
- **N, P y K son valores de referencia.** Sin color de estado, sin semáforo y sin acciones de dosis. No se destaca que sean poco precisos: se escribe como complemento del análisis de laboratorio.
- **Nunca se simula una lectura.** Un campo sin dato se muestra como «Sin dato».
- **Vocabulario.** «Campo» (no predio), «variables» (no registros): son diez, siete del suelo y tres del ambiente.
- **Todo texto en dos idiomas**, con `t('español', 'english')`.
- **Tema claro y oscuro.** Ningún color nuevo se escribe en la pantalla: se agrega a `src/constants/theme.ts` en ambos temas. La maqueta sólo muestra el claro. Excepción vigente: los paneles de ilustración usan siempre `#17392C`.
- **Accesibilidad vigente.** Área táctil mínima de 48, texto de lectura de 16 o más, «Letra grande» (`AppText`), «reducir movimiento» (toda animación tiene un estado final quieto) y el estado nunca se comunica sólo con color: lleva texto o ícono.
- **Documentación y mensajes de commit en español.** No se crean changelogs.
- **Rama de trabajo:** `rediseno-app`, creada desde `main`. Un commit por tarea.

Comprobación que cierra cada tarea, desde `App/`:

```bash
npm run type-check
npm test
```

## 2. Decisiones de diseño

### 2.1 Tomadas por el usuario

- La sonda se dibuja con **5 pines** en todas partes, y los pines salen **en fila, directo del cuerpo**.
- El resultado se divide en **Suelo, Aire y Nutrientes** y el plan de acción dice **cosas puntuales**.
- El paso previo que pide la ubicación **se elimina**; el permiso se pide **una sola vez** y, mientras se pueda, cada lectura se georreferencia y consulta Open-Meteo.
- El sello verde de la lectura guardada se reemplaza por algo más llamativo.

### 2.2 Tomadas al diseñar (confirmar antes de fusionar la fase que las usa)

| Decisión | Fase | Nota |
| --- | --- | --- |
| El cuerpo de la sonda se dibuja con un LED y el botón PAIR. | 1 | Si el equipo real difiere, cambia sólo `ProbeGlyph`. |
| La lectura guardada se marca con un pin ocre que cae sobre el punto medido. | 1 | Con respaldo pendiente, el pin lleva un reloj en vez de la nube. |
| La pantalla de permisos lleva **un solo botón**, «Continuar», que abre el diálogo del sistema. | 2 | La maqueta dibuja además «Ahora no»; no se implementa: Apple limita la pantalla previa a un botón (ver el comentario de `askForAccess`) y el propio diálogo del sistema ya ofrece rechazar. |
| En Android 11 o anterior la pregunta es un diálogo de la app, no del sistema. | 2 | Ahí el permiso de ubicación ya existe por el Bluetooth y no equivale a aceptar la georreferenciación. |
| El plan muestra 3 acciones; el resto queda tras «Ver N más». Las de prioridad alta se muestran siempre. | 3 | Ninguna recomendación se descarta. |
| Cada acción lleva un titular corto en imperativo (`headline`). | 3 | Es texto agronómico nuevo: lo revisa el usuario antes de fusionar. |
| El clima pasa de página propia a una franja que abre una hoja. | 3 | |
| Títulos y cifras en Space Grotesk; el resto sigue con la letra del sistema. | 4 | |

### 2.3 Valores de la maqueta

| Uso | Claro | Oscuro (propuesto) |
| --- | --- | --- |
| Pin de guardado y de ubicación (`pin`) | `#F0A63A` | `#F0A63A` |
| Destello del pin (`pinLight`) | `#F6D08F` | `#F6D08F` |
| Fondo de ícono favorable (`tintSuccess`) | `#E6F1EA` | `#1B3327` |
| Fondo de ícono que requiere atención (`tintWarning`) | `#F6EBD6` | `#3A2E14` |
| Texto sobre `tintWarning` (`onTintWarning`) | `#7A4E0B` | `#E8B860` |
| Fondo de ícono limitante (`tintDanger`) | `#F7E3DF` | `#3D1F1A` |
| Zona favorable de la escala (`scaleOk`) | `#A9D3B8` | `#2F6B49` |
| Pines de la sonda | `#E3F0D6` | igual |
| Cuerpo de la sonda / franja inferior | `#C6DFB4` / `#A3C490` | igual |

Los colores con nombre de esta tabla ya están en `src/constants/theme.ts`, en ambos temas.

Radios: tarjeta 22, panel de ilustración 28–30, botón 18, píldora 999. Título de pantalla: 34/38, peso 700. Cifra de variable en lista: 21; en detalle: 60.

## 3. Mapa de archivos

| Maqueta | Archivo de la app | Fase |
| --- | --- | --- |
| `Sonda` | **nuevo** `src/components/art/probeGeometry.ts`, **nuevo** `src/components/art/ProbeGlyph.tsx`, `AppIcon.tsx` | 1 |
| `Bienvenida` | `src/screens/WelcomeCarouselScreen.tsx` | 1 |
| `InicioSesion` | `src/components/auth/AuthUI.tsx`, `src/screens/AuthScreen.tsx` | 1 y 4 |
| `Vincular`, `PrepararSonda` | `src/screens/OnboardingScreen.tsx`, `src/components/pairing/PairingArt.tsx` | 1 y 4 |
| `Permisos` | `src/screens/PermissionsScreen.tsx`, `src/components/permissionPrompt.ts`, `src/utils/measureLocation.ts` | 2 |
| `Inicio` | `src/screens/DashboardScreen.tsx` | 4 |
| `Etapa`, `Especie` | `src/components/StageCards.tsx`, `src/components/SpeciesPicker.tsx` | 4 |
| `AntesDeMedir` | `src/screens/MeasureScreen.tsx`, `src/components/ProbeInsertArt.tsx` | 1 y 2 |
| `Midiendo` | `src/components/MeasurementLoading.tsx` | 1 |
| `Main` (resultado) | `src/components/MeasurementResultFlow.tsx`, **nuevos** en `src/components/result/` | 3 |
| `DetalleVariable`, `AccionPlan` | `src/components/MeasurementResultFlow.tsx` | 3 |
| `Guardada` | `src/components/ReadingSavedArt.tsx`, `src/components/MeasurementSavedModal.tsx` | 1 |
| `Mediciones` | `src/screens/HistoryScreen.tsx` | 3 |
| `MisDispositivos` | `src/screens/DevicesScreen.tsx` | 4 |
| `Configuracion`, `Preferencias`, `EquiposYDatos` | `src/screens/SettingsDetails.tsx`, `src/screens/FieldSettingsScreen.tsx`, `src/components/screen/ScreenUI.tsx` | 2 y 4 |

Los números de línea que aparecen en las tareas son aproximados: corresponden al código del 16-11-2026.

## 4. Puntos de revisión

Condiciones que la maqueta no muestra y que más probablemente fallen en uso real. Cada una tiene su prueba en la tarea indicada.

1. **Lectura antigua** (versiones 1 y 2 de la presentación, sin `recommendations`, `evidence` ni `headline`): el plan se arma con `actions` y nada queda vacío. Tarea 8.
2. **Permiso de ubicación rechazado, «no volver a preguntar» o revocado entre dos lecturas:** se mide igual, sin coordenadas, y no se vuelve a preguntar. Tarea 4.
3. **Lectura incompleta** (variables sin dato o evaluación insuficiente): el veredicto no muestra conteos que parezcan un diagnóstico. Tarea 8.
4. **Más de tres recomendaciones, con una de prioridad alta en cuarto lugar:** se muestra. Tarea 8.
5. **Letra grande, teléfono angosto (menos de 360) y tema oscuro:** nada se corta ni pierde contraste. No hay prueba automática; es la lista de la tarea 19.

---

## Fase 1 · La sonda única

Sólo ilustraciones. No cambia ningún flujo.

### Tarea 1: geometría y componente de la sonda

**Archivos**
- Crear: `src/components/art/probeGeometry.ts`, `src/components/art/ProbeGlyph.tsx`
- Prueba: `tests/probeGeometry.test.ts` (agregarla al script `test`)

**Interfaces que produce**

```ts
// probeGeometry.ts — sin dependencias
export const PROBE_PIN_COUNT = 5;
export const PROBE_PIN_SPACING = 8;
export const PROBE_BODY = { width: 48, height: 60, radius: 13 } as const;
/** Posición horizontal de cada pin respecto del centro del cuerpo: [-16, -8, 0, 8, 16]. */
export function probePinOffsets(): number[];
/** Trazo SVG de los pines, desde la base del cuerpo hacia abajo. */
export function probePinsPath(length: number): string;

// ProbeGlyph.tsx — se usa DENTRO de un <Svg> existente
export function ProbeGlyph(props: {
  x: number; y: number;        // centro superior del cuerpo, en unidades del viewBox
  scale?: number;              // 1 = cuerpo de 48 × 60
  pinLength?: number;          // 52 por defecto
  pinOpacity?: number;         // para pines dentro del suelo
  led?: string;                // color del LED; por defecto '#1F5B3F'
}): React.JSX.Element;
```

- [x] **Paso 1: escribir la prueba**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { PROBE_BODY, PROBE_PIN_COUNT, probePinOffsets, probePinsPath } from '../src/components/art/probeGeometry';

test('la sonda tiene cinco pines, simétricos y dentro del cuerpo', () => {
  const pins = probePinOffsets();
  assert.equal(PROBE_PIN_COUNT, 5);
  assert.deepEqual(pins, [-16, -8, 0, 8, 16]);
  assert.ok(Math.max(...pins) < PROBE_BODY.width / 2);
});

test('el trazo dibuja un pin por posición, con el largo pedido', () => {
  assert.equal(probePinsPath(52), 'M-16 58v52M-8 58v52M0 58v52M8 58v52M16 58v52');
});
```

- [x] **Paso 2:** `npm test` → falla porque el módulo no existe.
- [x] **Paso 3:** implementar `probeGeometry.ts`. Los pines parten 2 unidades dentro del cuerpo (`y = 58`) para que no se vea la unión.
- [x] **Paso 4:** implementar `ProbeGlyph` como un `<G transform>` con, en este orden: pines (`#E3F0D6`, ancho 3,2, extremos redondos), cuerpo (`#C6DFB4`), franja inferior (`M-24 44h48v3a13 13 0 0 1-13 13h-22a13 13 0 0 1-13-13Z`, `#A3C490`), LED (círculo en `-10, 14`, radio 4), botón PAIR (`x=1 y=9 w=15 h=10 rx=5`, `#1F5B3F`) y dos estrías (`M-12 29h24M-12 35h24`, `#8FB57C`).
- [x] **Paso 5:** `npm run type-check && npm test` → pasa. Commit: `feat(app): agrega el dibujo único de la sonda de 5 pines`.

### Tarea 2: reemplazar las sondas dibujadas a mano

**Archivos a modificar** (cada uno deja de trazar la sonda y usa `ProbeGlyph`)

| Archivo | Dónde | Hoy |
| --- | --- | --- |
| `src/components/ProbeInsertArt.tsx` | 41–44 | 3 pines |
| `src/components/result/ReadingArt.tsx` | 59–64, función `probe` | 3 pines |
| `src/components/MeasurementLoading.tsx` | 75–77 y el LED superpuesto (≈80) | 3 pines |
| `src/components/ReadingSavedArt.tsx` | 72–75 | 3 pines |
| `src/components/pairing/PairingArt.tsx` | 47–52 | 3 pines |
| `src/components/auth/AuthUI.tsx` | 140–143, variante 1 | 2 pines |
| `src/screens/WelcomeCarouselScreen.tsx` | 58–62 | 5 pines, trazo propio |
| `src/components/AppIcon.tsx` | entrada `probe` | sin pines |

**Prueba:** `tests/probeArt.test.ts` (agregarla al script `test`). Lee los ocho archivos como texto y comprueba que los siete primeros importan `ProbeGlyph` y que ninguno conserva un trazo de pines propio.

- [x] **Paso 1: escribir la prueba**

```ts
const ARCHIVOS = ['components/ProbeInsertArt.tsx', 'components/result/ReadingArt.tsx', 'components/MeasurementLoading.tsx',
  'components/ReadingSavedArt.tsx', 'components/pairing/PairingArt.tsx', 'components/auth/AuthUI.tsx', 'screens/WelcomeCarouselScreen.tsx'];
for (const archivo of ARCHIVOS) test(`${archivo} dibuja la sonda con ProbeGlyph`, () => {
  // Misma forma que usa tests/notifications.test.ts para leer fuentes.
  const fuente = readFileSync(join(import.meta.dirname, '..', 'src', archivo), 'utf8');
  assert.match(fuente, /ProbeGlyph/);
  // Dos o más trazos verticales seguidos: una sonda hecha a mano.
  assert.doesNotMatch(fuente, /M\d+ \d+[Vv]\d+M\d+ \d+[Vv]\d+/);
});
```

- [x] **Paso 2:** `npm test` → fallan los siete.
- [x] **Paso 3:** reemplazar archivo por archivo. En las animaciones que mueven la sonda (`ProbeInsertArt`, `ReadingSavedArt`) el recorrido se recalcula con el largo de pin nuevo: la sonda queda con el cuerpo justo sobre el suelo y los cinco pines cubiertos. En `MeasurementLoading` el LED animado se alinea con el LED de `ProbeGlyph`.
- [x] **Paso 4:** ícono `probe` de `AppIcon`: `M6.5 2.5h11v9h-11ZM8 11.5v10M10 11.5v10M12 11.5v10M14 11.5v10M16 11.5v10M9.5 6h.01M13 6h2`.
- [x] **Paso 5:** `npm run type-check && npm test` → pasa.
- [ ] **Paso 6: revisión en teléfono.** Bienvenida (página 2), inicio de sesión, vinculación por PAIR, «Antes de medir», lectura, lectura guardada, las páginas de suelo y ambiente del resultado y la barra inferior. En cada una: cinco pines, misma sonda, y con «reducir movimiento» queda quieta en su estado final.
- [x] **Paso 7:** commit: `feat(app): usa la sonda de 5 pines en todas las ilustraciones`.

### Tarea 3: el pin de la lectura guardada

**Archivo:** `src/components/ReadingSavedArt.tsx` (sello actual: ≈98–106).

- [x] **Paso 1:** reemplazar el sello circular por la secuencia de la maqueta `Guardada`: la sonda sale del suelo y queda inclinada a la izquierda; un pin ocre (`pin`) cae sobre el punto con un rebote corto; dos ondas se abren en el suelo; tres destellos; y arriba a la derecha aparece la nube con flecha. Trazo del pin, con la punta en el origen: `M0 0C-14-18-22-28-22-40A22 22 0 1 1 22-40C22-28 14-18 0 0Z`, con un círculo `#12281F` de radio 13 en `0, -40` y el visto en ocre.
- [x] **Paso 2:** conservar los dos estados que el componente ya distingue con `synced`: respaldada (nube con flecha) y pendiente (reloj en lugar de la nube). El paño que limpia los pines se conserva.
- [x] **Paso 3:** con «reducir movimiento» se muestra el estado final: pin clavado, sin ondas ni destellos.
- [x] **Paso 4:** usar `pin` y `pinLight` de `theme.ts` (sección 2.3). `npm run type-check && npm test`.
- [ ] **Paso 5: revisión en teléfono**, guardando una lectura con y sin conexión. Commit: `feat(app): marca la lectura guardada con un pin en el punto medido`.

---

## Fase 2 · La ubicación se pide una sola vez

Cambia un flujo. Hoy el paso «Todo listo» (`MeasureScreen.tsx` 458–498) muestra un interruptor «Ubicación y pronóstico» en cada medición. Pasa a decidirse una vez y a aplicarse sola.

### Tarea 4: la regla, sin interfaz

**Archivos**
- Modificar: `src/utils/measureLocation.ts`
- Prueba: `tests/measureLocation.test.ts` (ya está en el script `test`)

**Interfaces que produce**

```ts
export const LOCATION_CHOICE_KEY = '@terrasense/measure-location-v1';   // se muda desde MeasureScreen.tsx:49, mismo valor
export type LocationStep = 'capture' | 'ask' | 'skip';
export function nextLocationStep(
  choice: LocationChoice,
  permission: { granted: boolean; canAskAgain: boolean },
  legacyAndroidBluetooth: boolean,
): LocationStep;
/** Elección que se guarda después de preguntar: nunca vuelve a quedar en `null`. */
export function choiceAfterAsking(accepted: boolean): Exclude<LocationChoice, null>;
```

| Elección guardada | Permiso | Resultado |
| --- | --- | --- |
| `off` | cualquiera | `skip` |
| `on` | concedido | `capture` |
| `on` | no concedido (revocado) | `skip`, y se avisa una vez como hoy |
| `null` | concedido, Android 12 o posterior / iOS | `capture` |
| `null` | concedido, Android 11 o anterior | `ask` (diálogo de la app) |
| `null` | no concedido, se puede preguntar | `ask` (diálogo del sistema) |
| `null` | no concedido, el sistema ya no pregunta | `skip` |

- [ ] **Paso 1: escribir las pruebas**

```ts
test('con la elección apagada nunca se captura ni se pregunta', () => {
  assert.equal(nextLocationStep('off', { granted: true, canAskAgain: true }, false), 'skip');
});
test('sin elección guardada se pregunta una vez; con permiso previo se captura directo', () => {
  assert.equal(nextLocationStep(null, { granted: false, canAskAgain: true }, false), 'ask');
  assert.equal(nextLocationStep(null, { granted: true, canAskAgain: true }, false), 'capture');
});
test('si el sistema ya no pregunta, se mide sin ubicación y sin insistir', () => {
  assert.equal(nextLocationStep(null, { granted: false, canAskAgain: false }, false), 'skip');
});
test('en Android antiguo el permiso existe por el Bluetooth: se pregunta dentro de la app', () => {
  assert.equal(nextLocationStep(null, { granted: true, canAskAgain: true }, true), 'ask');
});
test('un permiso revocado no reabre la pregunta', () => {
  assert.equal(nextLocationStep('on', { granted: false, canAskAgain: true }, false), 'skip');
});
test('después de preguntar siempre queda una elección guardada', () => {
  assert.equal(choiceAfterAsking(true), 'on');
  assert.equal(choiceAfterAsking(false), 'off');
});
```

- [ ] **Paso 2:** `npm test` → fallan. **Paso 3:** implementar. **Paso 4:** `npm test` → pasan, junto con las pruebas anteriores del archivo.
- [ ] **Paso 5:** `initialIncludeLocation` queda sin uso después de la tarea 5; se elimina ahí, con sus pruebas. Commit: `feat(app): define cuándo se pregunta la ubicación al medir`.

### Tarea 5: quitar «Todo listo» de la medición

**Archivos**
- Modificar: `src/screens/MeasureScreen.tsx`, `src/components/permissionPrompt.ts`

**Interfaz que produce** (en `permissionPrompt.ts`)

```ts
/** Pregunta por la ubicación: diálogo del sistema o, en Android antiguo, uno propio. Devuelve si quedó aceptada. */
export async function askLocationOnce(language: Language, legacyAndroidBluetooth: boolean, isActive?: () => boolean): Promise<boolean>;
```

- [ ] **Paso 1:** `Phase` (línea 52) pierde `'prepare'`. Se elimina el bloque 458–498, el estado `includeLocation`, `toggleLocation` (139–161), la lectura inicial (112–115) y la rama del botón atrás (línea 180).
- [ ] **Paso 2:** el botón de «Antes de medir» (línea 442) pasa a `t('Listo, medir', 'Done, measure')` y llama a `runMeasurement()` directamente. `totalSteps` (línea 387) pasa a `asksSpecies ? 3 : 2`.
- [ ] **Paso 3:** en `runMeasurement`, donde hoy se llama a `revalidateLocation()` (≈206), se lee la elección y el permiso, se evalúa `nextLocationStep` y, si da `ask`, se llama a `askLocationOnce` y se guarda `choiceAfterAsking`. El resultado decide el argumento de `captureLocation`, que no cambia.
- [ ] **Paso 4:** el aviso de datos simulados (`demoNotice`) y el de permiso retirado, que vivían en «Todo listo», pasan: el primero a «Antes de medir», el segundo a los avisos del resultado (`notices`).
- [ ] **Paso 5:** la etapa y la especie elegidas se muestran como dos píldoras en la barra superior de «Antes de medir» (maqueta `AntesDeMedir`).
- [ ] **Paso 6:** `npm run type-check && npm test`.
- [ ] **Paso 7: revisión en teléfono**, con una instalación limpia cada vez: aceptar (la lectura trae coordenadas y pronóstico); rechazar (se mide igual y la siguiente medición no vuelve a preguntar); revocar el permiso desde los ajustes del teléfono entre dos lecturas (se mide sin coordenadas y aparece el aviso una vez); modo avión (coordenadas sí, pronóstico con la degradación que ya existe).
- [ ] **Paso 8:** commit: `feat(app): pide la ubicación una sola vez y elimina el paso «Todo listo»`.

### Tarea 6: la pantalla de permisos y el interruptor en Preferencias

**Archivos**
- Modificar: `src/screens/PermissionsScreen.tsx`, `src/screens/FieldSettingsScreen.tsx`

- [ ] **Paso 1:** en `PermissionsScreen`, «Continuar» llama primero a `askLocationOnce`, guarda `choiceAfterAsking` y después hace lo que ya hacía (`markPermissionsReviewed`). Sigue siendo **un solo botón**. Se corrige el comentario de cabecera del componente, que hoy dice que la pantalla no abre ningún diálogo.
- [ ] **Paso 2:** la tarjeta de Ubicación va primera y destacada, con la ilustración de la maqueta `Permisos` (pin sobre el campo y pronóstico). Las otras tres filas siguen siendo informativas.
- [ ] **Paso 3:** quien ya pasó por esta pantalla no la vuelve a ver: a esas cuentas les pregunta la tarea 5 en su próxima medición. Ambas rutas escriben la misma clave, así que nadie responde dos veces.
- [ ] **Paso 4:** en Preferencias (`FieldSettingsScreen.tsx`) se agrega la fila «Ubicación y pronóstico» con interruptor, que lee y escribe `LOCATION_CHOICE_KEY`. Encenderlo sin permiso llama a `askForAccess('location', …)`; si el sistema ya no pregunta, ofrece abrir los ajustes, como el resto de los permisos.
- [ ] **Paso 5:** `npm run type-check && npm test`. Revisión en teléfono de ambos caminos. Commit: `feat(app): pregunta la ubicación en la entrada y la deja a mano en Preferencias`.

### Tarea 7: textos y documentación que quedan falsos

- [ ] **Paso 1:** `src/utils/permissionCopy.ts:43` — «Si lo eliges al medir, guarda…» pasa a «Guarda las coordenadas de cada lectura y consulta el pronóstico con Open-Meteo.» (y su versión en inglés).
- [ ] **Paso 2:** `src/screens/SettingsDetails.tsx:38` — se quita «si activas esa opción al medir».
- [ ] **Paso 3:** `src/utils/legalSections.ts:16–17` — leer la frase completa. Si menciona la opción al medir, corregirla. **Antes de tocarla**, revisar `tests/privacy.test.ts` y `tests/registrationConsent.test.ts`: si el texto legal tiene versión, cambiarlo puede exigir una nueva aceptación, y eso lo decide el usuario.
- [ ] **Paso 4:** `App/TASK_PERMISSIONS.md` y `App/README.md` — actualizar los párrafos que describen el interruptor al medir y la regla «cada permiso se pide al usar su función», que deja de valer para la ubicación.
- [ ] **Paso 5:** desde la raíz, `python docs/verificar_documentacion.py` → 0 errores. Commit: `docs(app): actualiza los textos del permiso de ubicación`.

---

## Fase 3 · El resultado

Hoy `MeasurementResultFlow.tsx` (676 líneas) recorre seis páginas (`STEPS`, línea 32) y el plan es la última. Pasa a una sola pantalla que se desplaza: veredicto, «Qué hacer», clima, Suelo, Aire y Nutrientes.

### Tarea 8: el modelo del resultado, sin interfaz

**Archivos**
- Crear: `src/components/result/resultModel.ts`
- Prueba: `tests/resultModel.test.ts` (agregarla al script `test`)

**Interfaces que produce**

```ts
export interface ScoreCounts { ok: number; warn: number; bad: number; total: number }
/** Variables con estado: excluye N, P y K y los datos de contexto. Se muda desde MeasurementResultFlow.tsx:309–310. */
export function scoreCounts(parameters: ParameterPresentation[]): ScoreCounts;

export interface PlanAction {
  index: number;                       // posición en p.recommendations, o en p.actions si es una lectura antigua
  when: RecommendationTiming | null;   // null en lecturas antiguas
  title: string;                       // headline ?? title
  priority: 'high' | 'normal';
  evidence: ParameterKey[];
}
export const PLAN_VISIBLE = 3;
/** Acciones a la vista y cuántas quedan tras «Ver N más». */
export function planActions(p: MeasurementPresentation): { visible: PlanAction[]; hidden: number };
```

- [ ] **Paso 1: escribir las pruebas.** Con presentaciones armadas a mano (el archivo `tests/measurementPresentation.test.ts` tiene ejemplos de la forma):
  - `scoreCounts` no cuenta nitrógeno, fósforo, potasio ni las variables en `INFO`; una variable sin valor no suma a `ok`.
  - con cinco recomendaciones normales: `visible.length === 3`, `hidden === 2`.
  - con cinco recomendaciones y la cuarta en `high`: la cuarta está en `visible` y `hidden === 1`.
  - lectura antigua, sin `recommendations` y con `actions: ['a', 'b']`: dos acciones visibles, `when === null`, `evidence` vacío.
  - sin recomendaciones ni acciones: `visible` vacío y `hidden === 0`.
  - `title` usa `headline` cuando existe y `title` cuando no.
- [ ] **Paso 2:** falla. **Paso 3:** implementar. **Paso 4:** pasa. Commit: `feat(app): agrega el modelo del resultado en una pantalla`.

### Tarea 9: el dato que gatilla cada acción

**Archivos**
- Modificar: `src/engine/contextualAdvice.ts` (interfaz `Recommendation`, 22–29; alertas, 164–167; recomendaciones de riego y de demanda del aire)
- Prueba: `tests/measurementPresentation.test.ts`

- [ ] **Paso 1:** agregar a `Recommendation` el campo opcional `evidence?: ParameterKey[]`. Se llena con la variable de la alerta que origina la recomendación; las de riego llevan `['vwc']` y las de demanda del aire `['airTemp', 'airHumidity']`. Las que no salen de una variable (clima, «vuelve a medir») no lo llevan.
- [ ] **Paso 2: prueba.** Una lectura con humedad bajo el umbral produce una recomendación cuyo `evidence` incluye `'vwc'`, y el campo llega intacto a `MeasurementPresentation.recommendations`. Ninguna recomendación lleva `nitrogen`, `phosphorus` ni `potassium` en `evidence`.
- [ ] **Paso 3:** comprobar que `Web/` no valida el diagnóstico guardado con un esquema estricto: el campo nuevo viaja dentro del JSON que ya se guarda, sin migración.
- [ ] **Paso 4:** `npm run type-check && npm test`. Commit: `feat(app): cada recomendación declara la variable que la sostiene`.

### Tarea 10: titulares cortos (requiere aprobación del usuario)

**Archivos:** `src/engine/contextualAdvice.ts`, `src/engine/stageEvaluator.ts`, `src/engine/agronomyEngine.ts`.

- [ ] **Paso 1:** agregar `headline?: string` a `Recommendation` y a las alertas de las que nace.
- [ ] **Paso 2:** escribir el titular de cada regla, en ambos idiomas, con estas reglas: empieza con un verbo en imperativo, 40 caracteres como máximo, sin emojis, sin dosis ni cantidades de producto. Ejemplos del tono: «Riega hoy», «Espera la lluvia antes de regar», «Vuelve a medir después de regar», «Confirma el pH en laboratorio».
- [ ] **Paso 3: prueba.** Para las lecturas de ejemplo de `tests/measurementPresentation.test.ts`, toda recomendación trae `headline`, de 40 caracteres o menos, y no coincide con `/\p{Extended_Pictographic}/u`.
- [ ] **Paso 4: entregar al usuario la tabla** regla → titular en español e inglés. No se fusiona sin su visto bueno: es texto agronómico.
- [ ] **Paso 5:** `npm test`. Commit: `feat(app): agrega titulares cortos al plan de acción`.

### Tarea 11: la pantalla única

**Archivos**
- Crear en `src/components/result/`: `ResultHero.tsx`, `PlanList.tsx`, `WeatherStrip.tsx`, `ReadingGroup.tsx`, `NutrientGroup.tsx`, `BottomSheet.tsx` (el `PlanSheet` actual, mudado)
- Modificar: `src/components/MeasurementResultFlow.tsx`

Orden de la pantalla, de arriba hacia abajo (maqueta `Main`):

1. **Barra:** volver y la batería de la sonda (`BatteryBar`).
2. **Avisos** (`notices`): datos simulados, batería baja, permiso retirado.
3. **Veredicto** (`ResultHero`): panel `#17392C`; especie y etapa; el título que ya da el motor (`p.title`); una barra de segmentos, uno por variable con estado, con el color de cada una; píldoras con ícono y cantidad; fecha, coordenadas y precisión. Con `evaluationState === 'insufficient_data'` no hay barra ni píldoras: sólo «Evaluación insuficiente».
4. **Qué hacer** (`PlanList`): las acciones de `planActions`. Cada fila: número, píldora de cuándo, titular, y la línea de evidencia con el nombre y el valor de las variables de `evidence`. Tocar una fila abre la hoja con el porqué (`body`) y, cerrado, «Detalle técnico y fuente» (`detail`). Debajo: «Ver N más», «Cómo se evaluó» (resumen, cobertura y limitaciones) y la línea «Guía orientativa: confírmala en terreno.» En pre-siembra se agrega la fila «Posibles cultivos (N)».
5. **Clima** (`WeatherStrip`): una fila con el titular de `forecastOutlook` (`src/engine/weatherOutlook.ts`). Abre una hoja con `MeasurementForecast` completo. Sin coordenadas: «Sin ubicación incluida», y toca hacia Preferencias.
6. **Suelo** y **Aire** (`ReadingGroup`): una tarjeta por familia, una fila por variable: ícono (`MetricBadge`), nombre, valor, escala (`MetricScale`) y estado con ícono y texto. El encabezado resume la familia («1 requiere atención», «Todo favorable»). Tocar una fila abre el detalle.
7. **Nutrientes** (`NutrientGroup`): tres casillas neutras con nombre, valor y `mg/kg`, sin color de estado, y la frase «Sirven para comparar entre mediciones del mismo punto. El análisis de laboratorio fija el punto de referencia.»
8. **Pie fijo:** «Guardar resultado» en una medición nueva; «Cerrar» en el historial.

- [ ] **Paso 1:** mudar `PlanSheet` a `BottomSheet.tsx` sin cambiarlo.
- [ ] **Paso 2:** crear las cinco piezas con los valores de la sección 2.3, tomando los colores de `theme.ts`.
- [ ] **Paso 3:** reescribir el cuerpo de `MeasurementResultFlow`: desaparecen `STEPS`, `GROUP_OF`, `StepProgress` y las ilustraciones de familia; `ResultPager` queda sólo para recorrer el detalle de las variables. La interfaz pública del componente (`presentation`, `forecast`, `notices`, `onExit`, `exitLabel`, `save`) no cambia: `MeasureScreen` y `MeasurementDetailModal` no se tocan.
- [ ] **Paso 4:** botón atrás del teléfono: cierra la hoja abierta; si no hay, cierra el detalle; si no hay, sale (con la confirmación de descarte que ya existe).
- [ ] **Paso 5:** `useResetGuide` usa la clave `resultado` para la pantalla y `detalle-<n>` para cada variable.
- [ ] **Paso 6:** `npm run type-check && npm test`.
- [ ] **Paso 7: revisión en teléfono** con: una lectura nueva con especie; una en pre-siembra; una sin especie; una sin ubicación; una con variables sin dato; y, desde el historial, una lectura guardada antes de este cambio. En cada una: el plan es lo primero que se lee después del veredicto, ninguna recomendación desaparece y N, P y K no llevan color.
- [ ] **Paso 8:** commit: `feat(app): presenta el resultado en una pantalla con el plan primero`.

### Tarea 12: el detalle de una variable

**Archivo:** `src/components/MeasurementResultFlow.tsx` (función `detailPage`).

- [ ] **Paso 1:** aplicar la maqueta `DetalleVariable`: cifra grande (60) con la unidad en menor tamaño, píldora de estado, escala con las zonas rotuladas, «Qué significa», «Qué hacer» con vistos, «Detalle técnico y fuente» cerrado y los botones anterior/siguiente con el nombre de la variable vecina.
- [ ] **Paso 2:** el contenido no cambia: sigue saliendo de `buildParameterCopy` y del motor. Las variables de N, P y K conservan su texto de valores de referencia.
- [ ] **Paso 3:** `npm run type-check && npm test`. Revisión en teléfono recorriendo las diez variables. Commit: `feat(app): rediseña el detalle de una variable`.

### Tarea 13: el historial muestra la primera acción

**Archivos**
- Modificar: `src/engine/measurementPresentation.ts` (junto a `savedSpecies`, ≈363), `src/screens/HistoryScreen.tsx` (136–162)
- Prueba: `tests/measurementHistory.test.ts`

**Interfaz que produce**

```ts
/** Titular de la primera recomendación de un diagnóstico guardado; `null` si no trae. */
export function savedHeadline(diagnosis: unknown): string | null;
```

- [ ] **Paso 1: prueba.** Con un diagnóstico que trae recomendaciones devuelve el `headline` de la primera, o su `title` si no hay `headline`; con uno antiguo o con un valor que no es un objeto, `null`.
- [ ] **Paso 2:** implementar. **Paso 3:** la fila del historial (maqueta `Mediciones`) lleva un cuadro con ícono según el veredicto (visto, signo de exclamación o equis, sobre `tintSuccess`, `tintWarning` o `tintDanger`), especie y etapa, la hora, el titular en el color del estado (o el título que ya se mostraba, si `savedHeadline` da `null`) y el estado de respaldo.
- [ ] **Paso 4:** `npm run type-check && npm test`. Commit: `feat(app): muestra la primera acción en cada fila del historial`.

---

## Fase 4 · El resto de las pantallas

Sólo apariencia. Ninguna opción cambia de lugar ni de comportamiento.

### Tarea 14: letra de títulos y cifras

- [x] **Paso 1:** `npx expo install expo-font @expo-google-fonts/space-grotesk`.
- [x] **Paso 2:** cargar `SpaceGrotesk_500Medium` y `SpaceGrotesk_700Bold` en `App.tsx` antes de ocultar la pantalla de carga. Si a los 3 segundos no cargaron, la app sigue con la letra del sistema: nunca se bloquea el inicio.
- [x] **Paso 3:** agregar a `Typography` (`theme.ts`) `display` y `numeric`, con la familia por peso. En Android una letra propia no admite `fontWeight`: cada peso es una familia distinta.
- [ ] **Paso 4:** aplicarla en `EntryHeading` (`EntryUI.tsx:84`), en los títulos de `ScreenLayout` y en las cifras del resultado, el detalle y la batería.
- [x] **Paso 5:** comprobar que «Letra grande» sigue escalando (`AppText` escala por tamaño, no por familia). `npm run type-check && npm test`. Commit: `feat(app): usa Space Grotesk en títulos y cifras`.

### Tarea 15: Configuración

**Archivos:** `src/components/AppIcon.tsx`, `src/components/screen/ScreenUI.tsx`, `src/components/SettingsUI.tsx`, las pantallas de Configuración.

- [x] **Paso 1:** íconos nuevos en `AppIcon`: `user`, `help`, `logout`, `qr`, `team`, `download`, `shield` (trazos en las maquetas `Configuracion`, `Preferencias` y `EquiposYDatos`).
- [x] **Paso 2:** `ScreenOption` acepta un `icon?: IconName` opcional, dibujado en un cuadro de 44 a la izquierda. Sin `icon`, la fila queda como hoy.
- [ ] **Paso 3:** la portada de Configuración muestra una tarjeta de cuenta (`#17392C`: iniciales, nombre, correo y el estado de verificación) y agrupa sus filas en una sola tarjeta con separadores.
- [ ] **Paso 4:** «Equipos y datos» abre con el resumen de sincronización (pendientes de enviar, último envío confirmado y «Sincronizar ahora»), con los mismos datos que hoy muestra `SyncSettings`.
- [x] **Paso 5:** `npm run type-check && npm test` (incluye `settingsNavigation.test.ts`). Commit: `feat(app): rediseña Configuración`.

### Tarea 16: Inicio

**Archivo:** `src/screens/DashboardScreen.tsx`.

- [x] **Paso 1:** el botón Medir pasa a ser un círculo de 236 con la sonda (`ProbeGlyph`) sobre el suelo y, montada sobre su borde inferior, una píldora con la palabra «Medir». Sigue siendo un solo control, con la misma etiqueta de accesibilidad.
- [x] **Paso 2:** el selector de sonda de la barra superior muestra también la batería registrada, cuando existe.
- [x] **Paso 3:** un halo se abre alrededor del círculo cada 2,6 segundos; con «reducir movimiento» no aparece.
- [x] **Paso 4:** revisar la versión compacta (alto menor de 700 o letra del sistema grande) y el tema oscuro, que en esta pantalla usa el verde de marca. Commit: `feat(app): rediseña Inicio`.

### Tarea 17: Mis dispositivos

**Archivo:** `src/screens/DevicesScreen.tsx`.

- [x] **Paso 1:** cada sonda es una tarjeta con un panel `#17392C` a la izquierda con la sonda, y a la derecha el nombre, el identificador, el rol, una barra de batería con su porcentaje y la última comunicación. La sonda elegida para medir lleva la píldora «Para medir» y borde de 2.
- [x] **Paso 2:** batería bajo el umbral que ya usa `utils/batteryWarning`: barra y cifra en el color de atención. Sin dato: «Sin dato», sin barra.
- [x] **Paso 3:** `npm run type-check && npm test`. Commit: `feat(app): rediseña Mis dispositivos`.

### Tarea 18: entrada, etapa y especie

- [x] **Paso 1 — inicio de sesión** (`AuthScreen.tsx`, `AuthUI.tsx`): cabecera `#12281F` con el nombre de la app y la sonda en el campo; campos y botones como en la maqueta `InicioSesion`.
- [x] **Paso 2 — vinculación** (`OnboardingScreen.tsx`): las dos opciones llevan un cuadro con ícono (sonda y QR); la opción de equipo nuevo va destacada. Los pasos del PAIR son una secuencia numerada unida por una línea, con la ilustración del LED azul.
- [x] **Paso 3 — etapa** (`StageCards.tsx`): ya es una grilla de dos columnas; sólo se ajustan radio, borde y el visto de selección a los valores de la sección 2.3.
- [ ] **Paso 4 — especie** (`SpeciesPicker.tsx`): cada fila lleva un cuadro con hoja, el nombre y el nombre científico en cursiva; la elegida, fondo `tintSuccess` y visto. El botón dice «Continuar con <especie>».
- [x] **Paso 5:** `npm run type-check && npm test`. Commit: `feat(app): rediseña la entrada, la etapa y la especie`.

### Tarea 19: cierre

- [ ] **Paso 1:** desde `App/`: `npm run type-check && npm test`. Desde la raíz: `python docs/verificar_documentacion.py` → 0 errores.
- [ ] **Paso 2: recorrido completo en un teléfono**, desde una instalación limpia hasta una lectura guardada, tres veces: tema claro; tema oscuro; «Letra grande» con la letra del sistema al máximo.
- [ ] **Paso 3:** el mismo recorrido con «reducir movimiento» activado: ninguna ilustración queda a medio camino.
- [ ] **Paso 4:** en un teléfono angosto (menos de 360 de ancho): el resultado no se corta y los nombres largos de variable no empujan el valor fuera de la fila.
- [ ] **Paso 5:** actualizar en `App/README.md` la descripción del flujo de medición y del resultado, que cambia con las fases 2 y 3.
- [ ] **Paso 6:** el APK distribuible se compila en el otro computador, donde está la clave de firma.
