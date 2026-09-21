# Plan de trabajo: permisos, ajustes y dispositivos

## Estado y alcance vigente

### Etapa vigente: auditar Permisos, Vinculación y Dashboard

Bienvenida y acceso ya fueron revisados con el usuario. El alcance actual termina en
Dashboard; Medición queda como la siguiente etapa, después de validar estas pantallas.

Implementado localmente:

- [x] Permisos: conservar solicitudes explícitas y continuación sin concederlos;
  refrescar el estado al terminar una solicitud y al regresar de Ajustes.
- [x] Bluetooth iOS: admitir respuestas inmediatas del listener sin acceder a una
  suscripción todavía no inicializada y liberarlo después de resolver.
- [x] Vinculación: conservar dos opciones, sonda nueva por Bluetooth y equipo compartido.
  La segunda permite escanear QR o ingresar/pegar su código temporal, sin exigir cámara
  para la entrada manual. Ambas llaman a la misma solicitud de acceso y esperan aprobación.
- [x] Mostrar y copiar la invitación temporal junto al QR en Mis dispositivos. Retirar
  de ese diálogo el identificador permanente, que no sirve como invitación. Permitir
  desplazar el diálogo para alcanzar sus controles en pantallas pequeñas.
- [x] Reemplazar el botón visible de desarrollo por diez pulsaciones en el logo de
  la pantalla de elección. Entra a Dashboard sin inventar un equipo; sólo funciona
  en desarrollo, se guarda por cuenta y se limpia al cerrar sesión.
- [x] Dashboard: aviso de desarrollo sin sonda, acción principal hacia vinculación,
  recarga al volver al primer plano y actualización del historial tras respaldar la cola.
  Una cuenta sin equipos no conserva un dispositivo seleccionado anteriormente.
- [x] Pairing: límites de espera en conexión y operaciones de configuración; propagar
  fallos del inicio de escaneo. Una lectura fallida o inválida de identidad ya no se
  interpreta como sonda nueva. Releer antes de provisionar evita sobrescribir un código
  que quedó guardado durante un intento anterior cuya confirmación se perdió.
- [x] Revisar servicios de invitación, espera de aprobación, rutas de entrada, consulta
  del historial, sincronización y migraciones que aplican autorización en el servidor.
- [x] Agregar regresiones de invitación manual, gesto de desarrollo, aislamiento por
  cuenta, listener iOS, fallos/tiempos límite e identidad BLE. Los dobles nativos prueban
  el servicio real, pero no certifican el comportamiento del hardware.
- [x] Pruebas de App: 109 aprobadas; TypeScript sin errores; exportación JavaScript
  Android correcta; verificador documental con 0 errores. La exportación no equivale
  a compilar ni probar un APK. `adb devices -l` no muestra dispositivos conectados.

Validación pendiente antes de dar por funcional el recorrido completo:

- [ ] Teléfono: conceder, rechazar y bloquear cada permiso; volver de Ajustes y continuar
  sin permisos. Cubrir Android 12+, Android anterior e iOS según la matriz inferior.
- [ ] Dos cuentas reales: QR y código manual vigentes, invitación vencida, código inválido,
  solicitud repetida, aprobación/rechazo del administrador y recuperación tras perder red.
- [ ] Sonda real: búsqueda, radio apagada, permiso bloqueado, desconexión, escritura,
  confirmación e intento repetido. Confirmar cómo informa el firmware una identidad vacía:
  el cliente sólo acepta una lectura vacía confirmada como equipo sin código.
  **No hay firmware ESP32 en este repositorio.**
- [ ] Diez pulsaciones: nueve no navegan, diez abren Dashboard; repetir después de reiniciar
  y cambiar de cuenta. En producción el gesto y la marca guardada no habilitan el acceso.
- [ ] Dashboard: estados sin sonda, sin lecturas, con última lectura y cola pendiente;
  recuperar red y comprobar respaldo, refresco, detalle, historial, dispositivos y ajustes.
- [ ] Validar disposición con teclado, texto ampliado, temas, idiomas y lector de pantalla.

### Siguiente etapa pendiente: Medición, revisión completa

Comenzar sólo después de validar Permisos, Vinculación y Dashboard con el usuario.

- [ ] Auditar cada grid/bloque de la pantalla, valores, unidades, datos ausentes, estados
  de carga/error y coherencia entre captura, diagnóstico, detalle y guardado.
- [ ] Validar la API de clima: coordenadas, fechas/zona horaria, respuesta real, ausencia
  de red, datos parciales y su representación sin inventar información.
