// script.js — Enhanced Expense Tracker


// ── Auth ──────────────────────────────────────────────
const users = () => JSON.parse(localStorage.getItem('et_users') || '{}');
const saveUsers = u => localStorage.setItem('et_users', JSON.stringify(u));
let currentUser = localStorage.getItem('et_current') || null;

function register() {
  const u = document.getElementById('loginUser').value.trim();
  const p = document.getElementById('loginPass').value;
  if (!u || !p) return msg('Enter a username and password.');

  // ── Block if limits exceeded ──
  if (u.length > 20) return;
  if (p.length > 30) return;

  const db = users();
  if (db[u]) return msg('Username already exists.');
  db[u] = { pass: p, transactions: [] };
  saveUsers(db); msg('Account created! You can now log in.', true);
}

function login() {
  const u = document.getElementById('loginUser').value.trim();
  const p = document.getElementById('loginPass').value;

  // ── Block if limits exceeded ──
  if (u.length > 20) return;
  if (p.length > 30) return;

  const db = users();
  if (!db[u] || db[u].pass !== p) return msg('Invalid username or password.');
  currentUser = u; localStorage.setItem('et_current', u); bootApp();
}

function logout() {
  currentUser = null; localStorage.removeItem('et_current');
  document.getElementById('appScreen').classList.add('hidden');
  document.getElementById('loginScreen').classList.remove('hidden');
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
  msg('');
}

function msg(t, ok = false) {
  const el = document.getElementById('loginMsg');
  el.textContent = t; el.className = 'login-msg' + (ok ? ' ok' : '');
}

function bootApp() {
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('appScreen').classList.remove('hidden');
  document.getElementById('welcomeMsg').textContent = `Logged in as ${currentUser}`;
  render();
}

// ── Input char limit warnings ──────────────────────────
const limitRules = [
  { id: 'text',   max: 30 },
  { id: 'tags',   max: 40 },
  { id: 'amount', max: 8  },
];

limitRules.forEach(({ id, max }) => {
  const input = document.getElementById(id);

  // create warning element dynamically
  const warn = document.createElement('p');
  warn.className = 'input-warn hidden';
  warn.textContent = id === 'amount'
    ? `Max 8 digits allowed.`
    : `Max ${max} characters allowed.`;
  input.insertAdjacentElement('afterend', warn);

  input.addEventListener('input', () => {
    const len = id === 'amount'
      ? input.value.replace(/\D/g, '').length
      : input.value.length;
    if (len >= max) {
      warn.classList.remove('hidden');
    } else {
      warn.classList.add('hidden');
    }
  });
});

// ── Data helpers ──────────────────────────────────────
function getTx() { return users()[currentUser]?.transactions || []; }
function setTx(list) {
  const db = users(); db[currentUser].transactions = list; saveUsers(db);
}

// ── Core ──────────────────────────────────────────────
const form = document.getElementById('form');
let prevBalance = 0;

form.addEventListener('submit', e => {
  e.preventDefault();
  const text     = document.getElementById('text').value.trim();
  const amount   = +document.getElementById('amount').value;
  const category = document.getElementById('category').value;
  const tags     = document.getElementById('tags').value.split(',').map(t => t.trim()).filter(Boolean);
  if (!text || !amount) return;

  // ── Block submit if limits exceeded ──────────────────
  if (text.length > 30) return;
  if (document.getElementById('tags').value.length > 40) return;
  if (document.getElementById('amount').value.replace(/\D/g, '').length > 8) return;

  // ── 9-digit guard ──────────────────────────────
  const list = getTx();
  const currentTotal = list.reduce((a, b) => a + b.amount, 0);
  const newTotal = Math.abs(currentTotal + amount);
  if (newTotal >= 99999999) {
    alert('Total Balance is reaching the limit (99999999).\nPlease clear older transactions before adding more or enter smaller amounts.');
    return;
  }
  // ───────────────────────────────────────────────

  list.push({ id: Date.now(), text, amount, category, tags });
  setTx(list); render(); form.reset();
});


