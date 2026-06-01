(function () {
  'use strict';

  const API_BASE = 'http://localhost:3000';

  const loginForm = document.querySelector('.login-form');

  if (!loginForm) {
    console.error('Không tìm thấy form .login-form trong dangnhap.html');
    return;
  }

  const phoneInput = document.getElementById('phone');
  const passwordInput = document.getElementById('password');

  function showError(input, message) {
    removeError(input);

    input.classList.add('input-error');

    const error = document.createElement('p');
    error.className = 'form-error';
    error.textContent = message;

    input.insertAdjacentElement('afterend', error);
  }

  function removeError(input) {
    if (!input) return;

    input.classList.remove('input-error');

    const next = input.nextElementSibling;

    if (next && next.classList.contains('form-error')) {
      next.remove();
    }
  }

  function clearAllErrors() {
    removeError(phoneInput);
    removeError(passwordInput);
  }

  function isValidPhone(phone) {
    return /^0\d{9}$/.test(phone);
  }

  function normalizeUser(user) {
    if (!user) return null;

    return {
      id: user.id || user.userId || user.USER_ID,
      fullname: user.fullname || user.hoTen || user.HO_TEN || user.name || '',
      phone: user.phone || user.sdt || user.SDT || '',
      email: user.email || user.EMAIL || '',
      role: user.role || user.vaiTro || user.VAI_TRO || 'KHACH_HANG'
    };
  }

  loginForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    console.log('Đã bấm nút đăng nhập');

    clearAllErrors();

    const phone = phoneInput.value.trim();
    const password = passwordInput.value.trim();

    let isValid = true;

    if (phone === '') {
      showError(phoneInput, 'Vui lòng nhập số điện thoại.');
      isValid = false;
    } else if (!isValidPhone(phone)) {
      showError(phoneInput, 'Số điện thoại phải bắt đầu bằng 0 và có 10 chữ số.');
      isValid = false;
    }

    if (password === '') {
      showError(passwordInput, 'Vui lòng nhập mật khẩu.');
      isValid = false;
    }

    if (!isValid) return;

    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone: phone,
          password: password
        })
      });

      const data = await response.json();

      console.log('Kết quả API /login:', data);

      const loginFailed =
        !response.ok ||
        data.success === false ||
        data.ok === false;

      if (loginFailed) {
        showError(passwordInput, data.message || 'Đăng nhập thất bại');
        return;
      }

      const user = normalizeUser(data.user || data.data);

      if (!user || !user.id) {
        alert('Đăng nhập thành công nhưng backend chưa trả về USER_ID. Hãy kiểm tra API /login.');
        console.error('User backend trả về không hợp lệ:', data);
        return;
      }

      localStorage.setItem('currentUser', JSON.stringify(user));

      alert('Đăng nhập thành công!');
      window.location.href = 'trangchu.html';

    } catch (error) {
      console.error('Lỗi đăng nhập:', error);
      alert('Không thể kết nối server. Hãy kiểm tra backend Node.js đã chạy chưa.');
    }
  });
})();