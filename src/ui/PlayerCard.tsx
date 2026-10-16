import { useEffect, useRef } from 'react'
import { useProfileStore, fameTitle, xpToNext, CURRENCY_NAME } from '../state/profileStore'
import { useUiStore } from '../state/uiStore'
import { portraitCanvas, usePortraitStore } from './PortraitCapture'
import { IconBrilho, IconDiamante } from './shop/icons'
import './menu/menu.css'

/** Cartao do jogador (canto superior esquerdo): retrato do rosto, nome, nivel, titulo, XP e moedas. Toque abre o menu. */
export function PlayerCard() {
  const name = useProfileStore((s) => s.name)
  const level = useProfileStore((s) => s.level)
  const xp = useProfileStore((s) => s.xp)
  const coins = useProfileStore((s) => s.coins)
  const diamonds = useProfileStore((s) => s.diamonds)
  const openMenu = useUiStore((s) => s.openMenu)
  const version = usePortraitStore((s) => s.version)
  const cv = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const ctx = cv.current?.getContext('2d')
    if (ctx && version > 0) ctx.drawImage(portraitCanvas, 0, 0, 128, 128)
  }, [version])

  return (
    <button type="button" className="pcard" onClick={() => openMenu()} aria-label={`Abrir menu da personagem: ${name}, nível ${level}`}>
      <span className="pcard__face">
        <canvas ref={cv} width={128} height={128} />
        <span className="pcard__lvl">{level}</span>
      </span>
      <span className="pcard__txt">
        <span className="pcard__name">{name}</span>
        <span className="pcard__title">{fameTitle(level)}</span>
        <span className="pcard__xp" title={`${Math.floor(xp)} / ${xpToNext(level)} XP`}>
          <i style={{ width: `${Math.min(100, (xp / xpToNext(level)) * 100)}%` }} />
          <span>
            {Math.floor(xp)} / {xpToNext(level)}
          </span>
        </span>
        <span className="pcard__coins" title={`${CURRENCY_NAME} e Diamantes`}>
          <IconBrilho width={14} height={14} />
          {coins.toLocaleString('pt-BR')}
          <IconDiamante width={14} height={14} style={{ marginLeft: 6 }} />
          {diamonds.toLocaleString('pt-BR')}
        </span>
      </span>
    </button>
  )
}
