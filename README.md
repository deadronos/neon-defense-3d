# Neon Defense 3D

Neon Defense 3D is an immersive Tower Defense game built using **React 19**, **TypeScript**, and **Three.js** (via `@react-three/fiber`). Defend your base against waves of enemies by strategically placing and upgrading towers in a vibrant 3D world.

## 🌟 Features

- **3D Gameplay**: Fully 3D environment with dynamic lighting, shadows, and particle effects.
- **Strategic Depth**:
  - Three unique tower types: Turret (Balanced), Blaster (Rapid), Railgun (Sniper).
  - Four enemy types: Drone, Scout, Heavy, and Titan Boss.
  - Upgrade system for increasing tower damage, range, and fire rate.
- **Interactive UI**: Sleek, glass-morphism UI with real-time stats and tooltips.
- **Wave System**: Progressively difficult waves with varied enemy compositions.

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- npm or yarn

### Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd neon-defense-3d
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running Locally

Start the development server:

```bash
npm run dev
```

Open your browser and navigate to `http://localhost:5173` (or the URL shown in the terminal).

### Building for Production

To create a production build:

```bash
npm run build
```

The output will be in the `dist` directory.

## 🎮 How to Play

1.  **Start the Game**: Click "Start Mission" on the main menu.
2.  **Place Towers**:
    - Select a tower from the bottom menu.
    - Click on a valid grid tile (green highlight) to place it.
    - Each tower costs credits.
3.  **Upgrade & Sell**:
    - Click on an existing tower to select it.
    - Use the panel on the right to **Upgrade** stats or **Sell** for a partial refund.
4.  **Camera Controls**:
    - **Left Click + Drag**: Rotate camera.
    - **Right Click + Drag**: Pan camera.
    - **Scroll**: Zoom in/out.
5.  **Objective**: Survive as many waves as possible. The game ends if your lives reach zero.

## 📂 Project Structure

- **`src/game/`**: Core game logic and 3D components.
  - `GameCanvas.tsx`: Main 3D scene, game loop, and entity rendering.
  - `GameState.tsx`: React Context for managing global state (money, waves, entities).
- **`src/components/`**: UI overlay components.
  - `UI.tsx`: HUD, menus, and interaction panels.
- **`src/types.ts`**: TypeScript definitions for game entities and state.
- **`src/constants.ts`**: Game configuration (map layout, enemy stats, tower stats).

## 🛠️ Development

This project uses **Vite** for fast development and building.

- **Linting**: `npm run lint`
- **Formatting**: `npm run format`
- **Testing**: `npm run test`

### E2E Baseline Screenshot

- This repository includes a manual baseline screenshot test used to capture the UI welcome and first map images.
- The baseline test does not run automatically. Run manually with:

```bash
npx playwright install --with-deps
npm run e2e:baseline
```

The script runs the baseline Playwright test that saves `docs/baseline/welcome.png` and `docs/baseline/firstmap.png`.

### Styling

- Tailwind CSS is integrated with Vite via the `@tailwindcss/vite` plugin (Tailwind v4). The project no longer uses the CDN script — styles are compiled from `index.css` and include an `@import "tailwindcss"` entry.

#### CSS-first theme tokens (Tailwind v4)

- This project uses Tailwind v4's CSS-first workflow. Theme and design tokens are defined directly in `index.css` using the `@theme` directive, for example:

```css
@import 'tailwindcss';

@theme {
  --font-display: 'Orbitron', ui-sans-serif, system-ui;
  --color-neon-cyan-500: #06b6d4;
}
```

- Defining tokens like `--color-yourname-500` creates utilities like `bg-yourname-500`, `text-yourname-500`, `border-yourname-500` automatically. This replaces (or extends) the previous JS-based `tailwind.config` approach and unlocks v4 features like automatic content detection, CSS theme variables, and more performant builds.

Detailed documentation for all functions and components can be found in the source code via JSDoc comments.
