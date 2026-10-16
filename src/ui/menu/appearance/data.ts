import type { Appearance, BlushStyle, BrowStyle, GemKind, GemStyle, LashStyle, LinerStyle, LipFinish, MarkSpot, NailStyle, ShadowStyle, SkinFinish, TattooStyle } from '../../../shared/appearance'
import { MORPH_PAIRS, withPairValue } from '../../../game/character/morphConfig'

export interface Swatch {
  id: string
  label: string
  hex: string
  /** subtom (pele) ou grupo */
  note?: string
}

/** Tons de pele realistas, do muito claro ao muito profundo, com subtom (frio / neutro / quente / oliva). */
export const SKIN_TONES: Swatch[] = [
  { id: 'porcelana', label: 'Porcelana', hex: '#f8e4da', note: 'frio' },
  { id: 'marfim', label: 'Marfim', hex: '#f1d3c2', note: 'neutro' },
  { id: 'bege-claro', label: 'Bege claro', hex: '#ecc9a8', note: 'quente' },
  { id: 'bege', label: 'Bege', hex: '#e2b48f', note: 'neutro' },
  { id: 'dourada', label: 'Dourada', hex: '#d4a075', note: 'quente' },
  { id: 'oliva-clara', label: 'Oliva clara', hex: '#c89d73', note: 'oliva' },
  { id: 'oliva', label: 'Oliva', hex: '#b88a5c', note: 'oliva' },
  { id: 'mel', label: 'Mel', hex: '#b6764a', note: 'quente' },
  { id: 'caramelo', label: 'Caramelo', hex: '#a2653f', note: 'quente' },
  { id: 'castanha', label: 'Castanha', hex: '#855236', note: 'neutro' },
  { id: 'cacau', label: 'Cacau', hex: '#6a3f2a', note: 'frio' },
  { id: 'ebano', label: 'Ébano', hex: '#4a2c1f', note: 'frio' },
  { id: 'profunda', label: 'Profunda', hex: '#341d15', note: 'frio' },
]

export const SKIN_FINISH_LABELS: Record<SkinFinish, string> = { matte: 'Fosca', natural: 'Natural', dewy: 'Iluminada', porcelain: 'Porcelana' }

export const HAIR_NATURAL: Swatch[] = [
  { id: 'platinado', label: 'Platinado', hex: '#e8dcc8' },
  { id: 'loiro-claro', label: 'Loiro claro', hex: '#f0d78c' },
  { id: 'loiro', label: 'Loiro dourado', hex: '#d8b46e' },
  { id: 'loiro-escuro', label: 'Loiro escuro', hex: '#a8916a' },
  { id: 'ruivo-claro', label: 'Ruivo acobreado', hex: '#c0653a' },
  { id: 'ruivo', label: 'Ruivo', hex: '#8f3a22' },
  { id: 'castanho-claro', label: 'Castanho claro', hex: '#8b6a4d' },
  { id: 'castanho', label: 'Castanho', hex: '#5b4030' },
  { id: 'castanho-escuro', label: 'Castanho escuro', hex: '#3a2417' },
  { id: 'preto', label: 'Preto', hex: '#16110e' },
  { id: 'grisalho', label: 'Grisalho', hex: '#b9b6b4' },
  { id: 'branco', label: 'Branco', hex: '#f1efec' },
]
export const HAIR_FANTASY: Swatch[] = [
  { id: 'rosa', label: 'Rosa chiclete', hex: '#f283ad' },
  { id: 'rosa-pastel', label: 'Rosa pastel', hex: '#f7b5cd' },
  { id: 'lilas', label: 'Lilás', hex: '#b98bf0' },
  { id: 'azul', label: 'Azul', hex: '#4fa3e8' },
  { id: 'turquesa', label: 'Turquesa', hex: '#3fc5c0' },
  { id: 'menta', label: 'Menta', hex: '#8fe3c0' },
  { id: 'cereja', label: 'Cereja', hex: '#c0172f' },
  { id: 'laranja', label: 'Laranja', hex: '#ff8a3d' },
  { id: 'prata', label: 'Prata', hex: '#c9ccd6' },
]

