from __future__ import annotations

import os
import secrets
import subprocess
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

from app.core.config import Settings


class ConfigurationSecurityTest(unittest.TestCase):
    def setUp(self) -> None:
        environment = patch.dict(os.environ, {}, clear=True)
        environment.start()
        self.addCleanup(environment.stop)

    def test_validation_errors_do_not_echo_sensitive_input(self) -> None:
        marker = secrets.token_urlsafe(24)
        for inputs in (
            {"llm_api_key": marker, "runtime_mode": "live"},
            {"demo_access_codes": {"student_demo": [marker]}},
        ):
            with self.subTest(field=next(iter(inputs))):
                with self.assertRaises(ValueError) as caught:
                    Settings(_env_file=None, **inputs)
                self.assertNotIn(marker, str(caught.exception))

    def test_empty_keys_are_rejected_only_when_live_is_selected(self) -> None:
        for key in ("", "   ", "\t\n"):
            with (
                self.subTest(length=len(key)),
                self.assertRaisesRegex(ValueError, "LLM_API_KEY"),
            ):
                Settings(
                    _env_file=None,
                    runtime_mode="live",
                    llm_api_key=key,
                    llm_model="mock-chat-model",
                    embedding_model="mock-embedding-model",
                )
        self.assertEqual(
            Settings(_env_file=None, runtime_mode="offline_demo").runtime_mode,
            "offline_demo",
        )

    def test_startup_stderr_does_not_echo_provider_key(self) -> None:
        marker = secrets.token_urlsafe(24)
        result = subprocess.run(
            [
                sys.executable,
                "-c",
                (
                    "from app.core.config import Settings; "
                    "Settings.model_config['env_file'] = None; "
                    "import app.main"
                ),
            ],
            env={
                "PYTHONPATH": str(Path(__file__).resolve().parents[1]),
                "RUNTIME_MODE": "live",
                "LLM_API_KEY": marker,
            },
            capture_output=True,
            check=False,
            text=True,
            timeout=15,
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("live runtime configuration", result.stderr)
        self.assertNotIn(marker, result.stdout + result.stderr)
