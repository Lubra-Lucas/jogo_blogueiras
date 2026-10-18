// Teste do avatar mutavel (Appearance v5): gerador Aleatorio, catalogo, migracao e codigos JB4.
// Uso: npm run test:appearance   (Node 22.15+ com remocao de tipos; sem dependencias novas)
import { strict as assert } from 'node:assert'
import { registerHooks } from 'node:module'
import {
  DEFAULT_APPEARANCE,
  normalizeAppearance,
  sanitizeAppearance,
  type Appearance,
} from '../../src/shared/appearance.ts'
import {
  BODY_CONTROLS,
  BODY_KEYS,
  BROW_STYLES,
  EYE_SHAPES,
  FACE_LISTS,
  FACE_RANGES,
  FACE_SHAPES,
  LASH_STYLES,
  MOUTH_SHAPES,
  NOSE_SHAPES,
  catalogIds,
  type FaceListKey,
} from '../../src/shared/faceCatalog.ts'
import { DEFAULT_MALE_APPEARANCE, classicFromLegacy } from '../../src/shared/appearance.ts'
import { BIG_HEAD_SHAPE, MALE_SHAPE_GROUPS, FEMALE_SHAPE_GROUPS, safeShape, shapeGroups, shapeNames, sanitizeFaceLayers, sanitizeShape, EYE_STYLES, BEARD_STYLES, BROW_STYLES as LAYER_BROWS, MOUTH_STYLES } from '../../src/shared/faceLayers.ts'
import { TWELVE, FEM_SIX } from '../../src/shared/facePresets.ts'
import { FUN_SHAPE_CHANCE, rollShape } from '../../src/shared/randomFace.ts'
import { SHAPE_SAFE_MAX } from '../../src/shared/faceShapeRanges.ts'
import { mulberry32 } from '../../src/game/market/rng.ts'
import { readFileSync } from 'node:fs'
import {
  BROW_HAIR_MAX_DELTA,
  HAIR_NATURAL_HEX,
  appearanceIssues,
  boneIssues,
  randomProportions,
  luminance,
  npcAppearance,
  randomAppearance,
} from '../../src/shared/randomAppearance.ts'

let passed = 0
const t = (name: string, fn: () => void | Promise<void>) =>
  Promise.resolve()
    .then(fn)
    .then(() => {
      passed++
      console.log('  ok   ' + name)
    })
    .catch((e) => {
      console.log('  FALHA ' + name + '\n        ' + (e as Error).message)
      process.exitCode = 1
    })

const N = 3000
const HEX = /^#[0-9a-f]{6}$/i
const inRange = (v: unknown, lo: number, hi: number) => typeof v === 'number' && Number.isFinite(v) && v >= lo - 1e-9 && v <= hi + 1e-9

// ---------- catalogo ----------
await t('catalogo: quantidades e ids unicos', () => {
  const counts: Record<string, number> = { eye: 6, mouth: 6, nose: 5, face: 5, lash: 8, brow: 8 }
  const lists = { eye: EYE_SHAPES, mouth: MOUTH_SHAPES, nose: NOSE_SHAPES, face: FACE_SHAPES, lash: LASH_STYLES, brow: BROW_STYLES }
  for (const [k, l] of Object.entries(lists)) {
    assert.equal(l.length, counts[k], k)
    assert.equal(new Set(catalogIds(l)).size, l.length, `${k} ids repetidos`)
    for (const e of l) {
      assert.ok(e.id.startsWith(k + '_') && e.label && e.weight > 0 && typeof e.map === 'object', e.id)
    }
  }
})

// ---------- sorteio ----------
const seeds: Array<number | string> = []
for (let i = 0; i < N; i++) seeds.push(i % 3 === 0 ? `npc-${i}` : i * 2654435761 + 17)
const samples = seeds.map((s, i) => randomAppearance(s, { profile: i % 4 === 0 ? 'npc' : 'player' }))

