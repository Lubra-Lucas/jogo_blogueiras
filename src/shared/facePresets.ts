import { DEFAULT_FACE_LAYERS, mergeFace, type FaceLayers } from './faceLayers'

/** Um look masculino pronto: formato (morphs f_*), camadas do rosto, cabelo e cores. So dados; nada aqui toca o editor. */
export interface MaleLook {
  name: string
  skin: string
  suit: string
  face: FaceLayers
  /** pesos dos morphs de formato (nome do shape key -> 0..1); `f_maleBase` entra em 1 se nao for dito o contrario */
  shape: Record<string, number>
  hair: { id: string; color: string; gloss?: number } | null
}

const F = (p: Parameters<typeof mergeFace>[1]) => mergeFace(DEFAULT_FACE_LAYERS, p)
const L = (name: string, skin: string, shape: MaleLook['shape'], face: Parameters<typeof mergeFace>[1], hair: MaleLook['hair'], suit = '#2a4fa8'): MaleLook => ({ name, skin, suit, shape, face: F(face), hair })

/** Folha de 12 rostos: formato + camadas + cabelo, em varios tons de pele. */
export const TWELVE: MaleLook[] = [
  L('Quadrado', '#d9a58a', { f_jawWide: 0.9, f_jawAngular: 0.8, f_chinWide: 0.7, f_browRidge: 0.6, f_cheekboneHigh: 0.3, f_faceShort: 0.3, f_neckThick: 0.4 },
    { eye: { style: 'natural', lash: 'none', iris: '#5a4030', scale: 1.15, linerAmt: 0.8 }, brow: { style: 'thick', color: '#2a2018' }, mouth: { style: 'natural', color: '#a8645c', gloss: 0.1 }, beard: { style: 'stubble', color: '#2a2018', amount: 0.95 } },
    { id: 'hair.m.buzz', color: '#2b2622', gloss: 0.2 }),
  L('Retangular / longo', '#c58f6e', { f_faceLong: 0.9, f_jawWide: 0.4, f_chinForward: 0.4, f_noseLong: 0.5, f_foreheadHigh: 0.4, f_cheekHollow: 0.4, f_browRidge: 0.3 },
    { eye: { style: 'natural', lash: 'none', iris: '#3d3a36', scale: 1.05, tilt: -3, linerAmt: 0.7 }, brow: { style: 'thick', color: '#2e2219', tilt: -4, y: -0.002 }, mouth: { style: 'thin', color: '#8e5850', gloss: 0 } },
    { id: 'hair.m.sidepart', color: '#4a3626' }),
  L('Oval jovem', '#f0c9b2', { f_chinPointed: 0.2, f_cheekFull: 0.2, f_jawSoft: 0.4 },
    { eye: { style: 'natural', lash: 'natural', iris: '#4e86b8', scale: 1.3 }, brow: { style: 'thin', color: '#8a5a30' }, mouth: { style: 'natural', color: '#c97c78', gloss: 0.3 } },
    { id: 'hair.m.quiff', color: '#8a5a30' }),
  L('Redondo simpatico', '#e3b08f', { f_faceWide: 0.7, f_cheekFull: 0.9, f_chinBack: 0.3, f_jawSoft: 0.7, f_faceShort: 0.5, f_noseWide: 0.4 },
    { eye: { style: 'natural', lash: 'natural', iris: '#5a3f2a', scale: 1.25 }, brow: { style: 'thin', color: '#3a2a20' }, mouth: { style: 'natural', color: '#c0766c', gloss: 0.3, scale: 1.1 }, blush: { amount: 0.3, scale: 1.1 } },
    { id: 'hair.m.sidepart', color: '#1f1a17' }),
  L('Triangular', '#8d5a3e', { f_chinWide: 0.9, f_jawWide: 0.8, f_foreheadLow: 0.5, f_faceShort: 0.2, f_cheekHollow: 0.2 },
    { eye: { style: 'natural', lash: 'none', iris: '#2e231c', scale: 1.1 }, brow: { style: 'thick', color: '#17110d' }, mouth: { style: 'thin', color: '#6a3e38', gloss: 0.05 }, beard: { style: 'goatee', color: '#17110d', amount: 1 } },
    { id: 'hair.m.sidepart', color: '#17110d' }),
  L('Losango', '#a4714f', { f_cheekboneHigh: 1, f_jawAngular: 0.6, f_cheekHollow: 0.7, f_chinPointed: 0.5, f_foreheadLow: 0.2, f_browRidge: 0.5 },
    { eye: { style: 'almond', lash: 'natural', iris: '#5a4a2a', scale: 1.2, tilt: 3 }, brow: { style: 'arched', color: '#1c1511', tilt: 3 }, mouth: { style: 'thin', color: '#7e4a44', gloss: 0.1 } },
    { id: 'hair.m.quiff', color: '#17120f' }),
  L('Maduro', '#c9967a', { f_jawWide: 0.6, f_browRidge: 0.8, f_cheekHollow: 0.5, f_neckThick: 0.6, f_earsBig: 0.4, f_foreheadHigh: 0.5, f_adamsApple: 0.7 },
    { eye: { style: 'natural', lash: 'none', iris: '#6a5a48', scale: 1.05, linerAmt: 0.35 }, brow: { style: 'thick', color: '#8a8a88', scale: 1.1 }, mouth: { style: 'thin', color: '#8a5a52', gloss: 0 }, beard: { style: 'full', color: '#8d8d8b', amount: 0.9 }, detail: { bags: 0.8, lines: 0.9 } },
    { id: 'hair.m.sidepart', color: '#a9a9a7' }),
  L('Atleta', '#5f3a2a', { f_jawAngular: 1, f_jawWide: 0.8, f_neckThick: 1, f_browRidge: 0.7, f_chinWide: 0.6, f_cheekboneHigh: 0.4, f_adamsApple: 0.5 },
    { eye: { style: 'natural', lash: 'none', iris: '#3f3a32', scale: 1.05, linerAmt: 0.7 }, brow: { style: 'thick', color: '#0f0b09' }, mouth: { style: 'natural', color: '#6e3c36', gloss: 0.15 } },
    { id: 'hair.m.buzz', color: '#14100e', gloss: 0.25 }),
  L('Artistico', '#e1b799', { f_chinPointed: 0.4, f_cheekboneHigh: 0.5, f_noseLong: 0.4, f_noseBridge: 0.6, f_jawSoft: 0.3, f_lipsFull: 0.4 },
    { eye: { style: 'almond', lash: 'natural', iris: '#6a7a4a', scale: 1.25, tilt: 2 }, brow: { style: 'arched', color: '#3a2c22' }, mouth: { style: 'natural', color: '#b8706a', gloss: 0.2 }, beard: { style: 'mustache', color: '#2a1f18', amount: 0.95 } },
    { id: 'hair.m.sidepart', color: '#2a1d14' }),
  L('Delicado / boneca', '#f3d2c2', { f_jawSoft: 1, f_chinPointed: 0.5, f_cheekFull: 0.5, f_faceShort: 0.3, f_lipsFull: 0.7, f_earsSmall: 0.6, f_maleBase: 0.15 },
    { eye: { style: 'doll', lash: 'doll', iris: '#5aa0d6', liner: '#1c1618', lashColor: '#1a1416', scale: 1.4, gap: 0.0085, y: 0.0015, tilt: 2 }, brow: { style: 'arched', color: '#7a5a42', opacity: 0.85, gap: 0.0045, y: 0.004, tilt: 4, scale: 0.95 }, mouth: { style: 'doll', color: '#e0707c', gloss: 1, scale: 1.05, y: 0.001, opacity: 0.95 }, blush: { amount: 0.55, color: '#f08a96', scale: 1.15, y: -0.002 } },
    { id: 'hair.m.quiff', color: '#c7a05a' }),
  L('Coracao', '#edc1a6', { f_foreheadHigh: 0.8, f_faceWide: 0.4, f_chinPointed: 1, f_jawSoft: 0.7, f_cheekboneHigh: 0.6, f_browRidge: 0.2, f_chinBack: 0.2 },
    { eye: { style: 'natural', lash: 'natural', iris: '#2f5f45', scale: 1.3, gap: 0.001 }, brow: { style: 'arched', color: '#4a2f1e' }, mouth: { style: 'natural', color: '#c2766e', gloss: 0.25 } },
    { id: 'hair.m.quiff', color: '#4a2f1e' }),
  L('Livre', '#3d2418', { f_faceLong: 0.5, f_jawWide: 1, f_chinCleft: 1, f_chinForward: 0.8, f_earsBig: 0.9, f_noseWide: 0.9, f_noseBridge: 0.8, f_browRidge: 1, f_cheekFull: 0.5, f_lipsFull: 1 },
    { eye: { style: 'doll', lash: 'natural', iris: '#c58a1e', scale: 0.75, gap: -0.002, tilt: 6 }, brow: { style: 'thick', color: '#d8d8d6', tilt: 8, scale: 1.15 }, mouth: { style: 'natural', color: '#5a2e2a', gloss: 0.35, scale: 1.15 }, beard: { style: 'full', color: '#e6e6e4', amount: 0.95 }, detail: { bags: 0.5, lines: 0.6 } },
    { id: 'hair.m.buzz', color: '#dcdcda', gloss: 0.2 }, '#b8412a'),
]

