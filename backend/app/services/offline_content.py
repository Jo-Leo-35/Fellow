from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass
from functools import lru_cache
from typing import Literal

from pydantic import Field, TypeAdapter

from app.core.config import BACKEND_ROOT
from app.schemas.chat import LearningStepWire
from app.schemas.common import StrictModel
from app.schemas.enums import LearningTopic, ResourceCategory


class LearningFollowUpContent(StrictModel):
    question: str
    keywords: list[str]
    title: str
    summary: str
    steps: list[LearningStepWire]
    source_ids: list[str]


class LearningTopicContent(StrictModel):
    topic: LearningTopic
    follow_ups: list[LearningFollowUpContent] = Field(min_length=3, max_length=3)


class ResourceFollowUpContent(StrictModel):
    question: str
    answer: str


class ResourceCategoryContent(StrictModel):
    category: ResourceCategory
    canonical_program_id: str
    canonical_question: str
    keywords: list[str]
    follow_ups: list[ResourceFollowUpContent] = Field(min_length=3, max_length=3)
    fallback_reply: str


@dataclass(frozen=True, slots=True)
class LearningContentMatch:
    kind: Literal["overview", "follow_up"]
    follow_up: LearningFollowUpContent | None = None


@dataclass(frozen=True, slots=True)
class ResourceContentMatch:
    kind: Literal[
        "overview",
        "application",
        "documents",
        "deadline",
        "duration",
        "next_step",
        "fallback",
    ]
    authored_answer: str | None = None


@lru_cache
def learning_content() -> dict[LearningTopic, LearningTopicContent]:
    path = BACKEND_ROOT / "data/curriculum/followups.json"
    rows = TypeAdapter(list[LearningTopicContent]).validate_json(
        path.read_text(encoding="utf-8")
    )
    if len(rows) != 6:
        raise ValueError("offline learning content must contain six topics")
    return {row.topic: row for row in rows}


@lru_cache
def resource_content() -> dict[ResourceCategory, ResourceCategoryContent]:
    path = BACKEND_ROOT / "data/policies/followups.json"
    rows = TypeAdapter(list[ResourceCategoryContent]).validate_json(
        path.read_text(encoding="utf-8")
    )
    if len(rows) != 6:
        raise ValueError("offline resource content must contain six categories")
    return {row.category: row for row in rows}


def _normalize(value: str) -> str:
    normalized = unicodedata.normalize("NFKC", value).casefold()
    return "".join(
        character
        for character in normalized
        if not character.isspace()
        and unicodedata.category(character)[0] not in {"P", "S"}
    )


def _keyword_score(query: str, keywords: list[str]) -> int:
    normalized_query = _normalize(query)
    latin_tokens = set(re.findall(r"[a-z]+|\d+(?:\.\d+)?", query.casefold()))
    score = 0
    for keyword in {_normalize(value) for value in keywords}:
        if not keyword:
            continue
        present = (
            keyword in latin_tokens
            if re.fullmatch(r"[a-z]+|\d+", keyword)
            else keyword in normalized_query
        )
        if present:
            score += len(keyword) ** 2
    return score


QUESTION_WORDS = [
    "可不可以",
    "可以幫我",
    "能不能",
    "可否",
    "可以",
    "幫我",
    "請問",
    "請",
    "想了解",
    "想知道",
    "不太理解",
    "不太懂",
    "看不懂",
    "不理解",
    "不懂",
    "教我",
    "解釋一下",
    "解釋",
    "說明一下",
    "說明",
    "介紹一下",
    "介紹",
    "複習",
    "理解",
    "概念",
    "的例子",
    "生活中的例子",
    "生活例子",
    "舉例",
    "是什麼意思",
    "什麼意思",
    "是什麼",
    "為什麼",
    "怎麼理解",
    "怎麼",
    "如何",
    "有什麼",
    "什麼",
    "是不是",
    "是否",
    "會不會",
    "不會",
    "會",
    "為何",
    "有何",
    "到底",
    "真的",
    "一定",
    "通常",
    "不同",
    "差異",
    "差別",
    "關係",
    "互相",
    "彼此",
    "相同",
    "一樣",
    "之間",
    "之後",
    "的時候",
    "時",
    "現在",
    "那",
    "怎樣",
    "還",
    "也",
    "就",
    "只",
    "都",
    "能",
    "讓",
    "把",
    "被",
    "對",
    "和",
    "與",
    "跟",
    "在",
    "中",
    "有",
    "沒有",
    "不",
    "是",
    "的",
    "地",
    "得",
    "了",
    "嗎",
    "呢",
    "啊",
    "我",
    "它",
]

