# CRUSH 聚会游戏合集

一个统一入口的手机端聚会游戏网站。首页提供三个可点击游戏：

- 真心话大冒险
- 点 MOTO（别惹小毛头）
- 大小姐牌

每个游戏均有“返回游戏大厅”入口。

## 项目结构

- `site/`：目录首页及两款原生静态游戏
- `apps/tap-moto/`：MOTO 游戏源码
- `scripts/assemble-site.mjs`：组装最终静态网站
- `.github/workflows/pages.yml`：GitHub Pages 自动构建与部署

## 本地构建

需要 Node.js 22.13 或更高版本。

```bash
npm ci --prefix apps/tap-moto
STATIC_EXPORT=true \
NEXT_PUBLIC_BASE_PATH=/games/tap-moto \
SITE_URL=http://localhost:8974 \
npm run build:static --prefix apps/tap-moto
npm run assemble
python3 -m http.server 8974 --directory _site
```

然后打开 `http://localhost:8974`。

## 发布到 GitHub Pages

上传到 GitHub 后，在仓库 `Settings` > `Pages` 中把发布来源设为 `GitHub Actions`。此后推送到 `main` 分支时，工作流会自动：

1. 安装并静态导出 MOTO 游戏。
2. 合并目录首页和三款游戏。
3. 发布完整网站到 GitHub Pages。

## 许可与素材 / License & Assets

> [!IMPORTANT]
> **官方网站 / Official Website**
>
> [https://momo20233.github.io/crush-party-games/](https://momo20233.github.io/crush-party-games/)
>
> **中文**
>
> 本仓库当前未附开源许可证，公开可见不代表授权他人复用。公开发布前，请确认目录图、角色、卡牌、图片、音频和视频均为原创或已取得公开再分发许可。
>
> **English**
>
> This repository does not currently include an open-source license. Public visibility does not grant permission to reuse its contents. Before any public release or redistribution, please ensure that all directory artwork, characters, cards, images, audio, and video are original works or are properly licensed for public redistribution.