- [ ] Auditar el motor agronómico, umbrales, etapa del cultivo, recomendaciones y su
  consistencia con las mediciones y el clima. Contrastar con las fuentes de verdad del código.
- [ ] Probar el recorrido completo con sonda, datos simulados identificados, reintentos,
  guardado local, sincronización y prevención de duplicados.

### Correo funcional y pulido del flujo inicial

Plan aprobado por el usuario tras probar la app en teléfono. El correo era lo que rompía
todo: sin código de confirmación no hay cuenta, y sin cuenta las políticas RLS bloquean la
app entera.

**Correo.** El remitente es `akurasoporte@gmail.com`, decisión del usuario, enviado por el
SMTP de Gmail de esa misma cuenta. Se descartaron Resend (exige dominio propio verificado;
sin él sólo entrega al correo del titular de la cuenta) y Brevo (no puede autenticar
`gmail.com` y reescribe el remitente). El límite de envíos pasó de 2 a 30 por hora, que es
lo que agotaba la cuota en cada prueba.

- [x] Dejar `supabase/config.toml` con la cuenta, el límite y la plantilla de contraseña
  cambiada enlazada a su archivo real.
- [x] Contraseña de aplicación generada y SMTP cargado en el panel remoto por el usuario.
      Comprobado contra remoto el 20-09-2026 en modo lectura: `smtp.gmail.com:587`,
      usuario y remitente `akurasoporte@gmail.com`, nombre `TerraSense`, sin hook de correo,
      confirmación obligatoria activa, código de 6 dígitos con 600 s de vencimiento y 60 s
      entre envíos. La contraseña no se leyó ni se imprimió en ningún momento.
- [x] Límite de correos subido de 2 a 30 por hora en remoto, con la API de administración
      y un PATCH de ese único campo. Verificado después que SMTP, `site_url`, URLs
      autorizadas y parámetros del código quedaron intactos.
- [x] Plantillas publicadas el 20-09-2026. Confirmación y recuperación con
      `configurar_codigos.py --apply`; la notificación de contraseña cambiada con un PATCH
      de su único campo, porque ese script no la gestiona. Las tres verificadas carácter a
      carácter contra el archivo local, con SMTP, URLs y límites intactos.
      Corrección aplicada antes de publicar: la cabecera usaba sólo `linear-gradient`, que
      Gmail descarta, y dejaba el texto blanco sobre fondo blanco. Ahora lleva
      `background-color:#1F5B3F` delante como respaldo.
- [ ] Probar en teléfono: registro, código incorrecto, código vencido, reenvío antes y
  después de los 60 s, recuperación y correo de contraseña cambiada.

**Interfaz del flujo inicial.** Implementado localmente; falta validación en dispositivo.

- [x] Bienvenida con el logo de la empresa en lugar del icono y el texto, y las tres
  láminas con el texto centrado.
- [x] Encabezados de acceso centrados y flecha retirada de todos los botones primarios.
- [x] Movimiento sin rebote en todo el flujo inicial, con los tokens de
  `App/src/constants/motion.ts`: los muelles sobrepasaban el valor final y volvían.
- [x] Términos: título centrado, entrada de la hoja regulada, sin el aviso de versión
  preliminar ni la instrucción de deslizar, y «Continuar» baja el texto hasta el final
  antes de exigir las dos casillas.
- [x] Texto legal completo: responsable Akura, `akurasoporte@gmail.com` para ejercer
  derechos y conservación de un mes tras cerrar la cuenta. Versión `2026-09-20-1`.
- [x] Confirmación de cuenta sin logo ni flecha, con seis casillas enmascaradas y
  verificación automática al sexto dígito.
- [ ] **Borrado real al mes.** El texto legal ya promete que el perfil y los datos
  personales se eliminan dentro del mes siguiente al cierre de la cuenta, y hoy el servidor
  no lo hace: `purge_expired_operational_data()` sólo limpia intentos de vinculación y
  auditorías. Es una migración pendiente, no una mejora opcional: mientras no exista, el
  texto promete algo que el sistema no cumple.
- [x] Marca del proyecto nativo corregida. `App/assets/` ya venía bien, pero
      `App/android/` conservaba el icono del proyecto Akura —un escudo turquesa con un
      visto bueno— del 19-09-2026: los PNG de `assets/` sólo llegan al teléfono cuando se
      regenera el nativo. `npx expo prebuild --platform android` lo rehace; esa carpeta
      está completa en `.gitignore` y no tiene archivos versionados, así que regenerarla
      no pisa trabajo de nadie.
