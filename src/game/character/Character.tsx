import { forwardRef, Suspense, use, useImperativeHandle, useDeferredValue, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF, useTexture } from '@react-three/drei'
import { Color, MeshPhysicalMaterial, Vector3, type Material, NoColorSpace, Skeleton, type Bone, type Group, type MeshStandardMaterial, type Object3D, type SkinnedMesh, type Texture } from 'three'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import type { GLTF } from 'three-stdlib'
import type { Appearance, ItemRef } from '../../shared/appearance'
import { BASES, bodyAssets, loadBaseMeta } from './assets'
import { applyBodyLook, createBodyMaterial, createHairMaterial, setMakeupTextures } from './dollMaterial'
import { createMaleMaterial } from './maleMaterial'
import { AUDIT, auditSamplers } from './samplerAudit'
import { configureFaceLayers } from './faceLayerShader'
import { createMaleHairMaterial } from './maleHair'
import { BIG_HEAD_GAIN, BIG_HEAD_SHAPE, DEFAULT_FACE_LAYERS, MALE_BASE_SHAPE, safeShape, type FaceLayers } from '../../shared/faceLayers'
import { BLANK_TEXTURE, getMakeupTextures } from './makeup/textures'
import { DEFAULT_MAKEUP, makeupIsEmpty, normalizeMakeup } from '../../shared/appearance'
import { getWearable, MALE_WEARABLES, WEARABLES, type WearableDef } from './items'
import { getCatalogItem, hairFit, loadCatalog, type CatalogItem } from './catalog'
import { syncJewelEnv } from './jewelShine'
import { applyHairCalib, hairCalibFor } from './hairFit'
import { applyFinish, applyJewelMaterial, fabricTex, onFabricTextureLoad } from './fabric'
import { motifColor, patternTexture } from './patterns'
import { morphInfluence } from './morphConfig'
import { applyRestPose } from './pose'
import { BodyRig } from './proportions'
import { ensureTangents } from './tangents'
import { CharacterAnimation, type AnimDriver } from './animation/CharacterAnimation'
import { SKIRT_GARMENTS } from './secondary/skirtGarments'

export interface CharacterHandle {
  /** raiz (pes em y=0, olhando para +Z) */
  root: Group
  /** esqueleto da base (nomes `mixamorigHips`...); cabelo e roupa usam estes mesmos ossos */
  skeleton: Skeleton
  bones: Record<string, Bone>
  /** proporcoes por osso (altura, pernas, postura...); a animacao chama begin()/apply() a cada quadro */
  proportions: BodyRig
}

export interface CharacterProps {
  appearance: Appearance
  /** projeta sombra (qualidade medium/high) */
  shadows?: boolean
  /** animacao: 'player' (estados do jogo) ou { clip, t } (visualizador); omitido = so a pose de repouso */
  anim?: AnimDriver
}

interface Rig extends CharacterHandle {
  armature: Object3D
  body: SkinnedMesh
  /** texturas do GLB (atlas baked + normal), reaproveitadas pelo cabelo (mesmo atlas) */
  map: Texture | null
  normalMap: Texture | null
}

function buildRig(scene: Group, gender: 'female' | 'male'): Rig {
  const root = cloneSkinned(scene) as Group
  const bones: Record<string, Bone> = {}
  let body: SkinnedMesh | null = null
  root.traverse((o) => {
    if ((o as Bone).isBone) bones[o.name] = o as Bone
    if ((o as SkinnedMesh).isSkinnedMesh && !body) body = o as SkinnedMesh
  })
  const b = body as SkinnedMesh | null
  if (!b) throw new Error('doll_base.glb sem SkinnedMesh')
  ensureTangents(b.geometry) // geometria e compartilhada entre clones; faz uma vez
  const m = b.material as MeshPhysicalMaterial
  return { root, bones, proportions: new BodyRig(root, bones, gender), skeleton: b.skeleton, armature: b.parent!, body: b, map: m.map, normalMap: m.normalMap }
}

/** Peca a montar: cabelo (registro estatico) ou roupa (catalogo de manifesto). */
interface Part {
  key: string
  glb: string
  hair?: WearableDef
  item?: CatalogItem
  ref?: ItemRef
  color: string
  /** cabelo: coloracao extra (ombre/mechas/bicolor/brilho) */
  hairLook?: Appearance['hair']
}

