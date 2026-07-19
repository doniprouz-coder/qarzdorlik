// app.js
// Oddiy vanilla JavaScript - Netlify Functions (/api/...) bilan ishlaydi
//
// MUHIM FARQ (avvalgi versiyadan): Netlify'da "session cookie" ishlamaydi,
// shuning uchun login qilgandan keyin "token" localStorage'da saqlanadi va
// har bir so'rovda "Authorization" header orqali yuboriladi.

let currentCustomerId = null;

// ============================================
// TOKEN BOSHQARISH (localStorage)
// ============================================

function getToken() {
  return localStorage.getItem('qarzdorlik_token');
}

function setToken(token) {
  localStorage.setItem('qarzdorlik_token', token);
}

function clearToken() {
  localStorage.removeItem('qarzdorlik_token');
}

// Har bir so'rovga token qo'shib yuboradigan yordamchi funksiya
async function apiFetch(url, options = {}) {
  const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...options, headers });

  // Agar token noto'g'ri/eskirgan bo'lsa - login sahifasiga qaytarish
  if (response.status === 401) {
    clearToken();
    showLoginScreen();
    throw new Error('Qayta kirish kerak');
  }

  return response;
}

// ============================================
// FORMATLASH
// ============================================

function formatMoney(amount) {
  return new Intl.NumberFormat('uz-UZ').format(amount) + " so'm";
}

// ============================================
// LOGIN / AUTH
// ============================================

function checkAuth() {
  if (getToken()) {
    showMainScreen();
  } else {
    showLoginScreen();
  }
}

function showLoginScreen() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('mainScreen').style.display = 'none';
}

function showMainScreen() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('mainScreen').style.display = 'block';
  loadStats();
  loadCustomers();
}

async function login() {
  const password = document.getElementById('passwordInput').value;
  const errorEl = document.getElementById('loginError');

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    const data = await res.json();

    if (res.ok && data.token) {
      setToken(data.token);
      errorEl.textContent = '';
      showMainScreen();
    } else {
      errorEl.textContent = "Parol noto'g'ri!";
    }
  } catch (error) {
    errorEl.textContent = 'Xatolik yuz berdi. Qayta urinib ko\'ring.';
  }
}

function logout() {
  clearToken();
  showLoginScreen();
}

// Enter tugmasi bilan login qilish
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();

  const passwordInput = document.getElementById('passwordInput');
  if (passwordInput) {
    passwordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') login();
    });
  }
});

// ============================================
// STATISTIKA
// ============================================

async function loadStats() {
  try {
    const res = await apiFetch('/api/stats');
    const stats = await res.json();

    document.getElementById('statCustomers').textContent = stats.totalCustomers;
    document.getElementById('statDebt').textContent = formatMoney(stats.totalDebt);
    document.getElementById('statCollected').textContent = formatMoney(stats.totalCollected);
  } catch (error) {
    console.log('Statistika yuklashda xatolik:', error.message);
  }
}

// ============================================
// MIJOZLAR
// ============================================