- [x] Pantalla de arranque corregida. Desde SDK 52 la clave `splash:` suelta ya no aplica
      el color de fondo: quedaba `#FFFFFF` y el logotipo, casi blanco por diseño,
      desaparecía. Ahora se declara por el plugin `expo-splash-screen` con `#12281F`.
- [x] Pantalla de carga con la marca (`App/src/components/LoadingScreen.tsx`): fondo verde
      de arranque, logotipo y ruedita. Comparte color con la pantalla nativa, así que el
      arranque no muestra un destello claro al montar la app. Los estratos grises del
      logotipo pasan a verdes sobre fondo oscuro; la paleta vive en `BrandLogo` y su
      equivalente en el generador, que produce el PNG nativo.
- [x] Corregido el error «No pudimos revisar tu cuenta» en cuentas nuevas. La causa no
      estaba en la app: `listMyDevices` pedía `data_generation` y esa columna no existía en
      producción, porque faltaban por aplicar las dos migraciones de arriba. PostgREST
      respondía 42703, `getOnboardingState` lanzaba, y una cuenta recién creada no tiene
      estado en caché al que caer. El guardado de mediciones fallaba por lo mismo.
      Reproducido contra producción antes de tocar nada y verificado después.
- [x] Continuar de los términos responde a la primera. La hoja legal ya no espera a que
      termine la solicitud para cerrarse. Medido antes de cambiar: el endpoint de registro
      responde en 0,1–0,8 s, así que no era latencia del envío de correo sino que la única
      señal era una ruedita de medio segundo dentro del propio botón. La aceptación se
      conserva si la creación falla, para no obligar a releer los términos al reintentar.
- [x] `consentReducer` es idempotente al llegar al final: antes devolvía un objeto nuevo en
      cada evento de desplazamiento y re-renderizaba el texto legal completo mientras el
      dedo se movía.
- [x] Auditoría del esquema: se contrastó cada tabla, columna y RPC que consultan la app,
      la consola y las Edge Functions contra el esquema real en remoto. Aparece un segundo
      desfase de la misma clase que `data_generation`: **`profiles.push_token` no existía**.
      Ninguna migración lo declaraba. La app envuelve su escritura en un `catch` que
      devuelve `null`, así que el fallo se perdía en silencio y `send-push-alert` se
      quedaba sin destinatarios: el circuito de avisos push nunca llegó a cerrarse.
      Lo crea `20260920160000_token_de_notificaciones.sql`, ya aplicada y verificada.
- [x] Revisadas las tablas que ningún cliente consulta directamente
      (`admin_support_invite`, `device_access_invites`, `device_join_attempts`,
      `device_member_audit`, `device_status_log`, `support_register_attempts`).
      **Ninguna sobra**: las seis las usan RPCs o disparadores del servidor. Retirarlas
      rompería el QR de acceso, la unión por código, el alta de soporte, las auditorías,
      el restablecimiento de fábrica y el detalle de equipo. Una tabla que nadie consulta
      no provoca errores; los provoca lo contrario, una columna que el cliente pide y no
      existe, que es lo que esta auditoría busca.
- [x] Aviso de cuenta ya registrada. Supabase no devuelve error cuando el correo existe:
      para no confirmarle a un extraño qué direcciones están registradas, responde con un
      usuario sin identidades. La app lo reconoce y deja al agricultor en el inicio de
      sesión con el aviso, en vez de mandarlo a esperar un código que nunca llega. Se
      descartó una consulta directa a la base que respondiera sí o no: sería un padrón de
      clientes sondeable, y el proyecto tiene el CAPTCHA desactivado.
- [ ] Validar en teléfono el flujo completo con las transiciones nuevas, el icono del
      lanzador, la pantalla de arranque y la de carga. **Exige reinstalar la app**: el
      icono y el arranque se compilan en el APK, no se recargan con Metro.

### Etapa anterior: marca, pantallas principales y guías interactivas

Plan aprobado por el usuario. Marca oficial: **TerraSense**. Conservar cambios locales
de retirada de mapas y datos; bienvenida y autenticación quedan fuera de las guías.

- [x] Revisar continuidad, recursos vectoriales y cambios locales antes de editar.
- [x] Integrar logo vectorial en app, web y README; isotipo como favicon e íconos nativos.
- [x] Implementar guía reutilizable con foco en cada control, fondo atenuado,
  diálogo contextual, Atrás/Siguiente y X; desplazamiento y accesibilidad.
