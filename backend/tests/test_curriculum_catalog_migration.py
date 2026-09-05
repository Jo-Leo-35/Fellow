from __future__ import annotations

import json
import os
import secrets
import tempfile
import unittest
from copy import deepcopy
from datetime import date, timedelta
from pathlib import Path
from unittest.mock import patch

from app.core.config import Settings
from app.db.database import Database
from app.db.models import CurriculumScenario, Profile, User
from scripts.seed import load_json, seed_database
from sqlalchemy import text

# Independent fixture of the previously shipped catalog fields.
OLD_FEEDBACK = {
    "scenario-newton": {
        "analogy": "想像兩個人從相反方向、用一樣大的力拉同一個箱子。每個人都很用力，但箱子受到的合力仍可能是零。",
        "practice": {
            "question": "箱子正以等速度直線前進，它受到的合外力是多少？",
            "options": ["一定向前", "為零，因為速度沒有改變", "一定向後"],
            "answer_index": 1,
            "explanation": "等速度直線運動代表加速度為零，因此合力為零。",
        },
    },
    "scenario-thermodynamics": {
        "analogy": "把內能想成帳戶餘額，熱和功是兩種轉帳方式。",
        "practice": {
            "question": "氣體吸熱 100 J，同時對外做功 40 J，內能怎麼改變？",
            "options": ["增加 140 J", "增加 60 J", "減少 60 J"],
            "answer_index": 1,
            "explanation": "ΔU = Q − W = 100 − 40 = 60 J。",
        },
    },
    "scenario-entropy": {
        "analogy": "兩種不同理想氣體混合後可及的微觀排列遠多於完全分開時。",
        "practice": {
            "question": "冰箱中的水結冰、熵降低，是否違反第二定律？",
            "options": ["會", "不會，要連同環境一起計算總熵", "不會，因為總熵消失"],
            "answer_index": 1,
            "explanation": "計入冰箱耗電與向環境排熱後，總熵仍不減。",
        },
    },
    "scenario-equilibrium": {
        "analogy": "兩個房間每分鐘各有相同人數走向對面，房內人數可維持不變，但人仍在移動。",
        "practice": {
            "question": "已達平衡的系統加入催化劑會如何？",
            "options": ["往生成物移動", "平衡常數變大", "組成不變，正逆反應都加快"],
            "answer_index": 2,
            "explanation": "催化劑改變到達平衡的速率，不改變平衡組成。",
        },
    },
    "scenario-bonding": {
        "analogy": "沸騰像不同小組彼此散開，沒有把每一組內部牽著的手拆開。",
        "practice": {
            "question": "水沸騰成為水蒸氣時何者正確？",
            "options": [
                "分解成氫氣和氧氣",
                "分子間吸引被克服，H₂O 仍維持",
                "共價鍵都轉成氫鍵",
            ],
            "answer_index": 1,
            "explanation": "沸騰改變相態，分子內共價鍵仍維持。",
        },
    },
    "scenario-reaction-rate": {
        "analogy": "升溫像更多人具備越過山丘的能力；催化劑像提供較低的山路。",
        "practice": {
            "question": "催化劑為什麼通常能讓反應變快？",
            "options": ["提供活化能較低的路徑", "憑空增加總能量", "把粒子加熱"],
            "answer_index": 0,
            "explanation": "催化劑提供另一條較低活化能的路徑。",
        },
    },
}


