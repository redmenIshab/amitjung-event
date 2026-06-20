# Lyante Brand Reel Teaser — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone Remotion project that renders a ~25.5s, 1080×1920 vertical brand-reel teaser for Lyante Production, combining trimmed real screen-recording footage with one fully-animated ticket+QR scene.

**Architecture:** Six scenes composed with `@remotion/transitions`'s `TransitionSeries`. Five scenes reuse one `RealFootageScene` component that plays trimmed/speed-remapped windows of a single source video (`public/footage/lyante-walkthrough.mov`) inside a branded device frame, with a captions overlay. One scene (`TicketQr`) is a fully animated SVG/React recreation with no video dependency. Brand colors/fonts and frame-timing constants live in one `theme.ts` so every scene pulls from the same source of truth.

**Tech Stack:** Remotion 4.x (`remotion`, `@remotion/cli`, `@remotion/google-fonts`, `@remotion/transitions`), React 19, TypeScript, `qrcode` for QR generation, Vitest for the pure-logic unit tests.

**Reference spec:** `docs/superpowers/specs/2026-06-20-ticketing-teaser-video-design.md`

---

### Task 1: Scaffold the Remotion project

**Files:**
- Create: `/Users/redmen/Projects/lyante-ticketing-teaser/package.json`
- Create: `/Users/redmen/Projects/lyante-ticketing-teaser/tsconfig.json`
- Create: `/Users/redmen/Projects/lyante-ticketing-teaser/remotion.config.ts`
- Create: `/Users/redmen/Projects/lyante-ticketing-teaser/vitest.config.ts`
- Create: `/Users/redmen/Projects/lyante-ticketing-teaser/.gitignore`
- Create: `/Users/redmen/Projects/lyante-ticketing-teaser/src/index.ts`

- [ ] **Step 1: Create the project directory**

```bash
mkdir -p /Users/redmen/Projects/lyante-ticketing-teaser/src
cd /Users/redmen/Projects/lyante-ticketing-teaser
```

- [ ] **Step 2: Write `package.json`**

```json
{
  "name": "lyante-ticketing-teaser",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "remotion studio",
    "build": "remotion render BrandReelTeaser out/teaser.mp4 --codec=h264",
    "test": "vitest run"
  },
  "dependencies": {
    "@remotion/cli": "^4.0.0",
    "@remotion/google-fonts": "^4.0.0",
    "@remotion/transitions": "^4.0.0",
    "qrcode": "^1.5.4",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "remotion": "^4.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/qrcode": "^1.5.5",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 3: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2018",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "lib": ["DOM", "ES2018"],
    "noEmit": true
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 4: Write `remotion.config.ts`**

```ts
import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
```

- [ ] **Step 5: Write `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
  },
});
```

- [ ] **Step 6: Write `.gitignore`**

```
node_modules
out
.remotion
*.tsbuildinfo
```

- [ ] **Step 7: Write `src/index.ts`**

```ts
import { registerRoot } from 'remotion';
import { RemotionRoot } from './Root';

registerRoot(RemotionRoot);
```

This imports `./Root`, which doesn't exist yet — that's expected, it's created in Task 11. The project won't compile until then; that's fine, no command in this task runs the compiler.

- [ ] **Step 8: Install dependencies**

```bash
cd /Users/redmen/Projects/lyante-ticketing-teaser
pnpm install
```

Expected: completes without errors, creates `node_modules/` and `pnpm-lock.yaml`.

- [ ] **Step 9: Initialize git and commit**

```bash
cd /Users/redmen/Projects/lyante-ticketing-teaser
git init
git add package.json tsconfig.json remotion.config.ts vitest.config.ts .gitignore src/index.ts
git commit -m "chore: scaffold Remotion project for Lyante brand reel teaser"
```

---

### Task 2: Brand theme and timing constants (with tests)

**Files:**
- Create: `/Users/redmen/Projects/lyante-ticketing-teaser/src/theme.ts`
- Test: `/Users/redmen/Projects/lyante-ticketing-teaser/src/theme.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/theme.test.ts
import { describe, expect, it } from 'vitest';
import { FPS, SCENE_FRAMES, TOTAL_FRAMES, TRANSITION_FRAMES, secToFrames } from './theme';