- [x] Mejorar Dashboard, Medición, Historial y Dispositivos conservando estados reales.
- [x] Cubrir permisos, vinculación, espera, Ajustes, submenús y detalles con guías.
- [x] Ejecutar pruebas, TypeScript, compilación web y verificación documental.
- [ ] Validar visualmente en dispositivo las guías, íconos y conexión BLE real.

Los pendientes de firmware, despliegue remoto y pruebas de borrado de la etapa anterior
siguen vigentes; esta etapa no los da por resueltos.

Resultado de la verificación ejecutada: App 90 pruebas aprobadas y TypeScript sin errores;
consola web 4 pruebas aprobadas y compilación Vite correcta; verificador documental con
13 documentos, 308 enlaces y 11 diagramas, 0 errores; modelo financiero 14 pruebas
aprobadas. Esto no sustituye la validación en dispositivo, que sigue pendiente.

### Retirada del mapa en consola web y base de datos

El mapa se retiró también fuera de la app, con el mismo criterio: desaparece la
representación, se conserva la georreferenciación. La consola pierde la ruta del mapa,
sus dos componentes y el ítem de navegación. La migración
`20260920140000_retirar_mapa_y_postgis.sql` elimina `soil_measurements.geom` y `radius_m`,
las tablas `predial_quadrants` y `field_perimeters`, y la extensión PostGIS; rehace
`prepare_device_for_owner` y `admin_factory_reset_device` sin el borrado de cuadrantes, y
esta última deja de devolver `quadrants_deleted`.

Comprobado contra remoto el 20-09-2026, en modo lectura: sólo quedan dos migraciones sin
aplicar, `20260920120000` y esta; `predial_quadrants` y `field_perimeters` tienen cero filas,
así que el borrado no destruye datos; y `data_generation` todavía no existe en `devices`.
Las dos migraciones no pueden separarse, porque ésta rehace `prepare_device_for_owner`, que
referencia objetos creados por la anterior.

- [x] Aplicada en remoto el 20-09-2026 con autorización explícita del usuario, junto con
      `20260920120000`. Comprobado antes: `predial_quadrants` y `field_perimeters` con cero
      filas, y la única medición georreferenciada tenía en `geom` el mismo punto que
      `latitude`/`longitude`, que se conservan. Lo único que se perdió es su `radius_m`,
      que la app ya no usa. Después: PostGIS y las dos tablas retiradas, `data_generation`
      presente en `devices` y `soil_measurements` como `NOT NULL DEFAULT 0`, los dos
      disparadores creados y los recuentos de filas intactos.
- [x] `Web/backend/database.types.ts` regenerado desde el proyecto remoto. La consola
      compila y sus pruebas pasan.
- [x] `supabase/schema.sql` regenerado con Docker en marcha. Ya no declara PostGIS, la
      geometría, el radio, los cuadrantes ni los perímetros, e incorpora `data_generation`,
      `push_token` y la tabla `device_data_resets`. Al volcar, cuidado: `supabase db dump`
      **trunca el archivo de salida antes** de comprobar que tiene Docker, así que si falla
      deja el destino en cero bytes. Volcar a un temporal y copiar sólo si el resultado es
      válido.

`latitude`, `longitude` y `gps_accuracy_m` se conservan y el detalle de cada lectura sigue
mostrando las coordenadas como texto: quitar el mapa no es quitar la georreferenciación.

Implementación de esta etapa:

- Los archivos `Logo/Logo/code.html` y `Logo/Asset/code.html` contienen SVG y son las
  fuentes de marca. `npm run assets:brand` en App genera los SVG de distribución,
  el módulo vectorial nativo, favicon y PNG de Expo. La tipografía queda trazada para
  no depender de las fuentes del teléfono; los PNG se exportan desde el vector.
- `ScreenGuide` presenta recorridos manuales desde `?`; no se abren al iniciar una
  pantalla. Incluyen Atrás/Siguiente/Finalizar y X, fondo atenuado y desplazamiento.
  Los controles aportan referencias y explicaciones; las filas del historial usan la
  primera medición como ejemplo. El recorrido no ejecuta acciones y pausa la lectura
  de QR. Los modales tienen su propio ámbito y Atrás cierra primero la guía.
- Dashboard conserva resumen sin mapa; Medición añade preparación de la sonda;
  Historial desplaza también cabecera y filtros; Dispositivos distingue vinculación
  de conexión BLE y muestra el alcance del último registro de batería/conexión.
- Pairing ya tenía cambios previos. Esta etapa añade guías a elección, búsqueda,
  nombre, registro, QR y espera; no redefine el contrato BLE ni el firmware.
