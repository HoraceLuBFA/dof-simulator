# Interactive Depth of Field Simulator 交互式景深模拟器

[English](#english) | [中文](#中文)

## English

Physics-based DoF and bokeh visualizer built with React, Three.js (@react-three/fiber), and Zustand. Try online or run locally.

- **Live demo:** <https://dof.lumenghe.com>
- **Tech:** React 18 + Vite, Three.js, @react-three/fiber, @react-three/drei, @react-three/postprocessing, Zustand, Tailwind.

## Features by panel

- **Studio View (3D):** Camera frustum, focus plane, DoF volume; Top/Side/Front presets.
+- **Viewfinder (3D):** Physically driven bokeh (CoC-based), FOV/breathing, click-to-move focus box, infinity fallback on miss.
- **Schematic (2D SVG):** Top-down drag of RGB objects; synced distances/positions with 3D scenes and focus logic.
- **Control Panel:** Sliders for focal length (18–200mm), aperture (f/1.2–f/22), focus distance, sensor format (Full Frame / APS-C / M4/3), presets (portrait/landscape/macro), axis shift in viewfinder mode.
- **Math Panel:** Hyperfocal, DoF near/far limits, total DoF, front/back split, CoC diameter, horizontal FOV; updates live with inputs.

## Optical formulas

1. **Hyperfocal Distance**

   $$H = \frac{f^2}{N \times c} + f$$

2. **Bokeh Diameter at Infinity**

   $$B_{\infty} = \frac{f^2}{N(S - f)}$$

3. **Field of View**

   $$FOV = 2 \times \arctan\left(\frac{h}{2f}\right)$$

4. **Depth of Field**

   $$DoF = D_f - D_n$$

   $$D_n = \frac{H \cdot S}{H + S - f}, \quad D_f = \frac{H \cdot S}{H - S + f}$$

   If $D_f \rightarrow \infty$, then $DoF \rightarrow \infty$.

| Symbol | Meaning |
| --- | --- |
| $H$ | hyperfocal distance |
| $f$ | focal length |
| $N$ | f-number |
| $c$ | circle of confusion limit |
| $S$ | focus distance |
| $B_\infty$ | bokeh diameter at infinity |
| $h$ | sensor dimension (height) |
| $FOV$ | field of view |
| $D_n$ | near focus limit |
| $D_f$ | far focus limit |
| $DoF$ | depth of field |

## Quick start (local)

1) Install deps: `npm install`  
2) Dev server: `npm run dev` (open the shown localhost URL)  
3) Build: `npm run build`  
4) Preview built files: `npm run preview`  

Serve `dist/` with any static server for production.

---

## 中文

基于光学公式的景深/焦外可视化工具。线上可试用，亦可本地运行。

- **在线体验**：<https://dof.lumenghe.com>
- **技术栈**：React 18 + Vite，Three.js，@react-three/fiber，@react-three/drei，@react-three/postprocessing，Zustand，Tailwind。

## 面板功能

- **摄影棚视图 (3D)：** 显示视锥、焦平面、景深体积；内置顶/侧/正视预设。
- **取景器视图 (3D)：** 基于弥散圆的实时虚化，呼吸与视场角同步；点击移动对焦框，未命中则对到“无穷远”。
- **原理图 (2D SVG)：** 顶视拖拽红/绿/蓝目标，距离/位置与 3D 场景和对焦逻辑同步。
- **控制面板：** 焦距（18–200mm）、光圈（f/1.2–f/22）、对焦距离、画幅（全幅/APS-C/M4/3）、预设（人像/风景/微距）、取景器光轴平移。
- **数学面板：** 超焦距、景深近/远限、总景深、前后景深分布、弥散圆直径、水平视场角，实时刷新。

## 光学公式

1. **超焦距**

   $$H = \frac{f^2}{N \times c} + f$$

2. **无穷远焦外直径**

   $$B_{\infty} = \frac{f^2}{N(S - f)}$$

3. **视场角**

   $$FOV = 2 \times \arctan\left(\frac{h}{2f}\right)$$

4. **景深**

   $$DoF = D_f - D_n$$

   $$D_n = \frac{H \cdot S}{H + S - f}, \quad D_f = \frac{H \cdot S}{H - S + f}$$

   若 $D_f \rightarrow \infty$，则 $DoF \rightarrow \infty$

| 符号 | 含义 |
| --- | --- |
| $H$ | 超焦距 |
| $f$ | 焦距 |
| $N$ | 光圈值 |
| $c$ | 弥散圆限值 |
| $S$ | 对焦距离 |
| $B_\infty$ | 无穷远焦外直径 |
| $h$ | 传感器尺寸（高度） |
| $FOV$ | 视场角 |
| $D_n$ | 景深近限 |
| $D_f$ | 景深远限 |
| $DoF$ | 景深 |

## 本地运行

1) 安装依赖：`npm install`  
2) 开发模式：`npm run dev`（按提示打开本地地址）  
3) 构建：`npm run build`  
4) 预览构建产物：`npm run preview`  

生产环境直接用任意静态服务器部署 `dist/` 目录即可。

---

License: MIT
