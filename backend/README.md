# 後端

| 位置 | 用途 |
| --- | --- |
| `app/` | FastAPI、權限、服務、模型介面、檢索與資料模型 |
| `data/` | 原創教材、政策與通知示範資料 |
| `scripts/` | seed、向量索引與局部資料遷移 |
| `tests/` | 後端單元與 API 整合測試 |
| `requirements.txt` | Python 套件版本 |

這次目錄分類未改變後端模組結構。完整服務請從專案根目錄執行 `python3 scripts/local-demo.py start`；本機執行資料保存於 `runtime/local-demo/`。參考 [API 契約](../docs/api-alignment.md) 與 [操作手冊](../docs/demo-runbook.md)。
