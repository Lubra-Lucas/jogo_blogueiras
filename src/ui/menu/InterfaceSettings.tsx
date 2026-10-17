import { useUiPrefs, type JoyMode, type UiSize } from '../uiPrefs'

const SIZES: Array<{ id: UiSize; label: string }> = [
  { id: 'p', label: 'P' },
  { id: 'm', label: 'M' },
  { id: 'g', label: 'G' },
]
const JOYS: Array<{ id: JoyMode; label: string }> = [
  { id: 'fixed', label: 'Fixo' },
  { id: 'dynamic', label: 'Dinâmico' },
]

const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const isStandalone = () => window.matchMedia?.('(display-mode: fullscreen), (display-mode: standalone)').matches

/** Bloco "Interface" do menu Ajustes: tamanho da UI, joystick e camera. (Separado de Graficos/Qualidade.) */
export function InterfaceSettings() {
  const { size, joy, camSens, set } = useUiPrefs()
  return (
    <div className="panel" data-block="interface">
      <h3>Interface</h3>
      <div className="cfg-row">
        <span>
          Tamanho da interface
          <small>Botões, cartão, minimapa e joystick.</small>
        </span>
      </div>
      <div className="fin-chips ui-chips" role="group" aria-label="Tamanho da interface">
        {SIZES.map((o) => (
          <button key={o.id} type="button" className="pill" aria-pressed={size === o.id} onClick={() => set({ size: o.id })}>
            {o.label}
          </button>
        ))}
      </div>
      <div className="cfg-row">
        <span>
          Joystick
          <small>{joy === 'fixed' ? 'Fica sempre no canto; o resto da tela gira a câmera.' : 'Aparece onde o polegar toca, na metade esquerda.'}</small>
        </span>
      </div>
      <div className="fin-chips ui-chips" role="group" aria-label="Joystick">
        {JOYS.map((o) => (
          <button key={o.id} type="button" className="pill" aria-pressed={joy === o.id} onClick={() => set({ joy: o.id })}>
            {o.label}
          </button>
        ))}
      </div>
      <div className="cfg-row">
        <span>
          Sensibilidade da câmera
          <small>Arraste com um dedo fora do joystick. Pinça faz zoom.</small>
        </span>
        <b className="ui-sens">{camSens.toFixed(1)}x</b>
      </div>
      <input
        className="ui-range"
        type="range"
        min={0.5}
        max={2}
        step={0.1}
        value={camSens}
        aria-label="Sensibilidade da câmera"
        onChange={(e) => set({ camSens: Number(e.target.value) })}
      />
      {document.fullscreenEnabled && !isStandalone() && (
        <div className="cfg-row">
          <span>
            Tela cheia
            <small>Esconde a barra do navegador.</small>
          </span>
          <button type="button" className="btn" onClick={() => void document.documentElement.requestFullscreen().catch(() => {})}>
            Entrar
          </button>
        </div>
      )}
      {isIos() && !isStandalone() && (
        <div className="cfg-row">
          <span>
            Tela cheia no iPhone
            <small>O Safari não permite. Toque em Compartilhar e depois em &ldquo;Adicionar à Tela de Início&rdquo;: o jogo abre sem barras.</small>
          </span>
        </div>
      )}
    </div>
  )
}
