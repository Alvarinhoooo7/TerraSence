import contextlib
import io
import json
import unittest
from unittest.mock import patch

import configurar_codigos as config


class ConfigurarCodigosTests(unittest.TestCase):
    def test_payload_no_contiene_credenciales_ni_urls(self):
        desired = config.desired_config()
        self.assertEqual(set(desired), {
            "mailer_autoconfirm", "mailer_otp_exp", "mailer_otp_length", "smtp_max_frequency",
            "mailer_subjects_confirmation", "mailer_subjects_recovery",
            "mailer_templates_confirmation_content", "mailer_templates_recovery_content",
        })
        self.assertEqual(desired["mailer_otp_length"], 6)
        self.assertEqual(desired["mailer_otp_exp"], 600)
        self.assertFalse(desired["mailer_autoconfirm"])
        for kind in ("confirmation", "recovery"):
            content = desired[f"mailer_templates_{kind}_content"]
            self.assertIn("{{ .Token }}", content)
            self.assertNotIn("ConfirmationURL", content)

    def run_fake(self, apply=False, hook=False):
        calls = []
        desired = {"mailer_otp_exp": 600}
        before = {"mailer_otp_exp": 3600, "smtp_host": "smtp.example.com", "smtp_pass": "private", "hook_send_email_enabled": hook}

        def request(req, **kwargs):
            calls.append(req)
            result = {**before, **desired} if len(calls) >= 2 else before
            return io.BytesIO(json.dumps(result).encode())

        with patch.object(config, "desired_config", return_value=desired), \
             patch.object(config.Path, "read_text", return_value="bjmhjatykqccksddgtmo"), \
             patch.dict(config.os.environ, {"SUPABASE_ACCESS_TOKEN": "sbp_test"}), \
             patch("sys.argv", ["script", *(["--apply"] if apply else [])]), \
             patch.object(config.urllib.request, "urlopen", side_effect=request), \
             contextlib.redirect_stdout(io.StringIO()):
            if hook:
                with self.assertRaisesRegex(ValueError, "hook"):
                    config.main()
            else:
                config.main()
        return calls

    def test_por_defecto_solo_lee(self):
        calls = self.run_fake()
        self.assertEqual([req.method for req in calls], ["GET"])

    def test_aplica_solo_diferencias_y_verifica_con_get(self):
        calls = self.run_fake(apply=True)
        self.assertEqual([req.method for req in calls], ["GET", "PATCH", "GET"])
        self.assertEqual(json.loads(calls[1].data), {"mailer_otp_exp": 600})

    def test_no_modifica_si_un_hook_controla_los_correos(self):
        self.assertEqual([req.method for req in self.run_fake(apply=True, hook=True)], ["GET"])


if __name__ == "__main__":
    unittest.main()
