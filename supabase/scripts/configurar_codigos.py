"""Actualiza solo los correos de códigos y sus límites, preservando SMTP y el resto de Auth.

Uso desde la raíz: python supabase/scripts/configurar_codigos.py [--apply]
Sin --apply solo contrasta los valores remotos; nunca imprime credenciales.
"""
import argparse
import json
import os
from pathlib import Path
import tomllib
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[2]


def desired_config():
    config = tomllib.loads((ROOT / "supabase/config.toml").read_text(encoding="utf-8"))
    email = config["auth"]["email"]
    patch = {
        "mailer_autoconfirm": not email["enable_confirmations"],
        "mailer_otp_exp": email["otp_expiry"],
        "mailer_otp_length": email["otp_length"],
        "smtp_max_frequency": int(email["max_frequency"].removesuffix("s")),
    }
    for kind in ("confirmation", "recovery"):
        template = email["template"][kind]
        content = (ROOT / template["content_path"]).read_text(encoding="utf-8")
        if "{{ .Token }}" not in content or "ConfirmationURL" in content:
            raise ValueError(f"La plantilla {kind} debe contener el código y no un enlace de acción.")
        patch[f"mailer_subjects_{kind}"] = template["subject"]
        patch[f"mailer_templates_{kind}_content"] = content
    return patch


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    patch = desired_config()
    project = (ROOT / "supabase/.temp/project-ref").read_text().strip()
    if project != "bjmhjatykqccksddgtmo":
        raise ValueError("El proyecto vinculado no es TerraSense; no se modifica nada.")
    token = os.environ.get("SUPABASE_ACCESS_TOKEN", "").strip()
    if not token:
        token_file = Path.home() / ".supabase/access-token"
        if token_file.is_file():
            token = token_file.read_text().strip()
    if not token.startswith("sbp_"):
        raise ValueError("Define SUPABASE_ACCESS_TOKEN con un token personal de Supabase. No uses anon ni service_role.")
    endpoint = f"https://api.supabase.com/v1/projects/{project}/config/auth"

    def request(method="GET", payload=None):
        req = urllib.request.Request(endpoint, method=method,
            data=json.dumps(payload).encode() if payload is not None else None,
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                return json.load(response)
        except urllib.error.HTTPError as error:
            raise RuntimeError(f"Supabase respondió HTTP {error.code}; no se imprime el cuerpo por seguridad.") from None
        except urllib.error.URLError:
            raise RuntimeError("No se pudo conectar a Supabase. Revisa la conexión y el proxy.") from None

    before = request()
    if before.get("hook_send_email_enabled"):
        raise ValueError("Hay un hook de correo activo: revisar su implementación antes de cambiar plantillas.")
    if not before.get("smtp_host"):
        raise ValueError("Configura SMTP propio antes de publicar las plantillas personalizadas.")
    changes = [key for key, value in patch.items() if before.get(key) != value]
    print("Proyecto:", project)
    print("Campos pendientes:", ", ".join(changes) or "ninguno")
    if args.apply and changes:
        request("PATCH", {key: patch[key] for key in changes})
        after = request()
        if any(after.get(key) != value for key, value in patch.items()):
            raise RuntimeError("La verificación remota no coincide con la configuración esperada.")
        for key in ("smtp_host", "smtp_port", "smtp_user", "smtp_admin_email", "smtp_sender_name", "site_url", "uri_allow_list"):
            if before.get(key) != after.get(key):
                raise RuntimeError(f"Se detectó un cambio concurrente en {key}; revisar la configuración remota.")
        print("Códigos configurados y verificados. SMTP y URLs conservados.")
    elif changes:
        print("Solo lectura. Ejecuta con --apply después de publicar los clientes compatibles con códigos.")
    else:
        print("La configuración remota ya coincide.")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, RuntimeError, OSError) as error:
        print(f"No se completó la configuración: {error}")
        raise SystemExit(1) from None
