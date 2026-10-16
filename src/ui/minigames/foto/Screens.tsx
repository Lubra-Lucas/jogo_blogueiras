import { useState } from 'react'
import { DIFFICULTY_LABEL, type Difficulty } from '../../../game/minigames/shared/competition'
import { DIFF, LEVEL_XP, MOOD_LABEL } from '../../../game/minigames/foto/data'
import { FRAMING_LABEL, gradeOf, type Client, type ShotScore } from '../../../game/minigames/foto/logic'
import { bestShotOf, useFotoStore, type ShotRec } from '../../../game/minigames/foto/store'
import { getBest, getFollowers } from '../../../game/minigames/foto/persist'
import { IcCamera, IcCheck, IcClose, IcPeople, IcSkip, IcStar, IcTimer, IcTrophy } from './icons'

const DIFF_NOTE: Record<Difficulty, string> = {
  facil: 'Mais tempo, guias de enquadramento e aviso do pico da pose.',
  normal: 'Guias de enquadramento e nome da pose.',
  dificil: 'Sem guias: só a grade e o seu olho.',
  estrela: 'Sem ajudas, poses rápidas e 5 clientes exigentes.',
}

export function Chips({ client }: { client: Client }) {
  const b = client.brief
  return (
    <div className="fg-tags">
      <span>{FRAMING_LABEL[b.framing]}</span>
      <span>{b.temp === 'quente' ? 'Luz quente' : b.temp === 'fria' ? 'Luz fria' : 'Luz neutra'}</span>
      {b.side && <span>{{ esq: 'Luz da esquerda', dir: 'Luz da direita', topo: 'Luz de cima', tras: 'Contraluz' }[b.side]}</span>}
      <span>{MOOD_LABEL[b.mood][0].toUpperCase() + MOOD_LABEL[b.mood].slice(1)}</span>
      {b.backdropFamily && <span>Fundo {{ claro: 'claro', cinza: 'cinza', azul: 'azul', quente: 'terroso', verde: 'verde', escuro: 'escuro' }[b.backdropFamily]}</span>}
    </div>
  )
}

export function Avatar({ client }: { client: Client }) {
  const ini = client.name.split(' ').map((p) => p[0]).slice(0, 2).join('')
  return <span className="fg-avatar" style={{ background: client.tone }}>{ini}</span>
}

export function HowTo({ onClose }: { onClose: () => void }) {
  return (
    <div className="fg-modal" role="dialog" aria-label="Como jogar">
      <div className="fg-card">
        <h2 className="fg-h">Como jogar</h2>
        <ol className="fg-steps">
          <li><b>Enquadre.</b> Arraste o visor para mover a câmera e use a roda do mouse, a pinça ou o controle de lente para aproximar. Siga o pedido do cliente: close, plano médio ou corpo inteiro, sempre com folga sobre a cabeça.</li>
          <li><b>Ilumine.</b> Escolha a temperatura da luz (quente ou fria), a intensidade e o lado de onde ela vem. Confira o medidor de luz e a cor do fundo.</li>
          <li><b>Clique na hora certa.</b> A modelo troca de pose o tempo todo. No pico ela fica parada, de olhos abertos. Não clique se ela estiver se mexendo, piscando ou se a câmera estiver tremendo.</li>
        </ol>
        <p className="fg-note">Cada foto ganha nota de composição, luz, pose e nitidez, mais um bônus de criatividade (adereços e gel). Vale a melhor foto de cada cliente. Teclado: setas ou WASD movem, + e - aproximam, espaço tira a foto.</p>
        <div className="fg-actions"><button className="fg-btn primary" onClick={onClose}>Entendi</button></div>
      </div>
    </div>
  )
}