OVERVIEW_PHRASES = {
    LearningTopic.NEWTON: ["受力", "不一定會加速", "加速", "物體", "有力", "速度改變"],
    LearningTopic.THERMODYNAMICS: ["溫度", "區別"],
    LearningTopic.ENTROPY: ["混亂程度", "混亂", "分配方式"],
    LearningTopic.EQUILIBRIUM: [
        "反應",
        "進行",
        "停止",
        "濃度不再改變",
        "濃度不變",
        "濃度相等",
    ],
    LearningTopic.BONDING: ["分子間的吸引", "物理變化"],
    LearningTopic.REACTION_RATE: ["溫度升高", "溫度", "升溫", "變快", "決定"],
}
TOPIC_KEYWORDS = {
    LearningTopic.NEWTON: [
        "牛頓力學",
        "牛頓",
        "牛顿",
        "牛顿力学",
        "牛頓第二定律",
        "第二運動定律",
        "第一運動定律",
        "第三運動定律",
        "第一定律",
        "第二定律",
        "第三定律",
        "合力",
        "慣性",
        "加速度",
    ],
    LearningTopic.THERMODYNAMICS: [
        "熱力學第一定律",
        "熱力學",
        "热力学",
        "第一定律",
        "內能",
        "内能",
        "熱量",
        "絕熱",
        "等溫",
        "打氣筒",
    ],
    LearningTopic.ENTROPY: [
        "熱力學第二定律",
        "第二定律",
        "熵增加",
        "熵增",
        "熵",
        "entropy",
        "孤立系統",
        "微觀狀態",
    ],
    LearningTopic.EQUILIBRIUM: [
        "化學平衡",
        "化学平衡",
        "動態平衡",
        "平衡常數",
        "平衡",
        "勒沙特列",
        "可逆反應",
    ],
    LearningTopic.BONDING: [
        "化學鍵",
        "化学键",
        "共價鍵",
        "共价键",
        "氫鍵",
        "氢键",
        "離子鍵",
        "水分子",
        "食鹽",
        "水合",
    ],
    LearningTopic.REACTION_RATE: [
        "反應速率",
        "反应速率",
        "反應速度",
        "反應快慢",
        "反應變快",
        "活化能",
        "碰撞理論",
        "有效碰撞",
        "Arrhenius",
        "表面積",
    ],
}


def _covers_question(query: str, keywords: list[str]) -> bool:
    remaining = _normalize(query)
    phrases = sorted(
        {_normalize(value) for value in [*keywords, *QUESTION_WORDS] if value},
        key=len,
        reverse=True,
    )
    for phrase in phrases:
        remaining = remaining.replace(phrase, "")
    return not remaining


