document.addEventListener("DOMContentLoaded", function () {
  const productCards = document.querySelectorAll(".product-card");

  if (!productCards.length) return;

  productCards.forEach(function (card) {
    card.style.cursor = "pointer";

    card.addEventListener("click", function (event) {

      const clickedLink = event.target.closest("a");

      if (clickedLink) {
        event.preventDefault();
      }

      const productName = card.querySelector("h3")?.textContent.trim() || "";
      const productPrice = card.querySelector(".price")?.textContent.trim() || "";
      const productImage = card.querySelector(".product-img img")?.getAttribute("src") || "";

      localStorage.setItem("selectedProduct", JSON.stringify({
        name: productName,
        price: productPrice,
        image: productImage
      }));

      window.location.href = "sanpham.html";
    });
  });
});
document.addEventListener("DOMContentLoaded", function () {
  initProductCardToDetail();
});

function initProductCardToDetail() {
  const productCards = document.querySelectorAll(".products li.product, .product-card");

  if (!productCards.length) return;

  productCards.forEach(function (card) {
    card.style.cursor = "pointer";

    const link = card.querySelector("a");
    if (link) {
      link.setAttribute("href", "sanpham.html");
    }

    card.addEventListener("click", function (event) {
      const clickedControl = event.target.closest("input, button, select, label");
      if (clickedControl) return;

      event.preventDefault();

      const productName =
        card.querySelector(".woocommerce-loop-product__title")?.textContent.trim() ||
        card.querySelector("h3")?.textContent.trim() ||
        "Sản phẩm";

      const productPrice =
        card.querySelector(".price ins")?.textContent.trim().replace(/\s+/g, " ") ||
        card.querySelector(".price")?.textContent.trim().replace(/\s+/g, " ") ||
        "0₫";

      const oldPrice =
        card.querySelector(".price del")?.textContent.trim().replace(/\s+/g, " ") ||
        "";

      const productImage =
        card.querySelector(".wsha-images .im-def img")?.getAttribute("src") ||
        card.querySelector(".product-img img")?.getAttribute("src") ||
        card.querySelector("img")?.getAttribute("src") ||
        "";

      const rating =
        card.querySelector(".rating")?.textContent.trim() ||
        "";

      const selectedProduct = {
        name: productName,
        price: productPrice,
        oldPrice: oldPrice,
        image: productImage,
        rating: rating,
        breadcrumb: "Trang chủ / Quần vợt / Vợt tennis",
        color: "Xám | Xanh lá mạ",
        size: "2"
      };

      localStorage.setItem("selectedProduct", JSON.stringify(selectedProduct));

      window.location.href = "sanpham.html";
    });
  });
}