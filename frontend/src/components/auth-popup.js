(function () {
  'use strict';

  function getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem('currentUser'));
    } catch (error) {
      return null;
    }
  }

  function safeText(value) {
    return value === null || value === undefined ? '' : String(value);
  }

  function findAccountLink() {
    return (
      document.querySelector('a[aria-label="Tài khoản"]') ||
      document.querySelector('.icon-account')?.closest('a') ||
      document.querySelector('a[href="taikhoan.html"]') ||
      document.querySelector('a[href="tai-khoan.html"]')
    );
  }

  function createPopup(accountLink) {
    const oldPopup = document.querySelector('.auth-hover-popup');

    if (oldPopup) {
      oldPopup.remove();
    }

    const user = getCurrentUser();
    const isLoggedIn = Boolean(user && user.id);

    const displayName =
      user?.fullname ||
      user?.name ||
      user?.phone ||
      'Người dùng';

    const popup = document.createElement('div');
    popup.className = 'auth-hover-popup';

    if (isLoggedIn) {
      popup.innerHTML = `
        <div class="auth-popup-title">Tài khoản</div>
        <div class="auth-popup-name">${safeText(displayName)}</div>
        <button type="button" class="auth-popup-btn auth-popup-logout" id="auth-popup-logout">
          Đăng xuất
        </button>
      `;
    } else {
      popup.innerHTML = `
        <div class="auth-popup-title">Tài khoản</div>
        <div class="auth-popup-name">Bạn chưa đăng nhập</div>
        <button type="button" class="auth-popup-btn auth-popup-login" id="auth-popup-login">
          Đăng nhập
        </button>
      `;
    }

    accountLink.classList.add('auth-account-wrap');
    accountLink.appendChild(popup);

    const loginBtn = popup.querySelector('#auth-popup-login');
    const logoutBtn = popup.querySelector('#auth-popup-logout');

    if (loginBtn) {
      loginBtn.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        window.location.href = 'dangnhap.html';
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();

        localStorage.removeItem('currentUser');

        alert('Đã đăng xuất');
        window.location.href = 'trangchu.html';
      });
    }

    accountLink.addEventListener('click', function (event) {
      event.preventDefault();

      if (getCurrentUser()) {
        window.location.href = 'taikhoan.html';
      } else {
        window.location.href = 'dangnhap.html';
      }
    });
  }

  function initAuthPopup() {
    const accountLink = findAccountLink();

    if (!accountLink) {
      return;
    }

    createPopup(accountLink);
  }

  document.addEventListener('DOMContentLoaded', initAuthPopup);
})();