function saveSession(token, user) {
  localStorage.setItem('mrms_token', token);
  localStorage.setItem('mrms_user', JSON.stringify(user));
}

// ── DARK/LIGHT MODE ──
function initTheme() {
  const saved = localStorage.getItem('mrms_theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  updateToggleIcon(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next    = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('mrms_theme', next);
  updateToggleIcon(next);
}

function updateToggleIcon(theme) {
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

// Sahifa yuklanganda themeni qo'llamiz
document.addEventListener('DOMContentLoaded', initTheme);

function getUser() {
  const raw = localStorage.getItem('mrms_user');
  return raw ? JSON.parse(raw) : null;
}

function getRole() {
  const user = getUser();
  return user ? user.role : null;
}

function requireAuth(allowedRole) {
  const token = localStorage.getItem('mrms_token');
  const user  = getUser();
  if (!token || !user) {
    window.location.href = '/index.html';
    return false;
  }
  if (allowedRole && user.role !== allowedRole) {
    window.location.href = '/index.html';
    return false;
  }
  return true;
}

function logout() {
  localStorage.clear();
  window.location.href = '/index.html';
}

function renderUserInfo() {
  const user = getUser();
  if (!user) return;

  const rolLabels = {
    admin:             'Administrator',
    bosh_shifokor:     'Bosh shifokor',
    mahalliy_shifokor: 'Mahalliy shifokor',
    tor_shifokor:      'Tor shifokor',
    qabulxona:         'Qabulxona xodimi',
    bemor:             'Bemor',
  };

  const nameEl   = document.getElementById('user-name');
  const roleEl   = document.getElementById('user-role');
  const avatarEl = document.getElementById('user-avatar');

  if (nameEl)   nameEl.textContent   = user.fullName || user.username;
  if (roleEl)   roleEl.textContent   = rolLabels[user.role] || user.role;
  if (avatarEl) avatarEl.textContent = (user.fullName || user.username).charAt(0).toUpperCase();
}

function highlightNav() {
  const page = window.location.pathname.split('/').pop();
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href') || '';
    if (href === page || href.includes(page)) {
      link.classList.add('active');
    }
  });
}

function showToast(msg, type = '') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function setLoading(tbodyId, colspan) {
  const el = document.getElementById(tbodyId);
  if (el) el.innerHTML = `<tr><td colspan="${colspan}" class="table-empty"><div class="loading"><div class="spinner"></div> Yuklanmoqda...</div></td></tr>`;
}

function setEmpty(tbodyId, colspan, msg = 'Ma\'lumot topilmadi') {
  const el = document.getElementById(tbodyId);
  if (el) el.innerHTML = `<tr><td colspan="${colspan}" class="table-empty">${msg}</td></tr>`;
}

// ── LOGIN PAGE FUNKSIYALARI ──────────────────────────────────────────────────

// Demo login tugmasi: username va parolni to'ldiradi
function fill(username, password) {
  const u = document.getElementById('username');
  const p = document.getElementById('password');
  if (u) u.value = username;
  if (p) p.value = password;
}

// Parolni ko'rsatish/yashirish
const togglePwd = document.getElementById('togglePwd');
if (togglePwd) {
  togglePwd.addEventListener('click', () => {
    const pwd = document.getElementById('password');
    if (!pwd) return;
    pwd.type = pwd.type === 'password' ? 'text' : 'password';
    togglePwd.innerHTML = pwd.type === 'password' ? '&#128065;' : '&#128064;';
  });
}

// Login forma yuborilishi
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const errorEl  = document.getElementById('loginError');
    const btn      = document.getElementById('loginBtn');
    if (errorEl) errorEl.textContent = '';
    if (btn) { btn.disabled = true; btn.textContent = 'Yuklanmoqda...'; }
    try {
      const res = await api.login(username, password);
      if (res && res.success) {
        saveSession(res.data.token, res.data.user);
        window.location.href = '/' + res.data.redirect;
      } else {
        if (errorEl) errorEl.textContent = res?.message || "Xatolik yuz berdi";
      }
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Tizimga kirish'; }
    }
  });
}

// ── PAROLNI TIKLASH ─────────────────────────────────────────────────────────

let _forgotUsername = '';

function showForgot() {
  document.getElementById('loginSection').style.display  = 'none';
  document.getElementById('forgotSection').style.display = 'block';
  showStep1();
}

function showLogin() {
  document.getElementById('loginSection').style.display  = 'block';
  document.getElementById('forgotSection').style.display = 'none';
}

function showStep1() {
  document.getElementById('step1').style.display = 'block';
  document.getElementById('step2').style.display = 'none';
  document.getElementById('step3').style.display = 'none';
}

async function checkUsername() {
  const username = document.getElementById('forgot-username').value.trim();
  const errEl = document.getElementById('step1Error');
  if (errEl) errEl.textContent = '';
  if (!username) { if (errEl) errEl.textContent = 'Username kiriting'; return; }
  const res = await api.getSecurityQuestion(username);
  if (res && res.success) {
    _forgotUsername = username;
    document.getElementById('savolText').textContent = res.data.savol;
    document.getElementById('step1').style.display = 'none';
    document.getElementById('step2').style.display = 'block';
  } else {
    if (errEl) errEl.textContent = res?.message || 'Foydalanuvchi topilmadi';
  }
}

async function checkAnswer() {
  const answer = document.getElementById('forgot-answer').value.trim();
  const errEl = document.getElementById('step2Error');
  if (errEl) errEl.textContent = '';
  if (!answer) { if (errEl) errEl.textContent = 'Javob kiriting'; return; }
  // Javobni vaqtincha saqlaymiz — keyingi qadamda ishlatiladi
  document.getElementById('_forgot_answer') && (document.getElementById('_forgot_answer').value = answer);
  // Yashirin input yo'q bo'lsa, window o'zgaruvchisi ishlatiladi
  window._forgotAnswer = answer;
  document.getElementById('step2').style.display = 'none';
  document.getElementById('step3').style.display = 'block';
}

async function resetPassword() {
  const newPwd     = document.getElementById('new-password').value;
  const confirmPwd = document.getElementById('confirm-password').value;
  const errEl = document.getElementById('step3Error');
  if (errEl) errEl.textContent = '';
  if (!newPwd || newPwd.length < 6) { if (errEl) errEl.textContent = 'Parol kamida 6 belgi bo\'lishi kerak'; return; }
  if (newPwd !== confirmPwd) { if (errEl) errEl.textContent = 'Parollar mos kelmadi'; return; }
  const res = await api.resetPassword(_forgotUsername, window._forgotAnswer, newPwd);
  if (res && res.success) {
    alert('Parol muvaffaqiyatli yangilandi! Qayta kiring.');
    showLogin();
  } else {
    if (errEl) errEl.textContent = res?.message || 'Xatolik yuz berdi';
  }
}