def match_learning_content(
    topic: LearningTopic,
    query: str,
    *,
    canonical_question: str,
    scenario_title: str,
    scenario_keywords: list[str],
) -> LearningContentMatch | None:
    normalized_query = _normalize(query)
    topic_keywords = [*scenario_keywords, *TOPIC_KEYWORDS[topic], scenario_title]
    exact_overview = normalized_query == _normalize(canonical_question)
    named_overview = _keyword_score(query, [scenario_title]) > 0 and _covers_question(
        query, [scenario_title]
    )
    overview = exact_overview or (
        _keyword_score(query, topic_keywords) > 0
        and _covers_question(query, [*topic_keywords, *OVERVIEW_PHRASES.get(topic, [])])
    )
    if exact_overview or named_overview:
        return LearningContentMatch("overview")

    candidates: list[tuple[bool, int, LearningFollowUpContent]] = []
    for item in learning_content()[topic].follow_ups:
        exact = _normalize(item.question) == normalized_query
        score = _keyword_score(query, item.keywords)
        if exact or (
            score > 0 and _covers_question(query, [*item.keywords, *topic_keywords])
        ):
            candidates.append((exact, score, item))
    if candidates:
        item = max(candidates, key=lambda candidate: (candidate[0], candidate[1]))[2]
        return LearningContentMatch("follow_up", item)
    if overview:
        return LearningContentMatch("overview")
    return None


DOCUMENT_WORDS = ("資料", "文件", "準備", "證明", "照片", "證件", "清單", "表格")
DEADLINE_WORDS = (
    "期限",
    "截止",
    "何時",
    "什麼時候",
    "時程",
    "日期",
    "時間",
)
DURATION_WORDS = ("多久", "多長時間", "幾天", "幾週", "幾個月")
NEXT_STEP_WORDS = (
    "下一步",
    "接下來",
    "預約",
    "流程",
    "怎麼進行",
)
APPLICATION_WORDS = (
    "哪裡",
    "哪裏",
    "哪個",
    "誰",
    "窗口",
    "單位",
    "申請",
    "怎麼辦",
    "諮詢",
    "聊聊",
    "聯絡",
)
RESOURCE_NEED_WORDS = (
    "補助",
    "資源",
    "協助",
    "幫忙",
    "申請",
    "怎麼辦",
    "需要",
    "想找",
    "想問",
    "想了解",
    "貸款",
    "資金",
    "受損",
    "壞了",
    "安置",
    "避難",
    "學費",
    "生活費",
    "失業",
    "諮商",
    "聊聊",
    "預約",
    "不足",
    "困難",
)


def _resource_follow_up(
    content: ResourceCategoryContent,
    query: str,
    *,
    allow_fuzzy: bool,
) -> ResourceContentMatch | None:
    normalized = _normalize(query)
    for index, item in enumerate(content.follow_ups):
        if _normalize(item.question) == normalized:
            kind: Literal[
                "application", "documents", "deadline", "duration", "next_step"
            ]
            if index == 0:
                kind = "application"
            elif index == 1:
                kind = "documents"
            elif any(_normalize(word) in normalized for word in NEXT_STEP_WORDS):
                kind = "next_step"
            elif any(_normalize(word) in normalized for word in DURATION_WORDS):
                kind = "duration"
            else:
                kind = "deadline"
            return ResourceContentMatch(kind, item.answer)
    if not allow_fuzzy:
        return None
    for kind, words, index in (
        ("documents", DOCUMENT_WORDS, 1),
        ("next_step", NEXT_STEP_WORDS, 2),
        ("duration", DURATION_WORDS, 2),
        ("deadline", DEADLINE_WORDS, 2),
        ("application", APPLICATION_WORDS, 0),
    ):
        if any(_normalize(word) in normalized for word in words):
            return ResourceContentMatch(kind, content.follow_ups[index].answer)
    return None


def match_resource_content(
    category: ResourceCategory,
    query: str,
    *,
    continuation: bool,
) -> ResourceContentMatch | None:
    content = resource_content()[category]
    follow_up = _resource_follow_up(content, query, allow_fuzzy=continuation)
    if follow_up is not None:
        return follow_up
    normalized = _normalize(query)
    if normalized == _normalize(content.canonical_question):
        return ResourceContentMatch("overview")
    has_category_signal = any(
        _normalize(keyword) in normalized for keyword in content.keywords
    )
    has_need_signal = any(
        _normalize(keyword) in normalized for keyword in RESOURCE_NEED_WORDS
    )
    if has_category_signal and has_need_signal:
        return ResourceContentMatch("fallback" if continuation else "overview")
    return None