async function loadCustomers() {
  try {
    const res = await apiFetch('/api/customers');
    const customers = await res.json();

    const listEl = document.getElementById('customersList');

    if (customers.length === 0) {
      listEl.innerHTML = '<div class="empty-state">Hali mijozlar yo\'q. Yuqoridan qo\'shing.</div>';
      return;
    }

    listEl.innerHTML = customers.map(c => `
      <div class="customer-item" onclick="openCustomer(${c.id})">
        <div class="customer-info">
          <div class="customer-name">${escapeHtml(c.name)}</div>
          <div class="customer-phone">${c.phone ? escapeHtml(c.phone) : (c.telegram_username ? '@' + escapeHtml(c.telegram_username) : 'Telefon kiritilmagan')}</div>
        </div>
        <div class="customer-debt ${c.total_debt > 0 ? 'has-debt' : 'no-debt'}">
          ${c.total_debt > 0 ? formatMoney(c.total_debt) : '✓ Qarzi yo\'q'}
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.log('Mijozlarni yuklashda xatolik:', error.message);
  }
}

async function addCustomer() {
  const name = document.getElementById('newCustomerName').value.trim();
  const phone = document.getElementById('newCustomerPhone').value.trim();

  if (!name) {
    alert('Mijoz ismini kiriting!');
    return;
  }

  try {
    await apiFetch('/api/customers', {
      method: 'POST',
      body: JSON.stringify({ name, phone }),
    });

    document.getElementById('newCustomerName').value = '';
    document.getElementById('newCustomerPhone').value = '';

    loadCustomers();
    loadStats();
  } catch (error) {
    alert('Xatolik: ' + error.message);
  }
}

async function removeCustomer() {
  if (!confirm("Rostdan ham bu mijozni o'chirmoqchimisiz? Barcha qarz tarixi ham o'chadi.")) {
    return;
  }

  try {
    await apiFetch(`/api/customer?id=${currentCustomerId}`, { method: 'DELETE' });

    closeModal();
    loadCustomers();
    loadStats();
  } catch (error) {
    alert('Xatolik: ' + error.message);
  }
}

// ============================================
// MIJOZ MODAL / TAFSILOTLARI
// ============================================

async function openCustomer(id) {
  currentCustomerId = id;

  try {
    const res = await apiFetch(`/api/customer?id=${id}`);
    const customer = await res.json();

    document.getElementById('modalCustomerName').textContent = customer.name;
    document.getElementById('modalCustomerPhone').textContent =
      customer.phone || (customer.telegram_username ? '@' + customer.telegram_username : 'Telefon kiritilmagan');

    renderDebts(customer.debts);

    document.getElementById('customerModal').style.display = 'flex';
  } catch (error) {
    console.log('Mijoz ma\'lumotini yuklashda xatolik:', error.message);
  }
}

function closeModal() {
  document.getElementById('customerModal').style.display = 'none';
  currentCustomerId = null;
}

function renderDebts(debts) {
  const listEl = document.getElementById('debtsList');

  if (debts.length === 0) {
    listEl.innerHTML = '<div class="empty-state">Hali qarz yo\'q</div>';
    return;
  }

  listEl.innerHTML = debts.map(d => {
    const remaining = d.total_amount - d.paid_amount;
    const statusClass = d.status === 'yopilgan' ? 'paid' : (d.status === 'qisman_tolangan' ? 'partial' : '');

    return `
      <div class="debt-item ${statusClass}">
        <div class="debt-comment">${d.comment ? escapeHtml(d.comment) : 'Qarz'}</div>
        <div class="debt-amounts">
          <span>Jami: ${formatMoney(d.total_amount)}</span>
          <span>To'landi: ${formatMoney(d.paid_amount)}</span>
        </div>
        ${remaining > 0 ? `
          <div class="debt-remaining">Qoldiq: ${formatMoney(remaining)}</div>
          <div class="debt-payment-row">
            <input type="number" id="payment-${d.id}" placeholder="To'lov summasi" />
            <button onclick="makePayment(${d.id})">To'lash</button>
          </div>
        ` : '<div class="debt-remaining" style="color:#27ae60;">✓ To\'liq to\'langan</div>'}
      </div>
    `;
  }).join('');
}

// ============================================
// QARZ QO'SHISH
// ============================================

async function addDebt() {
  const amount = document.getElementById('newDebtAmount').value;
  const comment = document.getElementById('newDebtComment').value.trim();

  if (!amount || amount <= 0) {
    alert("To'g'ri summa kiriting!");
    return;
  }

  try {
    await apiFetch('/api/debts', {
      method: 'POST',
      body: JSON.stringify({
        customer_id: currentCustomerId,
        total_amount: amount,
        comment,
      }),
    });

    document.getElementById('newDebtAmount').value = '';
    document.getElementById('newDebtComment').value = '';

    openCustomer(currentCustomerId);
    loadCustomers();
    loadStats();
  } catch (error) {
    alert('Xatolik: ' + error.message);
  }
}

// ============================================
// TO'LOV QILISH
// ============================================

async function makePayment(debtId) {
  const input = document.getElementById(`payment-${debtId}`);
  const amount = input.value;

  if (!amount || amount <= 0) {
    alert("To'g'ri summa kiriting!");
    return;
  }

  try {
    await apiFetch('/api/payment', {
      method: 'POST',
      body: JSON.stringify({ debt_id: debtId, amount }),
    });

    openCustomer(currentCustomerId);
    loadCustomers();
    loadStats();
  } catch (error) {
    alert('Xatolik: ' + error.message);
  }
}

// ============================================
// XAVFSIZLIK - HTML escape
// ============================================

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