- Verificación visual nativa pendiente: teléfonos pequeños, texto ampliado,
  TalkBack/VoiceOver, máscaras del launcher, permisos reales y sonda física.

Este archivo es el punto de continuidad del trabajo. Se conserva su nombre para mantener
el enlace existente desde el README. Las casillas marcadas describen trabajo realizado;
las pendientes son requisitos, no funciones disponibles.

- [x] Auditoría y mejoras previas de autenticación, recuperación y onboarding, con renovación
  visual del flujo inicial conservando la paleta e integración de los avances del usuario.
- [x] Implementación de la etapa de permisos descrita abajo y documentación del paso 3.
- [x] Revisión inicial de Ajustes y Dispositivos y definición del alcance con el usuario.
- [x] Consolidar en este documento las decisiones de la siguiente etapa.
- [x] Implementar los submenús de Ajustes, perfil y dispositivos (validación nativa pendiente).
- [x] Retirar todos los mapas de la app conservando el historial de mediciones.

Implementación autorizada por el usuario y realizada localmente; despliegue y validación nativa pendientes. La restricción anterior de trabajar sólo en inicio/auth corresponde a la etapa
ya realizada; el nuevo alcance incluye Ajustes, sus submenús y la eliminación de mapas.

## Objetivo y decisiones

Insertar `PermissionsScreen` como paso 3: bienvenida → autenticación → permisos →
vinculación de equipos. Mantener prioridad de recuperación y aislamiento entre cuentas.
Conservar la paleta y los componentes del flujo inicial. No cambiar otras pantallas.

La pantalla explica Bluetooth, ubicación en primer plano, cámara y notificaciones.
Cada solicitud requiere una acción del usuario. Continuar no equivale a conceder
permisos: se registra que se revisó la explicación en esta cuenta y dispositivo.
Los permisos reales se consultan al sistema y las funciones conservan sus comprobaciones.
No se solicita ubicación en segundo plano, micrófono, contactos ni archivos.

## Pasos y criterios de aceptación

- [x] 1. Revisar permisos y puntos de solicitud existentes.
  - Bluetooth Android 12+ separado de ubicación; Android anterior necesita ubicación
    para escanear. Cámara sólo para QR; notificaciones opcionales.
  - Verificación: inspección de servicios, configuración nativa y bibliotecas locales.
- [x] 2. Implementar servicio de permisos y persistencia de la etapa.
  - Consultas sin diálogos automáticos; solicitudes explícitas, rechazo y ajustes.
  - Marca versionada por cuenta/dispositivo, sin confundirla con autorización real.
  - Dependencia: paso 1. Verificar tipos y pruebas de estados/persistencia.
- [x] 3. Crear `PermissionsScreen` e integrar `resolveEntryRoute` y `App.tsx`.
  - Recuperación y login preceden a permisos; permisos preceden a onboarding/app.
  - Sin solicitudes push automáticas tras omitir o rechazar; refrescar al volver de ajustes.
  - Dependencia: paso 2. Verificar regresiones de rutas y cambio de cuenta.
- [x] 4. Documentar el paso 3 en `App/README.md`.
  - Explicar permisos necesarios/opcionales, rechazo, persistencia y diferencias de plataforma.
  - Dependencia: paso 3. Ejecutar verificador de documentación.
- [x] 5. Verificar y revisar el cambio completo.
  - [x] `npm test`: 83 pruebas aprobadas.
  - [x] `npm run type-check`: sin errores.
  - [x] `python docs/verificar_documentacion.py`: sin errores.
  - [x] Configuración nativa generada: escaneo con `neverForLocation`, ubicación disponible,
    sin micrófono; no se han generado ni reemplazado proyectos nativos.
  - [x] Exportación JavaScript Android con `expo export --platform android --no-bytecode`:
    correcta. Es una validación de empaquetado, no una compilación nativa de producción.
  - Dependencia: pasos 2–4. Confirmar que otras pantallas no se modificaron.

## Punto para retomar

Pasos 1–5 terminados. Pruebas, TypeScript, manifiesto, documentación y exportación JavaScript
ya verificados tras integrar los avances del usuario (animaciones, háptica y cliente de desarrollo).
Queda pendiente la validación de permisos en dispositivo de la sección siguiente.
Para la siguiente etapa, seguir el plan de Ajustes y retirada de mapas al final de este archivo.
Hay cambios previos de autenticación/UI en el árbol de trabajo: conservarlos.
No hay teléfono/emulador conectado; los diálogos reales de Android/iOS requieren
validación posterior en dispositivo. La ejecución de Hermes puede fallar con `spawn EPERM`.

