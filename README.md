# 🧭 Interactive Depth of Field Simulator

[English](#english) | [中文](#中文)

---

# English

An advanced, physics-based educational tool that visualizes and simulates camera optics, with a focus on **Depth of Field (DoF)** and **Bokeh**. Built with **React**, **Three.js (@react-three/fiber)**, and **Zustand**.

## 🌟 Key Features (per panel)
- **Studio View (3D, left/top):** “God mode” showing camera frustum, focus plane, and DoF volume as semi-transparent shapes; Top/Side/Front presets for fast alignment.
- **Viewfinder (3D, right/bottom):** Physically accurate shot preview with real-time bokeh (CoC-driven), breathing, and FOV; movable focus box follows your click; clicking empty space auto-sets focus to max distance for an “infinity” look.
- **Schematic View (2D SVG):** Top-down draggable Red/Green/Blue markers to change object distances/positions; stays in sync with 3D scenes and focus logic.
- **Control Panel:** Sliders for focal length (18–200mm), aperture (f/1.2–f/22), focus distance, sensor format (Full Frame / APS-C / M4/3), plus presets (portrait/landscape/macro) and camera shift buttons in viewfinder mode.
- **Math Panel:** Live readouts for hyperfocal distance, DoF near/far limits, total DoF, front/back split, CoC diameter, and horizontal FOV, all recomputed from current parameters.

## 🛠 Tech Stack
- React 18 + Vite
- Three.js + @react-three/fiber
- @react-three/drei (OrbitControls, Text, Grid, etc.)
- @react-three/postprocessing (DepthOfField, Vignette)
- Zustand (central physics/state store)
- Tailwind CSS + clsx

## 📐 Optical Formulas
1. **Hyperfocal Distance:** $$H = \frac{f^2}{N \times c} + f$$

2. **Bokeh Diameter at Infinity:** $$B_{\infty} = \frac{f^2}{N(S - f)}$$

3. **Field of View:** $$FOV = 2 \times \arctan\left(\frac{h}{2f}\right)$$

4. **Depth of Field:**

   $$DoF = D_f - D_n,\quad D_n = \frac{H \cdot S}{H + S - f},\quad D_f = \frac{H \cdot S}{H - S + f}$$

   If $D_f \rightarrow \infty$, then $DoF \rightarrow \infty$.

**Vars:** $H$ hyperfocal distance; $f$ focal length; $N$ f-number; $c$ circle of confusion limit; $S$ focus distance; $B_\infty$ bokeh diameter at infinity; $h$ sensor dimension (height); $FOV$ field of view; $D_n$ near focus limit; $D_f$ far focus limit; $DoF$ depth of field.

---

# 中文

一个基于物理光学公式的教育工具，可视化并模拟摄影中的**景深**和**焦外虚化**。技术栈：**React**、**Three.js (@react-three/fiber)**、**Zustand**。

## 🌟 核心功能（按面板）
- **摄影棚视图 (3D, 左/上)：** 上帝视角展示相机视锥、焦平面、景深体积（近/远限），提供顶/侧/正视预设便于对齐。
- **取景器视图 (3D, 右/下)：** 基于弥散圆实时渲染焦外虚化，包含呼吸效应与视场角；对焦框随点击移动，点击空白自动跳到最大对焦距离以获得“背景无限远”效果。
- **原理图 (2D SVG)：** 顶视可拖拽红/绿/蓝物体，直接改变它们的物理距离/位置，并与 3D 场景和对焦逻辑实时同步。
- **控制面板：** 调焦距（18–200mm）、光圈（f/1.2–f/22）、对焦距离、传感器画幅（全幅/APS-C/M4/3），预设模式（人像/风景/微距），以及取景器光轴平移按钮。
- **数学面板：** 实时输出超焦距、景深近限/远限、总景深、前后景深分布、弥散圆直径、水平视场角，并随参数即时更新。

## 🛠 技术栈
- React 18 + Vite
- Three.js + @react-three/fiber
- @react-three/drei（轨道控制、文本、网格等）
- @react-three/postprocessing（景深、暗角）
- Zustand（集中存储光学与场景状态）
- Tailwind CSS + clsx

## 📐 光学公式
1. **超焦距：**

   $$
   H = \frac{f^2}{N \times c} + f
   $$

2. **无穷远焦外直径：**

   $$
   B_{\infty} = \frac{f^2}{N(S - f)}
   $$

3. **视场角：**

   $$
   FOV = 2 \times \arctan\left(\frac{h}{2f}\right)
   $$

4. **景深：**

   $$
   DoF = D_f - D_n,\quad
   D_n = \frac{H \cdot S}{H + S - f},\quad
   D_f = \frac{H \cdot S}{H - S + f}
   $$

   若 $D_f \rightarrow \infty$，则 $DoF \rightarrow \infty$。

**符号说明：** $H$ 超焦距；$f$ 焦距；$N$ 光圈值；$c$ 弥散圆限值；$S$ 对焦距离；$B_\infty$ 无穷远焦外直径；$h$ 传感器尺寸（高度）；$FOV$ 视场角；$D_n$ 景深近限；$D_f$ 景深远限；$DoF$ 景深。

---

**License:** MIT
