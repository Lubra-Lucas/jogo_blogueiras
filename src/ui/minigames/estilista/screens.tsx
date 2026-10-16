import { useState } from 'react'
import { playSfx } from '../../../game/minigames/audio'
import { TAG_LABEL } from '../../../game/minigames/desfile/types'
import { getProfessionXp } from '../../../game/minigames/rewards'
import { DIFFICULTY_LABEL, type Difficulty } from '../../../game/minigames/shared/competition'
import { CLIENTS_PER_ROUND } from '../../../game/minigames/estilista/clients'
import { liveComment, TIER_XP, tierOf, wishSummary } from '../../../game/minigames/estilista/logic'
import { markTutorialSeen, useEstilistaStore } from '../../../game/minigames/estilista/store'
import { CRITERION_LABEL, type Criterion } from '../../../game/minigames/estilista/types'
import { Face, IcoAsk, IcoClock, IcoCoin, IcoCrown, IcoFlame, IcoHanger, IcoStar, IcoTag } from './icons'
import { Questions } from './StylingPanel'

const DIFF_DESC: Record<Difficulty, string> = {
  facil: 'Dicas e mais tempo',
  normal: 'Pistas misturadas',
  dificil: 'Pistas vagas, orçamentos curtos',
  estrela: 'Sem dicas, tempo mínimo',
}

const TUT = [
  { icon: <IcoAsk size={30} />, title: 'Leia as pistas', text: 'O pedido da cliente esconde estilo, cores e orçamento. "Odeio rosa" e "algo leve" valem ouro.' },
  { icon: <IcoTag size={30} />, title: 'Pergunte só uma vez', text: 'Escolha entre estilo, limite de gasto ou o que ela faz questão. Não dá para perguntar tudo.' },
  { icon: <IcoClock size={30} />, title: 'Monte contra o relógio', text: 'A cliente reage ao vivo. Acertos seguidos criam combo e valem mais pontos.' },
]

export function Tutorial({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0)
  const t = TUT[i]
  return (
    <div className="es-modal" role="dialog" aria-label="Como jogar">
      <div className="es-card es-tut">
        <div className="es-tut-ico">{t.icon}</div>
        <h2 className="es-title small">{t.title}</h2>
        <p>{t.text}</p>
        <div className="es-dots">{TUT.map((_, k) => <i key={k} className={k === i ? 'on' : ''} />)}</div>
        <div className="es-row">
          <button className="es-btn ghost" onClick={() => (markTutorialSeen(), onDone())}>Pular</button>
          <button
            className="es-btn primary"
            onClick={() => {
              playSfx('tap')
              if (i + 1 < TUT.length) setI(i + 1)
              else (markTutorialSeen(), onDone())
            }}
          >
            {i + 1 < TUT.length ? 'Próximo' : 'Entendi'}
          </button>
        </div>
      </div>
    </div>
  )
}

const LEVELS = ['Assistente', 'Estilista sênior', 'Estilista VIP']

export function IntroScreen({ onHelp }: { onHelp: () => void }) {
  const difficulty = useEstilistaStore((s) => s.difficulty)
  const mode = useEstilistaStore((s) => s.mode)
  const set = useEstilistaStore.getState()
  const xp = getProfessionXp('Estilista')
  const tier = tierOf(xp)
  const next = TIER_XP[tier + 1]
  return (
    <div className="es-center">
      <div className="es-card es-intro">
        <div className="es-eyebrow">
          <IcoHanger size={18} /> Boutique
        </div>
        <h1 className="es-title">Estilista Personal</h1>
        <p className="es-lede">Decifre o pedido de cada cliente e monte o look certo, dentro do tempo e do orçamento.</p>
        <div className="es-level">
          <b>{LEVELS[tier]}</b>
          <span>{xp} XP{next ? ` · próximo nível em ${next}` : ' · nível máximo'}</span>
          {next && <i style={{ width: `${Math.min(100, ((xp - TIER_XP[tier]) / (next - TIER_XP[tier])) * 100)}%` }} />}
        </div>
        <div className="es-sub">Dificuldade</div>
        <div className="es-diffs" role="radiogroup" aria-label="Dificuldade">
          {(['facil', 'normal', 'dificil', 'estrela'] as Difficulty[]).map((d) => (
            <button key={d} role="radio" aria-checked={difficulty === d} className={difficulty === d ? 'on' : ''} onClick={() => (playSfx('click'), set.setDifficulty(d))}>
              <b>{DIFFICULTY_LABEL[d]}</b>
              <span>{DIFF_DESC[d]}</span>
            </button>
          ))}
        </div>
        <div className="es-seg" role="group" aria-label="Modo">
          <button className={mode === 'daily' ? 'on' : ''} onClick={() => (playSfx('click'), set.setMode('daily'))}>Desafio do dia</button>
          <button className={mode === 'free' ? 'on' : ''} onClick={() => (playSfx('click'), set.setMode('free'))}>Treino livre</button>
        </div>
        <p className="es-note">
          {CLIENTS_PER_ROUND[difficulty]} clientes · {mode === 'daily' ? 'mesmas clientes para todas e ranking do dia' : 'clientes sorteadas, sem ranking'}
          {tier >= 2 && ' · cliente VIP no final'}
        </p>
        <div className="es-row">
          <button className="es-btn ghost" onClick={onHelp}>Como jogar</button>
          <button className="es-btn primary" onClick={() => (playSfx('done'), set.start())}>Abrir a boutique</button>
        </div>
      </div>
    </div>
  )
}