await t(`${N} aparencias: campos dentro das faixas e ids no catalogo`, () => {
  for (const a of samples) {
    assert.equal(a.v, 5)
    for (const k of Object.keys(FACE_LISTS) as FaceListKey[]) assert.ok(catalogIds(FACE_LISTS[k]).includes(a.face[k]), `${k}=${a.face[k]}`)
    for (const k of ['eyeSize', 'eyeTilt', 'browThickness', 'browHeight'] as const) assert.ok(inRange(a.face[k], FACE_RANGES[k][0], FACE_RANGES[k][1]), k)
    assert.match(a.face.browColor, HEX)
    for (const c of BODY_CONTROLS) {
      assert.ok(inRange(a.body[c.id], c.safe[0], c.safe[1]), `body.${c.id}=${a.body[c.id]}`)
    }
    assert.deepEqual(Object.keys(a.body).sort(), [...BODY_KEYS].sort())
    for (const [k, v] of Object.entries(a.morphs)) assert.ok(inRange(v, 0, 1), `morph ${k}=${v}`)
    for (const h of [a.skin.tone, a.hair.color, a.eyes!.color!]) assert.match(h, HEX)
  }
})

await t('sem combinacoes proibidas e sobrancelha perto do cabelo natural', () => {
  let natural = 0
  for (const a of samples) {
    assert.deepEqual(appearanceIssues(a), [], JSON.stringify(a.face) + JSON.stringify(a.body))
    if (HAIR_NATURAL_HEX.includes(a.hair.color)) {
      natural++
      assert.ok(Math.abs(luminance(a.face.browColor) - luminance(a.hair.color)) <= BROW_HAIR_MAX_DELTA)
    }
  }
  assert.ok(natural > N * 0.6, 'cabelo natural deve ser a maioria')
})

await t('regras proibidas detectam extremos', () => {
  const bad = (f: (a: Appearance) => Appearance) => assert.ok(appearanceIssues(f(DEFAULT_APPEARANCE)).length > 0)
  bad((a) => ({ ...a, face: { ...a.face, eyeShape: 'eye_6', eyeSize: 0.05, faceShape: 'face_5' } }))
  bad((a) => ({ ...a, body: { ...a.body, waist: -0.9, hips: 0.9 } }))
  bad((a) => ({ ...a, face: { ...a.face, eyeShape: 'eye_1', eyeSize: 0.0 } }))
  assert.deepEqual(appearanceIssues(DEFAULT_APPEARANCE), [])
})

await t('determinismo: mesma seed = mesmo resultado; seeds diferentes variam', () => {
  for (let i = 0; i < 300; i++) {
    const s = i % 2 ? `s${i}` : i * 977
    assert.deepEqual(randomAppearance(s), randomAppearance(s))
    assert.deepEqual(randomAppearance(s, { profile: 'npc' }), randomAppearance(s, { profile: 'npc' }))
  }
  const sig = new Set(samples.map((a) => JSON.stringify([a.face, a.body])))
  assert.ok(sig.size > N * 0.99, 'aparencias quase todas distintas')
  const used = (k: FaceListKey) => new Set(samples.map((a) => a.face[k])).size
  assert.equal(used('eyeShape'), 6)
  assert.equal(used('lashStyle'), 8)
  assert.equal(used('browStyle'), 8)
  assert.equal(used('mouthShape'), 6)
  assert.equal(used('noseShape'), 5)
  assert.equal(used('faceShape'), 5)
})

await t('opcoes: sem face/corpo preserva os blocos; base (roupas, maquiagem) nao muda', () => {
  const base = { ...DEFAULT_APPEARANCE, outfit: { top: { id: 'tee' } }, hair: { id: 'hair.meshyUpdo', color: '#3a2417' } }
  const a = randomAppearance(5, { base, skin: false, hair: false, face: false, body: false })
  assert.deepEqual(a.face, normalizeAppearance(base).face)
  assert.deepEqual(a.body, normalizeAppearance(base).body)
  const b = randomAppearance(5, { base })
  assert.deepEqual(b.outfit, base.outfit)
  assert.deepEqual(b.makeup, normalizeAppearance(base).makeup)
  assert.equal(b.hair.id, 'hair.meshyUpdo')
})