describe('secToFrames', () => {
  it('converts seconds to frames at the composition fps', () => {
    expect(secToFrames(10)).toBe(300);
    expect(secToFrames(0)).toBe(0);
  });

  it('rounds to the nearest whole frame', () => {
    expect(secToFrames(1.25)).toBe(38);
  });
});

describe('composition timing', () => {
  it('TOTAL_FRAMES equals the sum of scene durations minus 5 transition overlaps', () => {
    const sceneSum =
      SCENE_FRAMES.hook +
      SCENE_FRAMES.processMontage +
      SCENE_FRAMES.ticketingSite +
      SCENE_FRAMES.ticketQr +
      SCENE_FRAMES.portfolio +
      SCENE_FRAMES.outro;
    expect(TOTAL_FRAMES).toBe(sceneSum - TRANSITION_FRAMES * 5);
  });

  it('keeps the teaser within the 20-30s target range', () => {
    const seconds = TOTAL_FRAMES / FPS;
    expect(seconds).toBeGreaterThanOrEqual(20);
    expect(seconds).toBeLessThanOrEqual(30);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd /Users/redmen/Projects/lyante-ticketing-teaser
pnpm test
```

Expected: FAIL — `src/theme.ts` does not exist yet.

- [ ] **Step 3: Write `src/theme.ts`**

```ts
export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

export const secToFrames = (seconds: number): number => Math.round(seconds * FPS);

export const SCENE_FRAMES = {
  hook: 90,
  processMontage: 150,
  ticketingSite: 120,
  ticketQr: 150,
  portfolio: 150,
  outro: 150,
} as const;

export const TRANSITION_FRAMES = 9; // 0.3s at 30fps

export const TOTAL_FRAMES =
  SCENE_FRAMES.hook +
  SCENE_FRAMES.processMontage +
  SCENE_FRAMES.ticketingSite +
  SCENE_FRAMES.ticketQr +
  SCENE_FRAMES.portfolio +
  SCENE_FRAMES.outro -
  TRANSITION_FRAMES * 5;

export const COLORS = {
  goldLight: '#F5C842',
  gold: '#C8922A',
  goldDeep: '#8B5E10',
  bg: '#080808',
  surface: '#111111',
  surfaceMid: '#1C1C1C',
  ivory: '#F0EDE6',
  ash: '#9A9590',
  coal: '#4A4744',
} as const;
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd /Users/redmen/Projects/lyante-ticketing-teaser
pnpm test
```

Expected: PASS — 4 tests passing in `src/theme.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/theme.ts src/theme.test.ts
git commit -m "feat: add brand theme and scene timing constants"
```

---

### Task 3: Load brand fonts

**Files:**
- Create: `/Users/redmen/Projects/lyante-ticketing-teaser/src/fonts.ts`

- [ ] **Step 1: Write `src/fonts.ts`**

```ts
import { loadFont as loadBebasNeue } from '@remotion/google-fonts/BebasNeue';
import { loadFont as loadCormorantGaramond } from '@remotion/google-fonts/CormorantGaramond';
import { loadFont as loadDMMono } from '@remotion/google-fonts/DMMono';
import { loadFont as loadDMSans } from '@remotion/google-fonts/DMSans';

export const { fontFamily: bebasFontFamily } = loadBebasNeue();
export const { fontFamily: cormorantFontFamily } = loadCormorantGaramond();
export const { fontFamily: dmMonoFontFamily } = loadDMMono();
export const { fontFamily: dmSansFontFamily } = loadDMSans();
```

This has no independent unit test — it's a thin wrapper around `@remotion/google-fonts`, and its only real verification is that it doesn't throw, which is covered by the render smoke test in Task 12.

- [ ] **Step 2: Verify it type-checks**

```bash
cd /Users/redmen/Projects/lyante-ticketing-teaser
pnpm exec tsc --noEmit
```

Expected: no errors related to `src/fonts.ts`. (There will still be an error about `./Root` not being found in `src/index.ts` — that's expected until Task 11; ignore it for this step.)

- [ ] **Step 3: Commit**

```bash
git add src/fonts.ts
git commit -m "feat: load Lyante brand fonts via @remotion/google-fonts"
```

---

### Task 4: QR grid utility (with tests)

**Files:**
- Create: `/Users/redmen/Projects/lyante-ticketing-teaser/src/lib/qr.ts`
- Test: `/Users/redmen/Projects/lyante-ticketing-teaser/src/lib/qr.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/qr.test.ts
import { describe, expect, it } from 'vitest';
import { buildQrGrid } from './qr';

describe('buildQrGrid', () => {
  it('returns a square grid with at least one dark cell', () => {
    const grid = buildQrGrid('https://lyante.com/ticket/SAMPLE-TOKEN-7F3A');
    expect(grid.size).toBeGreaterThan(0);
    expect(grid.cells.length).toBeGreaterThan(0);
  });

  it('keeps every cell coordinate inside the grid bounds', () => {
    const grid = buildQrGrid('https://lyante.com/ticket/SAMPLE-TOKEN-7F3A');
    const inBounds = grid.cells.every(
      (cell) => cell.x >= 0 && cell.x < grid.size && cell.y >= 0 && cell.y < grid.size
    );
    expect(inBounds).toBe(true);
  });

  it('produces a larger grid for longer input text', () => {
    const shortGrid = buildQrGrid('a');
    const longGrid = buildQrGrid('a'.repeat(200));
    expect(longGrid.size).toBeGreaterThan(shortGrid.size);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd /Users/redmen/Projects/lyante-ticketing-teaser
pnpm test
```

Expected: FAIL — `src/lib/qr.ts` does not exist yet.

- [ ] **Step 3: Write `src/lib/qr.ts`**

```ts
import QRCode from 'qrcode';

export interface QrCell {
  x: number;
  y: number;
}

export interface QrGrid {
  cells: QrCell[];
  size: number;
}

export function buildQrGrid(value: string): QrGrid {
  const qr = QRCode.create(value, { errorCorrectionLevel: 'M' });
  const size = qr.modules.size;
  const cells: QrCell[] = [];

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (qr.modules.get(row, col)) {
        cells.push({ x: col, y: row });
      }
    }
  }

  return { cells, size };
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd /Users/redmen/Projects/lyante-ticketing-teaser
pnpm test
```

Expected: PASS — 3 tests passing in `src/lib/qr.test.ts`, plus the 4 from Task 2 still passing (7 total).

- [ ] **Step 5: Commit**

```bash
git add src/lib/qr.ts src/lib/qr.test.ts
git commit -m "feat: add QR grid generation utility"
```

---

### Task 5: Copy source footage and add the footage-existence helper

**Files:**
- Create: `/Users/redmen/Projects/lyante-ticketing-teaser/public/footage/lyante-walkthrough.mov` (copied)
- Create: `/Users/redmen/Projects/lyante-ticketing-teaser/src/lib/footage.ts`

- [ ] **Step 1: Copy the source recording into `public/footage/`**

```bash
mkdir -p /Users/redmen/Projects/lyante-ticketing-teaser/public/footage
cp "/Users/redmen/Desktop/Screen Recording 2026-06-20 at 11.34.51.mov" \
   /Users/redmen/Projects/lyante-ticketing-teaser/public/footage/lyante-walkthrough.mov
```

Expected: `public/footage/lyante-walkthrough.mov` exists. Verify with:

```bash
ls -la /Users/redmen/Projects/lyante-ticketing-teaser/public/footage/
```

Expected: shows `lyante-walkthrough.mov` at roughly 44MB.

- [ ] **Step 2: Write `src/lib/footage.ts`**

```ts
import { getStaticFiles } from 'remotion';

export const FOOTAGE_FILE = 'footage/lyante-walkthrough.mov';

export function hasFootage(relativePath: string): boolean {
  return getStaticFiles().some((file) => file.name === relativePath);
}
```

No unit test here: `getStaticFiles()` only returns real data inside Remotion's bundler/render context, so a plain Vitest run can't exercise it meaningfully. It's verified by the render smoke test in Task 12 (the real file is present, so the real-footage branch renders; the placeholder branch is exercised manually by temporarily renaming the file, which is not required for this plan).

- [ ] **Step 3: Commit**

```bash
cd /Users/redmen/Projects/lyante-ticketing-teaser
git add src/lib/footage.ts
git commit -m "feat: add footage existence helper"
```

Note: `public/footage/lyante-walkthrough.mov` is a large binary — do not add a `.gitignore` rule excluding it for this project (unlike `tortoise-trails`/`event-tickets`, this project's footage is the deliverable's raw material, not a dev-only asset). Commit it normally:

```bash
git add public/footage/lyante-walkthrough.mov
git commit -m "chore: add source footage for brand reel teaser"
```

---

### Task 6: Caption component

**Files:**
- Create: `/Users/redmen/Projects/lyante-ticketing-teaser/src/components/Caption.tsx`

- [ ] **Step 1: Write `src/components/Caption.tsx`**

```tsx
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { bebasFontFamily } from '../fonts';
import { COLORS } from '../theme';

interface CaptionProps {
  text: string;
  delayFrames?: number;
}

export const Caption: React.FC<CaptionProps> = ({ text, delayFrames = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localFrame = Math.max(0, frame - delayFrames);

  const progress = spring({
    frame: localFrame,
    fps,
    config: { damping: 200, stiffness: 120, mass: 0.8 },
  });

  const translateY = interpolate(progress, [0, 1], [40, 0]);
  const opacity = interpolate(progress, [0, 1], [0, 1]);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 180,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        opacity,
        transform: `translateY(${translateY}px)`,
      }}
    >
      <span
        style={{
          fontFamily: bebasFontFamily,
          fontSize: 56,
          letterSpacing: 2,
          color: COLORS.ivory,
          textTransform: 'uppercase',
          textAlign: 'center',
          padding: '0 64px',
          textShadow: '0 4px 24px rgba(0,0,0,0.6)',
        }}
      >
        {text}
      </span>
    </div>
  );
};
```

- [ ] **Step 2: Verify it type-checks**

```bash
cd /Users/redmen/Projects/lyante-ticketing-teaser
pnpm exec tsc --noEmit
```

Expected: no errors related to `src/components/Caption.tsx` (the `./Root` error in `src/index.ts` is still expected until Task 11).

- [ ] **Step 3: Commit**

```bash
git add src/components/Caption.tsx
git commit -m "feat: add animated Caption component"
```

---

### Task 7: DeviceFrame and FootagePlaceholder components

**Files:**
- Create: `/Users/redmen/Projects/lyante-ticketing-teaser/src/components/DeviceFrame.tsx`
- Create: `/Users/redmen/Projects/lyante-ticketing-teaser/src/components/FootagePlaceholder.tsx`

- [ ] **Step 1: Write `src/components/DeviceFrame.tsx`**

```tsx
import { AbsoluteFill } from 'remotion';
import { COLORS } from '../theme';

export const DeviceFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: 760,
          height: 1620,
          borderRadius: 48,
          overflow: 'hidden',
          border: `3px solid ${COLORS.gold}`,
          boxShadow: '0 40px 120px rgba(0,0,0,0.7)',
        }}
      >
        {children}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(circle at 50% 30%, transparent 40%, ${COLORS.goldDeep}33 100%)`,
            pointerEvents: 'none',
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Write `src/components/FootagePlaceholder.tsx`**

```tsx
import { AbsoluteFill } from 'remotion';
import { dmMonoFontFamily } from '../fonts';
import { COLORS } from '../theme';

export const FootagePlaceholder: React.FC<{ filename: string }> = ({ filename }) => (
  <AbsoluteFill
    style={{
      backgroundColor: COLORS.bg,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 80,
    }}
  >
    <span
      style={{
        fontFamily: dmMonoFontFamily,
        color: COLORS.gold,
        fontSize: 32,
        textAlign: 'center',
        lineHeight: 1.5,
      }}
    >
      FOOTAGE MISSING:{'\n'}
      {filename}
    </span>
  </AbsoluteFill>
);
```

- [ ] **Step 3: Verify it type-checks**

```bash
cd /Users/redmen/Projects/lyante-ticketing-teaser
pnpm exec tsc --noEmit
```

Expected: no errors related to either new file.

- [ ] **Step 4: Commit**

```bash
git add src/components/DeviceFrame.tsx src/components/FootagePlaceholder.tsx
git commit -m "feat: add DeviceFrame and FootagePlaceholder components"
```

---

### Task 8: RealFootageScene component

**Files:**
- Create: `/Users/redmen/Projects/lyante-ticketing-teaser/src/components/RealFootageScene.tsx`

- [ ] **Step 1: Write `src/components/RealFootageScene.tsx`**

```tsx
import { OffthreadVideo, staticFile } from 'remotion';
import { Caption } from './Caption';
import { DeviceFrame } from './DeviceFrame';
import { FootagePlaceholder } from './FootagePlaceholder';
import { FOOTAGE_FILE, hasFootage } from '../lib/footage';

interface RealFootageSceneProps {
  startFrom: number;
  playbackRate?: number;
  caption: string;
  captionDelayFrames?: number;
}

export const RealFootageScene: React.FC<RealFootageSceneProps> = ({
  startFrom,
  playbackRate = 1,
  caption,
  captionDelayFrames = 20,
}) => {
  if (!hasFootage(FOOTAGE_FILE)) {
    return <FootagePlaceholder filename={FOOTAGE_FILE} />;
  }

  return (
    <>
      <DeviceFrame>
        <OffthreadVideo
          src={staticFile(FOOTAGE_FILE)}
          startFrom={startFrom}
          playbackRate={playbackRate}
          muted
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </DeviceFrame>
      <Caption text={caption} delayFrames={captionDelayFrames} />
    </>
  );
};
```

- [ ] **Step 2: Verify it type-checks**

```bash
cd /Users/redmen/Projects/lyante-ticketing-teaser
pnpm exec tsc --noEmit
```

Expected: no errors related to this file. If `playbackRate` is reported as an invalid prop on `OffthreadVideo`, check the installed Remotion version's typings (`node_modules/remotion/dist/video/OffthreadVideo.d.ts`) for the correct prop name and adjust this file before proceeding — do not skip the type error.

- [ ] **Step 3: Commit**

```bash
git add src/components/RealFootageScene.tsx
git commit -m "feat: add RealFootageScene component for trimmed video playback"
```

---

### Task 9: The five real-footage scene components

**Files:**
- Create: `/Users/redmen/Projects/lyante-ticketing-teaser/src/scenes/Hook.tsx`
- Create: `/Users/redmen/Projects/lyante-ticketing-teaser/src/scenes/ProcessMontage.tsx`
- Create: `/Users/redmen/Projects/lyante-ticketing-teaser/src/scenes/TicketingSite.tsx`
- Create: `/Users/redmen/Projects/lyante-ticketing-teaser/src/scenes/Portfolio.tsx`
- Create: `/Users/redmen/Projects/lyante-ticketing-teaser/src/scenes/Outro.tsx`

Each scene maps to a timestamp window in the source recording (see the spec's source timeline table). All durations are governed by `SCENE_FRAMES` in `theme.ts` via the `TransitionSeries.Sequence` wrapper in Task 11 — these components don't set their own duration.

- [ ] **Step 1: Write `src/scenes/Hook.tsx`**

```tsx
import { RealFootageScene } from '../components/RealFootageScene';
import { secToFrames } from '../theme';

export const Hook: React.FC = () => (
  <RealFootageScene startFrom={secToFrames(0)} caption="We Document The Journey" />
);
```

- [ ] **Step 2: Write `src/scenes/ProcessMontage.tsx`**

```tsx
import { RealFootageScene } from '../components/RealFootageScene';
import { secToFrames } from '../theme';

export const ProcessMontage: React.FC = () => (
  <RealFootageScene
    startFrom={secToFrames(10)}
    playbackRate={3}
    caption="From first frame to final cut"
  />
);
```

- [ ] **Step 3: Write `src/scenes/TicketingSite.tsx`**

```tsx
import { RealFootageScene } from '../components/RealFootageScene';
import { secToFrames } from '../theme';

export const TicketingSite: React.FC = () => (
  <RealFootageScene
    startFrom={secToFrames(25)}
    playbackRate={1.25}
    caption="Smart ticketing, built in"
  />
);
```

- [ ] **Step 4: Write `src/scenes/Portfolio.tsx`**

```tsx
import { RealFootageScene } from '../components/RealFootageScene';
import { secToFrames } from '../theme';

export const Portfolio: React.FC = () => (
  <RealFootageScene startFrom={secToFrames(30)} playbackRate={2} caption="This is what we make" />
);
```

- [ ] **Step 5: Write `src/scenes/Outro.tsx`**

```tsx
import { RealFootageScene } from '../components/RealFootageScene';
import { secToFrames } from '../theme';

export const Outro: React.FC = () => (
  <RealFootageScene
    startFrom={secToFrames(45)}
    caption="Lyante Production — Send Your Brief"
  />
);
```

- [ ] **Step 6: Verify it all type-checks**

```bash
cd /Users/redmen/Projects/lyante-ticketing-teaser
pnpm exec tsc --noEmit
```

Expected: no errors related to any file in `src/scenes/` (the `./Root` error is still expected until Task 11).

- [ ] **Step 7: Commit**

```bash
git add src/scenes/Hook.tsx src/scenes/ProcessMontage.tsx src/scenes/TicketingSite.tsx src/scenes/Portfolio.tsx src/scenes/Outro.tsx
git commit -m "feat: add the five real-footage scenes"
```

---

### Task 10: Animated Ticket + QR scene

**Files:**
- Create: `/Users/redmen/Projects/lyante-ticketing-teaser/src/scenes/TicketQr.tsx`

This is the one fully-animated scene: a ticket card springs in, then a QR code (built from the `buildQrGrid` utility from Task 4) draws in cell-by-cell.

- [ ] **Step 1: Write `src/scenes/TicketQr.tsx`**

```tsx
import { useMemo } from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Caption } from '../components/Caption';
import { cormorantFontFamily, dmMonoFontFamily } from '../fonts';
import { buildQrGrid } from '../lib/qr';
import { COLORS } from '../theme';

const QR_VALUE = 'https://lyante.com/ticket/SAMPLE-TOKEN-7F3A';
const QR_CELL_PX = 14;
const QR_DRAW_START_FRAME = 25;
const QR_DRAW_DURATION_FRAMES = 50;

export const TicketQr: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const { cells, size } = useMemo(() => buildQrGrid(QR_VALUE), []);

  const cardProgress = spring({
    frame,
    fps,
    config: { damping: 200, stiffness: 100, mass: 0.9 },
  });
  const cardScale = interpolate(cardProgress, [0, 1], [0.7, 1]);
  const cardOpacity = interpolate(cardProgress, [0, 1], [0, 1]);

  const qrFrame = Math.max(0, frame - QR_DRAW_START_FRAME);
  const cellsToShow = Math.floor(
    interpolate(qrFrame, [0, QR_DRAW_DURATION_FRAMES], [0, cells.length], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  );

  const qrSizePx = size * QR_CELL_PX;

  return (
    <AbsoluteFill
      style={{ backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' }}
    >
      <div
        style={{
          transform: `scale(${cardScale})`,
          opacity: cardOpacity,
          width: 760,
          backgroundColor: COLORS.ivory,
          border: `4px solid ${COLORS.gold}`,
          borderRadius: 32,
          padding: 48,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 32,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: cormorantFontFamily, fontSize: 48, fontWeight: 700, color: COLORS.coal }}>
            Nepal Music Festival
          </div>
          <div
            style={{
              fontFamily: dmMonoFontFamily,
              fontSize: 22,
              letterSpacing: 2,
              color: COLORS.gold,
              marginTop: 8,
            }}
          >
            GENERAL ADMISSION
          </div>
        </div>

        <svg width={qrSizePx} height={qrSizePx} viewBox={`0 0 ${qrSizePx} ${qrSizePx}`}>
          <rect width={qrSizePx} height={qrSizePx} fill={COLORS.ivory} />
          {cells.slice(0, cellsToShow).map((cell, i) => (
            <rect
              key={i}
              x={cell.x * QR_CELL_PX}
              y={cell.y * QR_CELL_PX}
              width={QR_CELL_PX}
              height={QR_CELL_PX}
              fill={COLORS.coal}
            />
          ))}
        </svg>

        <div style={{ fontFamily: dmMonoFontFamily, fontSize: 18, color: COLORS.ash, letterSpacing: 1 }}>
          TOKEN: SAMPLE-7F3A
        </div>
      </div>

      <Caption text="Every ticket, uniquely verified" delayFrames={90} />
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Verify it type-checks**

```bash
cd /Users/redmen/Projects/lyante-ticketing-teaser
pnpm exec tsc --noEmit
```

Expected: no errors related to `src/scenes/TicketQr.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/scenes/TicketQr.tsx
git commit -m "feat: add animated Ticket + QR scene"
```

---

### Task 11: Compose the full teaser and register it

**Files:**
- Create: `/Users/redmen/Projects/lyante-ticketing-teaser/src/BrandReelTeaser.tsx`
- Create: `/Users/redmen/Projects/lyante-ticketing-teaser/src/Root.tsx`

- [ ] **Step 1: Write `src/BrandReelTeaser.tsx`**

```tsx
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { Hook } from './scenes/Hook';
import { Outro } from './scenes/Outro';
import { Portfolio } from './scenes/Portfolio';
import { ProcessMontage } from './scenes/ProcessMontage';
import { TicketQr } from './scenes/TicketQr';
import { TicketingSite } from './scenes/TicketingSite';
import { SCENE_FRAMES, TRANSITION_FRAMES } from './theme';

const transition = (
  <TransitionSeries.Transition
    presentation={fade()}
    timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
  />
);

export const BrandReelTeaser: React.FC = () => {
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={SCENE_FRAMES.hook}>
        <Hook />
      </TransitionSeries.Sequence>
      {transition}
      <TransitionSeries.Sequence durationInFrames={SCENE_FRAMES.processMontage}>
        <ProcessMontage />
      </TransitionSeries.Sequence>
      {transition}
      <TransitionSeries.Sequence durationInFrames={SCENE_FRAMES.ticketingSite}>
        <TicketingSite />
      </TransitionSeries.Sequence>
      {transition}
      <TransitionSeries.Sequence durationInFrames={SCENE_FRAMES.ticketQr}>
        <TicketQr />
      </TransitionSeries.Sequence>
      {transition}
      <TransitionSeries.Sequence durationInFrames={SCENE_FRAMES.portfolio}>
        <Portfolio />
      </TransitionSeries.Sequence>
      {transition}
      <TransitionSeries.Sequence durationInFrames={SCENE_FRAMES.outro}>
        <Outro />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
```

Note: reusing one `transition` element 5 times in JSX is safe here — `TransitionSeries` reads each `<TransitionSeries.Transition>` it's given positionally as a sibling; React allows rendering the same element reference in multiple sibling slots in this context since none of them hold per-instance state.

- [ ] **Step 2: Write `src/Root.tsx`**

```tsx
import { Composition } from 'remotion';
import { BrandReelTeaser } from './BrandReelTeaser';
import { FPS, HEIGHT, TOTAL_FRAMES, WIDTH } from './theme';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="BrandReelTeaser"
      component={BrandReelTeaser}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  );
};
```

- [ ] **Step 3: Verify the whole project type-checks**

```bash
cd /Users/redmen/Projects/lyante-ticketing-teaser
pnpm exec tsc --noEmit
```

Expected: no errors. This is the first point in the plan where `src/index.ts`'s import of `./Root` resolves, so this must be fully clean.

- [ ] **Step 4: Run the full test suite**

```bash
cd /Users/redmen/Projects/lyante-ticketing-teaser
pnpm test
```

Expected: PASS — all 7 tests from Tasks 2 and 4 still passing.

- [ ] **Step 5: Commit**

```bash
git add src/BrandReelTeaser.tsx src/Root.tsx
git commit -m "feat: compose BrandReelTeaser with TransitionSeries and register composition"
```

---

### Task 12: Render smoke test and final render

**Files:** none (verification only)

- [ ] **Step 1: Boot Remotion Studio as a smoke test**

```bash
cd /Users/redmen/Projects/lyante-ticketing-teaser
timeout 20 pnpm dev || true
```

Expected: the command starts a local server (prints a `http://localhost:...` URL) without throwing a build error in the first ~20 seconds, then the `timeout` kills it. If it prints a stack trace instead of a server URL, stop and fix the underlying error before continuing — do not proceed to rendering with a broken composition.

- [ ] **Step 2: Render a fast partial smoke test (first scene only)**

```bash
cd /Users/redmen/Projects/lyante-ticketing-teaser
pnpm exec remotion render BrandReelTeaser out/smoke-hook.mp4 --frames=0-89 --codec=h264
```

Expected: command exits 0, `out/smoke-hook.mp4` exists. This renders only the Hook scene (frames 0–89) to catch failures fast before committing to a full render.

- [ ] **Step 3: Render a fast partial smoke test (TicketQr scene)**

First, compute the TicketQr scene's frame range. Per `SCENE_FRAMES` and 4 transitions before it (hook, processMontage, ticketingSite each contribute their duration minus the transition overlap before them): the TicketQr scene starts at frame `90 + 150 + 120 - (9 * 2)` minus further adjustment — rather than hand-deriving this, render a wider safe range that's guaranteed to include it:

```bash
pnpm exec remotion render BrandReelTeaser out/smoke-ticketqr.mp4 --frames=300-490 --codec=h264
```

Expected: command exits 0, `out/smoke-ticketqr.mp4` exists, and visually contains the ticket card / QR animation when opened (open it with `open out/smoke-ticketqr.mp4`).

- [ ] **Step 4: Full render**

```bash
cd /Users/redmen/Projects/lyante-ticketing-teaser
pnpm run build
```

Expected: command exits 0, `out/teaser.mp4` exists. Verify duration and dimensions:

```bash
mdls -name kMDItemDurationSeconds -name kMDItemPixelWidth -name kMDItemPixelHeight out/teaser.mp4
```

Expected: duration roughly 25.5s (765 frames / 30fps), width 1080, height 1920.

- [ ] **Step 5: Clean up smoke-test renders and commit**

```bash
cd /Users/redmen/Projects/lyante-ticketing-teaser
rm -f out/smoke-hook.mp4 out/smoke-ticketqr.mp4
git add -A
git commit -m "chore: verify full render pipeline" --allow-empty
```

`out/` is gitignored (Task 1), so this commit only captures any residual file changes; `--allow-empty` ensures the step doesn't fail if there's nothing to stage.

---

## Manual review (not automated)

After Task 12, open `out/teaser.mp4` and watch it end-to-end. Things an automated step can't verify:
- Whether the 3s Hook trim (source 0–3s) actually shows the cleanest part of the hero before any "drag to reveal" interaction starts.
- Whether the sped-up Process Montage (3×) and Portfolio (2×) scenes feel intentional rather than jarring.
- Whether captions overlap awkwardly with any on-screen text already visible in the real footage.

If any of these need adjustment, the fix is almost always a one-line change to a `startFrom`/`playbackRate` argument in `src/scenes/*.tsx` or a caption string — no architectural changes expected.
