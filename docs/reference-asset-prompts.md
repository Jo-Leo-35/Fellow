# 參考素材處理記錄

來源：`ChatGPT Image Sep 4, 2026 at 09_50_44 PM.png`。三個素材皆使用內建 imagegen 編輯模式；第一次從整張參考稿辨認並分離教師頭像、區域圖和燈泡，第二次依以下最終提示詞清理背景。純色背景再由 imagegen 技能的去背 helper 轉成透明 PNG，最後移除透明留白及縮圖。沒有使用 CLI 模型。

## teacher-avatar

儲存位置：`frontend/public/assets/reference-teacher-avatar.png`

最終背景清理提示詞：

```text
Use case: background-extraction. Edit target: the attached extracted artwork. Change only the checkerboard background to a perfectly flat solid #ff00ff chroma-key background. Preserve the entire circular teacher portrait, including its pale mint circular backing exactly: same shape, identity, colors, pose, texture and internal details. Remove every trace of white/gray checkerboard outside the subject. Tight square framing with 4% solid magenta padding around the subject. No fake transparency grid. No shadows or gradients in the background, no text, no new elements. The magenta is for local background removal; do not use magenta anywhere in the subject.
```

## region-map

儲存位置：`frontend/public/assets/reference-region-map.png`

最終背景清理提示詞：

```text
Use case: background-extraction. Edit target: the attached extracted artwork. Change only the checkerboard background to a perfectly flat solid #ff00ff chroma-key background. Preserve the entire mint and teal segmented regional map, including all its boundaries exactly: same shape, identity, colors, pose, texture and internal details. Remove every trace of white/gray checkerboard outside the subject. Tight square framing with 4% solid magenta padding around the subject. No fake transparency grid. No shadows or gradients in the background, no text, no new elements. The magenta is for local background removal; do not use magenta anywhere in the subject.
```

## insight-bulb

儲存位置：`frontend/public/assets/reference-insight-bulb.png`

最終背景清理提示詞：

```text
Use case: background-extraction. Edit target: the attached extracted artwork. Change only the checkerboard background to a perfectly flat solid #ff00ff chroma-key background. Preserve the yellow light bulb and short solid yellow rays, without the surrounding diffuse glow exactly: same shape, identity, colors, pose, texture and internal details. Remove every trace of white/gray checkerboard outside the subject. Tight square framing with 4% solid magenta padding around the subject. No fake transparency grid. No shadows or gradients in the background, no text, no new elements. The magenta is for local background removal; do not use magenta anywhere in the subject.
```