## Validación pendiente en dispositivo

- [ ] Reconstruir e instalar el cliente nativo para aplicar los permisos de configuración.
- [ ] Android 12+: Bluetooth concedido con ubicación rechazada; Android anterior: permiso
  de ubicación necesario para escanear. Probar también ubicación aproximada.
- [ ] iOS: primera solicitud Bluetooth, radio apagada, rechazo y autorización en Ajustes.
- [ ] Rechazar cámara/notificaciones, continuar y comprobar que no hay otro diálogo automático.
- [ ] Regresar de Ajustes, reiniciar, cambiar de cuenta y abrir una recuperación.

## Decisiones acordadas para Ajustes

| Submenú o acción | Alcance acordado |
| --- | --- |
| Mi perfil | Nombre, correo y estado real de verificación, cambio de contraseña y seguridad de la cuenta. |
| Mis dispositivos | Equipos vinculados, selección, estado, rol y acceso a sus detalles. |
| Notificaciones | Interruptores por categoría existente: agronómicas, equipo, clima y sincronización. Diferenciar preferencias de autorización del sistema. |
| Actualizaciones | Exclusivamente firmware del ESP32. Descripción de novedades, requisitos, instrucciones, progreso real, resultado e interrupciones. No incluye actualizaciones de la app. |
| Idioma | Español e inglés, con persistencia coherente. |
| Apariencia | Claro, oscuro y seguir el sistema. Mantener la paleta actual y documentar cualquier cambio justificado. |
| Permisos del teléfono | Estado real de Bluetooth, ubicación, cámara y notificaciones; explicación transparente del uso de cada uno; solicitud o acceso a Ajustes del teléfono. |
| Datos y sincronización | Mediciones pendientes, estado y fecha del último envío, errores y reintento. Útil antes de cerrar sesión o entregar un equipo. |
| Administración del equipo | Miembros, solicitudes y transferencia de administración. Visible sólo para el administrador del equipo correspondiente. |
| Contacto | Abrir el cliente de correo con destinatario, asunto y mensaje predeterminados; alternativa para copiar el correo. El envío lo realiza el usuario. |
| Acerca de y privacidad | Versión, términos y aviso de privacidad. |
| Cerrar sesión | Acción separada al final de Ajustes, con tono rojizo y contraste accesible. |

Eliminar la configuración del campo de Ajustes. No eliminar por ello datos del campo
que sigan siendo necesarios en otras funciones.

### Contacto

Destinatario indicado: `akurasoporte@gmail.com`, confirmado por el usuario.

Asunto propuesto: «Soporte TerraSense».
Mensaje propuesto: «Hola, equipo de soporte. Necesito ayuda con TerraSense.
Descripción del problema: … Pasos que realicé: … Gracias.»
No adjuntar mediciones, credenciales ni datos personales automáticamente.

### Administración y preparación para otro propietario

- La administración es por equipo. Transferirla elimina los privilegios del administrador
  anterior sobre ese equipo; la autorización debe aplicarse también en el servidor.
- «Preparar equipo para otro propietario» será la última opción del submenú,
  visualmente diferenciada de las acciones habituales.
- Exigir al menos dos confirmaciones: primera con resumen explícito del equipo y de todos
  los datos/accesos afectados; segunda con confirmación inequívoca y reautenticación
  del administrador. Verificar autorización nuevamente al ejecutar.
- El usuario decidió no conservar el historial de mediciones del equipo al prepararlo
  para otro propietario. Explicar la eliminación antes de confirmar; no afectar otros equipos.
- Definir y verificar el borrado de mediciones remotas y locales, colas pendientes,
  vínculos, solicitudes y configuración del equipo. Impedir que una cola antigua vuelva
  a subir datos borrados. Contemplar otros teléfonos y copias sin conexión.
- Mantener intacto el firmware. Distinguir limpieza de datos del servidor/app de un
  restablecimiento físico de configuración: este último necesita soporte del ESP32.
- No mostrar éxito hasta comprobar las operaciones necesarias; definir recuperación
  ante fallos parciales y el mecanismo de alta del nuevo propietario.

### Permisos y firmware: límites que debe respetar la interfaz

Los controles deben reflejar permisos reales. No simular con un interruptor que la app
puede revocar permisos del sistema: cuando corresponda, abrir Ajustes y refrescar el
estado al regresar. Explicar Bluetooth para conexión, cámara para QR, notificaciones
para avisos y ubicación únicamente según los usos que sigan vigentes tras quitar mapas.

