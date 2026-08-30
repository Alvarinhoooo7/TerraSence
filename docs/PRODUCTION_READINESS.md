# TerraSense — estado de preparación para producción

Última auditoría técnica: 30 de agosto de 2026.

## Controles aprobados

- App móvil: TypeScript sin errores, 18 pruebas automatizadas aprobadas y
  exportación Android completada (1.588 módulos).
- Expo: 18/18 controles de `expo-doctor` aprobados.
- Web: TypeScript y build Vite de producción aprobados.
- Dependencias App/Web: `npm audit --omit=dev` sin vulnerabilidades conocidas.
- Supabase: 18 migraciones alineadas entre local y remoto; onboarding E2E con
  12 controles aprobados.
- Edge Functions: `device-checkin` v2 y `send-push-alert` v3 desplegadas y
  activas en producción.
- Seguridad: una llamada con la clave pública a `send-push-alert` responde 401.
- Base remota: 20 MB, hit rate de tablas e índices 1,00; sin consultas
  bloqueadas ni de larga duración durante la inspección.
- Secretos y archivos `.env`: ignorados por Git; no se detectaron claves
  privadas o `service_role` versionadas.

## Correcciones aplicadas en esta auditoría

- Recuperación de contraseña móvil completa mediante
  `terrasense://reset-password`, creación de sesión desde el deep link y
  pantalla para guardar la contraseña nueva.
- Renovación automática de sesión Supabase ligada al estado foreground de
  React Native.
- `send-push-alert` ahora exige explícitamente `service_role`; antes cualquier
  JWT público válido podía activar el despacho global.
- `device-checkin` rechaza inserciones de mediciones si no existe o no coincide
  `DEVICE_INGEST_SECRET`.

## Bloqueos externos antes del lanzamiento

1. **Aplicar la URL de recuperación móvil en Auth remoto.** Está declarada en
   `supabase/config.toml`, pero `supabase config push` requiere que
   `GMAIL_APP_PASSWORD` esté presente en el entorno local para conservar la
   configuración SMTP. No guardar esa contraseña en Git.
2. **Aprovisionar telemetría Wi‑Fi sólo si se lanzará esa función.** Crear
   `DEVICE_INGEST_SECRET` en Supabase y cargar exactamente el mismo secreto de
   dispositivo en el firmware mediante un mecanismo de aprovisionamiento. Sin
   él, la ruta Wi‑Fi falla de forma segura; BLE → teléfono → Supabase funciona.
3. **Pruebas físicas obligatorias.** Ejecutar en al menos un Android real:
   permisos BLE/ubicación/cámara, lectura de la sonda, medición offline,
   sincronización posterior, deep link de recuperación y recepción de push.
4. **Build firmado de tienda.** Vincular/verificar el proyecto EAS, generar el
   AAB de `production`, instalarlo desde una pista interna de Play Console y
   repetir el smoke test. La exportación JS no sustituye la firma ni la prueba
   del binario distribuido.

La salida pública no debe declararse lista mientras los puntos 1, 3 y 4 no
tengan evidencia real. El punto 2 sólo es obligatorio si la telemetría directa
por Wi‑Fi forma parte del alcance inicial.