export function BriefScreen() {
  const idx = useEstilistaStore((s) => s.idx)
  const clients = useEstilistaStore((s) => s.clients)
  const difficulty = useEstilistaStore((s) => s.difficulty)
  const combo = useEstilistaStore((s) => s.combo)
  const c = clients[idx]
  if (!c) return null
  return (
    <div className="es-sheet">
      <div className="es-card es-brief" key={c.id}>
        <div className="es-brief-head">
          <div>
            <div className="es-eyebrow">
              {c.vip ? <><IcoCrown size={16} /> Cliente VIP</> : <>Cliente {idx + 1} de {clients.length}</>}
            </div>
            <h2 className="es-title small">{c.name}</h2>
          </div>
          {combo > 0 && <span className="es-combo"><IcoFlame size={16} /> combo ×{combo}</span>}
        </div>
        <blockquote className="es-quote">&ldquo;{c.brief}&rdquo;</blockquote>
        {difficulty === 'facil' && (
          <div className="es-hintbox">
            <IcoStar size={16} filled /> Dica: {c.hintTags.map((t) => TAG_LABEL[t]).join(' · ')}
            {c.budget !== null && <> · até {c.budget} Brilhos</>}
          </div>
        )}
        <Questions client={c} />
        <div className="es-row">
          <button className="es-btn primary" onClick={() => (playSfx('done'), useEstilistaStore.getState().beginStyling())}>
            <IcoClock size={18} /> Começar ({c.timeLimit}s)
          </button>
        </div>
      </div>
    </div>
  )
}

const ORDER: Criterion[] = ['occasion', 'colors', 'budget', 'coherence', 'surprise', 'special']

export function Bars({ breakdown }: { breakdown: Record<Criterion, number | null> }) {
  return (
    <ul className="es-bars">
      {ORDER.filter((k) => breakdown[k] !== null).map((k, i) => {
        const v = Math.round((breakdown[k] ?? 0) * 100)
        return (
          <li key={k}>
            <span>{CRITERION_LABEL[k]}</span>
            <div className="es-bar"><i style={{ width: `${v}%`, animationDelay: `${i * 70}ms` }} data-q={v >= 75 ? 'hi' : v >= 50 ? 'mid' : 'lo'} /></div>
            <b>{v}</b>
          </li>
        )
      })}
    </ul>
  )
}

