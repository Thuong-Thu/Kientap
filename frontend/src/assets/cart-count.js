function updateCartCount() {
  const cartCountEl = document.getElementById("cart-count");
  if (!cartCountEl) return;

  // Đọc đúng key mà sanpham.js và giohang.js đang dùng
  const cart = JSON.parse(localStorage.getItem("guestCartItems")) || [];

  const totalQuantity = cart.reduce(function (total, item) {
    return total + Number(item.soLuong || item.quantity || 0);
  }, 0);

  cartCountEl.textContent = totalQuantity;

  if (totalQuantity <= 0) {
    cartCountEl.classList.add("is-hidden");
  } else {
    cartCountEl.classList.remove("is-hidden");
  }
}

document.addEventListener("DOMContentLoaded", updateCartCount);

// Lắng nghe event từ sanpham.js khi thêm vào giỏ thành công
document.addEventListener("cart:updated", updateCartCount);