interface Attachment {
  part: Part
  meshes: SkinnedMesh[]
  materials: MeshPhysicalMaterial[]
  /** cabelo: cor; roupa: aplica cores/acabamentos do ItemRef */
  apply: (p: Part) => void
  skeletons: Skeleton[]
  /** cabelo: uniforms do shader (recorte sob chapeu) */
  hairUniforms?: Record<string, { value: unknown }>
}

const slotOf = (m: Material | Material[]): string => (Array.isArray(m) ? m[0] : m).name.replace(/\.\d+$/, '')

/**
 * Peca (cabelo/roupa) presa ao MESMO esqueleto do corpo: clona o GLB da peca e recria o `Skeleton` de cada
 * SkinnedMesh usando os ossos do corpo (casados por nome) + as boneInverses originais da peca. Assim a peca
 * segue a animacao dos ossos do corpo sem duplicar a hierarquia (e cada personagem tem seus proprios ossos).
 * Os GLB da peca vem do mesmo pipeline/esqueleto, entao as boneInverses coincidem.
 * Roupas: um material por slot (base/trim/accent/lining, pelo nome do material no GLB), recolorido pelo ItemRef.
 */
function buildAttachment(rig: Rig, part: Part, gltf: GLTF): Attachment {
  const src = cloneSkinned(gltf.scene) as Group
  const found: SkinnedMesh[] = []
  src.traverse((o) => {
    if ((o as SkinnedMesh).isSkinnedMesh) found.push(o as SkinnedMesh)
  })
  const skeletons: Skeleton[] = []
  const meshes: SkinnedMesh[] = []
  const def = part.hair
  if (def?.male) {
    // cabelo masculino: casca com cor de vertice, presa ao osso Head; sem textura (a cor e o tint do material)
    const material = createMaleHairMaterial(part.color, part.hairLook?.gloss ?? 0.7)
    for (const m of found) {
      const bones = m.skeleton.bones.map((b) => rig.bones[b.name])
      if (bones.some((b) => !b)) continue
      const skel = new Skeleton(bones, m.skeleton.boneInverses.map((x) => x.clone()))
      m.removeFromParent()
      m.bind(skel, m.bindMatrix)
      m.frustumCulled = false
      m.material = material
      skeletons.push(skel)
      meshes.push(m)
    }
    const apply = (p: Part) => {
      material.color.set(p.color)
      material.sheenColor.set(p.color).lerp(new Color('#ffffff'), 0.3)
      const gl = p.hairLook?.gloss ?? 0.7
      material.roughness = 0.55 - 0.3 * gl
      material.clearcoat = 0.9 * gl
    }
    return { part, meshes, materials: [material], apply, skeletons }
  }
  // cabelo com textura propria: baseColor/normal vem do material do proprio GLB (compartilhados no cache, nao descartar)
  const own = def?.texture === 'own' ? (found[0]?.material as MeshStandardMaterial | undefined) : undefined
  const slotMats = new Map<string, MeshPhysicalMaterial>()
  for (const m of found) {
    ensureTangents(m.geometry)
    const bones = m.skeleton.bones.map((b) => rig.bones[b.name])
    if (bones.some((b) => !b)) continue
    const skel = new Skeleton(bones, m.skeleton.boneInverses.map((x) => x.clone()))
    const slot = def ? '' : slotOf(m.material)
    m.removeFromParent()
    m.bind(skel, m.bindMatrix)
    m.frustumCulled = false
    skeletons.push(skel)
    meshes.push(m)
    if (!def) {
      let mat = slotMats.get(slot)
      if (!mat) {
        slotMats.set(slot, (mat = new MeshPhysicalMaterial({ name: slot })))
        if (SKIRT_GARMENTS.has(part.item!.id)) mat.userData.secondaryMotion = 'skirt'
      }
      m.material = mat
    }
  }
  if (def) {
    const h = def.kind === 'hair' && own ? createHairMaterial(own.map, own.normalMap, def.refLum) : createHairMaterial(rig.map, rig.normalMap)
    const material = h.material
    applyHairCalib(h.uniforms, hairCalibFor((def.glb.split('/').pop() ?? '').replace('.glb', '')))
    for (const m of meshes) m.material = material
    // faixa vertical do cabelo (ombre/mechas): altura min/max da malha em repouso
    let ymin = Infinity
    let ymax = -Infinity
    for (const m of meshes) {
      m.geometry.computeBoundingBox()
      const bb = m.geometry.boundingBox!
      ymin = Math.min(ymin, bb.min.y)
      ymax = Math.max(ymax, bb.max.y)
    }
    h.uniforms.uYMin.value = ymin
    h.uniforms.uYMax.value = ymax
    const apply = (p: Part) => {
      const hr = p.hairLook
      ;(h.uniforms.uHair.value as Color).set(p.color)
      ;(h.uniforms.uHair2.value as Color).set(hr?.color2 ?? p.color)
      h.uniforms.uHairMode.value = hr?.mode === 'ombre' ? 1 : hr?.mode === 'highlights' ? 2 : hr?.mode === 'twotone' ? 3 : 0
      h.uniforms.uHairAmt.value = hr?.amount ?? 0.5
      h.uniforms.uHairGloss.value = hr?.gloss ?? 0.5
      material.sheenColor.set(p.color).lerp(new Color('#ffffff'), 0.25).multiplyScalar(0.35 + (hr?.gloss ?? 0.5) * 0.7)
    }
    return { part, meshes, materials: [material], apply, skeletons, hairUniforms: h.uniforms }
  }
  const item = part.item!
  const apply = (p: Part) => {
    item.mats.forEach((ms, i) => {
      const mat = slotMats.get(ms.id)
      if (!mat) return
      applyFinish(mat, p.ref?.finishes?.[i] ?? ms.finish, p.ref?.colors?.[i] ?? ms.color)
      // estampa: so no slot de estampa (padrao: o primeiro); a peca pode trazer uma por padrao (`defaultPattern`), 'none' = liso.
      // O detalhe (trim) vira a cor do motivo nas estampas procedurais; texturas tonais multiplicam a cor do slot.
      const patId = p.ref?.pattern ?? item.defaultPattern
      const isPatSlot = item.patternSlot ? ms.id === item.patternSlot : i === 0
      const pat = isPatSlot && patId && patId !== 'none' ? item.patterns?.find((x) => x.id === patId) : undefined
      if (pat) {
        const baseCol = p.ref?.colors?.[i] ?? ms.color
        const motif = motifColor(baseCol, p.ref?.colors?.[1] ?? item.mats[1]?.color)
        mat.map = pat.texture ? fabricTex(pat.texture, true, pat.scale ?? 4) : patternTexture(pat.id, baseCol, motif, pat.scale ?? 4)
        mat.color.set(pat.texture && pat.tonal ? baseCol : pat.texture && !p.ref?.pattern ? baseCol : '#ffffff')
        mat.needsUpdate = true
      }
    })
  }
  return { part, meshes, materials: [...slotMats.values()], apply, skeletons }
}

