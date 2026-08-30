# Guardián de GitHub y backups

## Protección en cada cambio

El workflow `Guardian` se ejecuta en cada push y pull request. Sus checks son:

- `Secret scan`: Gitleaks revisa el historial alcanzable buscando credenciales.
- `Repository policy`: rechaza `.env`, llaves privadas y archivos de firma.
- `Mobile app`: instalación reproducible, auditoría npm, pruebas, TypeScript y
  `expo-doctor`.
- `Web console`: instalación reproducible, auditoría npm, TypeScript y build.

Dependabot revisa semanalmente App, Web y las propias GitHub Actions. Las
Actions están fijadas a SHA completos para impedir que una etiqueta mutable
cambie el código ejecutado.

## Backup diario de Supabase

`Supabase daily backup` corre diariamente a las 05:17 UTC y también se puede
ejecutar manualmente desde Actions. Genera por separado roles, esquema y datos,
crea un `tar.gz` con checksum SHA-256 y lo conserva como artefacto privado por
7 días. El dump no se agrega al historial Git.

Antes de su primera ejecución hay que crear el Secret del repositorio
`SUPABASE_DB_URL` con una URL de conexión de sesión que incluya la contraseña
de la base. Para evitar que la URL quede en el historial de PowerShell:

```powershell
gh secret set SUPABASE_DB_URL --repo Alvarinhoooo7/TerraSence
```

El comando solicita el valor de forma interactiva. La URL se obtiene en
Supabase Dashboard → Connect. Debe usarse la conexión directa o el pooler en
modo sesión (puerto 5432), no el pooler transaccional.

Los backups lógicos de Postgres no contienen los objetos binarios de Supabase
Storage; sólo contienen sus metadatos. Si TerraSense empieza a guardar firmware
u otros archivos en Storage, se necesita una segunda tarea para copiar esos
objetos a almacenamiento externo.

## Alcance real

Ningún workflow ofrece “protección total”. Estos controles reducen fugas y
regresiones, pero siguen siendo necesarios MFA en GitHub/Supabase, revisión de
alertas, rotación de secretos, pruebas de restauración y protección de la rama
principal.