await t('round-trip normalize/sanitize mantem tudo', () => {
  for (const a of samples.slice(0, 1000)) {
    assert.deepEqual(normalizeAppearance(a), a)
    const s = sanitizeAppearance(JSON.parse(JSON.stringify(a)))!
    assert.deepEqual(s.face, a.face)
    assert.deepEqual(s.body, a.body)
    assert.deepEqual(s.morphs, a.morphs)
    assert.deepEqual(sanitizeAppearance(s), s)
  }
})

await t('sanitize limita e corrige lixo nos campos novos', () => {
  const s = sanitizeAppearance({
    ...DEFAULT_APPEARANCE,
    face: { eyeShape: 'eye_99', eyeSize: 7, eyeTilt: -9, lashStyle: 5, browStyle: 'x', browColor: 'red', browThickness: NaN, browHeight: 2, mouthShape: 'mouth_2', noseShape: null, faceShape: 'face_3' },
    body: { height: 9, waist: -9, hips: 'a', bust: 0.3 },
  })!
  assert.equal(s.face.eyeShape, 'eye_1')
  assert.equal(s.face.eyeSize, 1)
  assert.equal(s.face.eyeTilt, -1)
  assert.equal(s.face.lashStyle, 'lash_1')
  assert.equal(s.face.browStyle, 'brow_1')
  assert.equal(s.face.browColor, '#6d5240')
  assert.equal(s.face.browThickness, 0.5)
  assert.equal(s.face.browHeight, 1)
  assert.equal(s.face.mouthShape, 'mouth_2')
  assert.equal(s.face.noseShape, 'nose_1')
  assert.equal(s.face.faceShape, 'face_3')
  assert.equal(s.body.height, 1)
  assert.equal(s.body.waist, -1)
  assert.equal(s.body.hips, 0)
  assert.equal(s.body.bust, 0.3)
})

// ---------- migracao ----------
const V3 = {
  v: 3,
  base: 'doll',
  morphs: { bustBig: 0.5, waistThin: 0.4, eyesBig: 0.5, browLift: 0.4, lipsFull: 0.7, weightDown: 0.25 },
  skin: { tone: '#6b4128' },
  suit: { color: '#123456', finish: 'latex' },
  hair: { id: 'hair.meshyUpdo', color: '#3a2417' },
  outfit: { top: { id: 'tee', colors: ['#ffffff'] } },
  accessories: [{ id: 'ring.x' }],
}
const V4 = {
  ...V3,
  v: 4,
  suit: { color: '#123456', finish: 'satin', base: 'auto' },
  makeup: { lashes: { style: 'doll', color: '#1a1214', length: 0.9 }, brows: { style: 'bold', color: '#17110f', thickness: 0.8 }, blush: { style: 'apple', color: '#e8808a', amount: 0.6 } },
}

await t('migracao v3 -> v5 sem perda', () => {
  const a = normalizeAppearance(V3 as never)
  assert.equal(a.v, 5)
  assert.deepEqual(a.morphs, V3.morphs)
  assert.equal(a.suit.base, 'color') // regra v3 -> v4 preservada
  assert.equal(a.skin.tone, '#6b4128')
  assert.deepEqual(a.outfit, V3.outfit)
  assert.deepEqual(a.accessories, V3.accessories)
  assert.equal(a.face.lashStyle, 'lash_1')
  assert.equal(a.face.browStyle, 'brow_1')
  assert.ok(Math.abs(a.face.eyeSize - 0.3) < 1e-9)
  assert.ok(Math.abs(a.face.browHeight - 0.7) < 1e-9)
  assert.ok(Math.abs(a.body.bust - 0.5) < 1e-9 && Math.abs(a.body.waist + 0.4) < 1e-9 && Math.abs(a.body.weight + 0.25) < 1e-9)
  assert.deepEqual(sanitizeAppearance(V3)!.morphs, V3.morphs)
})

