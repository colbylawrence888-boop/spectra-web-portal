'use strict';

const READER_URL = 'https://spectra-reader-lrdsot.v2.appdeploy.ai';
const SOURCE_LIST = [
  { name: 'Wikipedia', domain: 'wikipedia.org', icon: 'W', url: 'https://en.wikipedia.org/wiki/Main_Page', category: 'Encyclopedia' },
  { name: 'NASA', domain: 'nasa.gov', icon: '✳', url: 'https://www.nasa.gov/', category: 'Space & Science' },
  { name: 'Smithsonian', domain: 'si.edu', icon: '◇', url: 'https://www.si.edu/', category: 'Research & History' },
  { name: 'Britannica', domain: 'britannica.com', icon: 'B', url: 'https://www.britannica.com/', category: 'Reference' },
  { name: 'OpenStax', domain: 'openstax.org', icon: 'O', url: 'https://openstax.org/', category: 'Textbooks' },
  { name: 'Wiktionary', domain: 'wiktionary.org', icon: '字', url: 'https://en.wiktionary.org/', category: 'Language' }
];

function getStore(key, fallback) {
  try {
    const data = JSON.parse(localStorage.getItem('spectra:' + key));
    return data === null ? fallback : data;
  } catch {
    return fallback;
  }
}

function putStore(key, value) {
  try {
    localStorage.setItem('spectra:' + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

const state = {
  bookmarks: getStore('bookmarks', []),
  history: getStore('history', []),
  settings: getStore('settings', { theme: 'dark', accent: 'violet', reduced: false }),
  snakeBest: getStore('snakeBest', 0),
  game: 'snake'
};

const $ = (id) => document.getElementById(id);
const $all = (selector) => Array.from(document.querySelectorAll(selector));
const names = { home: 'Overview', browse: 'Browse', games: 'Games', library: 'Library', tools: 'Tools', settings: 'Settings' };
let noticeTimer;

function notify(message) {
  const toast = $('toast');
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => toast.classList.remove('visible'), 2600);
}

function validUrl(raw) {
  try {
    const url = new URL(raw.trim());
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

function openExternal(url) {
  const safe = validUrl(url);
  if (!safe) {
    notify('Only HTTPS websites can be opened.');
    return;
  }
  const link = document.createElement('a');
  link.href = safe;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.click();
}

function renderView(target) {
  const view = names[target] ? target : 'home';
  $all('[data-page]').forEach((section) => section.classList.toggle('active', section.dataset.page === view));
  $all('.nav-item').forEach((button) => button.classList.toggle('active', button.dataset.view === view));
  $('crumb').textContent = names[view];
  if (view !== 'games') stopSnake();
  if (view === 'library') drawBookmarks();
  if (view === 'browse') drawHistory();
  window.scrollTo({ top: 0, behavior: state.settings.reduced ? 'instant' : 'smooth' });
}

$all('[data-view]').forEach((button) => {
  button.addEventListener('click', () => {
    location.hash = button.dataset.view;
    renderView(button.dataset.view);
  });
});

window.addEventListener('hashchange', () => renderView(location.hash.slice(1)));
renderView(location.hash.slice(1) || 'home');

function applySettings() {
  document.documentElement.dataset.theme = state.settings.theme;
  document.documentElement.dataset.accent = state.settings.accent;
  document.documentElement.dataset.reduced = state.settings.reduced ? 'true' : 'false';
  $('themeSelect').value = state.settings.theme;
  $('reduceMotion').checked = !!state.settings.reduced;
  $all('[data-accent]').forEach((button) => button.classList.toggle('selected', button.dataset.accent === state.settings.accent));
  $('themeQuick').textContent = state.settings.theme === 'dark' ? '☼' : '☾';
}

function saveSettings() {
  putStore('settings', state.settings);
  applySettings();
}

$('themeQuick').addEventListener('click', () => {
  state.settings.theme = state.settings.theme === 'dark' ? 'light' : 'dark';
  saveSettings();
});
$('themeSelect').addEventListener('change', (event) => {
  state.settings.theme = event.target.value;
  saveSettings();
});
$('reduceMotion').addEventListener('change', (event) => {
  state.settings.reduced = event.target.checked;
  saveSettings();
});
$all('[data-accent]').forEach((button) => button.addEventListener('click', () => {
  state.settings.accent = button.dataset.accent;
  saveSettings();
}));
$('clearWorkspace').addEventListener('click', () => {
  if (!window.confirm('Erase bookmarks, history, notes, settings and saved game scores from this browser?')) return;
  ['bookmarks', 'history', 'settings', 'notes', 'snakeBest'].forEach((key) => {
    try { localStorage.removeItem('spectra:' + key); } catch {}
  });
  state.bookmarks = [];
  state.history = [];
  state.snakeBest = 0;
  state.settings = { theme: 'dark', accent: 'violet', reduced: false };
  $('notes').value = '';
  saveSettings();
  drawBookmarks();
  drawHistory();
  updateBest();
  notify('Local workspace cleared.');
});
applySettings();

function externalSearch(text) {
  const value = text.trim();
  if (!value) return;
  const url = validUrl(value);
  openExternal(url || 'https://www.google.com/search?q=' + encodeURIComponent(value));
}

$('globalSearch').addEventListener('submit', (event) => {
  event.preventDefault();
  externalSearch($('globalQuery').value);
});

const shortcuts = $('homeLinks');
SOURCE_LIST.slice(0, 4).forEach((source) => {
  const anchor = document.createElement('a');
  anchor.className = 'quicklink';
  anchor.href = source.url;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  const icon = document.createElement('span');
  icon.className = 'link-icon';
  icon.textContent = source.icon;
  anchor.append(icon, document.createTextNode(source.name + ' ↗'));
  shortcuts.appendChild(anchor);
});

function drawSources() {
  const container = $('sources');
  container.replaceChildren();
  SOURCE_LIST.forEach((source) => {
    const button = document.createElement('button');
    button.className = 'source-card';
    button.type = 'button';
    const image = document.createElement('i');
    image.textContent = source.icon;
    const copy = document.createElement('span');
    const name = document.createElement('b');
    const sub = document.createElement('small');
    name.textContent = source.name;
    sub.textContent = source.category;
    copy.append(name, sub);
    button.append(image, copy);
    button.addEventListener('click', () => {
      $('browserAddress').value = source.url;
      $('browserForm').requestSubmit();
    });
    container.appendChild(button);
  });
}

function drawReader(payload) {
  const content = $('readerContent');
  content.replaceChildren();
  if (payload.error) {
    const paragraph = document.createElement('p');
    paragraph.className = 'reader-error';
    paragraph.textContent = payload.error;
    content.appendChild(paragraph);
    return;
  }
  const h2 = document.createElement('h2');
  h2.className = 'reader-title';
  h2.textContent = payload.title || 'Public article';
  const address = document.createElement('p');
  address.className = 'reader-url';
  address.textContent = payload.url || '';
  const copy = document.createElement('div');
  copy.className = 'reader-copy';
  copy.textContent = payload.text || 'No readable text was found.';
  content.append(h2, address, copy);
}

$('browserForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const url = validUrl($('browserAddress').value);
  if (!url) return drawReader({ error: 'Please enter a valid HTTPS address.' });
  drawReader({ error: 'Retrieving readable article text…' });
  try {
    const response = await fetch(READER_URL + '/api/read?url=' + encodeURIComponent(url), { mode: 'cors' });
    let page;
    try { page = await response.json(); } catch { throw new Error('Reader returned an unexpected response.'); }
    if (!response.ok) throw new Error(page.error || 'This article could not be read.');
    drawReader(page);
    state.history = [{ title: page.title, url, at: Date.now() }].concat(state.history.filter((item) => item.url !== url)).slice(0, 20);
    putStore('history', state.history);
    drawHistory();
    notify('Reading view loaded.');
  } catch (failure) {
    drawReader({ error: (failure instanceof Error ? failure.message : '') + ' The external reader may be unavailable on this network. You can still open the original website.' });
  }
});

$('openOriginal').addEventListener('click', () => openExternal($('browserAddress').value));

$('saveCurrent').addEventListener('click', () => {
  const url = validUrl($('browserAddress').value);
  if (!url) return notify('Enter a valid HTTPS URL first.');
  $('bookmarkUrl').value = url;
  $('bookmarkName').value = new URL(url).hostname.replace(/^www\./, '');
  $('bookmarkDialog').showModal();
});

function drawHistory() {
  const container = $('historyList');
  container.replaceChildren();
  if (!state.history.length) {
    container.innerHTML = '<div class="empty-state">No pages read yet. Try an article in the public reader.</div>';
    $('lastActivity').textContent = 'Your recent reading history will appear here. Start by exploring a public article.';
    return;
  }
  $('lastActivity').textContent = 'Latest: ' + state.history[0].title;
  state.history.forEach((entry) => {
    const row = document.createElement('div');
    row.className = 'history-item';
    const title = document.createElement('span');
    title.textContent = entry.title || entry.url;
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Read again ↗';
    button.addEventListener('click', () => {
      $('browserAddress').value = entry.url;
      $('browserForm').requestSubmit();
    });
    row.append(title, button);
    container.appendChild(row);
  });
}

$('clearHistory').addEventListener('click', () => {
  state.history = [];
  putStore('history', []);
  drawHistory();
  notify('Reading history cleared.');
});

drawSources();
drawHistory();

function drawBookmarks() {
  const list = $('bookmarkList');
  list.replaceChildren();
  const query = $('bookmarkSearch').value.trim().toLowerCase();
  const matches = state.bookmarks.filter((item) => (item.title + ' ' + item.url).toLowerCase().includes(query));
  if (!matches.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = query ? 'No matching bookmarks.' : 'Your library is empty. Add a website to begin.';
    list.appendChild(empty);
    return;
  }
  matches.forEach((bookmark) => {
    const card = document.createElement('div');
    card.className = 'bookmark-card';
    const icon = document.createElement('span');
    icon.className = 'bookmark-glyph';
    icon.textContent = '↗';
    const title = document.createElement('h3');
    title.textContent = bookmark.title;
    const domain = document.createElement('span');
    domain.className = 'domain';
    domain.textContent = new URL(bookmark.url).hostname;
    const actions = document.createElement('div');
    actions.className = 'actions';
    const link = document.createElement('a');
    link.href = bookmark.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'OPEN WEBSITE ↗';
    const remove = document.createElement('button');
    remove.textContent = 'Remove';
    remove.type = 'button';
    remove.addEventListener('click', () => {
      state.bookmarks = state.bookmarks.filter((item) => item.url !== bookmark.url);
      putStore('bookmarks', state.bookmarks);
      drawBookmarks();
      notify('Bookmark removed.');
    });
    actions.append(link, remove);
    card.append(icon, title, domain, actions);
    list.appendChild(card);
  });
}

$('bookmarkSearch').addEventListener('input', drawBookmarks);
$('addBookmark').addEventListener('click', () => {
  $('bookmarkForm').reset();
  $('bookmarkError').textContent = '';
  $('bookmarkDialog').showModal();
});
$('cancelBookmark').addEventListener('click', () => $('bookmarkDialog').close());
$('bookmarkForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const url = validUrl($('bookmarkUrl').value);
  const title = $('bookmarkName').value.trim();
  if (!url || !title) {
    $('bookmarkError').textContent = 'Add a name and a valid HTTPS URL.';
    return;
  }
  state.bookmarks = [{ title, url }].concat(state.bookmarks.filter((entry) => entry.url !== url)).slice(0, 100);
  putStore('bookmarks', state.bookmarks);
  $('bookmarkDialog').close();
  drawBookmarks();
  notify('Bookmark saved to your library.');
});
drawBookmarks();

const notes = getStore('notes', '');
$('notes').value = typeof notes === 'string' ? notes : '';
$('notes').addEventListener('input', () => {
  const saved = putStore('notes', $('notes').value);
  $('noteStatus').textContent = saved ? 'SAVED LOCALLY' : 'STORAGE UNAVAILABLE';
});

let focusSeconds = 25 * 60;
let focusLength = 25 * 60;
let timerRunning = false;
let timerInterval = null;
let focusFinish = 0;

function updateTimer() {
  const mins = String(Math.floor(focusSeconds / 60)).padStart(2, '0');
  const secs = String(focusSeconds % 60).padStart(2, '0');
  $('timerValue').textContent = mins + ':' + secs;
  document.title = timerRunning ? mins + ':' + secs + ' • SPECTRA' : 'SPECTRA — Your digital space';
}

function pauseTimer() {
  timerRunning = false;
  clearInterval(timerInterval);
  timerInterval = null;
  $('timerToggle').textContent = 'Continue focus';
  updateTimer();
}

function runTimer() {
  if (timerRunning) return pauseTimer();
  if (focusSeconds <= 0) focusSeconds = focusLength;
  timerRunning = true;
  focusFinish = Date.now() + focusSeconds * 1000;
  $('timerToggle').textContent = 'Pause focus';
  timerInterval = setInterval(() => {
    focusSeconds = Math.max(0, Math.ceil((focusFinish - Date.now()) / 1000));
    updateTimer();
    if (focusSeconds === 0) {
      pauseTimer();
      $('timerToggle').textContent = 'Start again';
      notify('Focus session finished.');
    }
  }, 250);
  updateTimer();
}

$('timerToggle').addEventListener('click', runTimer);
$('timerReset').addEventListener('click', () => {
  pauseTimer();
  focusSeconds = focusLength;
  $('timerToggle').textContent = 'Start focus';
  updateTimer();
});
$all('[data-minutes]').forEach((button) => button.addEventListener('click', () => {
  pauseTimer();
  focusLength = Number(button.dataset.minutes) * 60;
  focusSeconds = focusLength;
  $('timerToggle').textContent = 'Start focus';
  $all('[data-minutes]').forEach((item) => item.classList.toggle('selected', item === button));
  updateTimer();
}));
updateTimer();

let snake = [];
let food = { x: 13, y: 10 };
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };
let snakeTimer = null;
let snakeScore = 0;
let snakeActive = false;
let snakePaused = false;
const canvas = $('snakeCanvas');
const ctx = canvas.getContext('2d');
const CELL = 20;

function updateBest() {
  $('gameScore').textContent = state.game === 'snake' ? 'BEST ' + state.snakeBest : 'GOOD LUCK';
}

function drawSnake() {
  ctx.fillStyle = '#0b1520';
  ctx.fillRect(0, 0, 400, 400);
  ctx.strokeStyle = 'rgba(91,188,183,.07)';
  for (let n = 0; n <= 20; n++) {
    ctx.beginPath();
    ctx.moveTo(n * CELL, 0);
    ctx.lineTo(n * CELL, 400);
    ctx.moveTo(0, n * CELL);
    ctx.lineTo(400, n * CELL);
    ctx.stroke();
  }
  ctx.fillStyle = '#ff86ac';
  ctx.shadowColor = '#ff86ac';
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.arc(food.x * CELL + 10, food.y * CELL + 10, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  snake.forEach((part, index) => {
    ctx.fillStyle = index === 0 ? '#b9ffe5' : '#59dcb8';
    ctx.fillRect(part.x * CELL + 2, part.y * CELL + 2, CELL - 4, CELL - 4);
  });
  ctx.fillStyle = '#c6efe8';
  ctx.font = 'bold 14px system-ui';
  ctx.fillText('SCORE ' + snakeScore, 12, 22);
}

function randomFood() {
  const empty = [];
  for (let y = 0; y < 20; y++) {
    for (let x = 0; x < 20; x++) {
      if (!snake.some((part) => part.x === x && part.y === y)) empty.push({ x, y });
    }
  }
  food = empty.length ? empty[Math.floor(Math.random() * empty.length)] : { x: 0, y: 0 };
}

function stopSnake() {
  clearInterval(snakeTimer);
  snakeTimer = null;
  snakeActive = false;
  snakePaused = false;
}

function resetSnake() {
  stopSnake();
  snake = [{ x: 8, y: 10 }, { x: 7, y: 10 }, { x: 6, y: 10 }];
  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };
  snakeScore = 0;
  randomFood();
  drawSnake();
  $('snakeMessage').textContent = 'Score: 0 · Keep moving!';
  snakeActive = true;
  snakeTimer = setInterval(stepSnake, 140);
  $('snakePause').textContent = 'Pause';
}

function stepSnake() {
  if (!snakeActive || snakePaused) return;
  direction = nextDirection;
  const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
  const eating = head.x === food.x && head.y === food.y;
  const body = eating ? snake : snake.slice(0, -1);
  const collided = head.x < 0 || head.y < 0 || head.x >= 20 || head.y >= 20 || body.some((part) => part.x === head.x && part.y === head.y);
  if (collided) {
    stopSnake();
    $('snakeMessage').textContent = 'Game over · Score ' + snakeScore + '. Press Start to try again.';
    return;
  }
  snake.unshift(head);
  if (eating) {
    snakeScore += 10;
    if (snakeScore > state.snakeBest) {
      state.snakeBest = snakeScore;
      putStore('snakeBest', state.snakeBest);
      updateBest();
    }
    randomFood();
    $('snakeMessage').textContent = 'Score: ' + snakeScore;
  } else {
    snake.pop();
  }
  drawSnake();
}

function setSnakeDirection(value) {
  const options = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
  const move = options[value];
  if (!move || direction.x + move.x === 0 && direction.y + move.y === 0) return;
  nextDirection = move;
}

window.addEventListener('keydown', (event) => {
  if (state.game !== 'snake' || !$('[data-page="games"]').classList.contains('active')) return;
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
  const moves = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
  if (moves[event.key]) {
    event.preventDefault();
    setSnakeDirection(moves[event.key]);
  }
});

$all('[data-dir]').forEach((button) => button.addEventListener('click', () => setSnakeDirection(button.dataset.dir)));
$('snakeStart').addEventListener('click', resetSnake);
$('snakePause').addEventListener('click', () => {
  if (!snakeActive) return;
  snakePaused = !snakePaused;
  $('snakePause').textContent = snakePaused ? 'Resume' : 'Pause';
  $('snakeMessage').textContent = snakePaused ? 'Game paused' : 'Score: ' + snakeScore;
});
snake = [{ x: 8, y: 10 }, { x: 7, y: 10 }, { x: 6, y: 10 }];
drawSnake();

const memorySymbols = ['◆', '☯', '✦', '◈', '✿', '♜', '✺', '⬡'];
let memoryOpen = [];
let memoryMatched = 0;
let memoryMoves = 0;
let memoryLocked = false;
let memoryTimeout = null;

function resetMemory() {
  clearTimeout(memoryTimeout);
  memoryOpen = [];
  memoryMatched = 0;
  memoryMoves = 0;
  memoryLocked = false;
  $('memoryMessage').textContent = 'Find all the matching pairs.';
  $('memoryStats').textContent = 'Moves: 0 · Matched: 0 / 8';
  const deck = memorySymbols.concat(memorySymbols).sort(() => Math.random() - 0.5);
  const board = $('memoryBoard');
  board.replaceChildren();
  deck.forEach((symbol) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'memory-cell';
    button.textContent = '?';
    button.dataset.symbol = symbol;
    button.addEventListener('click', () => {
      if (memoryLocked || button.classList.contains('matched') || memoryOpen.includes(button)) return;
      button.textContent = symbol;
      button.classList.add('flipped');
      memoryOpen.push(button);
      if (memoryOpen.length !== 2) return;
      memoryMoves++;
      $('memoryStats').textContent = 'Moves: ' + memoryMoves + ' · Matched: ' + memoryMatched + ' / 8';
      memoryLocked = true;
      if (memoryOpen[0].dataset.symbol === memoryOpen[1].dataset.symbol) {
        memoryOpen.forEach((cell) => cell.classList.add('matched'));
        memoryMatched++;
        memoryOpen = [];
        memoryLocked = false;
        $('memoryStats').textContent = 'Moves: ' + memoryMoves + ' · Matched: ' + memoryMatched + ' / 8';
        if (memoryMatched === 8) $('memoryMessage').textContent = 'You matched all the pairs in ' + memoryMoves + ' moves!';
      } else {
        memoryTimeout = setTimeout(() => {
          memoryOpen.forEach((cell) => {
            cell.textContent = '?';
            cell.classList.remove('flipped');
          });
          memoryOpen = [];
          memoryLocked = false;
        }, 850);
      }
    });
    board.appendChild(button);
  });
}
$('memoryReset').addEventListener('click', resetMemory);
resetMemory();