export function Intro({ onExit }: { onExit: () => void }) {
  const start = useFotoStore((s) => s.start)
  const level = useFotoStore((s) => s.level)
  const [diff, setDiff] = useState<Difficulty>('normal')
  const [daily, setDaily] = useState(false)
  const [help, setHelp] = useState(false)
  const next = LEVEL_XP[level] ?? null
  return (
    <div className="fg-center">
      <div className="fg-card intro">
        <div className="fg-kicker"><IcCamera size={18} /> Fotógrafa · Nível {level}</div>
        <h1 className="fg-title">Ensaio Fotográfico</h1>
        <p className="fg-lead">Enquadre, ilumine e clique no instante exato em que a modelo está perfeita.</p>
        <div className="fg-diffs" role="radiogroup" aria-label="Dificuldade">
          {(['facil', 'normal', 'dificil', 'estrela'] as Difficulty[]).map((d) => (
            <button key={d} role="radio" aria-checked={diff === d} className={diff === d ? 'on' : ''} onClick={() => setDiff(d)}>
              <b>{DIFFICULTY_LABEL[d]}</b>
              <span>{DIFF[d].clients} clientes · {Math.round(DIFF[d].time / 5) * 5} s</span>
            </button>
          ))}
        </div>
        <p className="fg-note">{DIFF_NOTE[diff]}</p>
        <label className="fg-check">
          <input type="checkbox" checked={daily} onChange={(e) => setDaily(e.target.checked)} />
          <span>Desafio do dia (mesmos clientes para todas)</span>
        </label>
        <div className="fg-stats">
          <span><IcPeople size={16} /> {getFollowers().toLocaleString('pt-BR')} seguidores</span>
          <span><IcTrophy size={16} /> Recorde {getBest(diff) || '-'}</span>
          {next && <span>Próximo nível: {next} XP de profissão</span>}
        </div>
        <div className="fg-actions">
          <button className="fg-btn ghost" onClick={() => setHelp(true)}>Como jogar</button>
          <button className="fg-btn primary" onClick={() => start(diff, daily)}>Começar</button>
        </div>
        <button className="fg-x" aria-label="Sair" onClick={onExit}><IcClose size={20} /></button>
      </div>
      {help && <HowTo onClose={() => setHelp(false)} />}
    </div>
  )
}

export function BriefCard() {
  const client = useFotoStore((s) => s.clients[s.ci])
  const ci = useFotoStore((s) => s.ci)
  const n = useFotoStore((s) => s.clients.length)
  const begin = useFotoStore((s) => s.beginShoot)
  if (!client) return null
  return (
    <div className="fg-center">
      <div className="fg-card brief">
        <div className="fg-kicker">Cliente {ci + 1} de {n}</div>
        <div className="fg-who"><Avatar client={client} /><div><h2 className="fg-h">{client.name}</h2><span className="fg-role">{client.role}</span></div></div>
        <p className="fg-quote">{client.text}</p>
        <Chips client={client} />
        <div className="fg-actions"><button className="fg-btn primary" onClick={begin}>Entrar no estúdio</button></div>
      </div>
    </div>
  )
}

function Bar({ label, v }: { label: string; v: number }) {
  return (
    <div className="fg-bar">
      <span>{label}</span>
      <i><b style={{ width: `${Math.round(v * 100)}%` }} /></i>
      <em>{Math.round(v * 100)}</em>
    </div>
  )
}

export function ScoreBars({ s }: { s: ShotScore }) {
  return (
    <div className="fg-bars">
      <Bar label="Composição" v={s.composition} />
      <Bar label="Luz" v={s.light} />
      <Bar label="Pose" v={s.pose} />
      <Bar label="Nitidez" v={s.sharp} />
      {s.creative > 0 && <div className="fg-bonus">Criatividade +{s.creative}</div>}
    </div>
  )
}

export function Thumb({ rec, className }: { rec: ShotRec; className?: string }) {
  const blur = rec.score ? (1 - rec.score.sharp) * 4 : 0
  return <img className={className} src={rec.thumb} alt="Foto do ensaio" style={blur > 0.2 ? { filter: `blur(${blur.toFixed(1)}px)` } : undefined} />
}

export function Between() {
  const s = useFotoStore()
  const client = s.clients[s.ci]
  const best = bestShotOf(s.shots, s.ci)
  const last = s.ci + 1 >= s.clients.length
  return (
    <div className="fg-center">
      <div className="fg-card between">
        <div className="fg-kicker">{client.name}</div>
        {best?.score ? (
          <>
            <div className="fg-between-row">
              <Thumb rec={best} className="fg-between-img" />
              <div>
                <div className="fg-big">{best.score.total}</div>
                <div className="fg-grade">{gradeOf(best.score.total)}</div>
              </div>
            </div>
            <ScoreBars s={best.score} />
            {best.score.hints[0] && <p className="fg-note">{best.score.hints[0]}</p>}
          </>
        ) : (
          <p className="fg-note">Nenhuma foto neste cliente.</p>
        )}
        <div className="fg-actions">
          <button className="fg-btn primary" onClick={s.nextClient}>{last ? 'Ver resultado' : 'Próximo cliente'}</button>
        </div>
      </div>
    </div>
  )
}

