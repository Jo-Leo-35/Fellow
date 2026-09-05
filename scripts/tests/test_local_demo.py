"""Regression checks for launcher state and startup failure handling."""

import argparse
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch, Mock

spec = importlib.util.spec_from_file_location("local_demo", Path(__file__).parents[1] / "local-demo.py")
demo = importlib.util.module_from_spec(spec)
spec.loader.exec_module(demo)

env_spec = importlib.util.spec_from_file_location(
    "create_demo_env", Path(__file__).parents[1] / "create-demo-env.py"
)
create_env = importlib.util.module_from_spec(env_spec)
env_spec.loader.exec_module(create_env)


class LauncherTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        for name, value in {"ROOT": self.root, "RUNTIME": self.root / "runtime",
                            "STATE_FILE": self.root / "runtime" / "processes.json"}.items():
            replacement = patch.object(demo, name, value)
            replacement.start()
            self.addCleanup(replacement.stop)
        demo.RUNTIME.mkdir()

    def state(self, value):
        demo.STATE_FILE.write_text(json.dumps(value))

    def test_partial_state_is_not_reported_as_running(self):
        self.state({"backend": 123, "port": 45465})
        with patch.object(demo, "process_is_ours", return_value=True), patch.object(demo, "healthy", return_value=True):
            self.assertEqual(demo.active_state(), {"backend": 123})
            self.assertEqual(demo.status(quiet=True), 1)
            with self.assertRaisesRegex(RuntimeError, "restart"):
                demo.start(argparse.Namespace())

    def test_pid_reuse_is_rejected(self):
        self.state({"backend": 123, "started": {"backend": "old"}})
        with patch.object(demo, "process_is_ours", return_value=True), patch.object(demo, "process_start_time", return_value="new"):
            self.assertEqual(demo.active_state(), {})

    def test_relocated_process_is_recognized_by_current_working_directory(self):
        arguments = [
            "/old/location/.venv/bin/python",
            "-m",
            "uvicorn",
            "app.main:app",
            "--port",
            "45466",
        ]
        with (
            patch.object(demo, "pid_arguments", return_value=arguments),
            patch.object(demo, "process_cwd", return_value=self.root),
            patch.object(demo.os, "getpgid", return_value=123),
            patch.object(demo.os, "getsid", return_value=123),
        ):
            self.assertTrue(demo.process_is_ours(123, "backend"))

    def test_copied_state_does_not_claim_process_from_old_checkout(self):
        arguments = [
            "/old/location/.venv/bin/python",
            "-m",
            "uvicorn",
            "app.main:app",
            "--port",
            "45466",
        ]
        with (
            patch.object(demo, "pid_arguments", return_value=arguments),
            patch.object(demo, "process_cwd", return_value=Path("/old/location")),
            patch.object(demo.os, "getpgid", return_value=123),
            patch.object(demo.os, "getsid", return_value=123),
        ):
            self.assertFalse(demo.process_is_ours(123, "backend"))

    def test_stop_refuses_live_unverified_pid_and_preserves_state(self):
        self.state({"backend": 123})
        with (
            patch.object(demo, "active_state", return_value={}),
            patch.object(demo, "pid_arguments", return_value=["unrelated-process"]),
            patch.object(demo.os, "killpg") as kill,
        ):
            with self.assertRaisesRegex(RuntimeError, "無法安全辨識"):
                demo.stop_processes(quiet=True)
        kill.assert_not_called()
        self.assertTrue(demo.STATE_FILE.exists())

    def test_legacy_state_remains_readable(self):
        self.state({"backend": 123, "frontend": 456, "port": 45465})
        with patch.object(demo, "process_is_ours", return_value=True):
            self.assertEqual(len(demo.active_state()), 2)

    def test_custom_ports_are_used_for_health(self):
        self.state({"backend": 123, "frontend": 456, "port": 49001, "backend_port": 49002})
        with patch.object(demo, "process_is_ours", return_value=True), patch.object(demo, "healthy", return_value=True) as health:
            self.assertEqual(demo.status(quiet=True), 0)
            self.assertEqual({c.args[0] for c in health.call_args_list},
                             {"http://127.0.0.1:49001/health", "http://127.0.0.1:49002/health"})

    def test_html_is_not_api_health(self):
        response = Mock(status=200)
        response.headers.get_content_type.return_value = "text/html"
        response.__enter__ = Mock(return_value=response)
        response.__exit__ = Mock(return_value=False)
        with patch.object(demo, "urlopen", return_value=response):
            self.assertFalse(demo.healthy("http://127.0.0.1/health"))

    def test_explicit_missing_env_is_not_created(self):
        with patch.object(demo, "run") as run:
            with self.assertRaises(RuntimeError):
                demo.ensure_env(self.root / "typo.env", 45465)
            run.assert_not_called()

    def test_existing_env_is_preserved(self):
        env = self.root / ".env"
        env.write_text("RUNTIME_MODE=offline_demo\n")
        with patch.object(demo, "run") as run:
            demo.ensure_env(env, 45465)
            run.assert_not_called()

    def test_parallel_lifecycle_operation_is_rejected(self):
        with demo.lifecycle_lock():
            with self.assertRaisesRegex(RuntimeError, "另一個"):
                with demo.lifecycle_lock():
                    self.fail("second lock succeeded")

    def test_restart_keeps_ports_and_configuration(self):
        self.state({"port": 49001, "backend_port": 49002, "env_file": str(self.root / "custom.env")})
        with patch("sys.argv", ["local-demo.py", "restart", "--skip-build"]):
            args = demo.parse_args()
        self.assertEqual((args.port, args.backend_port), (49001, 49002))
        self.assertEqual(args.env_file, self.root / "custom.env")
        self.assertTrue(args.skip_build)

    def test_restart_rebases_project_env_after_repository_move(self):
        self.state({
            "project_root": "/old/location",
            "env_file": "/old/location/config/demo.env",
        })
        with patch("sys.argv", ["local-demo.py", "restart"]):
            args = demo.parse_args()
        self.assertEqual(args.env_file, self.root / "config" / "demo.env")

    def test_restart_does_not_rebase_external_env(self):
        self.state({
            "project_root": "/old/location",
            "env_file": "/private/futureai/demo.env",
        })
        with patch("sys.argv", ["local-demo.py", "restart"]):
            args = demo.parse_args()
        self.assertEqual(args.env_file, Path("/private/futureai/demo.env"))

    def test_restart_explicit_env_overrides_saved_path(self):
        self.state({"env_file": "config/saved.env"})
        with patch(
            "sys.argv",
            ["local-demo.py", "restart", "--env-file", "config/override.env"],
        ):
            args = demo.parse_args()
        self.assertEqual(args.env_file, self.root / "config" / "override.env")

    def test_relative_env_argument_is_resolved_from_project_root(self):
        with patch("sys.argv", ["local-demo.py", "start", "--env-file", "config/demo.env"]):
            args = demo.parse_args()
        self.assertEqual(args.env_file, self.root / "config" / "demo.env")

    def test_state_stores_project_env_as_relocatable_path(self):
        env_file = self.root / "config" / "demo.env"
        args = argparse.Namespace(port=49001, backend_port=49002, env_file=env_file)
        with patch.object(demo, "process_start_time", return_value="100"):
            demo.save_state({"backend": 123}, args)
        state = json.loads(demo.STATE_FILE.read_text())
        self.assertEqual(state["version"], demo.STATE_VERSION)
        self.assertEqual(state["project_root"], str(self.root))
        self.assertEqual(state["env_file"], "config/demo.env")

    def test_skip_build_requires_existing_artifact(self):
        args = argparse.Namespace(port=45465, backend_port=45466, env_file=self.root / ".env", skip_build=True)
        args.env_file.write_text("RUNTIME_MODE=offline_demo\n")
        with patch.object(demo, "port_is_free", return_value=True), patch.object(demo, "ensure_dependencies") as dependencies:
            with self.assertRaisesRegex(RuntimeError, "尚無前端"):
                demo.start(args)
            dependencies.assert_not_called()


class CreateEnvTests(unittest.TestCase):
    def test_default_output_uses_project_root_not_caller_directory(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        base = Path(temporary.name)
        project_root = base / "relocated-project"
        caller = base / "caller"
        project_root.mkdir()
        caller.mkdir()
        (project_root / ".env.example").write_text(
            "WEB_PORT=8080\n"
            "DEMO_ACCESS_CODES=\n"
            "FRONTEND_ORIGIN=http://localhost:8080\n",
            encoding="utf-8",
        )

        original_cwd = Path.cwd()
        try:
            os.chdir(caller)
            with (
                patch.object(create_env, "PROJECT_ROOT", project_root),
                patch.object(create_env.secrets, "token_urlsafe", return_value="test"),
                patch("sys.argv", ["create-demo-env.py"]),
            ):
                create_env.main()
        finally:
            os.chdir(original_cwd)

        self.assertTrue((project_root / ".env").is_file())
        self.assertFalse((caller / ".env").exists())


if __name__ == "__main__":
    unittest.main()