let duelBoard = Array(9).fill('');
let duelComplete = false;
function checkWin(board) {
  const combos = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (const [a,b,c] of combos) {
    if (board[a] && board[a] === board[b] && board[b] === board[c]) return board[a];
  }
  return board.every(Boolean) ? 'draw' : '';
}
function chooseAiMove() {
  const vacant = duelBoard.map((value,index) => value ? -1 : index).filter((index) => index >= 0);
  for (const role of ['O', 'X']) {
    for (const index of vacant) {
      const test = duelBoard.slice();
      test[index] = role;
      if (checkWin(test) === role) return index;
    }
  }
  if (vacant.includes(4)) return 4;
  const corners = vacant.filter((index) => [0, 2, 6, 8].includes(index));
  return (corners.length ? corners : vacant)[Math.floor(Math.random() * (corners.length ? corners.length : vacant.length))];
}
function drawDuel() {
  const board = $('duelBoard');
  board.replaceChildren();
  duelBoard.forEach((value, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = value === 'O' ? 'o' : '';
    button.textContent = value;
    button.disabled = !!value || duelComplete;
    button.setAttribute('aria-label', 'Cell ' + (index + 1) + (value ? ' ' + value : ' empty'));
    button.addEventListener('click', () => {
      if (duelComplete || duelBoard[index]) return;
      duelBoard[index] = 'X';
      const done = checkWin(duelBoard);
      if (done) {
        finishDuel(done);
        return;
      }
      const move = chooseAiMove();
      if (Number.isInteger(move)) duelBoard[move] = 'O';
      const outcome = checkWin(duelBoard);
      if (outcome) finishDuel(outcome);
      else $('duelMessage').textContent = 'Your turn — you are X.';
      drawDuel();
    });
    board.appendChild(button);
  });
}
function finishDuel(winner) {
  duelComplete = true;
  $('duelMessage').textContent = winner === 'draw' ? 'It is a draw! Start a new round.' : winner === 'X' ? 'You win! Nice move.' : 'The computer wins this round.';
  drawDuel();
}
function resetDuel() {
  duelBoard = Array(9).fill('');
  duelComplete = false;
  $('duelMessage').textContent = 'Your turn — you are X.';
  drawDuel();
}
$('duelReset').addEventListener('click', resetDuel);
resetDuel();

$all('[data-game]').forEach((button) => button.addEventListener('click', () => {
  stopSnake();
  clearTimeout(memoryTimeout);
  state.game = button.dataset.game;
  $all('[data-game]').forEach((item) => item.classList.toggle('selected', item === button));
  $('snakeArea').classList.toggle('hidden', state.game !== 'snake');
  $('memoryArea').classList.toggle('hidden', state.game !== 'memory');
  $('duelArea').classList.toggle('hidden', state.game !== 'duel');
  const labels = { snake: ['Neon Snake','ARCADE / SKILL'], memory: ['Memory Grid','PUZZLE / FOCUS'], duel: ['Grid Duel','CLASSIC / STRATEGY'] };
  $('gameName').textContent = labels[state.game][0];
  $('gameType').textContent = labels[state.game][1];
  updateBest();
}));
updateBest();
