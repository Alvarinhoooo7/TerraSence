-- =============================================================================
-- TERRASENSE — PREFERENCIAS DE APLICACIÓN PERSISTENTES POR CUENTA
-- =============================================================================
-- JSONB permite añadir nuevas categorías sin una migración por interruptor.
-- La app mezcla este objeto con sus valores por defecto para tolerar perfiles
-- creados por versiones anteriores y futuras claves todavía desconocidas.

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS app_preferences JSONB NOT NULL DEFAULT
    '{
      "language": "es",
      "theme": "system",
      "measurement_system": "metric",
      "notifications": {
        "agronomic": true,
        "device": true,
        "weather": true,
        "sync": false
      },
      "guides_seen": {}
    }'::JSONB;

DO $$ BEGIN
    ALTER TABLE public.profiles
        ADD CONSTRAINT profiles_app_preferences_object_check
        CHECK (
            jsonb_typeof(app_preferences) = 'object'
            AND COALESCE(app_preferences->>'language', 'es') IN ('es', 'en')
            AND COALESCE(app_preferences->>'theme', 'system') IN ('system', 'light', 'dark')
            AND COALESCE(app_preferences->>'measurement_system', 'metric') IN ('metric', 'imperial')
            AND jsonb_typeof(COALESCE(app_preferences->'notifications', '{}'::JSONB)) = 'object'
            AND jsonb_typeof(COALESCE(app_preferences->'guides_seen', '{}'::JSONB)) = 'object'
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON COLUMN public.profiles.app_preferences IS
    'Preferencias multiplataforma de TerraSense: idioma, tema, sistema de '
    'medición, categorías de notificación y guías ya vistas.';
