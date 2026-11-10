function showToast(message, type = 'default') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = 'toast show';
  if (type === 'success') toast.classList.add('success');
  if (type === 'error') toast.classList.add('error');
  setTimeout(() => {
    toast.className = 'toast';
  }, 2800);
}

function showTab(tab) {
  const loginForm = document.getElementById('form-login');
  const registerForm = document.getElementById('form-register');
  const loginTab = document.getElementById('tab-login');
  const registerTab = document.getElementById('tab-register');

  if (tab === 'login') {
    if (loginForm) loginForm.classList.remove('hidden');
    if (registerForm) registerForm.classList.add('hidden');
    if (loginTab) loginTab.classList.add('active');
    if (registerTab) registerTab.classList.remove('active');
  } else {
    if (loginForm) loginForm.classList.add('hidden');
    if (registerForm) registerForm.classList.remove('hidden');
    if (loginTab) loginTab.classList.remove('active');
    if (registerTab) registerTab.classList.add('active');
  }
}
const showAuthTab = showTab;

function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isCurrentlyPassword = (input.type === 'password');
  input.type = isCurrentlyPassword ? 'text' : 'password';

  const button = btn || (typeof event !== 'undefined' && event ? event.currentTarget : null) || (input.parentElement ? input.parentElement.querySelector('.password-toggle') : null);
  if (button) {
    const img = button.querySelector('img') || (button.tagName === 'IMG' ? button : null);
    if (img) {
      img.src = isCurrentlyPassword ? 'Icon/show.png' : 'Icon/invisible.png';
      img.alt = isCurrentlyPassword ? 'Sembunyikan password' : 'Lihat password';
    }
  }
}

function login(event) {
  if (event) event.preventDefault();
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');

  const email = emailInput ? emailInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value : '';

  if (!email || !password) {
    showToast('Harap isi email dan password.', 'error');
    return;
  }

  const isTargetAdmin = (email.toLowerCase() === 'admin123' || email.toLowerCase() === 'admin' || email.toLowerCase() === 'tes123@');

  if (isTargetAdmin) {
    const validPasswords = ['admin 123', 'admin123', 'Tes123'];
    if (!validPasswords.includes(password)) {
      showToast('Password Admin salah! Gunakan: admin 123', 'error');
      return;
    }
  }

  const isTesAja = (email.toLowerCase() === 'tesaja');
  if (isTesAja) {
    if (password !== 'Tes123') {
      showToast('Password salah! Gunakan: Tes123', 'error');
      return;
    }
  }

  const users = JSON.parse(localStorage.getItem('ems_users') || '[]');
  const registeredUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (registeredUser && registeredUser.password && !isTargetAdmin && !isTesAja) {
    if (registeredUser.password !== password) {
      showToast('Password akun salah!', 'error');
      return;
    }
    if (registeredUser.active === false) {
      showToast('Akun Anda telah dinonaktifkan oleh Admin.', 'error');
      return;
    }
  }

  const isAdmin = isTargetAdmin || email.toLowerCase().includes('admin');
  const displayName = isAdmin
    ? 'Admin Utama'
    : (isTesAja ? 'Tes Aja' : (registeredUser ? registeredUser.name : (email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1))));

  const user = {
    name: displayName,
    email: email,
    role: isAdmin ? 'admin' : 'customer'
  };

  localStorage.setItem('ems_user', JSON.stringify(user));

  if (!isAdmin) {
    if (!users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      users.push({
        id: Date.now().toString(),
        name: displayName,
        email: email,
        phone: '-',
        password: password,
        role: 'customer',
        active: true,
        registeredAt: new Date().toISOString()
      });
      localStorage.setItem('ems_users', JSON.stringify(users));
    }
  }

  showToast(isAdmin ? 'Berhasil masuk ke Dashboard Admin!' : `Selamat datang, ${user.name}!`, 'success');

  setTimeout(() => {
    window.location.href = isAdmin ? 'admin.html' : 'home.html';
  }, 900);
}

function loginWithGoogle() {
  const googleUser = {
    name: 'Pengguna Google',
    email: 'user.elokmekarsari@gmail.com',
    role: 'customer',
    provider: 'google'
  };

  localStorage.setItem('ems_user', JSON.stringify(googleUser));

  const users = JSON.parse(localStorage.getItem('ems_users') || '[]');
  if (!users.some(u => u.email === googleUser.email)) {
    users.push({
      id: Date.now().toString(),
      name: googleUser.name,
      email: googleUser.email,
      phone: '-',
      role: 'customer',
      active: true,
      registeredAt: new Date().toISOString()
    });
    localStorage.setItem('ems_users', JSON.stringify(users));
  }

  showToast(`Selamat datang, ${googleUser.name}!`, 'success');

  setTimeout(() => {
    window.location.href = 'home.html';
  }, 900);
}

function register(event) {
  if (event) event.preventDefault();

  const nameInput = document.getElementById('reg-name');
  const emailInput = document.getElementById('reg-email');
  const phoneInput = document.getElementById('reg-phone');
  const passwordInput = document.getElementById('reg-password');
  const confirmInput = document.getElementById('reg-confirm');

  const name = nameInput ? nameInput.value.trim() : '';
  const email = emailInput ? emailInput.value.trim() : '';
  const phone = phoneInput ? phoneInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value : '';
  const confirmPassword = confirmInput ? confirmInput.value : '';

  if (!name || !email || !password) {
    showToast('Harap lengkapi semua kolom pendaftaran.', 'error');
    return;
  }

  if (password.length < 6) {
    showToast('Password minimal 6 karakter.', 'error');
    return;
  }

  if (password !== confirmPassword) {
    showToast('Konfirmasi password tidak cocok.', 'error');
    return;
  }

  const isAdmin = email.toLowerCase().includes('admin');
  const newUser = {
    id: Date.now().toString(),
    name,
    email,
    phone,
    password,
    role: isAdmin ? 'admin' : 'customer',
    active: true,
    registeredAt: new Date().toISOString()
  };

  const users = JSON.parse(localStorage.getItem('ems_users') || '[]');
  if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    showToast('Email sudah terdaftar. Silakan login.', 'error');
    return;
  }
  users.push(newUser);
  localStorage.setItem('ems_users', JSON.stringify(users));

  showToast('Pendaftaran berhasil! Silakan login dengan akun Anda.', 'success');
  setTimeout(() => {
    window.location.href = 'index.html?tab=login';
  }, 1200);
}

document.addEventListener('DOMContentLoaded', () => {
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');

  if (tabLogin) {
    tabLogin.addEventListener('click', () => showTab('login'));
  }
  if (tabRegister) {
    tabRegister.addEventListener('click', () => showTab('register'));
  }

  const params = new URLSearchParams(window.location.search);
  if (params.get('tab') === 'login') {
    showTab('login');
  }
});
