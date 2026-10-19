// Regras do jogo, sem DOM: da para testar com `node --test`.

// auto = seguidores por segundo; tap = seguidores extras por toque.
export const ITEMS = [
  { id: 'unha', name: 'Unha de gel', desc: 'Toca a tela com mais autoridade', cost: 25, growth: 2, tap: 1 },
  { id: 'filtro', name: 'Filtro de beleza', desc: 'Ninguem sabe como voce e de verdade', cost: 500, growth: 2, tap: 5 },
  { id: 'biquinho', name: 'Selfie com biquinho', desc: 'Classico que nunca morre', cost: 8000, growth: 2, tap: 40 },
  { id: 'dancinha', name: 'Dancinha viral', desc: 'Aponta pra legenda e pronto', cost: 150000, growth: 2, tap: 300 },
  { id: 'polegar', name: 'Polegar bionico', desc: 'Upgrade que o SUS nao cobre', cost: 3e6, growth: 2, tap: 2500 },

  { id: 'ringlight', name: 'Ring light', desc: 'Ilumina ate a falta de conteudo', cost: 15, growth: 1.15, auto: 0.1 },
  { id: 'celular', name: 'Celular com 3 cameras', desc: 'Parcelado em 24x, claro', cost: 100, growth: 1.15, auto: 1 },
  { id: 'estagiaria', name: 'Estagiaria nao remunerada', desc: 'Paga em exposicao', cost: 1100, growth: 1.15, auto: 8 },
  { id: 'fofoca', name: 'Grupo de fofoca', desc: 'Print vazado vale ouro', cost: 12000, growth: 1.15, auto: 47 },
  { id: 'bots', name: 'Fazenda de bots', desc: 'Seguidores 100% organicos (mentira)', cost: 130000, growth: 1.15, auto: 260 },
  { id: 'assessoria', name: 'Assessoria de imprensa', desc: 'Transforma treta em pauta', cost: 1.4e6, growth: 1.15, auto: 1400 },
  { id: 'reality', name: 'Participacao em reality', desc: 'Saiu na primeira semana, mas saiu', cost: 2e7, growth: 1.15, auto: 7800 },
  { id: 'cosmeticos', name: 'Linha de cosmeticos', desc: 'Mesma base de sempre, embalagem rosa', cost: 3.3e8, growth: 1.15, auto: 44000 },
];

export const TITLES = [
  [0, 'Anonima'], [100, 'Perfil fake'], [1e3, 'Micro'], [1e4, 'Blogueirinha'], [1e5, 'Influencer'],
  [1e6, 'Celebridade'], [1e8, 'Icone'], [1e10, 'Entidade da internet'],
];

export const VIRAL_CHANCE = 0.04;
export const VIRAL_MULT = 10;
export const OFFLINE_CAP_S = 8 * 3600; // shortcut: teto fixo de 8h offline, virar upgrade comprado quando houver prestigio

export function newState(now = Date.now()) {
  return { followers: 0, total: 0, owned: {}, last: now };
}

export const cost = (item, state) => Math.ceil(item.cost * item.growth ** (state.owned[item.id] || 0));
const sum = (state, key) => ITEMS.reduce((s, it) => s + (it[key] || 0) * (state.owned[it.id] || 0), 0);
export const perSecond = (state) => sum(state, 'auto');
export const perTap = (state) => 1 + sum(state, 'tap');
export const title = (state) => TITLES.findLast(([min]) => state.total >= min)[1];

function gain(state, n) {
  state.followers += n;
  state.total += n;
}

// Retorna quanto ganhou e se viralizou (rng injetavel para teste).
export function tap(state, rng = Math.random) {
  const viral = rng() < VIRAL_CHANCE;
  const n = perTap(state) * (viral ? VIRAL_MULT : 1);
  gain(state, n);
  return { n, viral };
}

export function buy(state, id) {
  const item = ITEMS.find((it) => it.id === id);
  const c = item && cost(item, state);
  if (!item || state.followers < c) return false;
  state.followers -= c;
  state.owned[id] = (state.owned[id] || 0) + 1;
  return true;
}

// Avanca o relogio ate `now`; cobre o frame normal, a aba escondida e o jogo fechado.
export function advance(state, now) {
  const seconds = Math.min(Math.max(0, (now - state.last) / 1000), OFFLINE_CAP_S);
  state.last = now;
  const n = perSecond(state) * seconds;
  gain(state, n);
  return { seconds, n };
}

// O save vem do localStorage do jogador: nao confiar no formato.
export function load(raw, now = Date.now()) {
  const fresh = newState(now);
  try {
    const s = JSON.parse(raw);
    const num = (v) => (Number.isFinite(v) && v >= 0 ? v : 0);
    fresh.followers = num(s.followers);
    fresh.total = Math.max(num(s.total), fresh.followers);
    for (const it of ITEMS) fresh.owned[it.id] = Math.floor(num(s.owned?.[it.id]));
    if (Number.isFinite(s.last) && s.last <= now) fresh.last = s.last;
  } catch {
    // save corrompido ou ausente: comeca do zero
  }
  return fresh;
}

const UNITS = ['', ' mil', ' mi', ' bi', ' tri', ' quatri', ' quinti', ' sexti'];
export function fmt(n) {
  if (n < 10) return (Math.floor(n * 10) / 10).toLocaleString('pt-BR'); // 0,1/s do ring light
  if (n < 1000) return String(Math.floor(n));
  const i = Math.min(Math.floor(Math.log10(n) / 3), UNITS.length - 1);
  // trunca em vez de arredondar: 999.999 vira "999,9 mil", nao "1.000 mil"
  return (Math.floor((n / 1000 ** i) * 10) / 10).toLocaleString('pt-BR') + UNITS[i];
}