No hay código fuente del firmware ESP32 en este repositorio. Antes de implementar
la instalación, verificar el protocolo y la capacidad de actualización del equipo,
origen e integridad del firmware, compatibilidad, requisitos de batería/conexión y
recuperación ante interrupciones. Sin ese contrato, el centro debe indicar honestamente
que la instalación no está disponible; no usar barras simuladas ni dar OTA por existente.

## Plan pendiente, en orden de implementación

- [x] 1. Revisar el estado actual de los archivos y preservar cambios concurrentes.
  - Auditar navegación de Ajustes, perfil, dispositivos y permisos por equipo.
  - Revisar migraciones/RLS y servicios para transferencia, borrado y sincronización.
  - Inventariar todas las superficies de mapas y dependencias antes de retirarlas.
  - Resolver el destinatario de soporte y disponibilidad del contrato de firmware.
- [x] 2. Organizar Ajustes como índice de submenús.
  - Retirar configuración del campo; corregir retorno al origen y cierre inesperado al perder foco.
  - Guardar preferencias con control de errores y evitar escrituras concurrentes desordenadas.
  - Aplicar idioma y apariencia coherentemente; separar Cerrar sesión al final.
- [x] 3. Completar Mi perfil y Mis dispositivos.
  - Mostrar datos reales de cuenta/verificación y permitir editar nombre/cambiar contraseña.
  - Revisar estados vacíos, carga, error, selección obsoleta y bloqueo de acciones duplicadas.
  - Mantener invitaciones temporales coherentes con los permisos y roles reales.
- [x] 4. Implementar Notificaciones, Permisos y Datos y sincronización.
  - Persistir cada preferencia y respetarla en los puntos de emisión correspondientes.
  - No solicitar permisos inesperadamente al entrar o cambiar idioma.
  - Mostrar estado real de permisos, explicación y acceso al sistema.
  - Mostrar pendientes y último envío real; gestionar fallos y cierre de sesión sin pérdida silenciosa.
- [ ] 5. Completar Administración del equipo.
  - [x] Miembros y solicitudes con autorización del servidor.
  - [x] Transferencia y salida de administración al delegar; autorización por equipo en servidor.
  - [x] Preparación al final, doble confirmación, reautenticación y migración de borrado.
  - [x] Aplicar la migración en base de pruebas: aplicada el 20-09-2026 sobre PostgreSQL 17.6
    en contenedor, hasta `COMMIT` y sin errores. Todas sus dependencias existían.
  - [x] Rechazo de sincronización antigua verificado contra PostgreSQL: una medición con la
    generación anterior se rechaza con `TS001`, y con la generación nueva se acepta.
  - [ ] Probar fallos parciales y reintentos: pendiente, requiere simular caídas a mitad del
    borrado.
- [ ] 6. Crear el centro de actualizaciones del firmware ESP32.
  - [x] Consulta del catálogo real por equipo y notas de versión; instalación no disponible, explícita.
  - [ ] Descarga, transferencia, instalación, verificación y progreso real: necesitan contrato ESP32.
  - Implementar progreso real e instrucciones; instalación pendiente del contrato del firmware.
- [x] 7. Añadir Contacto y Acerca de y privacidad.
  - Correo con texto predeterminado y alternativa si no hay cliente disponible.
  - Versión real y documentos/enlaces válidos; no inventar términos ni avisos existentes.
- [x] 8. Eliminar mapas de toda la app conservando el historial.
  - Retirar pantallas, rutas, pestañas, botones, vistas de resultados y componentes cartográficos.
  - Retirar dependencias sólo cuando dejen de tener consumidores.
  - Conservar mediciones de todas las etapas y acceso a sus detalles sin mapa.
  - Mantener ubicación cuando sea necesaria para BLE o clima; quitar mapas no implica
    eliminar automáticamente GPS o datos de medición.
  - Reubicar cualquier sincronización que dependa actualmente de abrir el mapa.
- [ ] 9. Documentar y verificar el resultado.
  - [x] Actualizar README: submenús, autorización, borrado, firmware disponible y ausencia de mapas.
  - [x] Documentar decisiones visuales, límites del hardware y pendientes reales.
  - [x] Pruebas: 85 aprobadas, incluidas generación y aislamiento de cachés al borrar.
  - [x] TypeScript aprobado.
  - [x] Exportación JavaScript Android sin bytecode: 1.584 módulos, correcta; no equivale a compilación nativa.
  - [x] Verificador documental estándar: 13 documentos, 308 enlaces, 11 diagramas, 0 errores.
    Desbloqueado el 20-09-2026: los 25 bytes en cp1252 de `PCB/README.md` se reescribieron a UTF-8
    sin alterar el texto, en la sección del módulo transceptor RS-485 añadida por el trabajo de PCB.
  - Validar navegación, temas, idiomas, accesibilidad, permisos reales y aislamiento entre cuentas.
  - [x] Retirar rutas/pantallas/componentes y dependencia react-native-maps; conservar filtros y detalle.
  - [ ] Probar historial completo y controles en dispositivo.