await t('migracao v4 -> v5 deriva cilios, sobrancelhas, olho e corpo', () => {
  const a = normalizeAppearance(V4 as never)
  assert.equal(a.v, 5)
  assert.equal(a.suit.base, 'auto')
  assert.equal(a.face.lashStyle, 'lash_3')
  assert.equal(a.face.browStyle, 'brow_6')
  assert.equal(a.face.browColor, '#17110f')
  assert.equal(a.face.browThickness, 0.8)
  assert.deepEqual(a.morphs, V4.morphs)
  assert.equal(a.makeup!.blush.style, 'apple')
  assert.equal(a.makeup!.lashes.style, 'doll') // maquiagem antiga continua intacta
  assert.deepEqual(a.outfit, V4.outfit)
  for (const style of ['natural', 'doll', 'dramatic', 'spider']) {
    const x = normalizeAppearance({ ...V4, makeup: { lashes: { style } } } as never)
    assert.ok(catalogIds(LASH_STYLES).includes(x.face.lashStyle))
  }
  for (const style of ['painted', 'soft', 'straight', 'thin', 'bold']) {
    const x = normalizeAppearance({ ...V4, makeup: { brows: { style } } } as never)
    assert.ok(catalogIds(BROW_STYLES).includes(x.face.browStyle))
  }
  // v5 explicito prevalece sobre a derivacao
  const v5 = normalizeAppearance({ ...V4, v: 5, face: { lashStyle: 'lash_8' } } as never)
  assert.equal(v5.face.lashStyle, 'lash_8')
  assert.equal(v5.face.browStyle, 'brow_6')
})

await t('looks salvos (default, alt, localStorage v4) viram v5 validos', () => {
  const d = normalizeAppearance(DEFAULT_APPEARANCE)
  assert.deepEqual(d, DEFAULT_APPEARANCE)
  assert.deepEqual(sanitizeAppearance(DEFAULT_APPEARANCE)!.face, DEFAULT_APPEARANCE.face)
  assert.equal(sanitizeAppearance({ v: 4, hair: { id: null, color: '#fff' } })!.v, 5)
})

// ---------- NPCs ----------
await t('NPCs: estavel, em cache, diferentes entre si, sem trocar roupa/cabelo/pele', () => {
  const base = { ...DEFAULT_APPEARANCE, skin: { tone: '#b57e5b', finish: 'natural' as const }, hair: { id: 'hair.meshyUpdo', color: '#2a1a12' }, outfit: { top: { id: 'tank' } } }
  const a = npcAppearance('calcadao-a', base)
  assert.equal(npcAppearance('calcadao-a', base), a, 'mesmo objeto em cache')
  assert.deepEqual(a, randomAppearance('npc:calcadao-a', { base, profile: 'npc', skin: false, hair: false, eyes: false }))
  assert.equal(a.skin.tone, base.skin.tone)
  assert.equal(a.hair.color, base.hair.color)
  assert.equal(a.eyes!.color, null)
  assert.deepEqual(a.outfit, base.outfit)
  assert.deepEqual(appearanceIssues(a), [])
  const sigs = new Set(Array.from({ length: 30 }, (_, i) => JSON.stringify([npcAppearance('n' + i, base).face, npcAppearance('n' + i, base).body])))
  assert.ok(sigs.size >= 29)
})

// ---------- codigos JB4 ----------
// Dependem das stores (localStorage/window) do jogo: stubs minimos para rodar em node.
const mem = new Map<string, string>()
const g = globalThis as Record<string, unknown>
g.localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear() }
g.window = Object.assign(globalThis, { location: { search: '', href: 'http://localhost/' }, addEventListener() {}, removeEventListener() {} })
// o Vite injeta import.meta.env/glob; em node trocamos por vazios so para carregar os modulos
registerHooks({
  load(url, context, nextLoad) {
    const r = nextLoad(url, context)
    if (url.includes('/src/') && r.source != null) return { ...r, source: String(r.source).replaceAll('import.meta.glob', '(() => ({}))').replaceAll('import.meta.env', '({})') }
    return r
  },
})
const looks = await import('../../src/state/looks.ts').catch((e) => {
  console.log('  (aviso) looks.ts nao carregou em node: ' + (e as Error).message)
  return null
})

