# 你是哪一种恋人？

## 1. 网站是什么
一个中文、36 题的亲密关系互动风格测试。答案和计算都留在浏览器，没有账号、后端、数据库或分析追踪。结果用于自我观察，不构成心理诊断或专业建议。16 种类型没有优劣或配对排名。

## 2. 如何打开项目
文件夹：`C:\Users\Lenovo\Desktop\恋爱文件`。不要直接双击 index.html；请使用下方本地服务器。

## 3. 如何安装依赖
普通电脑先安装 Node.js 22 LTS（包含 npm）。在文件夹空白处右键“在终端中打开”，运行 `npm install`。本次开发环境使用自带 pnpm 安装，已保留 pnpm-lock.yaml；需要完全复现依赖时使用 `pnpm install --frozen-lockfile`。

## 4. 如何本地运行
双击 `启动网站.cmd`，保持打开的终端窗口。也可在终端运行：
```powershell
cd "C:\Users\Lenovo\Desktop\恋爱文件"
npm run dev
```
浏览器打开终端显示的 Local 地址，默认 http://127.0.0.1:5173 。端口占用时以终端实际输出为准。

## 5. 如何关闭网站
在运行网站的终端按 Ctrl+C。关闭浏览器只会关闭页面，不会关闭服务器。

## 6. 如何重新运行
再次双击 `启动网站.cmd`，或再次运行 `npm run dev`。通常无需重复安装。

## 7. 如何修改 36 道题
编辑 `src/data/questions.ts` 中的 text。id 必须保持 1–36，dimension 为 0–3，每维 9 题；forward 表示该题正向还是反向。改动计分模型后请同步算法和测试，。

## 8. 如何修改 16 种人格结果
编辑 `src/data/profiles.ts`。name 是名称，definition 是一句话定义，core 是关系里的样子，need 是隐藏需求，risk 是雷区，reminder 是提醒。其他深度字段也在此维护。

## 9. 如何修改配色
编辑 `src/styles/app.css`；顶部 :root 是全站基础配色。结果页的轻微色彩变化由人格主题色控制。

## 10. 如何 production build
运行 `npm run build`。成功后生成 dist 文件夹，可交给静态托管平台。运行 `npm run preview` 可预览构建版，默认端口 4173。运行 `npm test` 检查计分逻辑。

## 11. 项目文件结构
- src/data：题目和人格文案。
- src/utils：计分逻辑。
- src/components：结果与分享组件。
- src/App.tsx：首页、答题与页面切换。
- src/styles/app.css：所有布局和配色。
- public：品牌图标；无需外部图片或字体。
- tests：算法与浏览器检查。
- dist：自动生成的上线文件，不手动编辑。
- package.json：依赖和运行命令。

## 12. 以后如何上传 GitHub
可以先在本地使用，不需要 GitHub 账号。将来创建空仓库，再在本目录运行 `git add .`、`git commit -m "Initial release: relationship personality test"`，按 GitHub 的提示添加远程仓库并 push。不要上传 node_modules、dist、.env；.gitignore 已排除它们。

## 13. 以后如何部署
Vercel、Cloudflare Pages 等：导入项目，构建命令 `npm run build`，输出目录 `dist`，无需环境变量。也可把 dist 的全部内容上传任意静态主机。

GitHub Pages：构建后把 dist 内容发布到 Pages。项目使用相对资源路径和 hash 页面状态，适用于仓库子目录；页面状态仅在内存中切换；旧结果地址也会回到首页。

## 计分与隐私说明
每题按要求映射为 0–1，反向题使用 (5-answer)/4。保留原始精度决定字母；百分比只在显示时四舍五入，另一端补足至 100。强度按显示整数落入五个区间。50/50 先比较距离 3 为 2 的两侧数量，再比较距离为 1 的数量，仍相等固定选第一字母 B/E/D/F。全部选 3 为 BEDF / 流动型，仅表示可复现的就近归类。

清晰度区间为 [0,6]、(6,14]、(14,24]、(24,50]，分别为流动、混合、清晰、鲜明。这不是准确率或置信度。

答题进度、答案和结果仅存在于当前页面的 React 内存状态，不使用 localStorage、sessionStorage、IndexedDB 或 URL 保存。刷新、关闭重开、浏览器历史恢复都会回到全新首页；开始测试总是从第 1 题开始。启动时仅删除旧版 which-lover:v1 缓存，不读取或写入作答数据，不影响其他存储键。

结果页仅供本次阅读，不提供保存、分享、重测或修改答案入口。

## 验收与兼容说明
已通过 TypeScript 检查和 production build。测试脚本涵盖算法、16 型映射、边界与平局；浏览器检查覆盖完整作答、修改、刷新清空、重开清空、旧缓存不恢复、禁用存储仍可完整答题和 375/390/430/1280px 布局。运行浏览器测试：`npx playwright test`（本配置使用 Windows 自带 Edge）。

本环境的原生 esbuild 无法读取部分父目录，已通过 npm overrides 和 pnpm-workspace.yaml 统一使用 esbuild-wasm；不影响网站生产运行，只涉及开发构建。没有后端依赖。

移动端已验证响应式布局，尚未在真实 iPhone Safari / 微信内置浏览器实机测试。

当浏览器支持 WebMCP 时，答题页提供 answer_current_relationship_scene 工具，与按钮共用答题逻辑；无支持时不影响网站。接口已用模拟注册上下文验证有效与无效输入，未验证原生支持该提案的浏览器。

## 本仓库的 GitHub Pages 自动部署
仓库：https://github.com/zx430/love-test
预计网址：https://zx430.github.io/love-test/

Vite base 已设为 /love-test/；本地开发地址也使用 http://127.0.0.1:5173/love-test/ 。页面设计、题目与计分未变。

本仓库的官方 Pages workflow 位于 .github/workflows/deploy-pages.yml。main 分支更新时运行 npm ci、npm test、npm run build，把 dist 作为 Actions 构建产物部署，不把 dist 提交到源码仓库。package-lock.json 用于 npm ci；pnpm 锁文件保留供原本本地环境使用。

首次进入仓库 Settings → Pages → Build and deployment → Source，选择 GitHub Actions。然后在 Actions → Deploy to GitHub Pages → Run workflow 选择 main 并运行。只有部署成功后，公开网址才可访问。
