# Optical Lab: Interactive Depth of Field Simulator
# 光学实验室：交互式景深模拟器

An advanced, physics-based educational tool designed to visualize and simulate camera optics, specifically focusing on **Depth of Field (DoF)** and **Bokeh**. Built with **React**, **Three.js (@react-three/fiber)**, and **Zustand**.

这是一个基于物理光学公式的高级教育工具，旨在可视化和模拟摄影光学原理，重点关注**景深 (DoF)** 和 **焦外成像 (Bokeh)**。项目基于 **React**、**Three.js (@react-three/fiber)** 和 **Zustand** 构建。

---

## 🌟 Key Features (核心功能)

### 1. Dual-View Visualization (双视窗可视化)
*   **Studio View (Left/Top):** A "God mode" looking at the camera setup from the outside. Visualizes the **Camera Frustum**, **Focus Plane**, and **Depth of Field Zone** (Near/Far limits) as semi-transparent 3D volumes. Supports Top/Side/Front orthographic presets.
*   **Viewfinder View (Right/Bottom):** A physically accurate simulation of the actual photo. Features real-time **Bokeh** rendering based on the Circle of Confusion (CoC) formula ($B = \frac{f^2}{N(S-f)}$), lens breathing, and field of view calculations.
*   **Studio 视图 (左/上):** “上帝视角”，从外部观察相机布景。以半透明 3D 体积形式可视化**相机视锥**、**焦平面**以及**景深范围**（近限/远限）。支持顶/侧/正视图切换。
*   **取景器视图 (右/下):** 物理精确的实拍模拟。基于弥散圆 (CoC) 公式 ($B = \frac{f^2}{N(S-f)}$) 实时渲染**焦外虚化**，支持呼吸效应和视场角计算。

### 2. Interactive Physics (交互式物理引擎)
*   **Parameters:** Adjust **Focal Length** (18-200mm), **Aperture** (f/1.2-f/22), **Focus Distance**, and **Sensor Size** (Full Frame, APS-C, M4/3).
*   **Smart Focus:** Click on objects in the Viewfinder to instantly snap focus to their exact physical distance.
*   **Draggable Schematic:** A 2D Top-down SVG dashboard where you can drag objects (Red, Green, Blue) to change their physical distance from the camera.
*   **参数调节:** 调节 **焦距**、**光圈**、**对焦距离** 以及 **传感器画幅**。
*   **智能对焦:** 点击取景器中的物体，焦平面会自动吸附到该物体的精确物理距离。
*   **可拖拽原理图:** 2D 顶视 SVG 面板，支持拖拽场景中的物体（红、绿、蓝）来改变它们与相机的距离。

### 3. Real-Time Math (实时数学计算)
*   Displays live calculations for **Hyperfocal Distance**, **Near Limit**, **Far Limit**, and **Total Depth**.
*   Visualizes the Circle of Confusion (CoC) diameter.
*   显示 **超焦距**、**景深近限**、**景深远限** 和 **总景深** 的实时计算结果。
*   可视化弥散圆 (CoC) 直径。

---

## 🎮 Controls (操作说明)

### Viewfinder (取景器)
*   **Click Object:** Focus on that specific object.
*   **Arrow Buttons (Overlay):** Truck (Move Left/Right) and Pedestal (Move Up/Down) the camera position to shift the optical axis.
*   **点击物体:** 对焦到该物体。
*   **方向按钮 (浮层):** 控制相机平移 (上下左右)，改变光轴位置。

### Schematic View (原理图)
*   **Drag Dots:** Click and drag the Blue, Green, or Red dots to move the objects in the 3D world.
*   **拖拽圆点:** 点击并拖动蓝、绿、红圆点，移动 3D 世界中对应的物体。

### Studio View (摄影棚视图)
*   **Orbit:** Left click + Drag to rotate.
*   **Pan:** Right click + Drag to move.
*   **Presets:** Use "Top", "Side", "Front" buttons for quick alignment.
*   **旋转:** 左键拖拽。
*   **平移:** 右键拖拽。
*   **预设:** 使用 "Top" (顶), "Side" (侧), "Front" (正) 按钮快速对齐视角。

---

## 🛠 Tech Stack (技术栈)

*   **Framework:** React 18 (Vite / Next.js compatible structure)
*   **3D Engine:** Three.js + @react-three/fiber
*   **Helpers:** @react-three/drei (OrbitControls, Text, Grid, etc.)
*   **Post-Processing:** @react-three/postprocessing (DepthOfField effect)
*   **State Management:** Zustand (Centralized store for physics state)
*   **Styling:** Tailwind CSS + clsx

---

## 📐 Optical Formulas Used (使用的光学公式)

1.  **Hyperfocal Distance (超焦距):**
    $$H = \frac{f^2}{N \times c} + f$$
    *(f = focal length, N = aperture, c = CoC limit)*

2.  **Bokeh Diameter at Infinity (无穷远焦外光斑直径):**
    $$B_{\infty} = \frac{f^2}{N(S - f)}$$
    *(S = Focus Distance)*

3.  **Field of View (视场角):**
    $$FOV = 2 \times \arctan(\frac{h}{2f})$$
    *(h = sensor dimension)*

---

**License:** MIT
