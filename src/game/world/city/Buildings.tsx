import { useMemo } from 'react'
import { CuboidCollider, CylinderCollider, RigidBody } from '@react-three/rapier'
import { BoxGeometry, ConeGeometry, CylinderGeometry, Matrix4, MeshBasicMaterial, MeshPhysicalMaterial, SphereGeometry, TorusGeometry, type BufferGeometry } from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { CITY } from './layout'
import { merge, paint, place, placement } from './geo'
import { Cull, chunkKey, useCullDist } from './cull'
import { nightGlass, registerGlowColor, registerWet } from '../environment/registry'
import { addGrain } from './grain'

// materiais compartilhados (registrados no ambiente: janelas acendem a noite, neon brilha mais, porcelana molha)
const BODY_MAT = new MeshPhysicalMaterial({ vertexColors: true, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2 })
const GLASS_MAT = new MeshPhysicalMaterial({ vertexColors: true, roughness: 0.1, metalness: 0.4, clearcoat: 0.8, clearcoatRoughness: 0.1, envMapIntensity: 1.1 })
const NEON_MAT = new MeshBasicMaterial({ vertexColors: true, toneMapped: false })
registerWet(BODY_MAT, { roughWet: 0.14, ccWet: 1, dark: 0.08 })
addGrain(BODY_MAT, { bump: 0.03, scale: 1.3, tone: 0.1, far: 55 })
/** molduras, caixilhos e cornijas (so perto): aco/latao escovado com envmap forte */
const METAL_MAT = new MeshPhysicalMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.85, clearcoat: 0.4, clearcoatRoughness: 0.2, envMapIntensity: 2.4 })
registerWet(METAL_MAT, { roughWet: 0.16, ccWet: 0.8, dark: 0.06 })
const DETAIL_DATA = { kit: true }
nightGlass(GLASS_MAT, 1.5)
registerGlowColor(NEON_MAT, 0.82, 1.4)

const rbox = (w: number, h: number, d: number, r: number) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - 0.01, d / 2 - 0.01, h / 2 - 0.01))

/** Centro (kit Y2K, centro.ts) e Jardim Romantico (kit romantico, romantic.ts) sao montados com o kit; os demais bairros seguem com o esboco de caixas. */
const BLOCKS = CITY.blocks.filter((b) => b.district !== 'centro' && b.district !== 'jardim')
/** o Cassino (Lounge de Jogos) e desenhado pela peca casino_building (streetProps.ts); aqui so entra o colisor */
const DRAWN = BLOCKS.filter((b) => b.shopId !== 'cassino')

interface Parts {
  body: BufferGeometry[]
  glass: BufferGeometry[]
  neon: BufferGeometry[]
}