export const EYE_NATURAL: Swatch[] = [
  { id: 'azul', label: 'Azul', hex: '#5a9fd4' },
  { id: 'azul-cinza', label: 'Azul acinzentado', hex: '#7f9cb8' },
  { id: 'verde', label: 'Verde', hex: '#5f9a6a' },
  { id: 'avela', label: 'Avelã', hex: '#8f7a45' },
  { id: 'mel', label: 'Mel', hex: '#b07a35' },
  { id: 'castanho', label: 'Castanho', hex: '#6b4527' },
  { id: 'castanho-escuro', label: 'Castanho escuro', hex: '#3b2517' },
  { id: 'cinza', label: 'Cinza', hex: '#8c949c' },
  { id: 'ambar', label: 'Âmbar', hex: '#c4781d' },
]
export const EYE_FANTASY: Swatch[] = [
  { id: 'violeta', label: 'Violeta', hex: '#8a5bd6' },
  { id: 'rosa', label: 'Rosa', hex: '#ee7fae' },
  { id: 'dourado', label: 'Dourado', hex: '#e2b53a' },
  { id: 'turquesa', label: 'Turquesa', hex: '#26b9b0' },
  { id: 'vermelho', label: 'Vermelho', hex: '#b8222d' },
]

export const LIP_COLORS: Swatch[] = [
  { id: 'nude-rosado', label: 'Nude rosado', hex: '#d99a92' },
  { id: 'nude-pessego', label: 'Nude pêssego', hex: '#e0a08e' },
  { id: 'rosa', label: 'Rosa', hex: '#e8909a' },
  { id: 'rosa-natural', label: 'Rosa natural', hex: '#da7076' },
  { id: 'coral', label: 'Coral', hex: '#ee6f5c' },
  { id: 'laranja', label: 'Laranja', hex: '#f06a2b' },
  { id: 'vermelho', label: 'Vermelho clássico', hex: '#c1122a' },
  { id: 'cereja', label: 'Cereja', hex: '#a3132f' },
  { id: 'pink', label: 'Pink', hex: '#e63e8a' },
  { id: 'berry', label: 'Berry', hex: '#9d2a55' },
  { id: 'malva', label: 'Malva', hex: '#a8566e' },
  { id: 'marrom', label: 'Marrom', hex: '#8a4a3a' },
  { id: 'vinho', label: 'Vinho', hex: '#6a1b3a' },
  { id: 'ameixa', label: 'Ameixa', hex: '#4d1530' },
  { id: 'lilas', label: 'Lilás', hex: '#a688d6' },
]

export const SHADOW_COLORS: Swatch[] = [
  { id: 'champanhe', label: 'Champanhe', hex: '#e6c3ae' },
  { id: 'bronze', label: 'Bronze', hex: '#a8745a' },
  { id: 'cobre', label: 'Cobre', hex: '#b8603a' },
  { id: 'taupe', label: 'Taupe', hex: '#a58a7c' },
  { id: 'chocolate', label: 'Chocolate', hex: '#4a2b2b' },
  { id: 'rosa', label: 'Rosa', hex: '#e8a0b4' },
  { id: 'rose', label: 'Rosé', hex: '#b9788a' },
  { id: 'ameixa', label: 'Ameixa', hex: '#6a3a5a' },
  { id: 'lilas', label: 'Lilás', hex: '#a98ad8' },
  { id: 'azul-gelo', label: 'Azul gelo', hex: '#9fc8ee' },
  { id: 'azul', label: 'Azul', hex: '#3f6fb5' },
  { id: 'verde', label: 'Verde', hex: '#2f9d86' },
  { id: 'dourado', label: 'Dourado', hex: '#d9a93a' },
  { id: 'preto', label: 'Preto', hex: '#1a1417' },
]

export const LINER_COLORS: Swatch[] = [
  { id: 'preto', label: 'Preto', hex: '#1c1417' },
  { id: 'marrom', label: 'Marrom', hex: '#4a2f26' },
  { id: 'azul', label: 'Azul-marinho', hex: '#1f2f5a' },
  { id: 'verde', label: 'Verde', hex: '#1f6a55' },
  { id: 'roxo', label: 'Roxo', hex: '#5a2f7a' },
  { id: 'vinho', label: 'Vinho', hex: '#6a1b3a' },
  { id: 'pink', label: 'Pink', hex: '#ff4f8b' },
  { id: 'turquesa', label: 'Turquesa', hex: '#19b3a6' },
  { id: 'branco', label: 'Branco', hex: '#f6f2ee' },
]

