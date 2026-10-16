import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import type { AnimationClip } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { GLTF } from 'three-stdlib'
import { usePlayerStore } from '../../../state/playerStore'
import type { CharacterHandle } from '../Character'
import { applyRestPose } from '../pose'
import { useSitStore } from '../../sit/sitStore'
import { driveBridge } from '../../vehicles/driveStore'
import { CORE_URL, EMOTES_URL, EMOTE_CLIPS, CharacterAnimator, type AnimInput, type ClipName } from './animator'
import { turnState } from './turnState'
import { EMOTE_BY_ID, playEmote, useEmoteStore } from './emoteStore'

/**
 * Como o personagem e animado:
 *  - 'player': maquina de estados guiada por playerStore (velocidade) + emoteStore + sitStore;
 *  - { clip, t }: minigames/visualizador; com `t` congela o clipe nesse instante (capturas).
 */
export type AnimDriver = 'player' | { clip: ClipName; t?: number }

const input: AnimInput = { turn: false, speed: 0, emote: null, emoteOnce: false, desfile: false, seat: 'none', typing: false }

// ---- clipes de emotes: um arquivo, baixado sob demanda (uma vez) ----
let emotesPromise: Promise<AnimationClip[]> | null = null
let emotesLoaded: AnimationClip[] | null = null
/** Baixa doll_anims_emotes.glb (cache global). */
export function loadEmoteClips(): Promise<AnimationClip[]> {
  if (!emotesPromise) {
    emotesPromise = new GLTFLoader().loadAsync(EMOTES_URL).then((g) => (emotesLoaded = g.animations))
  }
  return emotesPromise
}

let spawnWaved = false

/** Componente sem render: cria o mixer do personagem e o atualiza uma vez por frame. */
export function CharacterAnimation({ rig, driver }: { rig: CharacterHandle; driver: AnimDriver }) {
  const gltf = useGLTF(CORE_URL) as unknown as GLTF
  const animator = useMemo(() => {
    applyRestPose(rig.bones, rig.root) // base do idle de reserva
    const a = new CharacterAnimator(rig.root, rig.bones, gltf.animations)
    if (emotesLoaded) a.addClips(emotesLoaded)
    return a
  }, [rig, gltf])

  useEffect(() => {
    // medidas de sentar/levantar (o PlayerController posiciona a personagem a partir delas)
    const find = (n: string) => gltf.animations.find((c) => c.name === n)
    const sIn = find('stand_to_sit')
    const sOut = find('sit_to_stand')
    const hips = sIn?.tracks.find((k) => k.name === 'mixamorigHips.position')
    const hipsOut = sOut?.tracks.find((k) => k.name === 'mixamorigHips.position')
    if (sIn && sOut && hips && hipsOut) {
      const v = hips.values
      const n = v.length
      const o = hipsOut.values
      const m = o.length
      useSitStore.setState({
        clip: { inDur: sIn.duration, outDur: sOut.duration, offX: v[n - 3] - v[0], offZ: v[n - 1] - v[2], endY: v[n - 2], outX: o[m - 3] - o[0], outZ: o[m - 1] - o[2] },
      })
    }
    // fim de um emote de uma vez: solta
    const onFinished = (e: { action: { getClip: () => { name: string } } }) => {
      const nm = e.action.getClip().name
      const st = useEmoteStore.getState()
      if (st.emote && EMOTE_BY_ID[st.emote].clip === nm) st.stop()
    }
    animator.mixer.addEventListener('finished', onFinished as never)
    return () => animator.mixer.removeEventListener('finished', onFinished as never)
  }, [animator, gltf])

  useEffect(() => {
    // emotes: jogador baixa logo (apos o carregamento); minigames so se pedirem um clipe de emote
    const wants = driver === 'player' || EMOTE_CLIPS.has(driver.clip)
    if (!wants) return
    let alive = true
    loadEmoteClips().then((c) => {
      if (!alive) return
      animator.addClips(c)
      // aceno ao entrar no jogo (uma vez por sessao)
      if (driver === 'player' && !spawnWaved) {
        spawnWaved = true
        setTimeout(() => {
          if (!usePlayerStore.getState().hasMoved && !useSitStore.getState().seat) playEmote('wave', { silent: true })
        }, 700)
      }
    })
    return () => {
      alive = false
    }
  }, [animator, driver])

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05)
    if (driver === 'player') {
      input.speed = usePlayerStore.getState().speed
      const e = useEmoteStore.getState()
      input.emote = e.emote ? EMOTE_BY_ID[e.emote].clip : null
      input.emoteOnce = e.emoteOnce
      input.desfile = e.desfile
      input.typing = e.typing
      input.turn = turnState.active
      const sit = useSitStore.getState()
      input.seat = sit.seat ? sit.phase : driveBridge.active ? 'sitting' : 'none' // dirigindo = sentada no carro
      animator.update(dt, input)
    } else if (driver.t !== undefined) {
      animator.seek(driver.clip, driver.t)
    } else {
      animator.looping = true
      animator.play(driver.clip, 0)
      animator.mixer.update(dt)
    }
  })

  useEffect(() => () => animator.dispose(), [animator])
  useEffect(() => {
    if (import.meta.env.DEV && driver === 'player') (window as unknown as { __animator?: CharacterAnimator }).__animator = animator
  }, [animator, driver])
  return null
}

useGLTF.preload(CORE_URL)
