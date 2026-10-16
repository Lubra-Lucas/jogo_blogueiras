import { useState } from 'react'
import { loadJson, removeKey, saveJson, STORAGE_KEYS } from '../../shared/storage'
import { getQuality, type QualityTier } from '../../game/systems/quality'
import { useDeviceStore } from '../../game/systems/device'

type Pref = 'auto' | QualityTier
const PREFS: Array<{ id: Pref; label: string }> = [
  { id: 'auto', label: 'Automática' },
  { id: 'low', label: 'Baixa' },
  { id: 'medium', label: 'Média' },
  { id: 'high', label: 'Alta' },
]

export function savedQualityPref(): Pref {
  const v = loadJson<Pref>(STORAGE_KEYS.quality)
  return v === 'low' || v === 'medium' || v === 'high' ? v : 'auto'
}

export function SettingsTab() {
  const [pref, setPref] = useState<Pref>(savedQualityPref)
  const [sound, setSound] = useState<boolean>(() => loadJson<{ sound?: boolean }>(STORAGE_KEYS.settings)?.sound ?? true)
  const [confirm, setConfirm] = useState(false)
  const isTouch = useDeviceStore((s) => s.isTouch)
  const forced = new URLSearchParams(window.location.search).get('quality')

  const choose = (p: Pref) => {
    setPref(p)
    if (p === 'auto') removeKey(STORAGE_KEYS.quality)
    else saveJson(STORAGE_KEYS.quality, p)
  }
  const reload = () => window.location.reload()
  const resetAll = () => {
    for (const k of Object.values(STORAGE_KEYS)) removeKey(k)
    reload()
  }

  return (
    <>
      <div className="panel">
        <h3>Gráficos</h3>
        <div className="cfg-row">
          <span>
            Qualidade
            <small>
              Atual: {getQuality() === 'low' ? 'baixa' : getQuality() === 'medium' ? 'média' : 'alta'}
              {forced ? ' (forçada pela URL)' : ''}. Aplica ao recarregar.
            </small>
          </span>
        </div>
        <div className="fin-chips" style={{ marginBottom: 8 }}>
          {PREFS.map((o) => (
            <button key={o.id} type="button" className="pill" aria-pressed={pref === o.id} onClick={() => choose(o.id)}>
              {o.label}
            </button>
          ))}
          <button type="button" className="btn btn--primary" style={{ height: 30, marginLeft: 'auto' }} onClick={reload}>
            Recarregar
          </button>
        </div>
      </div>

      <div className="panel">
        <h3>Som</h3>
        <div className="cfg-row">
          <span>
            Sons do jogo
            <small>Ainda sem áudio: a opção já fica salva.</small>
          </span>
          <button
            type="button"
            className="toggle"
            role="switch"
            aria-checked={sound}
            aria-label="Sons do jogo"
            onClick={() => {
              setSound(!sound)
              saveJson(STORAGE_KEYS.settings, { sound: !sound })
            }}
          />
        </div>
      </div>

      <div className="panel">
        <h3>Controles</h3>
        {isTouch ? (
          <div className="keys">
            <b>Joystick</b>
            <span>Andar (empurre até o fim para correr)</span>
            <b>Arrastar</b>
            <span>Girar a câmera</span>
            <b>Pinça</b>
            <span>Zoom</span>
            <b>Toque no chão</b>
            <span>Ir até lá</span>
            <b>Cartão / Chat</b>
            <span>Abrir menu e conversar</span>
          </div>
        ) : (
          <div className="keys">
            <span className="kbd">WASD</span>
            <span>Andar (Shift corre)</span>
            <span className="kbd">Q / E</span>
            <span>Girar a câmera</span>
            <span className="kbd">1 2 3</span>
            <span>Emotes (aplaudir, desfilar, dançar)</span>
            <span className="kbd">C / Tab</span>
            <span>Abrir/fechar o menu da personagem</span>
            <span className="kbd">Enter</span>
            <span>Abrir o chat e escrever</span>
            <span className="kbd">Esc</span>
            <span>Fechar menu ou chat</span>
            <span className="kbd">Clique</span>
            <span>Ir até o ponto clicado</span>
          </div>
        )}
      </div>

      <div className="panel">
        <h3>Dados salvos</h3>
        <div className="cfg-row">
          <span>
            Apagar progresso
            <small>Remove perfil, aparência e preferências deste navegador.</small>
          </span>
          {confirm ? (
            <span className="row-wrap">
              <button type="button" className="btn btn--danger" onClick={resetAll}>
                Apagar tudo
              </button>
              <button type="button" className="btn" onClick={() => setConfirm(false)}>
                Cancelar
              </button>
            </span>
          ) : (
            <button type="button" className="btn btn--danger" onClick={() => setConfirm(true)}>
              Resetar save
            </button>
          )}
        </div>
      </div>
    </>
  )
}
