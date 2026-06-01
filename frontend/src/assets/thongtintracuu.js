document.addEventListener("DOMContentLoaded", function () {
  initOrderLookup();
  initLocalLinks();
});

function initOrderLookup() {
  const form = document.querySelector(".order-check-form");
  const input = document.querySelector(".order-check-form input[name='order_code']");
  const params = new URLSearchParams(window.location.search);
  const orderCodeFromUrl = params.get("order_code");

  if (!form || !input) return;

  if (orderCodeFromUrl) {
    input.value = orderCodeFromUrl;
    loadOrder(orderCodeFromUrl);
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    const orderCode = input.value.trim();

    if (!orderCode) {
      showMessage("Vui lòng nhập mã đơn hàng cần tra cứu.", "warning");
      return;
    }
    window.history.pushState({}, '', '?order_code=' + encodeURIComponent(orderCode));
    loadOrder(orderCode);
  });
}

async function loadOrder(orderCode) {
  showMessage("Đang tra cứu dữ liệu...", "info"); 

  try {
    const response = await fetch(`http://localhost:3000/api/don-hang/tra-cuu/${orderCode}`);
    const result = await response.json();

    if (!result.ok) {
      showMessage(result.message || "Không tìm thấy đơn hàng.", "error");
      return;
    }

    renderOrder(result.data);
  } catch (error) {
    console.error(error);
    showMessage("Có lỗi xảy ra khi kết nối đến máy chủ. Hãy kiểm tra lại Backend.", "error");
  }
}

const statusMap = {
  'CHO_THANH_TOAN': 'Chờ thanh toán',
  'DA_THANH_TOAN': 'Đã thanh toán',
  'DANG_XU_LY': 'Đang xử lý',
  'DA_DAT_COC': 'Đã đặt cọc', 
  'DANG_GIAO_HANG': 'Đang giao hàng',
  'DA_GIAO_HANG': 'Giao hàng thành công',
  'DA_HUY': 'Đã hủy',
  'HOAN_HANG': 'Hoàn hàng'
};

function renderOrder(order) {
  const title = document.querySelector(".order-info-title");
  const box = document.querySelector(".order-info-box");

  if (!box) return;

  if (title) title.style.display = "block";
  box.classList.add("is-show");

  const statusText = statusMap[order.status] || order.status;
  
  const allowedCancelStatuses = ['CHO_THANH_TOAN', 'DANG_XU_LY', 'DA_DAT_COC', 'DA_THANH_TOAN'];
  const canCancel = allowedCancelStatuses.includes(order.status);
  
  const cancelBtnHtml = canCancel 
    ? `<button class="cancel-order-btn" type="button" style="margin-top: 20px; background: #dc3545; color: white; padding: 12px 24px; border: none; font-weight: bold; cursor: pointer; width: 100%;">HỦY ĐƠN HÀNG</button>` 
    : '';

  box.innerHTML = `
    <div class="order-left">
      <div class="order-row">
        <span class="order-label">MÃ ĐƠN HÀNG:</span>
        <span>${escapeHtml(order.orderCode)}</span>
      </div>
      <div class="order-row">
        <span class="order-label">NGÀY TẠO:</span>
        <span>${formatDate(order.createdAt)}</span>
      </div>
      <h3 class="receiver-title" style="margin-top:20px; font-weight:bold;">THÔNG TIN NGƯỜI NHẬN:</h3>
      <div class="receiver-row" style="margin-top:10px;"><span>Họ tên: </span><strong>${escapeHtml(order.customer.fullName)}</strong></div>
      <div class="receiver-row"><span>Số điện thoại: </span><strong>${escapeHtml(order.customer.phone)}</strong></div>
      <div class="receiver-row"><span>Địa chỉ: </span><strong>${escapeHtml(order.customer.address)}</strong></div>
      <div class="receiver-row"><span>Ghi chú: </span><strong>${escapeHtml(order.customer.note || "Không")}</strong></div>
    </div>

    <div class="order-right">
      <div class="status-row" style="margin-bottom: 20px;">
        <span class="order-label">TÌNH TRẠNG:</span>
        <span class="status-badge" style="background:${order.status === 'DA_HUY' ? '#dc3545' : '#28a745'}; color:#fff; padding: 4px 10px; border-radius: 4px; font-weight:bold; float:right;">${statusText}</span>
      </div>
      <div class="detail-title" style="font-weight:bold; margin-bottom: 15px;">CHI TIẾT ĐƠN HÀNG:</div>
      ${renderProducts(order.items)}
      
      <div style="border-top: 1px solid #ddd; padding-top: 15px; margin-top: 15px;">
        <div class="summary-row" style="display:flex; justify-content:space-between; margin-bottom:10px;"><span>Tạm tính:</span><strong>${formatMoney(order.subtotal)}</strong></div>
        <div class="summary-row" style="display:flex; justify-content:space-between; margin-bottom:10px;"><span>Phí vận chuyển:</span><strong>${formatMoney(order.shippingFee)}</strong></div>
        <div class="summary-row" style="display:flex; justify-content:space-between; margin-bottom:10px;"><span>Phương thức thanh toán:</span><strong>${order.paymentMethod === 'TIEN_MAT' ? 'Tiền mặt (COD)' : 'Chuyển khoản'}</strong></div>
        <div class="summary-row total-row" style="display:flex; justify-content:space-between; margin-bottom:10px; font-size: 18px; color: red;"><span>Tổng thu:</span><strong>${formatMoney(order.total)}</strong></div>
      </div>
      ${cancelBtnHtml}
    </div>
  `;

  const cancelBtn = document.querySelector(".cancel-order-btn");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", function () {
      localStorage.setItem("cancelOrderCode", order.orderCode);
      window.location.href = "huydonhang.html"; 
    });
  }
}

