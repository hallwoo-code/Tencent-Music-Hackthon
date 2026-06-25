# AI Sonic Resonance

AI 音浪共振器是一个嵌入 QQ音乐播放体验的高保真交互 Demo。它演示完整链路：

`音乐播放 -> 歌词实时滚动 -> AI 标记高能互动点 -> 用户点击歌词 -> 歌词与页面发生音乐共振 -> 歌曲结束后生成能量结果 -> 查看其他用户高亮歌词 -> 评论与充能互动`

本项目可本地运行、上传 GitHub，并部署到 Streamlit Community Cloud。

## 核心功能

- 沉浸式歌词播放器：中央歌词为视觉中心，背景海报低透明叠加。
- 音频播放：内置 demo 音频，也支持用户导入 MP3。
- 歌词同步：当前歌词高亮，上下句弱化，拖动进度条后同步跳转。
- Deadman 双语歌词：已录入用户提供的中英双语演示歌词，并按 3:55 音频时长配置同步时间轴。
- 授权歌词导入：点击 `粘贴歌词` 可输入 LRC 歌词并立即刷新播放器。
- 歌词同步微调：`歌词+0.5s` / `歌词-0.5s` 可现场校准人声与文字。
- 渐进裂纹互动：同一句歌词前 4 次点击只增加裂纹和蓄力反馈，第 5 次点击才触发 3D 字块爆裂、进度条震动和波纹。
- AI 高能点：使用预设数据模拟鼓点密集、副歌开始、高音进入、节奏突变、情绪爆发、人声转折、乐器独奏、歌词高共鸣点。
- 歌词互动：点击高能歌词后触发按压、蓄力、放大、粒子碎裂、评论波和页面升温。
- 结束结算：歌曲结束或点击演示结算后，显示金色老虎机式能量分数。
- 共振场：展示其他用户高亮歌词，热度影响大小、亮度、位置和动效。
- 评论与充能：点击高亮歌词出现电流波评论，支持为歌词充能。
- 可访问性：提供降低动效和关闭互动音效开关。

## 页面截图占位

上传 GitHub 前可在这里补充截图：

- `docs/screenshot_player.png`：沉浸式歌词播放器。
- `docs/screenshot_settlement.png`：金色能量结算。
- `docs/screenshot_field.png`：用户歌词共振场。

## 技术栈

- Python
- Streamlit
- `streamlit.components.v1.html`
- HTML / CSS / JavaScript
- Canvas
- Web Audio API

## 本地运行

```bash
pip install -r requirements.txt
streamlit run app.py
```

启动后浏览器会打开 Streamlit 页面。若浏览器阻止自动播放，点击播放按钮即可。

## 项目目录

```text
tencent-music-resonance/
├── app.py
├── requirements.txt
├── README.md
├── .gitignore
├── assets/
│   ├── audio/
│   │   └── demo_track.mp3
│   ├── images/
│   │   ├── cover.svg
│   │   └── poster.svg
│   ├── sounds/
│   │   └── README.md
│   └── fonts/
├── data/
│   ├── lyrics.json
│   ├── interaction_points.json
│   ├── comments.json
│   └── resonance_scores.json
├── components/
│   ├── player.html
│   ├── styles.css
│   └── player.js
├── docs/
│   ├── PROJECT_MAP.md
│   ├── RUNBOOK.md
│   └── DEMO_SCRIPT.md
└── outputs/
    └── ai-sonic-resonance-prototype/
```

## Streamlit Community Cloud 部署

1. 将项目推送到 GitHub。
2. 打开 Streamlit Community Cloud。
3. 选择该 GitHub 仓库。
4. Main file path 填写 `app.py`。
5. Python 依赖会从 `requirements.txt` 自动安装。
6. 点击 Deploy。

注意：代码只使用相对路径和 `pathlib.Path`，不依赖本机绝对路径、不需要第二个后端服务、不包含密钥。

## Demo 演示流程

1. 进入页面，展示 QQ音乐风格沉浸式播放器。
2. 点击播放音乐。
3. 观察歌词随播放进度实时滚动。
4. 当 AI 标记高能点出现时，点击高亮歌词。
5. 连续点击同一句高能歌词，前 4 次出现裂纹蓄力，第 5 次触发 3D 字块爆裂、进度条震动和评论波。
6. 页面随高能段落升温和呼吸。
7. 点击 `演示结算` 或等待歌曲结束。
8. 金色数字快速滚动并减速停下。
9. 点击 `查看本曲共振场`。
10. 点击任意热门歌词，查看电流波评论。
11. 点击 `为这句歌词充能`，观察数字和说明反馈。

## 模拟 AI 数据说明

以下 AI 能力使用预设模拟数据：

- 歌曲结构识别。
- 高能互动点检测。
- 歌词情绪匹配。
- 视觉模板选择。
- 评论语义聚类。
- 能量结算分数。
- 热门歌词热度和充能数量。

Web Audio API 会在浏览器端读取真实音频频谱，用于实时能量、低频冲击和页面呼吸强度，但它不是生产级音乐理解模型。

## 已知限制

- 默认音频仅用于 demo，需要在正式提交前确认版权或替换为可授权素材。
- 当前默认歌词来自用户在本地对话中提供的文本；公开发布前请确认音频和歌词授权，或通过页面里的 `粘贴歌词` 替换为自有授权文本。
- 真实 QQ音乐歌词、评论和分享链路未接入。
- Streamlit iframe 内的组件与 Python 后端没有实时双向状态同步。
- 移动端可预览，但复杂粒子效果更适合桌面浏览器录屏。
- 浏览器若禁用 Web Audio，页面会降级为预设节奏动效。

## 部署错误排查

- 页面空白：检查 `components/player.html`、`components/styles.css`、`components/player.js` 是否存在。
- 数据缺失：检查 `data/*.json` 是否为合法 JSON。
- 音频不播放：确认浏览器已允许用户点击后播放，或替换 `assets/audio/demo_track.mp3`。
- Streamlit 安装失败：确认 `requirements.txt` 只有 `streamlit` 依赖。
- 路径错误：确保代码中没有 Windows 绝对路径，资源位于仓库内部。