if (looks) {
  // gera um codigo no formato ANTIGO (JB4 sem `v`, so o que diferia do padrao v4), com o mesmo algoritmo de antes
  const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const check = (s: string) => {
    let h = 2166136261
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
    return ((h >>> 0) % 1296).toString(36).padStart(2, '0')
  }
  const oldCode = (diff: unknown) => {
    const body = b64(JSON.stringify(diff))
    return `JB4-${body}-${check(body)}`
  }

  await t('JB4 antigo (sem face/body/v) importa e deriva cilios/sobrancelhas/corpo', () => {
    const code = oldCode({
      morphs: { bustBig: 0.5, eyesBig: 0.5, lipsFull: 0.7 },
      makeup: { lashes: { style: 'dramatic', length: 0.8 }, brows: { style: 'thin', color: '#17110f', thickness: 0.2 }, blush: { style: 'apple' } },
      skin: { tone: '#6b4128' },
      lips: { color: '#a8566e', gloss: 0.7 },
    })
    const r = looks.decodeLook(code)
    assert.ok(r.ok, r.ok ? '' : r.error)
    if (!r.ok) return
    const a = r.appearance
    assert.equal(a.v, 5)
    assert.equal(a.face.lashStyle, 'lash_5')
    assert.equal(a.face.browStyle, 'brow_4')
    assert.equal(a.face.browColor, '#17110f')
    assert.ok(Math.abs(a.face.eyeSize - 0.3) < 1e-9)
    assert.ok(Math.abs(a.body.bust - 0.5) < 1e-9)
    assert.deepEqual(a.morphs, { bustBig: 0.5, eyesBig: 0.5, lipsFull: 0.7 })
    assert.equal(a.skin.tone, '#6b4128')
    assert.equal(a.makeup!.blush.style, 'apple')
    assert.equal(a.lips!.gloss, 0.7)
  })

  await t('JB4 antigo vazio (= look padrao) continua valido', () => {
    const r = looks.decodeLook(oldCode({}))
    assert.ok(r.ok)
    if (r.ok) assert.deepEqual(r.appearance.face, DEFAULT_APPEARANCE.face)
  })

  await t('JB4 novo: encode/decode em ida e volta (inclui face/body padrao)', () => {
    for (const a of samples.slice(0, 200)) {
      const withOutfit = { ...a, outfit: {}, accessories: [], hair: { ...a.hair, id: null } }
      const r = looks.decodeLook(looks.encodeLook(withOutfit))
      assert.ok(r.ok, r.ok ? '' : r.error)
      if (r.ok) {
        // (roupas fora: o codigo ja nao carrega "sem roupa", pois so grava o que difere do padrao)
        const want = sanitizeAppearance(withOutfit)!
        const { outfit: _o, ...got } = r.appearance
        const { outfit: _w, ...exp } = want
        void _o
        void _w
        assert.deepEqual(got, exp)
      }
    }
    // face/body iguais ao padrao mas morphs diferentes: nao pode ser "re-derivado"
    const odd = { ...DEFAULT_APPEARANCE, morphs: { eyesBig: 1, bustBig: 1 } }
    const r = looks.decodeLook(looks.encodeLook({ ...odd, hair: { ...odd.hair, id: null } }))
    assert.ok(r.ok)
    if (r.ok) {
      assert.deepEqual(r.appearance.face, DEFAULT_APPEARANCE.face)
      assert.deepEqual(r.appearance.body, DEFAULT_APPEARANCE.body)
    }
  })
}