## Verificación de la migración contra PostgreSQL (20-09-2026)

Aplicada sobre PostgreSQL 17.6 en contenedor, partiendo del volcado `supabase/schema.sql`,
que todavía no contiene `data_generation` y sirve como estado previo.

| Comprobación | Resultado |
| --- | --- |
| La migración aplica completa | Sin errores hasta `COMMIT` |
| Columnas `data_generation` | Presentes en `devices` y `soil_measurements`, `NOT NULL DEFAULT 0` |
| Disparadores | `trg_measurement_generation` y `trg_protect_device_generation` creados |
| `SECURITY DEFINER` | Correcto: lo tienen las funciones que deben, y `protect_device_generation` no |
| RLS de `device_data_resets` | Activa, política sólo de lectura, `anon` sin permisos |
| Medición con la generación vigente | Aceptada |
| Medición con la generación anterior | **Rechazada con `TS001`** |
| Medición con la generación nueva | Aceptada |
| Cliente intentando cambiar `data_generation` | Bloqueado: RLS de `devices` corta el `UPDATE` antes del disparador; el valor no cambia |

Pendiente de esta migración: fallos parciales y reintentos, que exigen simular caídas a
mitad del borrado, y su aplicación remota.

### `supabase start` no puede reconstruir la base desde cero

Hallazgo independiente, **anterior a este trabajo**. Las dos migraciones de línea base
`20260825000000_remote_baseline.sql` y `20260825020000_remote_baseline.sql` son marcadores
vacíos, sin DDL: el esquema real se creó directamente en el proyecto remoto y nunca quedó
en una migración. Los propios archivos lo advierten.

Por eso `supabase start` falla siempre en la tercera migración con
`relation "public.soil_measurements" does not exist`, y seguirá fallando: no es un defecto
de la migración nueva. Para probar migraciones en local hay que cargar antes
`supabase/schema.sql`, que es lo que se hizo aquí.

En Windows, además, el rango de puertos 54239-54338 puede estar reservado por el sistema y
chocar con los puertos por defecto de Supabase; se libera con `net stop winnat` y
`net start winnat` desde una consola de administrador.

## Próximo punto de continuidad

Los submenús y la retirada de mapas están implementados localmente. Se conservó la paleta.
El selector de campos se trasladó al historial para no perder acceso a mediciones de otros
campos al eliminar el mapa. Contacto usa el correo confirmado `akurasoporte@gmail.com`.

La revisión independiente identificó y se corrigió el riesgo de reclamar un equipo borrado
con su código permanente: la nueva migración bloquea esa reclamación y exige intervención
de soporte hasta disponer de una prueba de posesión física del firmware. La app lo explica
antes de borrar. El restablecimiento no modifica firmware ni limpia memoria física del ESP32.

Retomar con:
1. ~~Aplicar y probar la migración en base de pruebas~~: hecho el 20-09-2026. Sigue
   **sin aplicarse remotamente**. Resultado de la verificación local, con detalle abajo.
   Incluye columnas nuevas requeridas por la app, generación de datos, invalidación de
   copias, preparación por administrador, protección de reclamación y retirada de pushes
   de firmware. El borrado del panel de soporte también incrementa la generación.
2. Validar autorización, contraseña reciente, código, transferencia, concurrencia,
   borrado, reintentos, otros equipos y limpieza de teléfonos al reconectar.
3. Reconstruir cliente nativo y probar submenús, temas, idiomas, regreso de Ajustes,
   correo, historial y los casos de permisos pendientes de la etapa inicial.
4. Obtener el protocolo del firmware para implementar instalación con progreso real
   y, por separado, borrado físico de configuración sin modificar el firmware.
5. ~~Resolver la codificación de PCB/README.md~~: resuelto el 20-09-2026. Los bytes en cp1252
   se convirtieron a UTF-8 conservando el contenido; el verificador estándar vuelve a pasar.

No marcar instalación ESP32, borrado físico, migración desplegada ni pruebas en teléfono
como completados. Los textos legales ya identifican responsable, contacto y plazo de
conservación, pero el borrado automático al mes que anuncian sigue sin implementarse.
