# PingYin

PingYin 是一个面向儿童的中文拼音冒险小游戏，首发目标是 `pingyin.lucasli.net`。

## V1 范围

- 3 个内置关卡
- 3 类基础题型：听音选拼音、听音选声调、汉字配对
- 1 个极窄语音题型：固定词卡朗读
- 无语音时自动降级为自我跟读模式
- 本地 `localStorage` 保存关卡进度和星数

## 本地预览

```bash
python3 -m http.server 4173
```

然后访问 `http://localhost:4173`。

推荐桌面 Chrome 体验语音题。其他浏览器也能完整玩通，只是语音题会变成自我跟读模式。