await t('proporcoes por osso: migracao zera, sanitize limita, sorteio concentrado no meio com poucos extremos', async () => {
  const BONE = ['height', 'legs', 'arms', 'torso', 'neck', 'headSize', 'hands', 'feet', 'posture', 'lordosis', 'shouldersSlope'] as const
  const old = normalizeAppearance({ v: 4, morphs: { bustBig: 0.3 } } as never)
  for (const k of BONE) assert.equal(old.body[k], 0, k)
  const s = sanitizeAppearance({ ...DEFAULT_APPEARANCE, body: { ...DEFAULT_APPEARANCE.body, posture: 7, neck: -7, feet: 'x' } } as never)!
  assert.equal(s.body.posture, 1)
  assert.equal(s.body.neck, -1)
  assert.equal(s.body.feet, 0)
  const rp = randomProportions('abc', DEFAULT_APPEARANCE.body)
  assert.deepEqual(rp, randomProportions('abc', DEFAULT_APPEARANCE.body))
  assert.equal(rp.bust, 0)
  let near = 0
  let far = 0
  let tot = 0
  for (let i = 0; i < 1500; i++) {
    const b = randomProportions(i * 977 + 3, DEFAULT_APPEARANCE.body)
    assert.deepEqual(boneIssues(b), [])
    for (const k of BONE) {
      tot++
      if (Math.abs(b[k]) < 0.45) near++
      if (Math.abs(b[k]) > 0.6) far++
    }
  }
  assert.ok(near / tot > 0.8, `perto do meio ${near / tot}`)
  assert.ok(far / tot > 0.005 && far / tot < 0.1, `extremos ${far / tot}`)
})

// ---------- genero, camadas do rosto e formato ----------
await t('catalogo de camadas e formatos: estilos, formatos por genero (v2), presets 16/9', () => {
  assert.equal(EYE_STYLES.length, 6)
  assert.equal(LAYER_BROWS.length, 6)
  assert.equal(MOUTH_STYLES.length, 6)
  assert.equal(BEARD_STYLES.length, 5)
  assert.ok(shapeNames('male').length >= 60 && shapeNames('female').length >= 55, `${shapeNames('male').length}/${shapeNames('female').length}`)
  assert.equal(MALE_SHAPE_GROUPS.length, 8)
  assert.equal(FEMALE_SHAPE_GROUPS.length, 8)
  for (const g of ['male', 'female'] as const) {
    const ids = shapeGroups(g).map((x) => x.label)
    assert.ok(ids.includes('Olhos (posição)'), 'grupo Olhos (posição)')
    assert.equal(ids[ids.length - 1], 'Divertidos', 'Divertidos por ultimo')
    assert.equal(new Set(shapeNames(g)).size, shapeNames(g).length, 'nomes de formato repetidos')
  }
  assert.equal(TWELVE.length, 16)
  assert.equal(FEM_SIX.length, 9)
  for (const g of ['male', 'female'] as const) {
    const fun = (g === 'male' ? TWELVE : FEM_SIX).filter((p) => Object.keys(p.shape).some((k) => k.startsWith('f_fun_')))
    assert.ok(fun.length >= 1, `${g}: preset divertido`)
  }
  for (const p of [...TWELVE, ...FEM_SIX]) {
    const g = (TWELVE as unknown[]).includes(p) ? 'male' : 'female'
    assert.deepEqual(sanitizeFaceLayers(p.face), p.face, p.name)
    for (const k of Object.keys(p.shape)) assert.ok(shapeNames(g).includes(k) || k === 'f_maleBase', `${p.name}: ${k}`)
  }
})

await t('migracao: perfil antigo vira female + Classica com cores atuais mantidas', () => {
  const old = normalizeAppearance({ v: 5, eyes: { color: '#3b2517', ring: 0.3 }, lips: { color: '#a8566e', gloss: 0.8 }, makeup: { brows: { style: 'painted', color: '#17110f', thickness: 0.5 } } } as never)
  assert.equal(old.gender, 'female')
  assert.equal(old.faceLayers.eye.style, 'classic')
  assert.equal(old.faceLayers.eye.iris, '#3b2517')
  assert.equal(old.faceLayers.mouth.color, '#a8566e')
  assert.equal(old.faceLayers.brow.color, '#17110f')
  assert.equal(normalizeAppearance({ v: 5 } as never).faceLayers.eye.style, 'classic')
  assert.equal(classicFromLegacy({}).eye.style, 'classic')
  assert.equal(normalizeAppearance({ gender: 'male' } as never).faceLayers.eye.style, DEFAULT_MALE_APPEARANCE.faceLayers.eye.style)
})