function buildParts(blocks: typeof CITY.blocks): Parts {
  const body: BufferGeometry[] = []
  const glass: BufferGeometry[] = []
  const neon: BufferGeometry[] = []
  const dmap = new Map(CITY.districts.map((d) => [d.id, d]))

  for (const b of blocks) {
    const d = dmap.get(b.district)!
    const M: Matrix4 = placement(b.x, 0, b.z, b.rot)
    const col = d.palette[b.colorIdx % d.palette.length]
    const acc = d.accent[b.accentIdx % d.accent.length]
    const add = (list: BufferGeometry[], g: BufferGeometry, color: string, lx: number, ly: number, lz: number) => {
      paint(g, color)
      place(g, M, lx, ly, lz)
      list.push(g)
    }
    const { w, h, d: dp } = b

    if (b.shape === 'cyl') {
      const r = w / 2
      add(body, new CylinderGeometry(r, r, h, 28), col, 0, h / 2, 0)
      const dome = new SphereGeometry(r, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2)
      dome.scale(1, 0.55, 1)
      add(body, dome, '#fdfbff', 0, h, 0)
      add(body, new TorusGeometry(r + 0.05, 0.4, 8, 28).rotateX(Math.PI / 2), '#fdfbff', 0, h * 0.62, 0)
      if (b.colorIdx % 2 === 0) add(neon, new TorusGeometry(r + 0.12, 0.09, 4, 32).rotateX(Math.PI / 2), '#9fe9ff', 0, h * 0.62, 0)
    } else if (d.style === 'y2k') {
      add(body, rbox(w, h, dp, 2.6), col, 0, h / 2, 0)
      add(body, rbox(w * 0.7, 1.6, dp * 0.7, 0.8), '#fdfbff', 0, h + 0.7, 0)
      add(body, rbox(w + 0.5, 1.1, dp + 0.5, 0.5), '#fdfbff', 0, h * 0.5, 0)
      if (b.colorIdx % 3 === 0) add(neon, new BoxGeometry(w + 0.9, 0.1, dp + 0.9), '#9fe9ff', 0, h * 0.5 + 0.7, 0)
    } else if (d.style === 'luxo') {
      add(body, rbox(w + 2, 3.2, dp + 2, 0.4), '#f7f0e6', 0, 1.6, 0)
      add(body, rbox(w, h, dp, 0.5), col, 0, h / 2, 0)
      for (let k = 1; k <= 5; k++) add(glass, new BoxGeometry(w + 0.2, 1.8, dp + 0.2), acc, 0, 3.2 + ((h - 4) * k) / 6, 0)
      add(glass, new BoxGeometry(2.4, h * 0.88, 0.2), '#7fb8e6', 0, h * 0.46, dp / 2 + 0.1)
    } else if (d.style === 'neon') {
      add(body, rbox(w, h, dp, 0.5), col, 0, h / 2, 0)
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(neon, new BoxGeometry(0.35, h * 0.92, 0.35), acc, (sx * w) / 2, h * 0.5, (sz * dp) / 2)
      add(neon, new BoxGeometry(w + 0.15, 0.3, dp + 0.15), acc, 0, h * 0.5, 0)
      add(neon, new BoxGeometry(w + 0.15, 0.3, dp + 0.15), acc, 0, h + 0.05, 0)
    } else {
      // romantico: casa baixa com telhado de quatro aguas
      add(body, rbox(w, h, dp, 0.3), col, 0, h / 2, 0)
      const rh = 3.2
      const roof = new ConeGeometry(1, 1, 4, 1)
      roof.rotateY(Math.PI / 4)
      roof.scale((w + 1.4) / Math.SQRT2, rh, (dp + 1.4) / Math.SQRT2)
      add(body, roof, acc, 0, h + rh / 2, 0)
      add(body, new BoxGeometry(1, 2.2, 1), '#c9a9a0', w * 0.25, h + rh * 0.55, dp * 0.15)
      add(body, new BoxGeometry(1.3, 2.3, 0.2), '#e8b4c0', 0, 1.15, dp / 2 + 0.05)
      if (b.shopId === 'casa-sonhos') {
        for (const sx of [-1, 1]) {
          add(body, new CylinderGeometry(2.6, 2.6, h + 5, 20), '#ffd1dc', (sx * w) / 2, (h + 5) / 2, -dp / 2 + 1)
          add(body, new ConeGeometry(3.2, 4.5, 20), '#ff9ccb', (sx * w) / 2, h + 5 + 2.25, -dp / 2 + 1)
        }
      }
    }

    // portas das lojas: faixa luminosa + toldo na cor da loja
    if (b.shopId) {
      const poi = CITY.pois.find((p) => p.id === b.shopId)!
      add(neon, new BoxGeometry(2.4, 3.4, 0.3), poi.color, 0, 1.7, dp / 2 + 0.2)
      add(body, new BoxGeometry(5, 0.35, 2.4), poi.color, 0, 3.9, dp / 2 + 1.2)
    }
  }
  return { body, glass, neon }
}

// ---------------------------------------------------------------- detalhe de fachada (so perto, em 2 niveis)
/** `base`: cornijas e quinas (barato, ate ~85 m); `near`: aletas, linhas de laje, colunas, caixilhos, portal e toldo (ate ~44 m). Alem disso: so a massa simples. */
const DETAIL_BASE_DIST = 70
const DETAIL_NEAR_DIST = 38

interface DParts {
  stone: BufferGeometry[]
  metal: BufferGeometry[]
  glass: BufferGeometry[]
  neon: BufferGeometry[]
}
const emptyParts = (): DParts => ({ stone: [], metal: [], glass: [], neon: [] })

const FACE_ROT = [0, Math.PI / 2, Math.PI, -Math.PI / 2]

