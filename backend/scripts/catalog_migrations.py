from __future__ import annotations

from copy import deepcopy
from typing import Any

from app.db.models import CurriculumScenario
from sqlalchemy import update
from sqlalchemy.orm import Session

# Exact defaults shipped before the authored teaching feedback was restored.
# Keep these frozen: customized text or practice semantics must never be replaced.
LEGACY_FEEDBACK: dict[str, dict[str, Any]] = {
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


def upgrade_legacy_curriculum_feedback(
    session: Session, scenarios: list[dict[str, Any]]
) -> int:
    """Upgrade catalog text only; conversations and their snapshots are immutable."""
    changed_rows = 0
    for scenario in scenarios:
        legacy = LEGACY_FEEDBACK.get(scenario["id"])
        if legacy is None:
            continue
        row = session.get(CurriculumScenario, scenario["id"])
        if row is None or not row.demo or row.topic != scenario["topic"]:
            continue
        current = row.answer_payload
        replacement = deepcopy(current)
        authored = scenario["answer_payload"]
        if current.get("analogy") == legacy["analogy"]:
            replacement["analogy"] = authored["analogy"]
        practice = current.get("practice")
        # The old explanation alone is insufficient if a user edited the question,
        # options or correct choice while leaving that explanation in place.
        if (
            isinstance(practice, dict)
            and type(practice.get("answer_index")) is int
            and all(
                practice.get(key) == value for key, value in legacy["practice"].items()
            )
        ):
            replacement["practice"]["explanation"] = authored["practice"]["explanation"]
        if replacement == current:
            continue
        # Compare the full old JSON to avoid overwriting an intervening catalog edit.
        result = session.execute(
            update(CurriculumScenario)
            .where(
                CurriculumScenario.id == row.id,
                CurriculumScenario.answer_payload == current,
            )
            .values(answer_payload=replacement)
            .execution_options(synchronize_session=False)
        )
        if result.rowcount:
            changed_rows += 1
            session.expire(row, ["answer_payload", "updated_at"])
    return changed_rows