await t('sanitize: genero, camadas e formato validos; lixo e limitado', () => {
  const bad = sanitizeAppearance({ ...DEFAULT_MALE_APPEARANCE, faceLayers: { eye: { style: 'x', scale: 99, iris: 'red' }, beard: { style: 'full', amount: 9 } }, shape: { f_jawWide: 5, f_noseWide: 1, f_chinPointed: 0.4, nope: 1, f_earsBig: 'x' } } as never)!
  assert.equal(bad.gender, 'male')
  assert.ok(EYE_STYLES.some((e) => e.id === bad.faceLayers.eye.style))
  assert.ok(bad.faceLayers.eye.scale <= 2.4)
  assert.match(bad.faceLayers.eye.iris, HEX)
  assert.equal(bad.faceLayers.beard.amount, 1)
  assert.deepEqual(Object.keys(bad.shape).sort(), ['f_chinPointed', 'f_jawWide', 'f_noseWide'])
  assert.equal(bad.shape.f_jawWide, 1)
  const fem = sanitizeAppearance({ ...DEFAULT_APPEARANCE, shape: { f_jawWide: 0.5, f_browRidge: 1, f_adamsApple: 1, f_maleBase: 1 } } as never)!
  assert.deepEqual(Object.keys(fem.shape).sort(), ['f_browRidge', 'f_jawWide'])        // f_adamsApple e f_maleBase so existem no masculino
  assert.deepEqual(sanitizeShape('x', 'male'), {})
})

await t('aleatorio por genero: camadas e formato validos e deterministicos; NPCs misturadas', () => {
  const beards = new Set<string>()
  for (let i = 0; i < 400; i++) {
    const m = randomAppearance(`g${i}`, { gender: 'male' })
    const f = randomAppearance(`g${i}`, { gender: 'female' })
    assert.equal(m.gender, 'male')
    assert.equal(f.gender, 'female')
    assert.ok((m.hair.id ?? '').startsWith('hair.m.'), String(m.hair.id))
    assert.ok(!(f.hair.id ?? '').startsWith('hair.m.'))
    assert.notEqual(m.faceLayers.eye.style, 'classic')
    assert.notEqual(m.faceLayers.mouth.style, 'classic')
    assert.equal(f.faceLayers.beard.style, 'none')
    assert.deepEqual(sanitizeFaceLayers(m.faceLayers), m.faceLayers)
    assert.deepEqual(sanitizeFaceLayers(f.faceLayers), f.faceLayers)
    assert.deepEqual(sanitizeShape(m.shape, 'male'), m.shape)
    assert.deepEqual(sanitizeShape(f.shape, 'female'), f.shape)
    assert.deepEqual(m, randomAppearance(`g${i}`, { gender: 'male' }))
    assert.ok(Object.keys(m.shape).length >= 2 && Object.keys(f.shape).length >= 2)
    beards.add(m.faceLayers.beard.style)
  }
  assert.ok(beards.size >= 4, 'varias barbas')
  let nm = 0
  for (let i = 0; i < 400; i++) {
    const n = npcAppearance(`npc-x${i}`, DEFAULT_APPEARANCE, 0.3)
    if (n.gender === 'male') {
      nm++
      assert.deepEqual(n.outfit, {})
      assert.ok((n.hair.id ?? '').startsWith('hair.m.'))
    }
    assert.equal(npcAppearance(`npc-x${i}`, DEFAULT_APPEARANCE, 0.3), n)
  }
  assert.ok(nm > 80 && nm < 170, `masculinos ${nm}`)
  const any = Array.from({ length: 300 }, (_, i) => randomAppearance(`any${i}`, { gender: 'any' }).gender)
  assert.ok(any.filter((g) => g === 'male').length > 70)
})