interface Jewel {
  item: CatalogItem
  roots: Array<{ bone: Bone; obj: Group; scale: [number, number, number] }>
  materials: Array<{ slot: string; mat: MeshPhysicalMaterial }>
}

/** Joia rigida: um clone por ponto de fixacao, preso ao osso com o offset do manifesto (pose de repouso). */
function buildJewel(rig: Rig, item: CatalogItem, gltf: GLTF, hairFile: string | null): Jewel {
  const roots: Jewel['roots'] = []
  const materials: Jewel['materials'] = []
  for (const at of item.attachments ?? []) {
    const bone = rig.bones[at.bone.replace(':', '')]
    if (!bone) continue
    const obj = gltf.scene.clone(true)
    obj.position.set(...at.position)
    const dir = hairFit.mountDir[item.id]
    // chapeus que cobrem (hairClip) comprimem o cabelo em vez de depender do lift
    const lift = hairFile && !item.hairClip ? hairFit.lift[hairFile]?.[item.id] : undefined
    if (dir && lift) obj.position.add(new Vector3(dir[0], dir[1], dir[2]).multiplyScalar(lift))
    obj.quaternion.set(...at.quaternion)
    obj.scale.set(...at.scale)
    const byName = new Map<string, MeshPhysicalMaterial>()
    obj.traverse((o) => {
      const mesh = o as import('three').Mesh
      if (!mesh.isMesh) return
      const slot = slotOf(mesh.material)
      let mat = byName.get(slot)
      if (!mat) {
        byName.set(slot, (mat = new MeshPhysicalMaterial({ name: slot })))
        materials.push({ slot, mat })
      }
      mesh.material = mat
      mesh.castShadow = false
    })
    roots.push({ bone, obj, scale: at.scale })
  }
  return { item, roots, materials }
}