/** Seis rostos da etapa anterior (grade) e o "visual de boneca" (agora com formato). */
export const DOLLISH: MaleLook = TWELVE[9]
export const SIX: MaleLook[] = [TWELVE[0], TWELVE[2], TWELVE[6], TWELVE[7], TWELVE[9], TWELVE[11]]

export const SHAPE_MORPHS = [
  'f_jawWide', 'f_jawAngular', 'f_jawSoft', 'f_chinWide', 'f_chinPointed', 'f_chinForward', 'f_chinBack', 'f_chinCleft', 'f_browRidge',
  'f_foreheadHigh', 'f_foreheadLow', 'f_cheekboneHigh', 'f_cheekFull', 'f_cheekHollow', 'f_faceLong', 'f_faceShort', 'f_faceWide',
  'f_noseWide', 'f_noseLong', 'f_noseBridge', 'f_lipsFull', 'f_lipsThin', 'f_neckThick', 'f_adamsApple', 'f_earsSmall', 'f_earsBig',
] as const

// ---------------------------------------------------------------- boneca feminina com camadas (doll_layers.glb)
export interface FemLook {
  name: string
  skin: string
  face: FaceLayers
  /** pesos dos morphs f_* da boneca (jawWide/Soft, chinWide/Pointed, cheekFull/Hollow, noseWide/Narrow, lipsFull/Thin, faceLong/Short) */
  shape: Record<string, number>
  hair: { id: string; color: string }
}