await t('sanitize(JSON) preserva genero, camadas e formato (codigo de compartilhamento / nuvem)', () => {
  for (const a of [randomAppearance('jb-m', { gender: 'male' }), randomAppearance('jb-f', { gender: 'female' })]) {
    const r = sanitizeAppearance(JSON.parse(JSON.stringify(a)))!
    assert.equal(r.gender, a.gender)
    assert.deepEqual(r.faceLayers, a.faceLayers)
    assert.deepEqual(r.shape, a.shape)
  }
})

// ---------- formatos v2: faixas seguras, GLB x catalogo, frequencia dos divertidos ----------
await t('formatos: todo morph do catalogo existe no GLB/JSON do genero e a faixa segura bate com o JSON', () => {
  const files = { female: 'public/assets/characters/doll_layers.json', male: 'public/assets/characters/male/male_base.json' } as const
  for (const g of ['female', 'male'] as const) {
    const meta = JSON.parse(readFileSync(files[g], 'utf-8')) as { morphs: Array<{ name: string; safeMax?: number }> }
    const byName = new Map(meta.morphs.map((m) => [m.name, m]))
    for (const k of shapeNames(g)) {
      if (k === BIG_HEAD_SHAPE) continue // virtual: escala o osso da cabeca
      const m = byName.get(k)
      assert.ok(m, `${g}: ${k} nao existe no JSON do modelo`)
      assert.equal(m!.safeMax ?? 1, SHAPE_SAFE_MAX[g][k] ?? 1, `${g}: faixa segura de ${k}`)
    }
    for (const [k, v] of Object.entries(SHAPE_SAFE_MAX[g])) {
      assert.ok(v >= 0.25 && v <= 1, `${g}: ${k} safe ${v}`)
      assert.ok(shapeNames(g).includes(k), `${g}: faixa de morph desconhecido ${k}`)
    }
  }
})

await t('formatos: safeShape aplica a faixa segura (1 no slider = maximo seguro) e rolls ficam no catalogo', () => {
  const sh = safeShape({ f_earsBig: 1, f_jawWide: 0.5, f_x: 0.3 }, 'female')
  assert.equal(sh.f_earsBig, SHAPE_SAFE_MAX.female.f_earsBig ?? 1)
  assert.equal(sh.f_jawWide, 0.5)
  assert.equal(sh.f_x, 0.3)
  for (const g of ['female', 'male'] as const) {
    const names = new Set(shapeNames(g))
    for (let i = 0; i < 500; i++) {
      const sp = rollShape(mulberry32(i * 7919 + 3), g, i % 2 === 0)
      for (const [k, v] of Object.entries(sp)) assert.ok(names.has(k) && v > 0 && v <= 1, `${g}: ${k}=${v}`)
    }
  }
})

await t('formatos divertidos aparecem raramente (~5%, no maximo 1 por rosto) e os naturais sempre', () => {
  for (const g of ['female', 'male'] as const) {
    const funNames = new Set(shapeGroups(g).find((x) => x.id === 'fun')!.controls.flatMap((c) => [c.plus, c.minus ?? '']))
    let withFun = 0
    const N2 = 6000
    const seen = new Set<string>()
    for (let i = 0; i < N2; i++) {
      const sp = rollShape(mulberry32(i * 2654435761 + 11), g, i % 3 === 0)
      const fun = Object.keys(sp).filter((k) => funNames.has(k))
      assert.ok(fun.length <= 1, 'mais de um divertido')
      if (fun.length) withFun++
      assert.ok(Object.keys(sp).length - fun.length >= 2, 'poucos formatos naturais')
      for (const k of Object.keys(sp)) seen.add(k)
    }
    const rate = withFun / N2
    assert.ok(Math.abs(rate - FUN_SHAPE_CHANCE) < 0.012, `${g}: divertidos ${(rate * 100).toFixed(1)}%`)
    // o sorteio alcanca (quase) todos os formatos naturais
    const natural = shapeNames(g).filter((k) => !funNames.has(k))
    const miss = natural.filter((k) => !seen.has(k))
    assert.equal(miss.length, 0, `${g}: nunca sorteados ${miss.join(',')}`)
  }
})

console.log(`\n${passed} verificacoes passaram (${N} aparencias sorteadas).`)
