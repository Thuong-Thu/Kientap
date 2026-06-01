document.addEventListener("DOMContentLoaded", function () {
  const API_BASE = "http://localhost:3000/api/don-hang";
  const currentUrl = window.location.href;

  if (currentUrl.includes("huydonhang.html")) {
    initRequestCancelPage(API_BASE);
  } else if (currentUrl.includes("huy-don-hang.html")) {
    initOtpCancelPage(API_BASE);
  } else if (currentUrl.includes("huythanhcong.html")) {
    initCancelSuccessPage();
  }
});


const TRANG_THAI_MAP = {
  'CHO_THANH_TOAN'  : { label: 'Chờ thanh toán',       color: '#f59e0b' },
  'DANG_XU_LY'      : { label: 'Đang xử lý',            color: '#3b82f6' },
  'DA_DAT_COC'      : { label: 'Đã đặt cọc',            color: '#8b5cf6' },
  'DA_THANH_TOAN'   : { label: 'Thanh toán thành công', color: '#10b981' },
  'DANG_GIAO'       : { label: 'Đang giao hàng',        color: '#06b6d4' },
  'DA_GIAO'         : { label: 'Đã giao hàng',          color: '#22c55e' },
  'DA_HUY'          : { label: 'Đã hủy',                color: '#ef4444' },
};

function applyStatus(statusEl, trangThaiRaw) {
  const info = TRANG_THAI_MAP[trangThaiRaw];
  if (info) {
    statusEl.textContent = info.label;
    statusEl.style.background = info.color;
    statusEl.style.color = '#fff';
  } else {
    statusEl.textContent = trangThaiRaw || 'Không xác định';
  }
}

function initRequestCancelPage(API_BASE) {
  const cancelForm   = document.querySelector(".cancel-form");
  const phoneInput   = document.getElementById("cancel-phone");
  const orderCodeEl  = document.getElementById("cancel-order-code");
  const statusEl     = document.getElementById("cancel-order-status");

  const savedCode = localStorage.getItem("cancelOrderCode");

  if (orderCodeEl) {
    orderCodeEl.textContent = savedCode || '—';
  }

  if (savedCode && statusEl) {
    fetch(`http://localhost:3000/api/don-hang/tra-cuu/${savedCode}`)
      .then(res => res.json())
      .then(data => {
        if (data.ok && data.data) {
          applyStatus(statusEl, data.data.status);
        } else {
          statusEl.textContent = 'Không tìm thấy';
          statusEl.style.background = '#999';
          statusEl.style.color = '#fff';
        }
      })
      .catch(() => {
        statusEl.textContent = 'Lỗi kết nối';
        statusEl.style.background = '#999';
        statusEl.style.color = '#fff';
      });
  } else if (statusEl) {
    statusEl.textContent = '—';
  }

  if (!cancelForm || !phoneInput) return;

  cancelForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    const phone = phoneInput.value.trim();

    if (!/^0\d{9}$/.test(phone)) {
      alert("Số điện thoại không hợp lệ.");
      return;
    }

    const submitBtn = cancelForm.querySelector("button");
    submitBtn.disabled = true;
    submitBtn.textContent = "Đang kiểm tra...";

    try {
      const response = await fetch(`${API_BASE}/yeu-cau-huy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maDonHang: savedCode, phone: phone })
      });
      const data = await response.json();

      if (data.ok) {
        localStorage.setItem("cancelPhone", phone);
        window.location.href = "huy-don-hang.html";
      } else {
        alert(data.message);
      }
    } catch (error) {
      alert("Lỗi kết nối máy chủ");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Nhận mã";
    }
  });
}


function initOtpCancelPage(API_BASE) {
  const inputs      = document.querySelectorAll(".otp-inputs input");
  const btnVerify   = document.getElementById("btn-verify");
  const btnResend   = document.getElementById("btn-resend");
  const countdownEl = document.getElementById("otp-countdown");

  const maDonHang = localStorage.getItem("cancelOrderCode");
  const phone     = localStorage.getItem("cancelPhone");

  if (!maDonHang || !phone) {
    alert("Không tìm thấy thông tin đơn hàng.");
    window.location.href = "tracuu.html";
    return;
  }

  inputs.forEach((inp, i) => {
    inp.addEventListener("input", function () {
      inp.value = inp.value.replace(/\D/g, "").slice(-1);
      if (inp.value && i < inputs.length - 1) inputs[i + 1].focus();
    });
    inp.addEventListener("keydown", function (e) {
      if (e.key === "Backspace" && !inp.value && i > 0) inputs[i - 1].focus();
    });
  });

  if (btnVerify) {
    btnVerify.addEventListener("click", async function () {
      const code = Array.from(inputs).map(inp => inp.value).join("");
      if (code.length < 6) {
        alert("Vui lòng nhập đủ 6 số.");
        return;
      }

      btnVerify.disabled = true;
      btnVerify.textContent = "Đang xác minh...";

      try {
        const response = await fetch(`${API_BASE}/xac-nhan-huy`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ maDonHang: maDonHang, otp: code })
        });
        const data = await response.json();

        if (data.ok) {
          window.location.href = "huythanhcong.html";
        } else {
          alert(data.message);
        }
      } catch (error) {
        alert("Lỗi kết nối máy chủ");
      } finally {
        btnVerify.disabled = false;
        btnVerify.textContent = "Xác minh";
      }
    });
  }

  if (btnResend) {
    btnResend.addEventListener("click", async function () {
      btnResend.disabled = true;
      try {
        const response = await fetch(`${API_BASE}/yeu-cau-huy`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ maDonHang: maDonHang, phone: phone })
        });
        const data = await response.json();

        if (data.ok) {
          alert("Mã OTP mới đã được gửi!");
          startCooldown(btnResend, countdownEl);
        } else {
          alert(data.message);
          btnResend.disabled = false;
        }
      } catch (e) {
        alert("Lỗi server");
        btnResend.disabled = false;
      }
    });
  }

  startCooldown(btnResend, countdownEl);
}

function startCooldown(btnResend, countdownEl) {
  let remaining = 60;

  if (btnResend) {
    btnResend.disabled = true;
    btnResend.textContent = "Gửi mã mới";
  }

  if (countdownEl) {
    countdownEl.classList.remove("is-expired");
    countdownEl.innerHTML = `Mã hết hạn sau <span>${remaining}s</span>`;
  }

  const timer = setInterval(() => {
    remaining -= 1;

    if (countdownEl) {
      if (remaining > 0) {
        countdownEl.innerHTML = `Mã hết hạn sau <span>${remaining}s</span>`;
      } else {
        countdownEl.classList.add("is-expired");
        countdownEl.textContent = "Mã đã hết hạn. Vui lòng gửi lại mã mới.";
      }
    }

    if (remaining <= 0) {
      clearInterval(timer);
      if (btnResend) {
        btnResend.disabled = false;
        btnResend.textContent = "Gửi mã mới";
      }
    }
  }, 1000);
}

function initCancelSuccessPage() {
  const orderCodeEl    = document.getElementById("cancel-order-code");
  const savedOrderCode = localStorage.getItem("cancelOrderCode");

  if (orderCodeEl && savedOrderCode) {
    orderCodeEl.textContent = savedOrderCode;
  }

  // Dọn dẹp localStorage sau khi hoàn tất
  localStorage.removeItem("cancelOrderCode");
  localStorage.removeItem("cancelPhone");
}