/** Detalhes de fachada. Cada face e desenhada em coordenadas locais (x ao longo da face, y para cima, z para fora do plano da parede). */
function buildDetail(blocks: typeof CITY.blocks): { base: DParts; near: DParts } {
  const base = emptyParts()
  const near = emptyParts()
  const dmap = new Map(CITY.districts.map((d) => [d.id, d]))
  for (const b of blocks) {
    const d = dmap.get(b.district)!
    if (d.style !== 'luxo' && d.style !== 'neon') continue
    const Mb = placement(b.x, 0, b.z, b.rot)
    const { w, h, d: dp } = b
    const acc = d.accent[b.accentIdx % d.accent.length]
    const luxo = d.style === 'luxo'
    const poi = b.shopId ? CITY.pois.find((p) => p.id === b.shopId) : undefined
    for (let f = 0; f < 4; f++) {
      const fw = f % 2 === 0 ? w : dp
      const half = f % 2 === 0 ? dp / 2 : w / 2
      const Mf = new Matrix4().multiplyMatrices(Mb, new Matrix4().makeRotationY(FACE_ROT[f])).multiply(new Matrix4().makeTranslation(0, 0, half))
      const put = (list: BufferGeometry[], g: BufferGeometry, color: string, u: number, y: number, o: number) => {
        paint(g, color)
        g.applyMatrix4(new Matrix4().multiplyMatrices(Mf, new Matrix4().makeTranslation(u, y, o)))
        list.push(g)
      }
      const bx = (list: BufferGeometry[], color: string, bw: number, bh: number, bd: number, u: number, y: number, o: number) =>
        put(list, new BoxGeometry(bw, bh, bd), color, u, y, o)
      const isDoorFace = !!b.shopId && f === 0

      if (luxo) {
        const gold = '#d4b06a'
        const steel = '#cfd3d6'
        const podH = 3.2
        // ---- base (barato): cornija do pedestal, quinas em latao, coroamento com parapeito
        bx(base.stone, '#f3ece0', fw + 2.5, 0.34, 0.5, 0, podH + 0.17, 1.0)
        bx(base.metal, gold, fw + 2.3, 0.07, 0.12, 0, podH + 0.4, 1.12)
        if (f % 2 === 0) for (const sx of [-1, 1]) bx(base.metal, gold, 0.34, h - podH - 0.4, 0.34, (sx * fw) / 2, podH + 0.2 + (h - podH - 0.4) / 2, 0.14)
        bx(base.stone, '#f3ece0', fw + 1.0, 0.5, 0.9, 0, h - 0.05, 0.4)
        bx(base.metal, gold, fw + 0.8, 0.08, 0.14, 0, h + 0.28, 0.82)
        bx(base.stone, '#f3ece0', fw + 0.7, 0.9, 0.28, 0, h + 0.7, 0.26)
        // ---- perto: soco, colunas do pedestal, aletas do curtain wall, linhas de laje, modilhoes
        bx(near.stone, '#c9bfac', fw + 2.7, 0.4, 0.5, 0, 0.2, 1.05)
        if (f % 2 === 0) {
          const nCol = Math.max(2, Math.round(fw / 3.6))
          for (let i = 0; i <= nCol; i++) {
            const u = -fw / 2 - 0.9 + ((fw + 1.8) * i) / nCol
            if (isDoorFace && Math.abs(u) < 2.4) continue
            bx(near.stone, '#f6f0e4', 0.46, podH - 0.2, 0.46, u, 0.4 + (podH - 0.5) / 2, 1.08)
            bx(near.metal, gold, 0.64, 0.1, 0.64, u, podH - 0.06, 1.08)
          }
        }
        const nFin = Math.max(3, Math.round(fw / 3.0))
        const fh = h - podH - 0.4
        for (let i = 1; i < nFin; i++) bx(near.metal, steel, 0.1, fh, 0.3, -fw / 2 + (fw * i) / nFin, podH + 0.2 + fh / 2, 0.14)
        for (let k = 1; k <= 5; k += 2) bx(near.stone, '#efe6d6', fw + 0.5, 0.2, 0.34, 0, Math.min(podH + ((h - 4) * (k + 0.5)) / 6 + 0.2, h - 0.5), 0.16)
        const nMod = Math.max(3, Math.round(fw / 1.9))
        for (let i = 0; i < nMod; i++) bx(near.stone, '#d9cdb8', 0.3, 0.26, 0.3, -fw / 2 + 0.3 + ((fw - 0.6) * i) / (nMod - 1), h - 0.45, 0.84)
        // portal da loja: pilastras, verga, letreiro dourado e toldo com franja
        if (isDoorFace) {
          for (const sx of [-1, 1]) {
            bx(near.stone, '#f6f0e4', 0.55, 3.5, 0.5, sx * 1.75, 1.75, 1.2)
            bx(near.metal, gold, 0.7, 0.14, 0.64, sx * 1.75, 3.55, 1.2)
          }
          bx(near.stone, '#f6f0e4', 4.4, 0.55, 0.55, 0, 3.78, 1.2)
          bx(near.metal, gold, 4.0, 0.2, 0.1, 0, 3.52, 1.5)
          // vitrines: moldura de latao + vidro profundo dos dois lados da porta
          for (const sx of [-1, 1]) {
            bx(near.metal, gold, 3.3, 2.5, 0.16, sx * 4.4, 1.7, 1.02)
            bx(near.glass, '#bcd2dc', 2.9, 2.1, 0.06, sx * 4.4, 1.7, 1.12)
            bx(near.stone, '#f3ece0', 3.5, 0.2, 0.34, sx * 4.4, 0.42, 1.12)
          }
          const stripe = [poi?.color ?? '#f4a3c4', '#f7f1e3']
          bx(near.stone, stripe[0], 5.2, 0.12, 2.0, 0, 4.15, 2.2)
          for (let i = 0; i < 9; i++) bx(near.stone, stripe[i % 2], 0.6, 0.38, 0.05, -2.4 + i * 0.6, 3.98, 3.17)
        }
      } else {
        // Palco Neon: tijolo escuro + aco, janelas de caixilho com vidro aceso, letreiros e cornija de aco
        const steel = '#3c424c'
        bx(base.metal, steel, fw + 0.9, 0.45, 0.8, 0, h - 0.1, 0.34)
        bx(base.neon, acc, fw - 0.4, 0.07, 0.07, 0, h - 0.5, 0.78)
        bx(base.metal, steel, fw + 0.5, 0.7, 0.28, 0, h + 0.55, 0.14)
        bx(base.stone, '#26282f', fw + 0.5, 0.9, 0.3, 0, 0.45, 0.14)
        if (f !== 2) {
          const cols = Math.max(2, Math.floor(fw / 3.4))
          const rows = Math.max(1, Math.floor((h - 4.2) / 3.8))
          for (let r = 0; r < rows; r++) {
            const y = 5.0 + r * 3.8
            if (y > h - 1.6) break
            for (let c = 0; c < cols; c++) {
              const u = -fw / 2 + (fw * (c + 0.5)) / cols
              if (isDoorFace && r === 0 && Math.abs(u) < 3) continue
              bx(near.metal, steel, 1.5, 2.0, 0.22, u, y, 0.1)
              bx(near.glass, acc, 1.18, 1.68, 0.06, u, y, 0.23)
              if (f === 0) bx(near.stone, '#8c8f96', 1.8, 0.14, 0.42, u, y - 1.08, 0.2)
            }
          }
        }
        if (isDoorFace) {
          bx(near.metal, steel, 5.4, 0.5, 0.3, 0, 4.1, 0.9)
          bx(near.neon, poi?.color ?? acc, 4.6, 0.12, 0.08, 0, 4.1, 1.08)
        }
      }
    }
    // topo: antena/aro luminoso (Moda) ou caixa d'agua (Neon)
    if (luxo && h > 40) {
      const spire = paint(new CylinderGeometry(0.12, 0.3, 8, 6), '#d4b06a')
      place(spire, Mb, w * 0.15, h + 4, -dp * 0.1)
      base.metal.push(spire)
      const ring = paint(new TorusGeometry(1.6, 0.1, 4, 14).rotateX(Math.PI / 2), '#fff2c8')
      place(ring, Mb, w * 0.15, h + 3.2, -dp * 0.1)
      base.neon.push(ring)
    }
    if (!luxo) {
      const tank = paint(new CylinderGeometry(1.1, 1.1, 2.2, 8), '#5a4a3e')
      place(tank, Mb, w * 0.25, h + 1.6, dp * 0.1)
      base.stone.push(tank)
      const roof = paint(new ConeGeometry(1.25, 0.8, 8), '#2f2f36')
      place(roof, Mb, w * 0.25, h + 3.1, dp * 0.1)
      base.stone.push(roof)
    }
  }
  return { base, near }
}

