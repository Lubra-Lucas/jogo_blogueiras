/**
 * Pontos de referencia do rosto na TELA DE PROJECAO FRONTAL (1024x1024 px).
 *
 * O atlas do Meshy e pequeno e confuso (o rosto pintado ocupa ~190 px de 2048), entao a maquiagem nao vive no
 * UV: ela e projetada de frente no espaco da malha em repouso (plano XY), a partir desta tela.
 *   u = (x - X0) / (X1 - X0)      v = 1 - (y - Y0) / (Y1 - Y0)      (metros, espaco do modelo; frente = +Z)
 * As medidas abaixo foram lidas da projecao de `tools/blender/face_landmarks.py` (face_front.png, com grade).
 * Olho "A" = lado esquerdo da imagem (direita da personagem); o outro olho e o espelho em X = MIRROR_X.
 */
export const FACE_BOX = { x0: -0.11, x1: 0.11, y0: 1.28, y1: 1.5, size: 1024 }
export const MIRROR_X = 1020 // x' = MIRROR_X - x

export type Pt = [number, number]

/** Linha dos cilios superiores (palpebra), do canto externo ao interno. */
export const UPPER: Pt[] = [
  [150, 430],
  [197, 424],
  [273, 437],
  [323, 463],
  [360, 513],
  [377, 547],
]
/** Linha dos cilios inferiores, do canto externo ao interno. */
export const LOWER: Pt[] = [
  [143, 578],
  [173, 583],
  [227, 582],
  [307, 570],
  [367, 555],
  [377, 547],
]
/** Vinco da palpebra (acima da linha superior). */
export const CREASE: Pt[] = [
  [128, 378],
  [195, 358],
  [275, 366],
  [335, 396],
  [375, 450],
  [398, 515],
]
export const IRIS_A = { c: [253, 493] as Pt, r: 85 }

export const NOSE_TIP: Pt = [512, 690]
export const MOUTH: Pt = [512, 842]
export const CHEEK_APPLE: Pt = [245, 662]
export const CHEEK_BONE: Pt = [240, 592]

/** Centro das sobrancelhas por estilo (A, de fora para dentro) e largura base (px). */
export const BROWS: Record<string, { pts: Pt[]; w: number }> = {
  soft: {
    pts: [
      [122, 304],
      [180, 282],
      [255, 270],
      [328, 284],
      [388, 318],
      [408, 332],
    ],
    w: 32,
  },
  straight: {
    pts: [
      [124, 304],
      [200, 296],
      [280, 294],
      [350, 300],
      [408, 316],
    ],
    w: 36,
  },
  thin: {
    pts: [
      [124, 316],
      [190, 286],
      [260, 270],
      [330, 288],
      [396, 330],
    ],
    w: 13,
  },
  bold: {
    pts: [
      [118, 296],
      [190, 270],
      [268, 262],
      [340, 280],
      [410, 322],
    ],
    w: 50,
  },
  painted: {
    pts: [
      [127, 268],
      [200, 280],
      [280, 296],
      [345, 316],
      [390, 332],
    ],
    w: 34,
  },
}

export function mirror(p: Pt): Pt {
  return [MIRROR_X - p[0], p[1]]
}