/** "Classica": as camadas EXTRAIDAS da pintura original (extract_classic_layers.py): olho, iris, cilios com tufos, sobrancelha, tinta dos labios e o
 *  sombreado da pele (blush/bochechas/testa/rosado dos olhos). Sem desenhos novos: deve ficar praticamente igual a boneca antiga. */
export const DOLL_REPLICA: FemLook = {
  name: 'Boneca (camadas, Classica)',
  skin: '#efcdbd',
  face: F({
    eye: { style: 'classic', lash: 'classic', iris: '#799aad', linerAmt: 1 },
    brow: { style: 'classic', color: '#a68672', opacity: 1 },
    mouth: { style: 'classic', color: '#e68288', gloss: 0.7, opacity: 1 },
    blush: { amount: 1, shade: true },
  }),
  shape: {},
  hair: { id: 'hair.meshyUpdo', color: '#d8b46e' },
}

export const FEM_SIX: FemLook[] = [
  { ...DOLL_REPLICA, name: 'Classica' },
  { name: 'Natural', skin: '#e6b896', shape: { f_jawSoft: 0.6, f_noseNarrow: 0.7, f_chinPointed: 0.3 }, hair: { id: 'hair.chestnutWaves', color: '#5a3820' },
    face: F({ eye: { style: 'natural', lash: 'natural', iris: '#6b4a32', scale: 1.9, gap: 0.004 }, brow: { style: 'thin', color: '#5a3f2e', scale: 1.15, opacity: 0.85 }, mouth: { style: 'classic', color: '#c9707a', gloss: 0.35 }, blush: { amount: 0.6, shade: true } }) },
  { name: 'Amendoada', skin: '#a86d4a', shape: { f_cheekHollow: 1, f_chinPointed: 1, f_faceLong: 0.7, f_jawSoft: 0.4 }, hair: { id: 'hair.meshyUpdo', color: '#7a4a2a' },
    face: F({ eye: { style: 'almond', lash: 'natural', iris: '#3f6b45', scale: 1.75, tilt: 3, gap: 0.003 }, brow: { style: 'arched', color: '#2c2018', scale: 1.25, tilt: 3 }, mouth: { style: 'classic', color: '#b8505a', gloss: 0.5 }, blush: { amount: 0.5, shade: true } }) },
  { name: 'Doce', skin: '#f2d4c4', shape: { f_cheekFull: 1, f_faceShort: 0.8, f_lipsFull: 0.8, f_jawSoft: 0.5, f_noseNarrow: 0.4 }, hair: { id: 'hair.meshyUpdo', color: '#c4813f' },
    face: F({ eye: { style: 'doll', lash: 'doll', iris: '#7a5a3a', scale: 1.3, gap: 0.006 }, brow: { style: 'classic', color: '#8a6a50' }, mouth: { style: 'classic', color: '#e89aa0', gloss: 0.8 }, blush: { amount: 1, shade: true } }) },
  { name: 'Marcante', skin: '#6a4028', shape: { f_jawWide: 0.9, f_cheekHollow: 1, f_lipsFull: 0.8, f_faceLong: 1, f_chinWide: 0.6, f_noseWide: 0.5 }, hair: { id: 'hair.meshyUpdo', color: '#16141a' },
    face: F({ eye: { style: 'almond', lash: 'dolla', iris: '#4a4038', liner: '#0c0a0a', scale: 1.95, tilt: 5, gap: 0.002 }, brow: { style: 'arched', color: '#140e0a', scale: 1.35, tilt: 5, y: 0.002 }, mouth: { style: 'classic', color: '#7a2535', gloss: 0.5 }, blush: { amount: 0.4, shade: true } }) },
  { name: 'Redonda suave', skin: '#f0c8b0', shape: { f_cheekFull: 1, f_jawSoft: 1, f_faceShort: 1, f_noseWide: 0.6, f_chinWide: 0.5, f_lipsThin: 0.4 }, hair: { id: 'hair.chestnutWaves', color: '#8a5a30' },
    face: F({ eye: { style: 'classic', lash: 'natural', iris: '#4a8ac0' }, brow: { style: 'soft', color: '#8a6a50', opacity: 0.8 }, mouth: { style: 'classic', color: '#d8788a', gloss: 0.5 }, blush: { amount: 0.9, shade: true } }) },
]
