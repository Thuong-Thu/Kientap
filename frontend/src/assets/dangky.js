(function () {

  'use strict';

  const registerForm = document.querySelector('.register-form');

  if (!registerForm) return;

  const fullnameInput = document.getElementById('fullname');
  const phoneInput = document.getElementById('phone');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirm-password');

  function showError(input, message) {

    removeError(input);

    input.classList.add('input-error');

    const error = document.createElement('p');

    error.className = 'form-error';
    error.textContent = message;

    input.insertAdjacentElement('afterend', error);

  }

  function removeError(input) {

    input.classList.remove('input-error');

    const next = input.nextElementSibling;

    if (next && next.classList.contains('form-error')) {
      next.remove();
    }

  }

  function clearAllErrors() {

    const inputs = registerForm.querySelectorAll('input');

    inputs.forEach(function (input) {
      removeError(input);
    });

  }

  function isValidPhone(phone) {

    return /^0\d{9}$/.test(phone);

  }

  function isValidEmail(email) {

    if (email === '') return true;

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  }

  registerForm.addEventListener('submit', async function (e) {

    e.preventDefault();

    clearAllErrors();

    const fullname = fullnameInput.value.trim();
    const phone = phoneInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    const confirmPassword = confirmPasswordInput.value.trim();

    let isValid = true;

    if (fullname === '') {

      showError(fullnameInput, 'Vui lòng nhập họ tên.');
      isValid = false;

    }

    if (phone === '') {

      showError(phoneInput, 'Vui lòng nhập số điện thoại.');
      isValid = false;

    } else if (!isValidPhone(phone)) {

      showError(
        phoneInput,
        'Số điện thoại phải bắt đầu bằng 0 và có 10 chữ số.'
      );

      isValid = false;

    }

    if (!isValidEmail(email)) {

      showError(emailInput, 'Email không đúng định dạng.');
      isValid = false;

    }

    if (password === '') {

      showError(passwordInput, 'Vui lòng nhập mật khẩu.');
      isValid = false;

    } else if (password.length < 6) {

      showError(
        passwordInput,
        'Mật khẩu phải có ít nhất 6 ký tự.'
      );

      isValid = false;

    }

    if (confirmPassword !== password) {

      showError(
        confirmPasswordInput,
        'Mật khẩu nhập lại không khớp.'
      );

      isValid = false;

    }

    if (!isValid) return;

    try {

      const response = await fetch('http://localhost:3000/register', {

        method: 'POST',

        headers: {
          'Content-Type': 'application/json'
        },

        body: JSON.stringify({
          fullname,
          phone,
          email,
          password
        })

      });

      const data = await response.json();

      if (!response.ok) {

        showError(phoneInput, data.message);
        return;

      }

      alert('Đăng ký thành công!');

      window.location.href = 'dangnhap.html';

    } catch (err) {

      console.log(err);

      alert('Không thể kết nối server');

    }

  });

})();