export function Buildings({ shadows }: { shadows: boolean }) {
  const dist = useCullDist()
  const chunks = useMemo(() => {
    const map = new Map<number, typeof CITY.blocks>()
    for (const b of DRAWN) {
      const k = chunkKey(b.x, b.z)
      const l = map.get(k)
      if (l) l.push(b)
      else map.set(k, [b])
    }
    return [...map.values()].map((blocks) => {
      const p = buildParts(blocks)
      const cx = blocks.reduce((a, b) => a + b.x, 0) / blocks.length
      const cz = blocks.reduce((a, b) => a + b.z, 0) / blocks.length
      const r = Math.max(...blocks.map((b) => Math.hypot(b.x - cx, b.z - cz) + Math.hypot(b.w, b.d))) + 4
      const dt = buildDetail(blocks.filter((b) => b.shape === 'box'))
      const mg = (l: BufferGeometry[]) => (l.length ? merge(l) : null)
      const mp = (q: DParts) => ({ stone: mg(q.stone), metal: mg(q.metal), glass: mg(q.glass), neon: mg(q.neon) })
      // cornijas de pedra e fios de neon baratos entram direto na massa (sem malha extra); so o latao do coroamento e o nivel `near` sao malhas separadas
      const nbody = [...p.body, ...dt.base.stone]
      const nneon = [...p.neon, ...dt.base.neon]
      return { body: merge(nbody), glass: p.glass.length ? merge(p.glass) : null, neon: nneon.length ? merge(nneon) : null, cx, cz, r, base: { stone: null, metal: mg(dt.base.metal), glass: null, neon: null }, near: mp(dt.near) }
    })
  }, [])

  return (
    <group>
      {chunks.map((c, i) => (
        <Cull key={i} cx={c.cx} cz={c.cz} r={c.r} max={dist.buildings}>
          <mesh geometry={c.body} material={BODY_MAT} castShadow={shadows} receiveShadow={shadows} />
          {c.glass && <mesh geometry={c.glass} material={GLASS_MAT} castShadow={shadows} />}
          {c.neon && <mesh geometry={c.neon} material={NEON_MAT} />}
        </Cull>
      ))}
      {/* detalhe de fachada em 2 niveis: cornijas/quinas (ate ~85 m) e aletas/caixilhos/portais (ate ~44 m); alem disso so a massa simples */}
      {(['base', 'near'] as const).map((tier) =>
        chunks.map((c, i) => (
          <Cull key={tier + i} cx={c.cx} cz={c.cz} r={c.r} max={Math.min(tier === 'base' ? DETAIL_BASE_DIST : DETAIL_NEAR_DIST, dist.buildings)}>
            {c[tier].stone && <mesh geometry={c[tier].stone} material={BODY_MAT} receiveShadow={shadows} userData={DETAIL_DATA} />}
            {c[tier].metal && <mesh geometry={c[tier].metal} material={METAL_MAT} receiveShadow={shadows} userData={DETAIL_DATA} />}
            {c[tier].glass && <mesh geometry={c[tier].glass} material={GLASS_MAT} renderOrder={3} userData={DETAIL_DATA} />}
            {c[tier].neon && <mesh geometry={c[tier].neon} material={NEON_MAT} userData={DETAIL_DATA} />}
          </Cull>
        )),
      )}

      <RigidBody type="fixed" colliders={false}>
        {BLOCKS.map((b) =>
          b.shape === 'cyl' ? (
            <CylinderCollider key={b.id} args={[b.h / 2, b.w / 2]} position={[b.x, b.h / 2, b.z]} />
          ) : (
            <CuboidCollider key={b.id} args={[b.w / 2, b.h / 2, b.d / 2]} position={[b.x, b.h / 2, b.z]} rotation={[0, b.rot, 0]} />
          ),
        )}
      </RigidBody>
    </group>
  )
}
