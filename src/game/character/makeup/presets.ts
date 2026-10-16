import type { Appearance, Makeup } from '../../../shared/appearance'
import { DEFAULT_MAKEUP, normalizeMakeup } from '../../../shared/appearance'

/** Looks de maquiagem prontos (paletas baseadas em maquiagem real). Aplicar = trocar `makeup` + cor do batom. */
export interface MakeupLook {
  id: string
  label: string
  note: string
  makeup: Partial<{ [K in keyof Makeup]: Partial<Makeup[K]> | Makeup[K] }>
  lips: { color: string; gloss: number }
  /** cor da iris opcional */
  eyes?: string
}

export const MAKEUP_LOOKS: MakeupLook[] = [
  {
    id: 'natural',
    label: 'Natural glow',
    note: 'Pele iluminada, rubor pêssego',
    makeup: {
      foundation: { coverage: 0.25, shift: 0 },
      highlighter: { amount: 0.55, color: '#fff0dc' },
      blush: { style: 'sunkissed', color: '#ee9a86', amount: 0.55 },
      freckles: 0.35,
      eyeshadow: { style: 'wash', c1: '#c79a86', c2: '#e6c3ae', shimmer: 0.1, intensity: 0.5 },
      brows: { style: 'soft', color: '#7a5a42', thickness: 0.45 },
      lips: { finish: 'gloss', liner: null, ombre: null },
    },
    lips: { color: '#d98a86', gloss: 0.7 },
  },
  {
    id: 'glam',
    label: 'Glam noturno',
    note: 'Esfumado bronze, delineado gatinho',
    makeup: {
      foundation: { coverage: 0.45, shift: 0 },
      contour: 0.6,
      highlighter: { amount: 0.7, color: '#ffe6c2' },
      blush: { style: 'draping', color: '#c9776e', amount: 0.5 },
      eyeshadow: { style: 'smoky', c1: '#3d2a2a', c2: '#a8745a', shimmer: 0.55, intensity: 0.85 },
      eyeliner: { style: 'wing', color: '#150f12', thickness: 0.6 },
      lashes: { style: 'dramatic', color: '#150f12', length: 0.65 },
      brows: { style: 'bold', color: '#4a3326', thickness: 0.5 },
      lips: { finish: 'matte', liner: '#7d4a46', ombre: null },
    },
    lips: { color: '#b86d68', gloss: 0.2 },
  },
  {
    id: 'y2k',
    label: 'Y2K gelo',
    note: 'Halo azul, gloss e brilho',
    makeup: {
      highlighter: { amount: 0.8, color: '#f2f6ff' },
      blush: { style: 'apple', color: '#f4a3c0', amount: 0.4 },
      glitter: { amount: 0.4, color: '#dff0ff' },
      eyeshadow: { style: 'halo', c1: '#7fb4e6', c2: '#e9f2ff', shimmer: 0.9, intensity: 0.85 },
      eyeliner: { style: 'tight', color: '#3a6fb0', thickness: 0.4 },
      lashes: { style: 'spider', color: '#1b1b2a', length: 0.5 },
      brows: { style: 'thin', color: '#6a5444', thickness: 0.35 },
      gems: { style: 'liner', kind: 'pearl', color: '#f6f2ff' },
      lips: { finish: 'gloss', liner: null, ombre: null },
    },
    lips: { color: '#e88db0', gloss: 1 },
  },
  {
    id: 'doll',
    label: 'Boneca',
    note: 'Cílios de boneca, rubor maçã',
    makeup: {
      foundation: { coverage: 0.3, shift: 0.15 },
      highlighter: { amount: 0.4, color: '#fff3ee' },
      blush: { style: 'apple', color: '#f08a9c', amount: 0.75 },
      freckles: 0.5,
      eyeshadow: { style: 'wash', c1: '#e8a0b4', c2: '#f6cdd8', shimmer: 0.3, intensity: 0.65 },
      eyeliner: { style: 'tight', color: '#4a2a30', thickness: 0.4 },
      lashes: { style: 'doll', color: '#2a1a1e', length: 0.6 },
      brows: { style: 'soft', color: '#8a6a58', thickness: 0.4 },
      tattoo: { style: 'hearts', color: '#8a3b52' },
      lips: { finish: 'satin', liner: null, ombre: '#f0788f' },
    },
    lips: { color: '#d9606f', gloss: 0.55 },
  },
  {
    id: 'gotica',
    label: 'Gótica',
    note: 'Lábio ameixa, delineado gráfico',
    makeup: {
      foundation: { coverage: 0.55, shift: 0.4 },
      contour: 0.4,
      blush: { style: 'none', color: '#b04a60', amount: 0.3 },
      eyeshadow: { style: 'smoky', c1: '#120d14', c2: '#4a2a5a', shimmer: 0.2, intensity: 0.9 },
      eyeliner: { style: 'graphic', color: '#0c080c', thickness: 0.7 },
      lashes: { style: 'spider', color: '#0c080c', length: 0.8 },
      brows: { style: 'straight', color: '#17110f', thickness: 0.6 },
      lips: { finish: 'matte', liner: '#2a0f1e', ombre: null },
    },
    lips: { color: '#4d1530', gloss: 0 },
  },
  {
    id: 'festival',
    label: 'Festival',
    note: 'Cor, brilho e estrelas',
    makeup: {
      highlighter: { amount: 0.7, color: '#fff2c2' },
      blush: { style: 'sunkissed', color: '#ff8f7a', amount: 0.5 },
      glitter: { amount: 0.8, color: '#ffd86b' },
      eyeshadow: { style: 'graphic', c1: '#19b3a6', c2: '#ffcf3a', shimmer: 0.8, intensity: 0.95 },
      eyeliner: { style: 'color', color: '#ff4f8b', thickness: 0.55 },
      lashes: { style: 'doll', color: '#1c1a22', length: 0.5 },
      brows: { style: 'bold', color: '#5a3a2a', thickness: 0.5 },
      gems: { style: 'cheek', kind: 'star', color: '#ffd23f' },
      tattoo: { style: 'stars', color: '#2c2b4a' },
      lips: { finish: 'metallic', liner: null, ombre: null },
    },
    lips: { color: '#f0577a', gloss: 0.8 },
  },
  {
    id: 'classico',
    label: 'Vermelho clássico',
    note: 'Gatinho e batom vermelho',
    makeup: {
      foundation: { coverage: 0.4, shift: 0.1 },
      contour: 0.3,
      highlighter: { amount: 0.5, color: '#fff0e0' },
      blush: { style: 'draping', color: '#e59084', amount: 0.4 },
      eyeshadow: { style: 'cut', c1: '#a58a7c', c2: '#d6bfae', shimmer: 0.15, intensity: 0.6 },
      eyeliner: { style: 'wing', color: '#120d10', thickness: 0.55 },
      lashes: { style: 'dramatic', color: '#120d10', length: 0.5 },
      brows: { style: 'straight', color: '#5a4030', thickness: 0.5 },
      marks: ['cheek'],
      lips: { finish: 'satin', liner: '#8f1020', ombre: null },
    },
    lips: { color: '#c1122a', gloss: 0.45 },
  },
  {
    id: 'coreana',
    label: 'Pêssego coreano',
    note: 'Lábios ombré, pele de vidro',
    makeup: {
      foundation: { coverage: 0.35, shift: 0.2 },
      highlighter: { amount: 0.6, color: '#fff6f0' },
      blush: { style: 'apple', color: '#f6a08e', amount: 0.55 },
      eyeshadow: { style: 'wash', c1: '#e8a58c', c2: '#f4cdb8', shimmer: 0.35, intensity: 0.6 },
      eyeliner: { style: 'tight', color: '#5a3a30', thickness: 0.35 },
      lashes: { style: 'natural', color: '#2a1c1c', length: 0.4 },
      brows: { style: 'straight', color: '#8a6a52', thickness: 0.4 },
      gems: { style: 'none', kind: 'pearl', color: '#fff6ee' },
      lips: { finish: 'gloss', liner: null, ombre: '#ff8a80' },
    },
    lips: { color: '#e0556a', gloss: 0.85 },
  },
]

/** Aplica um look de maquiagem a uma aparencia. */
export function applyMakeupLook(a: Appearance, look: MakeupLook): Appearance {
  return { ...a, makeup: normalizeMakeup({ ...DEFAULT_MAKEUP, ...look.makeup }), lips: { ...look.lips }, eyes: look.eyes ? { ...(a.eyes ?? { color: null, ring: 0.35 }), color: look.eyes } : a.eyes }
}

// dev: aplica um look pelo indice (capturas de tela)
if (import.meta.env.DEV)
  (window as unknown as { __mkLook: (i: number) => void }).__mkLook = async (i: number) => {
    const { useAppearanceStore } = await import('../../../state/appearanceStore')
    const s = useAppearanceStore.getState()
    s.setAppearance(applyMakeupLook(s.appearance, MAKEUP_LOOKS[i]))
  }
