document.addEventListener("DOMContentLoaded", function () {
  initLookupRedirect();
  initLocalLinks();
});

function initLookupRedirect() {
  const form = document.querySelector(".order-lookup-form");
  const input = document.querySelector(".order-lookup-form input[name='order_code']");
  const errorBox = document.querySelector(".order-lookup-error");

  if (!form || !input) return;

  form.setAttribute("action", "#");

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    const orderCode = input.value.trim();

    if (!orderCode) {
      if (errorBox) {
        errorBox.style.display = "block";
        errorBox.textContent = "Vui lòng nhập mã đơn hàng cần tra cứu.";
      } else {
        alert("Vui lòng nhập mã đơn hàng cần tra cứu.");
      }

      return;
    }

    window.location.href =
      "thongtintracuu.html?order_code=" + encodeURIComponent(orderCode);
  });
}

function initLocalLinks() {
  document.querySelectorAll("a[href*='babolat.com.vn']").forEach(function (link) {
    link.addEventListener("click", function (event) {
      event.preventDefault();

      if (link.href.includes("gio-hang")) {
        window.location.href = "gio-hang.html";
        return;
      }

      window.location.href = "trangchu.html";
    });
  });

  document.querySelectorAll(".product--carousel li.product").forEach(function (product) {
    const link = product.querySelector("a");
    if (link) {
      link.setAttribute("href", "sanpham.html");
    }

    product.addEventListener("click", function (event) {
      event.preventDefault();

      const name =
        product.querySelector(".woocommerce-loop-product__title")?.textContent.trim() ||
        "Sản phẩm";

      const price =
        product.querySelector(".price")?.textContent.trim().replace(/\s+/g, " ") ||
        "0đ";

      const image =
        product.querySelector(".wsha-images img")?.getAttribute("src") ||
        "";

      localStorage.setItem(
        "selectedProduct",
        JSON.stringify({
          name: name,
          price: price,
          image: image,
          color: "Xám | Xanh lá mạ",
          size: "2"
        })
      );

      window.location.href = "sanpham.html";
    });
  });
}