export const BLUSH_COLORS: Swatch[] = [
  { id: 'pessego', label: 'Pêssego', hex: '#ee9a86' },
  { id: 'rosa', label: 'Rosa', hex: '#e8808a' },
  { id: 'coral', label: 'Coral', hex: '#f08a72' },
  { id: 'malva', label: 'Malva', hex: '#c9778e' },
  { id: 'terracota', label: 'Terracota', hex: '#c0705a' },
  { id: 'berry', label: 'Berry', hex: '#a84a63' },
  { id: 'pink', label: 'Pink', hex: '#f06a9a' },
]

export const BROW_COLORS: Swatch[] = [
  { id: 'loiro', label: 'Loiro', hex: '#a88a62' },
  { id: 'castanho-claro', label: 'Castanho claro', hex: '#7a5a42' },
  { id: 'castanho', label: 'Castanho', hex: '#5b4332' },
  { id: 'escuro', label: 'Castanho escuro', hex: '#3a2a22' },
  { id: 'preto', label: 'Preto', hex: '#17110f' },
  { id: 'ruivo', label: 'Ruivo', hex: '#8a4a2a' },
  { id: 'grafite', label: 'Grafite', hex: '#4d4a4e' },
  { id: 'rosa', label: 'Rosa', hex: '#d76a98' },
]

export const NAIL_COLORS: Swatch[] = [
  { id: 'nude', label: 'Nude', hex: '#e6b8a4' },
  { id: 'rosa-leite', label: 'Rosa leite', hex: '#f3cfd3' },
  { id: 'rosa', label: 'Rosa', hex: '#e9a3b5' },
  { id: 'vermelho', label: 'Vermelho', hex: '#c1122a' },
  { id: 'vinho', label: 'Vinho', hex: '#6a1b3a' },
  { id: 'coral', label: 'Coral', hex: '#ee6f5c' },
  { id: 'branco', label: 'Branco', hex: '#f6f2ee' },
  { id: 'preto', label: 'Preto', hex: '#17121a' },
  { id: 'lilas', label: 'Lilás', hex: '#b9a0e0' },
  { id: 'azul', label: 'Azul bebê', hex: '#a7cdf0' },
  { id: 'verde', label: 'Verde menta', hex: '#9fdcc2' },
  { id: 'dourado', label: 'Dourado', hex: '#d9b25a' },
]

export const HIGHLIGHT_COLORS: Swatch[] = [
  { id: 'champanhe', label: 'Champanhe', hex: '#fff1dc' },
  { id: 'dourado', label: 'Dourado', hex: '#ffe0a0' },
  { id: 'rose', label: 'Rosé', hex: '#ffd6d0' },
  { id: 'perola', label: 'Pérola', hex: '#f2f6ff' },
  { id: 'bronze', label: 'Bronze', hex: '#e8b88a' },
]

export const GLITTER_COLORS: Swatch[] = [
  { id: 'champanhe', label: 'Champanhe', hex: '#ffe9c4' },
  { id: 'prata', label: 'Prata', hex: '#e8ecf4' },
  { id: 'ouro', label: 'Ouro', hex: '#ffd86b' },
  { id: 'rosa', label: 'Rosa', hex: '#ffb3d1' },
  { id: 'azul', label: 'Azul', hex: '#9fd0ff' },
  { id: 'lilas', label: 'Lilás', hex: '#d3b8ff' },
]

export const GEM_COLORS: Swatch[] = [
  { id: 'perola', label: 'Pérola', hex: '#fff6ee' },
  { id: 'dourado', label: 'Dourado', hex: '#ffd23f' },
  { id: 'prata', label: 'Prata', hex: '#e6e9f2' },
  { id: 'rosa', label: 'Rosa', hex: '#ff8fc0' },
  { id: 'azul', label: 'Azul', hex: '#7cc4ff' },
  { id: 'vermelho', label: 'Rubi', hex: '#d3243f' },
  { id: 'verde', label: 'Esmeralda', hex: '#2fbf8f' },
]

export const TATTOO_COLORS: Swatch[] = [
  { id: 'grafite', label: 'Grafite', hex: '#3b2a2e' },
  { id: 'preto', label: 'Preto', hex: '#17121a' },
  { id: 'marrom', label: 'Marrom', hex: '#6a4a3a' },
  { id: 'rosa', label: 'Rosa', hex: '#8a3b52' },
  { id: 'azul', label: 'Azul', hex: '#2f4f8f' },
  { id: 'dourado', label: 'Dourado', hex: '#b78a2a' },
]

