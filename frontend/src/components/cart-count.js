function updateCartCount() {
  const cartCountEl = document.getElementById("cart-count");

  if (!cartCountEl) return;

  const cart = JSON.parse(localStorage.getItem("cart")) || [];

  const totalQuantity = cart.reduce(function (total, item) {
    return total + Number(item.quantity || 0);
  }, 0);

  cartCountEl.textContent = totalQuantity;

  if (totalQuantity <= 0) {
    cartCountEl.classList.add("is-hidden");
  } else {
    cartCountEl.classList.remove("is-hidden");
  }
}

document.addEventListener("DOMContentLoaded", updateCartCount);