export function ReactScreen() {
  const results = useEstilistaStore((s) => s.results)
  const idx = useEstilistaStore((s) => s.idx)
  const total = useEstilistaStore((s) => s.clients.length)
  const difficulty = useEstilistaStore((s) => s.difficulty)
  const combo = useEstilistaStore((s) => s.combo)
  const r = results[results.length - 1]
  if (!r) return null
  const last = idx + 1 >= total
  const word = r.eval.total >= 92 ? 'Perfeito!' : r.eval.total >= 75 ? 'Ótimo!' : r.eval.total >= 50 ? 'Bom' : 'Quase...'
  return (
    <div className="es-sheet">
      <div className="es-card es-react" data-mood={r.eval.mood}>
        <div className="es-react-head">
          <Face mood={r.eval.mood} size={56} />
          <div>
            <div className="es-eyebrow">{word}{r.timedOut ? ' · tempo esgotado' : ''}</div>
            <h2 className="es-title small">{r.client.name}</h2>
          </div>
          <div className="es-score"><b>{r.eval.total}</b><span>de 100</span></div>
        </div>
        <blockquote className="es-quote">&ldquo;{r.quote.replace(/"/g, '')}&rdquo;</blockquote>
        <p className="es-live">{liveComment(r.client, r.eval, 'facil', idx)}</p>
        <Bars breakdown={r.eval.breakdown} />
        <div className="es-pts">
          <span>Pontos <b>+{r.points}</b></span>
          {r.points > r.eval.total && <span className="es-combo"><IcoFlame size={16} /> bônus ×{(r.points / Math.max(1, r.eval.total)).toFixed(1)}</span>}
          {r.eval.mood === 'happy' && <span className="es-combo on"><IcoFlame size={16} /> sequência {combo}</span>}
        </div>
        <p className="es-note small">{difficulty === 'estrela' ? 'No Estrela os comentários ao vivo são vagos.' : ''}</p>
        <div className="es-row">
          <button className="es-btn primary" onClick={() => (playSfx('click'), useEstilistaStore.getState().next())}>
            {last ? 'Ver resultado' : 'Próxima cliente'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function ResultsScreen({ onExit }: { onExit: () => void }) {
  const summary = useEstilistaStore((s) => s.summary)
  const results = useEstilistaStore((s) => s.results)
  const difficulty = useEstilistaStore((s) => s.difficulty)
  const mode = useEstilistaStore((s) => s.mode)
  if (!summary) return null
  return (
    <div className="es-center scroll">
      <div className="es-card es-results">
        <div className="es-eyebrow">{DIFFICULTY_LABEL[difficulty]} · {mode === 'daily' ? 'Desafio do dia' : 'Treino livre'}</div>
        <h1 className="es-title">Rodada concluída</h1>
        <div className="es-stars" aria-label={`${summary.stars} de 3 estrelas`}>
          {[1, 2, 3].map((n) => <IcoStar key={n} size={48} filled={n <= summary.stars} className={n <= summary.stars ? 'on' : ''} />)}
        </div>
        <div className="es-bigstats">
          <div><b>{summary.points}</b><span>pontos</span></div>
          <div><b>{summary.avg}</b><span>média por cliente</span></div>
          <div><b>×{summary.bestCombo}</b><span>melhor sequência</span></div>
        </div>
        {summary.newBest && <div className="es-badge">Novo recorde pessoal!</div>}
        <div className="es-rewards">
          <span><IcoCoin size={18} /> +{summary.rewards.coins} Brilhos</span>
          <span><IcoStar size={18} /> +{summary.rewards.xp} XP</span>
          <span><IcoHanger size={18} /> +{summary.rewards.professionXp} XP Estilista</span>
        </div>
        {(summary.unlocked.length > 0 || summary.tierUp) && (
          <div className="es-unlock">
            <b>Novo item desbloqueado!</b>
            {summary.unlocked.length > 0 && <span>{summary.unlocked.map((i) => i.label).join(', ')}</span>}
            {summary.tierUp && tierOf(getProfessionXp('Estilista')) >= 2 && <span>Clientes VIP agora aparecem na boutique.</span>}
          </div>
        )}

        <div className="es-sub">Depoimentos</div>
        <ul className="es-testi">
          {results.map((r) => (
            <li key={r.client.id}>
              <Face mood={r.eval.mood} size={38} />
              <div>
                <b>{r.client.name}{r.client.vip ? ' (VIP)' : ''} <em>{r.eval.total}</em></b>
                <p>&ldquo;{r.quote.replace(/"/g, '')}&rdquo;</p>
                <small>Queria: {wishSummary(r.client).join(' · ')}</small>
              </div>
            </li>
          ))}
        </ul>

        {summary.board && (
          <>
            <div className="es-sub">Ranking do dia{summary.rank ? ` · você em ${summary.rank}º` : ''}</div>
            <ol className="es-board">
              {summary.board.map((e, i) => (
                <li key={e.name + i} className={e.you ? 'you' : ''}>
                  <span>{i + 1}º</span><b>{e.name}</b><em>{e.score}</em>
                </li>
              ))}
            </ol>
          </>
        )}
        <div className="es-row">
          <button className="es-btn ghost" onClick={onExit}>Sair</button>
          <button className="es-btn primary" onClick={() => (playSfx('click'), useEstilistaStore.getState().reset())}>Jogar de novo</button>
        </div>
      </div>
    </div>
  )
}