export const BODY_BASE_COLORS: Swatch[] = [
  { id: 'nude', label: 'Nude (acompanha a pele)', hex: '#d9bba8' },
  { id: 'preto', label: 'Preto', hex: '#16141a' },
  { id: 'branco', label: 'Branco', hex: '#f6f2ee' },
  { id: 'cinza', label: 'Cinza', hex: '#8a8590' },
  { id: 'rosa', label: 'Rosa', hex: '#f39ab3' },
  { id: 'vermelho', label: 'Vermelho', hex: '#b01a30' },
  { id: 'azul', label: 'Azul-marinho', hex: '#1f2f5a' },
]

export interface Opt<T extends string> {
  id: T
  label: string
}
export const SHADOW_STYLES: Array<Opt<ShadowStyle>> = [
  { id: 'none', label: 'Nenhuma' },
  { id: 'wash', label: 'Esfumado suave' },
  { id: 'smoky', label: 'Esfumado intenso' },
  { id: 'cut', label: 'Cut crease' },
  { id: 'halo', label: 'Halo' },
  { id: 'graphic', label: 'Gráfica' },
]
export const LINER_STYLES: Array<Opt<LinerStyle>> = [
  { id: 'none', label: 'Sem delineado' },
  { id: 'tight', label: 'Tightline' },
  { id: 'classic', label: 'Clássico' },
  { id: 'wing', label: 'Gatinho' },
  { id: 'graphic', label: 'Gráfico' },
  { id: 'color', label: 'Colorido' },
]
export const LASH_STYLES: Array<Opt<LashStyle>> = [
  { id: 'natural', label: 'Natural' },
  { id: 'doll', label: 'Boneca' },
  { id: 'dramatic', label: 'Dramáticos' },
  { id: 'spider', label: 'Aranha (anos 2000)' },
]
export const BROW_STYLES: Array<Opt<BrowStyle>> = [
  { id: 'painted', label: 'Original' },
  { id: 'soft', label: 'Arqueada suave' },
  { id: 'straight', label: 'Reta' },
  { id: 'thin', label: 'Fina anos 90' },
  { id: 'bold', label: 'Marcada' },
]
export const BLUSH_STYLES: Array<Opt<BlushStyle>> = [
  { id: 'none', label: 'Sem blush' },
  { id: 'apple', label: 'Maçã' },
  { id: 'draping', label: 'Draping' },
  { id: 'sunkissed', label: 'Sun-kissed' },
]
export const LIP_FINISHES: Array<Opt<LipFinish>> = [
  { id: 'matte', label: 'Matte' },
  { id: 'satin', label: 'Acetinado' },
  { id: 'gloss', label: 'Gloss' },
  { id: 'metallic', label: 'Metálico' },
]
export const MARK_SPOTS: Array<Opt<MarkSpot>> = [
  { id: 'cheek', label: 'Bochecha' },
  { id: 'lip', label: 'Acima do lábio' },
  { id: 'chin', label: 'Queixo' },
  { id: 'brow', label: 'Sobrancelha' },
  { id: 'nose', label: 'Nariz' },
]
export const GEM_STYLES: Array<Opt<GemStyle>> = [
  { id: 'none', label: 'Nenhuma' },
  { id: 'cheek', label: 'Bochechas' },
  { id: 'liner', label: 'Linha dos cílios' },
  { id: 'temple', label: 'Têmporas' },
  { id: 'tear', label: 'Lágrima' },
  { id: 'brow', label: 'Sobrancelha' },
]
export const GEM_KINDS: Array<Opt<GemKind>> = [
  { id: 'pearl', label: 'Pérola' },
  { id: 'star', label: 'Estrela' },
  { id: 'heart', label: 'Coração' },
  { id: 'crystal', label: 'Cristal' },
]
export const TATTOO_STYLES: Array<Opt<TattooStyle>> = [
  { id: 'none', label: 'Nenhuma' },
  { id: 'hearts', label: 'Corações' },
  { id: 'stars', label: 'Estrelas' },
  { id: 'moon', label: 'Lua' },
  { id: 'butterfly', label: 'Borboleta' },
]
export const NAIL_STYLES: Array<Opt<NailStyle>> = [
  { id: 'none', label: 'Natural' },
  { id: 'solid', label: 'Esmalte liso' },
  { id: 'french', label: 'Francesinha' },
  { id: 'ombre', label: 'Degradê' },
  { id: 'glitter', label: 'Glitter' },
]