export function Results({ onExit }: { onExit: () => void }) {
  const r = useFotoStore((s) => s.results)
  const diff = useFotoStore((s) => s.difficulty)
  const enter = useFotoStore((s) => s.enter)
  if (!r) return null
  return (
    <div className="fg-results">
      <div className="fg-card results">
        <div className="fg-kicker">Fim do ensaio · {DIFFICULTY_LABEL[diff]}</div>
        <div className="fg-stars" aria-label={`${r.stars} estrelas`}>
          {[1, 2, 3].map((i) => <span key={i} className={i <= r.stars ? 'on' : ''}><IcStar size={34} filled={i <= r.stars} /></span>)}
        </div>
        <div className="fg-big">{Math.round(r.avg)}<small> / 100</small></div>
        <div className="fg-grade">{gradeOf(r.avg)}{r.newBest ? ' · Novo recorde!' : ''}</div>

        <div className="fg-followers">
          <IcPeople size={22} />
          <div><b>+{r.followers.toLocaleString('pt-BR')} seguidores</b><span>{r.followersTotal.toLocaleString('pt-BR')} no total</span></div>
          <div className="fg-rew"><span>+{r.coins} Brilhos</span><span>+{r.xp} XP</span><span>+{r.profXp} XP Fotógrafa</span></div>
        </div>

        {r.unlocked.length > 0 && (
          <div className="fg-unlock"><b>Novo item desbloqueado!</b>{r.unlocked.map((u) => <span key={u}><IcCheck size={14} /> {u}</span>)}</div>
        )}

        <h3 className="fg-h3">Folha de contatos</h3>
        <div className="fg-sheet">
          {r.perClient.map((c) => (
            <div className="fg-contact" key={c.client.id}>
              <div className="fg-contact-img">
                {c.best ? <Thumb rec={c.best} /> : <span className="fg-empty">Sem foto</span>}
                <em>{c.best?.score?.total ?? 0}</em>
                {r.bestPhoto && c.best?.id === r.bestPhoto.id && <b className="fg-pick">Melhor</b>}
              </div>
              <div className="fg-contact-txt"><b>{c.client.name}</b><p>{c.comment}</p></div>
            </div>
          ))}
        </div>
        <p className="fg-critique">{r.critique}</p>
        {r.savedToFeed && <p className="fg-note ok"><IcCheck size={14} /> A melhor foto foi publicada no seu Blogram.</p>}

        <h3 className="fg-h3"><IcTrophy size={16} /> Ranking do dia</h3>
        <ol className="fg-board">
          {r.board.map((e, i) => (
            <li key={e.name + i} className={e.you ? 'you' : ''}><span>{i + 1}</span><b>{e.name}</b><em>{e.score}</em></li>
          ))}
        </ol>
        <div className="fg-actions">
          <button className="fg-btn ghost" onClick={onExit}>Sair</button>
          <button className="fg-btn primary" onClick={enter}>Jogar de novo</button>
        </div>
      </div>
    </div>
  )
}

const TUT = [
  'Arraste o visor para enquadrar. Use a roda, a pinça ou a lente para aproximar.',
  'Agora ajuste a luz: temperatura, intensidade ou lado. Veja o medidor.',
  'Clique no obturador quando a modelo estiver parada e de olhos abertos.',
]
export function Tutorial() {
  const step = useFotoStore((s) => s.tutorial)
  const skip = useFotoStore((s) => s.skipTutorial)
  if (step === null) return null
  return (
    <div className="fg-tut" role="status">
      <span className="fg-tut-n">{step + 1}/3</span>
      <p>{TUT[step]}</p>
      <button className="fg-link" onClick={skip}><IcSkip size={14} /> Pular</button>
    </div>
  )
}

export function PauseModal({ onExit }: { onExit: () => void }) {
  const setPaused = useFotoStore((s) => s.setPaused)
  const finish = useFotoStore((s) => s.finish)
  return (
    <div className="fg-modal" role="dialog" aria-label="Pausa">
      <div className="fg-card">
        <h2 className="fg-h">Pausa</h2>
        <div className="fg-actions col">
          <button className="fg-btn primary" onClick={() => setPaused(false)}>Continuar</button>
          <button className="fg-btn ghost" onClick={finish}><IcTimer size={16} /> Encerrar o ensaio</button>
          <button className="fg-btn ghost" onClick={onExit}>Sair do minijogo</button>
        </div>
      </div>
    </div>
  )
}