// ── Login input char limit warnings ──────────────────
const loginLimits = [
  { id: 'loginUser', max: 20, label: 'Username' },
  { id: 'loginPass', max: 30, label: 'Password' },
];

loginLimits.forEach(({ id, max, label }) => {
  const input = document.getElementById(id);

  const warn = document.createElement('p');
  warn.className = 'input-warn hidden';
  warn.textContent = `Max ${max} characters allowed.`;
  input.insertAdjacentElement('afterend', warn);

  input.addEventListener('input', () => {
    if (input.value.length >= max) {
      warn.classList.remove('hidden');
    } else {
      warn.classList.add('hidden');
    }
  });
});

function remove(id) { setTx(getTx().filter(t => t.id !== id)); render(); }

function clearAll() {
  if (getTx().length && confirm('Clear all transactions?')) { setTx([]); render(); }
}

// ── Animated balance counter ──────────────────────────
function animateBalance(from, to) {
  const el = document.getElementById('balance');
  const dur = 500, start = performance.now();
  el.classList.add('bump');
  setTimeout(() => el.classList.remove('bump'), 320);
  function step(now) {
    const p = Math.min((now - start) / dur, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    const val = from + (to - from) * ease;
    el.textContent = `₹${val.toFixed(2)}`;
    if (p < 1) requestAnimationFrame(step);
    else { el.textContent = `₹${to.toFixed(2)}`; prevBalance = to; }
  }
  requestAnimationFrame(step);
}

// ── Render ────────────────────────────────────────────
function render() {
  const filterCat = document.getElementById('filterCat').value;
  const all = getTx();
  const list = filterCat ? all.filter(t => t.category === filterCat) : all;

  document.getElementById('transactions').innerHTML = list.length
    ? list.map(t => `
        <li class="${t.amount > 0 ? 'income' : 'expense'}">
          <div class="tx-info">
            <span class="tx-desc">${t.text}</span>
            <div class="tx-meta">
              ${t.category ? `<span class="tx-cat">${t.category}</span>` : ''}
              ${(t.tags || []).map(g => `<span class="tx-tag">#${g}</span>`).join('')}
            </div>
          </div>
          <div class="tx-right">
            <span class="tx-amount">${t.amount > 0 ? '+' : ''}₹${Math.abs(t.amount).toFixed(2)}</span>
            <button class="del-btn" onclick="remove(${t.id})">✕</button>
          </div>
        </li>`).join('')
    : '<p class="empty">No transactions found.</p>';

  const amounts = all.map(t => t.amount);
  const total   = amounts.reduce((a, b) => a + b, 0);
  const income  = amounts.filter(a => a > 0).reduce((a, b) => a + b, 0);
  const expense = Math.abs(amounts.filter(a => a < 0).reduce((a, b) => a + b, 0));

  const el = document.getElementById('balance');
  el.className = `balance-amount ${total >= 0 ? 'positive' : 'negative'}`;
  animateBalance(prevBalance, total);

  document.getElementById('income').textContent  = `₹${income.toFixed(2)}`;
  document.getElementById('expense').textContent = `₹${expense.toFixed(2)}`;
}

// ── CSV Export ────────────────────────────────────────
function exportCSV() {
  const list = getTx();
  if (!list.length) return alert('No transactions to export.');
  const rows = [['ID','Description','Amount','Type','Category','Tags','Date']];
  list.forEach(t => rows.push([
    t.id, `"${t.text}"`, t.amount,
    t.amount > 0 ? 'Income' : 'Expense',
    t.category || '',
    (t.tags || []).join('; '),
    new Date(t.id).toLocaleDateString()
  ]));
  const csv = rows.map(r => r.join(',')).join('\n');
  const a = Object.assign(document.createElement('a'), {
    href: 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv),
    download: `${currentUser}_transactions.csv`
  });
  a.click();
}

// ── Boot ──────────────────────────────────────────────
if (currentUser && users()[currentUser]) bootApp();