// ---------- presets de rosto e corpo ----------
export interface MorphPreset {
  id: string
  label: string
  note: string
  morphs: Record<string, number>
}

export const FACE_PRESETS: MorphPreset[] = [
  { id: 'doce', label: 'Doce', note: 'Olhos grandes, nariz delicado', morphs: { eyesBig: 0.6, noseSmall: 0.5, lipsFull: 0.3, cheekbonesHigh: 0.2, chinPointed: 0.1, browLift: 0.3, jawNarrow: 0.3 } },
  { id: 'glam', label: 'Glam', note: 'Lábios cheios, maçãs altas', morphs: { lipsFull: 0.7, cheekbonesHigh: 0.7, eyesBig: 0.4, jawNarrow: 0.5, noseNarrow: 0.4, faceThin: 0.3, browLift: 0.5, chinPointed: 0.3 } },
  { id: 'elegante', label: 'Elegante', note: 'Traços finos e alongados', morphs: { faceThin: 0.5, cheekbonesHigh: 0.5, noseNarrow: 0.6, jawNarrow: 0.4, chinPointed: 0.5, lipsFull: 0.3, lipsWide: 0.1, browLift: 0.3, eyesBig: 0.2 } },
  { id: 'marcante', label: 'Marcante', note: 'Maxilar definido, olhar forte', morphs: { cheekbonesHigh: 0.9, browLift: 0.15, lipsFull: 0.5, lipsWide: 0.5, eyesBig: 0.3, noseNarrow: 0.3, chinPointed: 0.2 } },
]

const body = (o: Record<string, number>, pairs: Record<string, number> = {}): Record<string, number> => {
  let m = { ...o }
  for (const p of MORPH_PAIRS) if (pairs[p.id] !== undefined) m = withPairValue(p, m, pairs[p.id])
  return m
}

export const BODY_PRESETS: MorphPreset[] = [
  { id: 'esguia', label: 'Esguia', note: 'Silhueta longa e leve', morphs: body({ shouldersNarrow: 0.5, waistThin: 0.3 }, { bust: -0.4, butt: -0.3, weight: -0.4 }) },
  { id: 'atletica', label: 'Atlética', note: 'Pernas fortes, cintura marcada', morphs: body({ thighsThick: 0.6, waistThin: 0.35 }, { bust: -0.25, butt: 0.3, weight: 0.1 }) },
  { id: 'ampulheta', label: 'Ampulheta', note: 'Busto e quadril equilibrados', morphs: body({ waistThin: 0.8, hipsWide: 0.6 }, { bust: 0.5, butt: 0.5 }) },
  { id: 'pera', label: 'Pera', note: 'Quadril e coxas generosos', morphs: body({ hipsWide: 0.8, thighsThick: 0.6, shouldersNarrow: 0.5, waistThin: 0.4 }, { bust: -0.3, butt: 0.5 }) },
  { id: 'curvilinea', label: 'Curvilínea', note: 'Curvas marcadas', morphs: body({ hipsWide: 0.6, thighsThick: 0.6, waistThin: 0.4 }, { bust: 0.6, butt: 0.7, weight: 0.5 }) },
  { id: 'plus', label: 'Plus size', note: 'Corpo cheio e confortável', morphs: body({ hipsWide: 0.5, thighsThick: 0.7 }, { bust: 0.5, butt: 0.6, weight: 1 }) },
]

export const FACE_KEYS = ['faceThin', 'jawNarrow', 'chinPointed', 'cheekbonesHigh', 'eyesBig', 'browLift', 'noseSmall', 'noseNarrow', 'lipsFull', 'lipsWide']
export const BODY_KEYS = ['bustBig', 'bustSmall', 'buttBig', 'buttSmall', 'hipsWide', 'thighsThick', 'waistThin', 'weightUp', 'weightDown', 'shouldersNarrow']

/** Substitui so as chaves de `keys` (zera as demais do grupo) mantendo o resto dos morphs. */
export function applyMorphGroup(a: Appearance, keys: string[], values: Record<string, number>): Appearance {
  const morphs = { ...a.morphs }
  for (const k of keys) delete morphs[k]
  for (const [k, v] of Object.entries(values)) if (keys.includes(k) && v > 0) morphs[k] = v
  return { ...a, morphs }
}
