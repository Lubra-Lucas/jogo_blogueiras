import { ITEMS, newState, load, tap, buy, advance, cost, perSecond, perTap, title, fmt } from './game.js';

const SAVE_KEY = 'influencer-tycoon:v1';
const $ = (s) => document.querySelector(s);

let state;
try {
  state = load(localStorage.getItem(SAVE_KEY));
} catch {
  state = newState(); // localStorage bloqueado (aba anonima etc.)
}

function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // sem armazenamento: o jogo continua, so nao lembra
  }
}

// --- pixel art: cada letra e uma cor ---
const PALETTE = {
  h: '#ffd36e', H: '#e0a83c', s: '#f8c9a8', e: '#3a2340', l: '#e8487a',
  d: '#ff7eb6', D: '#c94f92', p: '#2b2b3a', w: '#9ff0ff', k: '#7a2d5a',
};
const SPRITE = [
  '.....hhhhhh.....',
  '....hhhhhhhh....',
  '...hhHhhhhhhh...',
  '...hhsssssshh...',
  '...hhsesseshh...',
  '...hhsssssshh...',
  '...hhssllsshh...',
  '...hhhsssshhh...',
  '...hhh.ss.hhh...',
  '....hddddddh.pp.',
  '...dddddddddswp.',
  '..sdddddddddswp.',
  '..s.dddddddd.pp.',
  '....DddddddD....',
  '...DddddddddD...',
  '..DddddddddddD..',
  '..DDDDDDDDDDDD..',
  '.....ss..ss.....',
  '.....ss..ss.....',
  '....kkk..kkk....',
];
const ctx = $('canvas').getContext('2d');
SPRITE.forEach((row, y) => [...row].forEach((c, x) => {
  if (PALETTE[c]) { ctx.fillStyle = PALETTE[c]; ctx.fillRect(x, y, 1, 1); }
}));

// --- loja ---
const shop = $('#shop');
const rows = {};
for (const [label, key] of [['TOQUE MAIS FORTE', 'tap'], ['RENDA AUTOMATICA', 'auto']]) {
  shop.insertAdjacentHTML('beforeend', `<h2>${label}</h2>`);
  for (const it of ITEMS.filter((i) => i[key])) {
    const b = document.createElement('button');
    b.className = 'item';
    b.innerHTML = `<span>${it.name}</span><span class="count"></span>
      <small>${it.desc} · +${fmt(it[key])}${key === 'auto' ? '/s' : '/toque'}</small><span class="price"></span>`;
    b.onclick = () => { if (buy(state, it.id)) { render(); save(); } };
    shop.append(b);
    rows[it.id] = { b, count: b.querySelector('.count'), price: b.querySelector('.price'), it };
  }
}

function render() {
  $('#followers').textContent = fmt(state.followers);
  $('#rates').textContent = `${fmt(perSecond(state))}/s · ${fmt(perTap(state))}/toque`;
  $('#title').textContent = title(state);
  for (const { b, count, price, it } of Object.values(rows)) {
    const c = cost(it, state);
    count.textContent = state.owned[it.id] || '';
    price.textContent = fmt(c);
    b.disabled = state.followers < c;
  }
}

// --- toque (pointerdown: sem atraso no celular e aceita varios dedos) ---
const stage = $('#stage');
$('#star').addEventListener('pointerdown', (e) => {
  const { n, viral } = tap(state);
  const r = stage.getBoundingClientRect();
  const pop = document.createElement('span');
  pop.className = viral ? 'pop viral' : 'pop';
  pop.textContent = viral ? `VIRALIZOU! +${fmt(n)}` : `+${fmt(n)}`;
  pop.style.left = `${(e.clientX || r.left + r.width / 2) - r.left - 20}px`;
  pop.style.top = `${(e.clientY || r.top + r.height / 2) - r.top - 20}px`;
  stage.append(pop);
  pop.addEventListener('animationend', () => pop.remove());
  if (navigator.vibrate) navigator.vibrate(viral ? 40 : 8);
  $('#hint').hidden = true;
  render();
});
// teclado: Enter/Espaco tambem postam
$('#star').addEventListener('click', (e) => { if (e.detail === 0) { tap(state); render(); } });

function toast(text) {
  $('#toast-text').textContent = text;
  $('#toast').hidden = false;
}
$('#toast button').onclick = () => { $('#toast').hidden = true; };

// --- relogio: o mesmo calculo serve pro frame, pra aba escondida e pro jogo fechado ---
function frame() {
  const { seconds, n } = advance(state, Date.now());
  if (seconds > 60 && n >= 1) toast(`Enquanto voce sumia, ganhou ${fmt(n)} seguidores. Nem precisou postar.`);
  render();
  requestAnimationFrame(frame);
}
frame();
setInterval(save, 5000);
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