function renderProducts(items) {
  return items.map(item => `
    <div class="product-detail-card" style="display:flex; gap:15px; margin-bottom: 15px; border: 1px solid #eee; padding: 10px; border-radius: 8px;">
      <div class="product-thumb" style="width: 80px;"><img style="width:100%;" src="${escapeAttribute(item.image)}" alt="Product"></div>
      <div class="product-info" style="flex:1;">
        <h4 style="margin: 0 0 10px 0; font-size: 15px;">${escapeHtml(item.name)}</h4>
        ${item.color ? `<div style="font-size: 13px; margin-bottom: 5px;"><span>Màu sắc: </span><strong>${escapeHtml(item.color)}</strong></div>` : ''}
        ${item.size ? `<div style="font-size: 13px; margin-bottom: 5px;"><span>Kích cỡ: </span><strong>${escapeHtml(item.size)}</strong></div>` : ''}
        <div style="font-size: 13px; margin-bottom: 5px;"><span>Đơn giá: </span><strong>${formatMoney(item.price)}</strong></div>
        <div style="font-size: 13px;"><span>Số lượng: </span><strong>${item.quantity}</strong></div>
      </div>
    </div>
  `).join("");
}

function showMessage(message, type) {
  const title = document.querySelector(".order-info-title");
  const box = document.querySelector(".order-info-box");
  
  if (title) title.style.display = "none";
  if (box) {
    box.classList.add("is-show");
    let color = type === "error" ? "red" : (type === "info" ? "#00b9cc" : "#333");
    box.innerHTML = `<div style="text-align:center; padding: 50px 20px; font-size: 18px; color: ${color}; width: 100%; font-weight: 500;">${message}</div>`;
  }
}

function formatMoney(number) {
  return Number(number || 0).toLocaleString("vi-VN") + "đ";
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleString("vi-VN");
}

function escapeHtml(value) { return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function escapeAttribute(value) { return escapeHtml(value); }

function initLocalLinks() {
  document.querySelectorAll("a[href*='babolat.com.vn']").forEach(link => {
    link.addEventListener("click", e => { e.preventDefault(); window.location.href = "trangchu.html"; });
  });
}