function applyMorphs(mesh: SkinnedMesh, morphs: Record<string, number>) {
  const dict = mesh.morphTargetDictionary
  const inf = mesh.morphTargetInfluences
  if (!dict || !inf) return
  for (const name in dict) inf[dict[name]] = morphInfluence(name, morphs[name] ?? 0)
}

// Efeitos em layout: o look (pele/macacao/cabelo/joias/morphs) e aplicado ANTES do primeiro quadro desenhado.
// Com useEffect havia 1+ quadros com os uniforms padrao (corpo todo rosa, cabelo sem cor, joias sem material).
function CharacterImpl({ appearance, shadows = false, anim, handle }: CharacterProps & { handle: React.Ref<CharacterHandle> }) {
  const gender = appearance.gender === 'male' ? 'male' : 'female'
  use(loadBaseMeta(appearance.base, gender))
  const base = bodyAssets(gender)
  // useDeferredValue: ao trocar o cabelo (GLB carregado sob demanda) o anterior fica ate o novo estar pronto, sem suspender o personagem
  const hairId = useDeferredValue(appearance.hair.id)
  const hairDef0 = getWearable(hairId)
  // cabelos femininos so na boneca e os masculinos so no masculino
  const hairDef = hairDef0 && !!hairDef0.male === (gender === 'male') ? hairDef0 : null
  use(loadCatalog())
  const o = useDeferredValue(appearance.outfit)
  const accessories = useDeferredValue(appearance.accessories)
  const parts: Part[] = []
  if (hairDef) parts.push({ key: hairDef.id, glb: hairDef.glb, hair: hairDef, color: appearance.hair.color, hairLook: appearance.hair })
  // masculino: as roupas sao do corpo feminino (a boxer e a base); acessorios rigidos ficam ocultos ate serem testados no corpo masculino
  const worn = gender === 'male' ? [] : [o.dress ?? o.top, o.dress ? undefined : o.bottom, o.gloves, o.legwear, o.shoes]
  // `hides` do manifesto: uma peca esconde (nao desenha) outras, sem tirar do look ('legs' = meias)
  const hidden = new Set<string>()
  for (const r of worn) for (const h of getCatalogItem(r?.id)?.hides ?? []) hidden.add(h === 'legs' ? 'legwear' : h)
  for (const r of worn) {
    const item = getCatalogItem(r?.id)
    if (r && item && item.kind === 'garment' && !(hidden.has(item.slot) && !(item.hides ?? []).includes(item.slot))) parts.push({ key: item.id, glb: item.glb, item, ref: r, color: '' })
  }
  // sapatos elevam o personagem (m), para a sola assentar no chao
  const lift = worn.reduce((m, r) => Math.max(m, getCatalogItem(r?.id)?.lift ?? 0), 0)
  const jewels: Array<{ item: CatalogItem; ref: ItemRef }> = []
  const wornAcc = (gender === 'male' ? [] : accessories).map((r) => getCatalogItem(r.id)).filter((x): x is CatalogItem => !!x)
  const hasScarf = wornAcc.some((x) => x.slot === 'scarf')
  const hasBackBag = wornAcc.some((x) => x.slot === 'bag' && x.carry === 'back')
  for (const r of gender === 'male' ? [] : accessories) {
    const item = getCatalogItem(r.id)
    if (!item || item.kind !== 'jewelry') continue
    // regras de esconder: lenco esconde gargantilhas; mochila esconde colares longos nas costas
    if (item.slot === 'neck' && ((hasScarf && /choker/.test(item.id)) || (hasBackBag && /^(opera_pearls|layered_gold|chunky_chain)$/.test(item.id)))) continue
    jewels.push({ item, ref: r })
  }
  const gltfs = useGLTF([base.glb, ...parts.map((d) => d.glb), ...jewels.map((j) => j.item.glb)]) as GLTF[]
  const glCfg = useThree((st) => st.gl)
  configureFaceLayers(glCfg.capabilities.maxTextures) // GPU com poucas unidades de textura: modo economico do rosto
  const masks = useTexture(gender === 'male' || base.layers ? [base.mask] : [base.mask, base.mask2, base.mask3!, base.mask4!])

  // ---- esqueleto + malha do corpo (clone por instancia) ----
  const rig = useMemo(() => buildRig(gltfs[0].scene, gender), [gltfs[0]]) // eslint-disable-line react-hooks/exhaustive-deps
  useImperativeHandle(handle, () => rig, [rig])
  // f_fun_bigHead (divertido) nao e morph: escala o osso da cabeca (cabelo e chapeus acompanham), somando-se ao `headSize` do corpo
  const bigHead = appearance.shape?.[BIG_HEAD_SHAPE] ?? 0
  const bodyEff = useMemo(() => (bigHead > 0.001 ? { ...appearance.body, headSize: appearance.body.headSize + BIG_HEAD_GAIN * bigHead } : appearance.body), [appearance.body, bigHead])
  useLayoutEffect(() => {
    applyRestPose(rig.bones, rig.root)
    rig.proportions.set(bodyEff)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rig])
  // proporcoes: comprimentos de osso (altura, pernas, bracos...) e postura; a pose animada e somada em CharacterAnimation
  const bodyKey = JSON.stringify(bodyEff)
  useLayoutEffect(() => {
    rig.proportions.set(bodyEff)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rig, bodyKey])
  // sem animacao propria (poses de minijogo, retratos): so comprimentos/escalas, sem postura aditiva
  useFrame(() => {
    if (anim) return
    rig.proportions.weights.posture = 0
    rig.proportions.weights.lordosis = 0
    rig.proportions.begin()
    rig.proportions.apply()
  })

  // mascaras: dados lineares, UV do glTF (sem flip)
  useMemo(() => {
    for (const t of masks) {
      t.flipY = false
      t.colorSpace = NoColorSpace
      t.anisotropy = 4
      t.needsUpdate = true
    }
  }, [masks])

  // ---- material do corpo (um por instancia) ----
  // rosto por camadas: o estado efetivo respeita a maquiagem antiga (sobrancelha/cilios desenhados pela maquiagem escondem os da camada)
  const mkp = useMemo(() => normalizeMakeup(appearance.makeup ?? DEFAULT_MAKEUP), [appearance.makeup])
  const faceKey = JSON.stringify([appearance.faceLayers, gender === 'female' ? [mkp.brows.style, mkp.lashes.style] : 0])
  const faceLayers = useMemo<FaceLayers>(() => {
    const f: FaceLayers = appearance.faceLayers ?? DEFAULT_FACE_LAYERS
    if (gender === 'male') return f
    return {
      ...f,
      brow: { ...f.brow, opacity: mkp.brows.style !== 'painted' ? 0 : f.brow.opacity },
      eye: { ...f.eye, lash: mkp.lashes.style !== 'natural' ? 'none' : f.eye.lash },
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faceKey])
  const maleMat = useMemo(() => (gender === 'male' ? createMaleMaterial(rig.map, masks[0], faceLayers) : null), [rig, masks, gender]) // eslint-disable-line react-hooks/exhaustive-deps
  const bodyMat = useMemo(
    () => (gender === 'male' ? null : createBodyMaterial(rig.map, rig.normalMap, { mask: masks[0], mask2: masks[1] ?? masks[0], mask3: masks[2], mask4: masks[3] }, BLANK_TEXTURE, base.layers ? faceLayers : null)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rig, masks, gender],
  )
  const bodyMaterial = (maleMat?.material ?? bodyMat!.material) as MeshPhysicalMaterial
  useLayoutEffect(() => {
    maleMat?.setFace(faceLayers)
    bodyMat?.setFace?.(faceLayers)
  }, [maleMat, bodyMat, faceLayers])
  useLayoutEffect(() => {
    rig.body.material = bodyMaterial
    rig.body.frustumCulled = false
    return () => {
      maleMat?.dispose()
      bodyMat?.dispose?.() ?? bodyMat?.material.dispose()
    }
  }, [rig, bodyMaterial, maleMat, bodyMat])

  const lookKey = JSON.stringify([appearance.skin, appearance.suit, appearance.lips, appearance.hair.color, appearance.eyes, mkp, !!(appearance.outfit.dress || appearance.outfit.top), !!(appearance.outfit.dress || appearance.outfit.bottom), !hairDef])
  useLayoutEffect(() => {
    if (maleMat) {
      maleMat.setLook(appearance.skin.tone, appearance.suit.color, appearance.hair.color)
      return
    }
    const eyes = appearance.eyes
    const brow = mkp.brows
    const nails = mkp.nails
    applyBodyLook(bodyMat!, {
      skin: appearance.skin.tone,
      suit: appearance.suit.color,
      finish: appearance.suit.finish,
      suitBase: appearance.suit.base ?? 'color',
      covered: { up: !!(appearance.outfit.dress || appearance.outfit.top), low: !!(appearance.outfit.dress || appearance.outfit.bottom) },
      skinFinish: appearance.skin.finish,
      bodyFreckles: appearance.skin.bodyFreckles,
      lips: appearance.lips,
      lipFinish: mkp.lips.finish,
      hair: appearance.hair.color,
      bald: !hairDef,
      eyes: eyes ? { l: eyes.color, r: eyes.colorR ?? eyes.color, ring: eyes.ring } : undefined,
      brow: { mode: brow.style !== 'painted' ? 'erase' : brow.color.toLowerCase() !== DEFAULT_MAKEUP.brows.color ? 'tint' : 'keep', color: brow.color },
      lash: { color: mkp.lashes.style !== 'natural' || mkp.lashes.color.toLowerCase() !== DEFAULT_MAKEUP.lashes.color ? mkp.lashes.color : null },
      nails: { style: { none: 0, solid: 1, french: 2, ombre: 3, glitter: 4 }[nails.style], c1: nails.color, c2: nails.color2, fin: { gloss: 0, matte: 1, chrome: 2 }[nails.finish] },
    })
    if (makeupIsEmpty(mkp)) setMakeupTextures(bodyMat!, null, BLANK_TEXTURE)
    else {
      const t = getMakeupTextures(mkp, appearance.skin.tone)
      setMakeupTextures(bodyMat!, t.tex, BLANK_TEXTURE)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodyMat, maleMat, lookKey])

  // ---- cabelo e roupa: presos ao mesmo esqueleto ----
  const attachKey = parts.map((d) => d.key).join('|')
  const attachments = useMemo(
    () => parts.map((d, i) => buildAttachment(rig, d, gltfs[i + 1])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rig, attachKey, gltfs.length],
  )
  useLayoutEffect(() => {
    for (const a of attachments) for (const m of a.meshes) rig.armature.add(m)
    return () => {
      for (const a of attachments) {
        for (const m of a.meshes) m.removeFromParent()
        for (const mat of a.materials) mat.dispose()
        for (const s of a.skeletons) s.dispose()
      }
    }
  }, [rig, attachments])

  const colorKey = JSON.stringify(parts.map((d) => [d.color, d.ref, d.hairLook]))
  useLayoutEffect(() => {
    attachments.forEach((a, i) => a.apply(parts[i]))
    return onFabricTextureLoad(() => attachments.forEach((a, i) => parts[i] && a.apply(parts[i])))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachments, colorKey])

  // ---- joias rigidas presas aos ossos ----
  const hairFile = hairDef ? (hairDef.glb.split('/').pop() ?? '').replace('.glb', '') : null
  const jewelKey = jewels.map((j) => j.item.id).join('|') + '@' + hairFile
  const jewelObjs = useMemo(
    () => jewels.map((j, i) => buildJewel(rig, j.item, gltfs[1 + parts.length + i], hairFile)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rig, jewelKey, gltfs.length],
  )
  useLayoutEffect(() => {
    for (const j of jewelObjs) for (const r of j.roots) r.bone.add(r.obj)
    return () => {
      for (const j of jewelObjs) {
        for (const r of j.roots) r.bone.remove(r.obj)
        for (const m of j.materials) m.mat.dispose()
      }
    }
  }, [jewelObjs])
  // a escala (uniforme) do osso da mao/cabeca/pe acompanha a joia presa a ele (anel, pulseira, brinco, chapeu: queremos isso),
  // mas a BOLSA na mao nao deve crescer junto com a mao: compensa
  useLayoutEffect(() => {
    for (const j of jewelObjs) {
      if (j.item.slot !== 'bag') continue
      for (const r of j.roots) r.obj.scale.set(...r.scale).divideScalar(r.bone.scale.x || 1)
    }
  }, [jewelObjs, bodyKey, rig])
  const jewelColorKey = JSON.stringify(jewels.map((j) => j.ref))
  useLayoutEffect(() => {
    jewelObjs.forEach((j, i) => {
      for (const { slot, mat } of j.materials) {
        const idx = j.item.mats.findIndex((m) => m.id === slot)
        const ms = j.item.mats[idx]
        applyJewelMaterial(mat, slot, jewels[i]?.ref.colors?.[idx] ?? ms?.color ?? '#ffffff', ms?.fin)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jewelObjs, jewelColorKey])

  // reflexo de ambiente das joias: copia scene.environment (cidade/interiores/visualizador) para os materiais
  const scene = useThree((st) => st.scene)
  useFrame(() => {
    for (const j of jewelObjs) for (const m of j.materials) syncJewelEnv(m.mat, scene)
  })

  // ---- cabelo sob chapeu: recorta o elipsoide (hairClip do acessorio) ----
  const clip = jewels.map((j) => j.item.hairClip).find(Boolean) ?? null
  const clipKey = clip ? JSON.stringify(clip) : ''
  useLayoutEffect(() => {
    for (const a of attachments) {
      const U = a.hairUniforms
      if (!U) continue
      U.uClipOn.value = clip ? 1 : 0
      if (clip) {
        ;(U.uClipC.value as Vector3).set(...clip.center)
        ;(U.uClipR.value as Vector3).set(...clip.radii)
        U.uClipMinY.value = clip.minY
        U.uClipSoft.value = clip.soft
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachments, clipKey])

  // ---- morphs (corpo e cabelo compartilham os nomes) ----
  const morphKey = JSON.stringify(appearance.morphs) + JSON.stringify(appearance.shape ?? null) + gender
  useLayoutEffect(() => {
    // formato do rosto (f_*): o masculino ganha o rosto masculino base em 1, a menos que o perfil diga outra coisa
    const shape = safeShape(appearance.shape ?? {}, gender) // 1 no slider = maximo SEGURO do morph (sem triangulos invertidos)
    const mm: Record<string, number> = { ...appearance.morphs, ...shape }
    if (gender === 'male' && mm[MALE_BASE_SHAPE] === undefined) mm[MALE_BASE_SHAPE] = 1
    applyMorphs(rig.body, mm)
    for (const a of attachments) for (const m of a.meshes) applyMorphs(m, appearance.morphs)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rig, attachments, morphKey])

  // ---- sombras ----
  useLayoutEffect(() => {
    rig.body.castShadow = shadows
    for (const a of attachments) for (const m of a.meshes) m.castShadow = shadows
  }, [rig, attachments, shadows])

  const glAudit = useThree((st) => st.gl)
  const auditLast = useRef(0)
  useFrame(({ clock }) => {
    if (AUDIT && clock.elapsedTime - auditLast.current > 2) {
      auditLast.current = clock.elapsedTime
      auditSamplers(glAudit)
    }
  })
  useLayoutEffect(
    () => () => {
      rig.skeleton.dispose()
    },
    [rig],
  )

  return (
    <>
      <group position={[0, lift, 0]}>
        <primitive object={rig.root} />
      </group>
      {anim && <CharacterAnimation rig={rig} driver={anim} />}
    </>
  )
}

/**
 * Personagem: base GLB (esqueleto Mixamo + corpo com textura baked) + cabelo/roupas presos ao mesmo
 * esqueleto, tudo a partir do JSON `appearance` (morphs, pele, macacao, labios, cabelo). Um clone por instancia.
 * O `ref` expoe `{ root, skeleton, bones }` para a animacao.
 */
export const Character = forwardRef<CharacterHandle, CharacterProps>(function Character(props, ref) {
  return (
    <Suspense fallback={null}>
      <CharacterImpl {...props} handle={ref} />
    </Suspense>
  )
})

// pre-carrega os GLB e mascaras (cache do drei)
// so a base e o cabelo padrao sao pre-carregados; os demais carregam sob demanda ao selecionar
const DEFAULT_HAIR_ID = 'hair.meshyUpdo'
const FB = bodyAssets('female')
useGLTF.preload([FB.glb, ...Object.values(WEARABLES).filter((w) => w.id === DEFAULT_HAIR_ID).map((w) => w.glb)])
useTexture.preload(FB.layers ? [FB.mask] : [FB.mask, FB.mask2, FB.mask3!, FB.mask4!])
void loadBaseMeta('doll')
void BASES
void MALE_WEARABLES
