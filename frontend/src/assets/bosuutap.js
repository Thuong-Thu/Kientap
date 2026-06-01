document.addEventListener("DOMContentLoaded", function () {
  initResetFilter();
  initCategoryRedirect();
  initProductClickToDetail();
  initLocalPagination();
  initLocalSearch();
  initMiniCartLink();
});

function initResetFilter() {
  const resetBtn = document.querySelector(".reset-filter-btn");

  if (!resetBtn) return;

  resetBtn.addEventListener("click", function (event) {
    event.preventDefault();

    const inputs = document.querySelectorAll(
      ".archive-products-sidebar input[type='checkbox'], .archive-products-sidebar input[type='radio']"
    );

    inputs.forEach(function (input) {
      input.checked = false;
    });

    const orderby = document.querySelector(".orderby");
    if (orderby) {
      orderby.value = "date";
    }

    const products = document.querySelectorAll(".products li.product");
    products.forEach(function (product) {
      product.style.display = "";
    });

    const resultCount = document.querySelector(".woocommerce-result-count");
    if (resultCount) {
      resultCount.textContent = "Hiển thị 1–24 của 77 kết quả";
    }
  });
}

function initCategoryRedirect() {
  const routeMap = {
    "pure-aero": "pureaero.html",
    "rafa": "pureaerorafa.html",
    "pure-drive": "puredrive.html",
    "pure-strike": "purestrike.html",
    "evo-drive": "evodrive.html",
    "wimbledon": "wimbledon.html",
    "aero-junior-bo-suu-tap": "aerojunior.html",
    "boost-bo-suu-tap-tennis": "boost.html",
    "evo-aero-bo-suu-tap": "evoaero.html",
    "junior-bo-suu-tap": "junior.html"
  };

  const filterInputs = document.querySelectorAll(
    ".archive-products-sidebar input[type='checkbox']"
  );

  filterInputs.forEach(function (input) {
    input.addEventListener("change", function () {
      const value = input.value;

      if (input.checked && routeMap[value]) {
        window.location.href = routeMap[value];
      }
    });
  });
}


function initProductClickToDetail() {
  const productCards = document.querySelectorAll(".products li.product");

  if (!productCards.length) return;

  productCards.forEach(function (card) {
    card.style.cursor = "pointer";

    const link = card.querySelector("a");
    if (link) {
      link.setAttribute("href", "sanpham.html");
    }

    card.addEventListener("click", function (event) {
      const clickedInput = event.target.closest("input, button, select, label");
      if (clickedInput) return;

      event.preventDefault();

      const productName =
        card.querySelector(".woocommerce-loop-product__title")?.textContent.trim() || "";

      const productPrice =
        card.querySelector(".price")?.textContent.trim().replace(/\s+/g, " ") || "";

      const productImage =
        card.querySelector(".wsha-images .im-def img")?.getAttribute("src") ||
        card.querySelector("img")?.getAttribute("src") ||
        "";

      localStorage.setItem(
        "selectedProduct",
        JSON.stringify({
          name: productName,
          price: productPrice,
          image: productImage
        })
      );

      window.location.href = "sanpham.html";
    });
  });
}


function initLocalPagination() {
  const pageLinks = document.querySelectorAll(".woocommerce-pagination a");

  pageLinks.forEach(function (link) {
    link.setAttribute("href", "#");

    link.addEventListener("click", function (event) {
      event.preventDefault();
    });
  });
}


function initLocalSearch() {
  const searchInput = document.querySelector(".header-search input");

  if (!searchInput) return;

  searchInput.addEventListener("keydown", function (event) {
    if (event.key !== "Enter") return;

    event.preventDefault();

    const keyword = searchInput.value.trim();

    if (keyword === "") {
      alert("Vui lòng nhập từ khóa tìm kiếm.");
      return;
    }

    localStorage.setItem("searchKeyword", keyword);
    window.location.href = "timkiem.html";
  });
}


function initMiniCartLink() {
  const cartLinks = document.querySelectorAll(
    ".cart-wrap a, .header-minicart a, a[href*='gio-hang'], a[href*='cart']"
  );

  cartLinks.forEach(function (link) {
    link.addEventListener("click", function (event) {
      event.preventDefault();
      window.location.href = "giohang.html";
    });
  });
}
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