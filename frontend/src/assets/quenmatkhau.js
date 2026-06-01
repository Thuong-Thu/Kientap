(function () {
  'use strict';

  var steps = Array.from(document.querySelectorAll('.forgot-step'));
  var phoneForm = document.getElementById('phone-form');
  var passwordForm = document.getElementById('password-form');
  var successOverlay = document.getElementById('success-overlay');
  var successClose = document.getElementById('success-close');
  var successContinue = document.getElementById('success-continue');
  var inputs = Array.from(document.querySelectorAll('.otp-inputs input'));
  var btnVerify = document.getElementById('btn-verify');
  var btnResend = document.getElementById('btn-resend');
  var otpExpiryText = document.getElementById('otp-expiry-text');

  var userPhone = '';
  var verifiedOtp = '';
  
  var resendTimer = null;
  var expiryTimer = null;
  var RESEND_COOLDOWN = 60; // 60 giây chờ gửi lại mã
  var EXPIRY_DURATION = 180; // 3 phút = 180 giây mã hết hạn

  var API_BASE = 'http://localhost:3000/api/forgot-password';

  function showStep(name) {
    steps.forEach(function (step) {
      var active = step.getAttribute('data-step') === name;
      step.classList.toggle('is-active', active);
      step.setAttribute('aria-hidden', active ? 'false' : 'true');
    });

    if (name === 'otp' && inputs[0]) {
      inputs.forEach(inp => inp.value = ''); // Xóa input cũ nếu có
      inputs[0].focus();
    }
    if (name === 'password') {
      var passwordInput = document.getElementById('new-password');
      if (passwordInput) passwordInput.focus();
    }
  }

  function showSuccess() {
    if (!successOverlay) return;
    successOverlay.classList.add('is-visible');
    successOverlay.setAttribute('aria-hidden', 'false');
    if (successContinue) successContinue.focus();
  }

  function hideSuccess() {
    if (!successOverlay) return;
    successOverlay.classList.remove('is-visible');
    successOverlay.setAttribute('aria-hidden', 'true');
    window.location.href = 'dangnhap.html'; // Đổi mật khẩu xong tự động chuyển về đăng nhập
  }

  inputs.forEach(function (inp, i) {
    inp.addEventListener('keypress', function (e) {
      if (!/[0-9]/.test(e.key)) e.preventDefault();
    });

    inp.addEventListener('input', function () {
      inp.value = inp.value.replace(/\D/g, '').slice(-1);
      if (inp.value && i < inputs.length - 1) inputs[i + 1].focus();
    });

    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Backspace' && !inp.value && i > 0) inputs[i - 1].focus();
    });

    inp.addEventListener('paste', function (e) {
      e.preventDefault();
      var pasted = (e.clipboardData || window.clipboardData)
        .getData('text').replace(/\D/g, '').slice(0, inputs.length);
      pasted.split('').forEach(function (char, j) {
        if (inputs[i + j]) inputs[i + j].value = char;
      });
      var nextIndex = Math.min(i + pasted.length, inputs.length - 1);
      inputs[nextIndex].focus();
    });
  });

  function startTimers() {
    clearInterval(resendTimer);
    clearInterval(expiryTimer);

    var resendRemaining = RESEND_COOLDOWN;
    btnResend.disabled = true;
    btnResend.textContent = 'Gửi lại sau ' + resendRemaining + 's';
    
    resendTimer = setInterval(function () {
      resendRemaining -= 1;
      btnResend.textContent = 'Gửi lại sau ' + resendRemaining + 's';
      if (resendRemaining <= 0) {
        clearInterval(resendTimer);
        btnResend.disabled = false;
        btnResend.textContent = 'Gửi mã mới';
      }
    }, 1000);

    var expiryRemaining = EXPIRY_DURATION;
    if (otpExpiryText) otpExpiryText.textContent = `Mã hết hạn trong: 03:00`;
    
    expiryTimer = setInterval(function () {
      expiryRemaining -= 1;
      var minutes = Math.floor(expiryRemaining / 60);
      var seconds = expiryRemaining % 60;
      
      if (otpExpiryText) {
        otpExpiryText.textContent = `Mã hết hạn trong: 0${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
      }

      if (expiryRemaining <= 0) {
        clearInterval(expiryTimer);
        if (otpExpiryText) {
          otpExpiryText.textContent = 'Mã OTP đã hết hạn. Vui lòng nhận mã mới.';
        }
        inputs.forEach(inp => inp.disabled = true); // Vô hiệu hóa ô nhập khi hết hạn
      } else {
        inputs.forEach(inp => inp.disabled = false);
      }
    }, 1000);
  }

  if (phoneForm) {
    phoneForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      var phoneInput = phoneForm.elements.phone;
      var phone = phoneInput.value.replace(/\s/g, '');

      if (phone.length < 9) {
        alert('Vui lòng nhập số điện thoại hợp lệ.');
        return;
      }

      var btn = phoneForm.querySelector('button');
      btn.disabled = true;
      btn.textContent = 'Đang kiểm tra...';

      try {
        const response = await fetch(`${API_BASE}/request-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: phone })
        });
        const data = await response.json();

        if (data.success) {
          userPhone = phone; // Lưu SĐT vào bộ nhớ tạm
          showStep('otp');
          startTimers();
        } else {
          alert(data.message || 'Lỗi gửi số điện thoại!');
        }
      } catch (err) {
        alert('Lỗi kết nối máy chủ!');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Đặt lại mật khẩu';
      }
    });
  }

  if (btnResend) {
    btnResend.addEventListener('click', async function () {
      if (!userPhone) return;
      btnResend.disabled = true;
      btnResend.textContent = 'Đang gửi...';

      try {
        const response = await fetch(`${API_BASE}/request-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: userPhone })
        });
        const data = await response.json();

        if (data.success) {
          alert('Đã gửi mã OTP mới!');
          inputs.forEach(inp => { inp.value = ''; inp.disabled = false; }); // Mở lại input
          inputs[0].focus();
          startTimers(); // Reset đồng hồ
        } else {
          alert(data.message);
          btnResend.disabled = false;
          btnResend.textContent = 'Gửi mã mới';
        }
      } catch (err) {
        alert('Lỗi kết nối máy chủ!');
        btnResend.disabled = false;
        btnResend.textContent = 'Gửi mã mới';
      }
    });
  }

  if (btnVerify) {
    btnVerify.addEventListener('click', async function () {
      var code = inputs.map(function (inp) { return inp.value; }).join('');

      if (code.length < 6) {
        alert('Vui lòng nhập đủ 6 chữ số.');
        return;
      }

      btnVerify.disabled = true;
      btnVerify.textContent = 'Đang kiểm tra...';

      try {
        const response = await fetch(`${API_BASE}/verify-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: userPhone, otp: code })
        });
        const data = await response.json();

        if (data.success) {
          verifiedOtp = code; // Lưu mã vào biến tạm
          clearInterval(expiryTimer);
          clearInterval(resendTimer);
          showStep('password');
        } else {
          alert(data.message);
          inputs.forEach(inp => inp.value = ''); // Nhập sai xóa đi nhập lại
          inputs[0].focus();
        }
      } catch (err) {
        alert('Lỗi kết nối máy chủ!');
      } finally {
        btnVerify.disabled = false;
        btnVerify.textContent = 'Xác minh';
      }
    });
  }

  if (passwordForm) {
    passwordForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      var password = passwordForm.elements['new-password'].value;
      var confirmPassword = passwordForm.elements['confirm-password'].value;

      if (password.length < 6) {
        alert('Mật khẩu mới cần có ít nhất 6 ký tự.');
        return;
      }

      if (password !== confirmPassword) {
        alert('Mật khẩu nhập lại không khớp.');
        return;
      }

      var btn = passwordForm.querySelector('button');
      btn.disabled = true;
      btn.textContent = 'Đang cập nhật...';

      try {
        const response = await fetch(`${API_BASE}/reset`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            phone: userPhone, 
            otp: verifiedOtp, 
            newPassword: password 
          })
        });
        const data = await response.json();

        if (data.success) {
          showSuccess(); 
        } else {
          alert(data.message || 'Có lỗi xảy ra, vui lòng thử lại.');
          if (data.message.includes('hết hạn')) {
             window.location.reload(); 
          }
        }
      } catch (err) {
        alert('Lỗi kết nối máy chủ!');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Xác nhận';
      }
    });
  }

  if (successClose) successClose.addEventListener('click', hideSuccess);
  if (successContinue) successContinue.addEventListener('click', hideSuccess);
  if (successOverlay) {
    successOverlay.addEventListener('click', function (e) {
      if (e.target === successOverlay) hideSuccess();
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') hideSuccess();
  });

})();