class CurriculumCatalogMigrationTest(unittest.TestCase):
    def setUp(self) -> None:
        environment = patch.dict(os.environ, {}, clear=True)
        environment.start()
        self.addCleanup(environment.stop)
        directory = tempfile.TemporaryDirectory(prefix="futureai-catalog-migration-")
        self.addCleanup(directory.cleanup)
        root = Path(directory.name)
        self.database = Database(
            Settings(
                _env_file=None,
                app_env="test",
                runtime_mode="offline_demo",
                data_dir=root,
                chroma_path=root / "chroma",
                database_url=f"sqlite:///{root / 'app.db'}",
                demo_access_codes={"student_demo": secrets.token_urlsafe(32)},
            )
        )
        self.addCleanup(self.database.dispose)
        self.anchor = date(2026, 9, 5)
        self.authored = load_json("curriculum/scenarios.json")
        legacy = deepcopy(self.authored)
        for scenario in legacy:
            feedback = OLD_FEEDBACK[scenario["id"]]
            scenario["answer_payload"]["analogy"] = feedback["analogy"]
            scenario["answer_payload"]["practice"] = deepcopy(feedback["practice"])

        def old_catalog(relative_path: str) -> list[dict]:
            if relative_path == "curriculum/scenarios.json":
                return deepcopy(legacy)
            return load_json(relative_path)

        # Seed the actual old payloads into both the catalog and saved conversations.
        with patch("scripts.seed.load_json", side_effect=old_catalog):
            seed_database(self.database, self.anchor)

    def snapshot(self) -> dict[str, list[tuple]]:
        with self.database.engine.connect() as connection:
            names = list(
                connection.execute(
                    text(
                        "SELECT name FROM sqlite_master WHERE type='table' "
                        "AND name NOT LIKE 'sqlite_%'"
                    )
                ).scalars()
            )
            return {
                name: sorted(
                    (
                        tuple(row)
                        for row in connection.execute(text(f'SELECT * FROM "{name}"'))
                    ),
                    key=repr,
                )
                for name in names
            }

    def payloads(self) -> dict[str, dict]:
        with self.database.session_factory() as session:
            return {
                scenario["id"]: deepcopy(
                    session.get(CurriculumScenario, scenario["id"]).answer_payload
                )
                for scenario in self.authored
            }

    def assert_other_tables_preserved(self, before: dict, after: dict) -> None:
        for table, previous_rows in before.items():
            if table != "curriculum_scenarios":
                self.assertEqual(after[table], previous_rows, table)
        self.assertTrue(before["messages"], "History preservation needs saved messages")

    def test_old_defaults_upgrade_once_without_rewriting_history(self) -> None:
        before = self.snapshot()
        old_payloads = self.payloads()
        seed_database(self.database, self.anchor + timedelta(days=50))
        after = self.snapshot()
        upgraded = self.payloads()
        for scenario in self.authored:
            with self.subTest(scenario=scenario["id"]):
                expected = old_payloads[scenario["id"]]
                expected["analogy"] = scenario["answer_payload"]["analogy"]
                expected["practice"]["explanation"] = scenario["answer_payload"][
                    "practice"
                ]["explanation"]
                self.assertEqual(upgraded[scenario["id"]], expected)
                for key in ("question", "options", "answer_index"):
                    self.assertEqual(
                        upgraded[scenario["id"]]["practice"][key],
                        OLD_FEEDBACK[scenario["id"]]["practice"][key],
                    )
        self.assert_other_tables_preserved(before, after)
        with self.database.engine.connect() as connection:
            saved = json.loads(
                connection.execute(
                    text(
                        "SELECT structured_response FROM messages WHERE id='demo-conv-newton-assistant'"
                    )
                ).scalar_one()
            )
        self.assertEqual(
            saved["learning_answer"]["practice"]["explanation"],
            OLD_FEEDBACK["scenario-newton"]["practice"]["explanation"],
        )
        self.assertNotEqual(
            saved["learning_answer"]["practice"]["explanation"],
            upgraded["scenario-newton"]["practice"]["explanation"],
        )
        seed_database(self.database, self.anchor + timedelta(days=100))
        self.assertEqual(
            self.snapshot(), after, "Second seed must not update timestamps or data"
        )

    def test_custom_feedback_practice_semantics_and_mutable_data_are_preserved(
        self,
    ) -> None:
        with self.database.session_factory() as session, session.begin():
            for scenario in self.authored:
                row = session.get(CurriculumScenario, scenario["id"])
                payload = deepcopy(row.answer_payload)
                payload["summary"] = "保留自訂摘要"
                payload["custom_extension"] = {"nested": ["保留額外欄位"]}
                row.title = "保留自訂標題"
                if scenario["topic"] == "newton":
                    payload["analogy"] = "保留自訂類比"
                    payload["practice"]["custom_note"] = "保留練習附註"
                elif scenario["topic"] == "thermodynamics":
                    payload["practice"]["explanation"] = "保留自訂理由"
                elif scenario["topic"] == "entropy":
                    payload["practice"] = None
                elif scenario["topic"] == "equilibrium":
                    payload["practice"]["question"] = "保留自訂的新題目"
                elif scenario["topic"] == "bonding":
                    payload["practice"]["options"] = ["自訂甲", "自訂乙", "自訂丙"]
                else:
                    payload["practice"]["answer_index"] = 1
                row.answer_payload = payload
            session.get(User, "demo_student_01").nickname = "保留使用者修改"
            session.get(Profile, "profile-demo_student_01").family_type = "保留家庭資料"

        before = self.snapshot()
        old_payloads = self.payloads()
        seed_database(self.database, self.anchor)
        after = self.snapshot()
        upgraded = self.payloads()
        for scenario in self.authored:
            with self.subTest(scenario=scenario["id"]):
                expected = deepcopy(old_payloads[scenario["id"]])
                if scenario["topic"] == "newton":
                    expected["practice"]["explanation"] = scenario["answer_payload"][
                        "practice"
                    ]["explanation"]
                else:
                    expected["analogy"] = scenario["answer_payload"]["analogy"]
                self.assertEqual(upgraded[scenario["id"]], expected)
                with self.database.session_factory() as session:
                    self.assertEqual(
                        session.get(CurriculumScenario, scenario["id"]).title,
                        "保留自訂標題",
                    )
        self.assert_other_tables_preserved(before, after)
        seed_database(self.database, self.anchor)
        self.assertEqual(self.snapshot(), after)


if __name__ == "__main__":
    unittest.main()
