const addressSelect = document.querySelector("[data-address-select]");
const addressTrigger = document.querySelector("[data-address-trigger]");
const addressValue = document.querySelector("[data-address-value]");
const addressDropdown = document.querySelector("[data-address-dropdown]");
const modalBackdrop = document.querySelector("[data-address-modal]");
const modalTitle = document.querySelector("[data-modal-title]");
const modalForm = document.querySelector("[data-address-form]");
const modalSubmit = document.querySelector("[data-modal-submit]");
const modalCloseButtons = document.querySelectorAll("[data-modal-close]");

let mode = "add";
let editingId = null;

const addresses = [
  {
    id: 1,
    label: "Địa chỉ 1 (Mặc định)",
    name: "Nguyễn Văn An",
    phone: "0896 691 279",
    city: "TP. Hồ Chí Minh",
    district: "Quận 7",
    ward: "Phường Tân Hưng",
    street: "98 Lâm Văn Bền",
    isDefault: true,
  },
  {
    id: 2,
    label: "Địa chỉ 2",
    name: "Trần Minh Khang",
    phone: "0909 123 456",
    city: "TP. Hồ Chí Minh",
    district: "Quận 1",
    ward: "Phường Bến Nghé",
    street: "12 Nguyễn Thị Minh Khai",
    isDefault: false,
  },
  {
    id: 3,
    label: "Địa chỉ 3",
    name: "Lê Hoàng Nam",
    phone: "0912 345 678",
    city: "TP. Hồ Chí Minh",
    district: "Quận 1",
    ward: "Phường Cầu Ông Lãnh",
    street: "45 Trần Hưng Đạo",
    isDefault: false,
  },
  {
    id: 4,
    label: "Địa chỉ 4",
    name: "Phạm Gia Hân",
    phone: "0933 888 999",
    city: "TP. Hồ Chí Minh",
    district: "Quận 1",
    ward: "Phường Võ Thị Sáu",
    street: "22 Võ Văn Tần",
    isDefault: false,
  },
  {
    id: 5,
    label: "Địa chỉ 5",
    name: "Đỗ Bảo Long",
    phone: "0988 777 666",
    city: "TP. Hồ Chí Minh",
    district: "Quận 1",
    ward: "Phường Bến Nghé",
    street: "7 Pasteur",
    isDefault: false,
  },
];

function renderAddressDropdown() {
  addressDropdown.innerHTML = "";

  addresses.forEach((address) => {
    const option = document.createElement("div");
    option.className = "address-option";
    option.innerHTML = `
      <button class="address-option-main" type="button" data-select-address="${address.id}">${address.label}</button>
      <button class="address-edit" type="button" data-edit-address="${address.id}">Sửa</button>
    `;
    addressDropdown.appendChild(option);
  });

  const addButton = document.createElement("button");
  addButton.className = "address-add";
  addButton.type = "button";
  addButton.dataset.addAddress = "true";
  addButton.innerHTML = "<span>Thêm địa chỉ mới</span><span aria-hidden=\"true\">+</span>";
  addressDropdown.appendChild(addButton);
}

function selectAddress(id) {
  const selected = addresses.find((address) => address.id === id);
  if (!selected) return;

  addressValue.textContent = selected.label;
  addressValue.classList.remove("address-select-placeholder");
  document.querySelector("#billing-name").value = selected.name;
  document.querySelector("#billing-phone").value = selected.phone;
  addressSelect.classList.remove("is-open");
}

function openModal(nextMode, id = null) {
  mode = nextMode;
  editingId = id;
  addressSelect.classList.remove("is-open");

  const address = id ? addresses.find((item) => item.id === id) : null;
  modalTitle.textContent = mode === "edit" ? "Sửa địa chỉ" : "Thêm địa chỉ mới";
  modalSubmit.textContent = mode === "edit" ? "Cập nhật" : "Lưu địa chỉ";
  modalForm.reset();

  modalForm.elements.name.value = address?.name || "";
  modalForm.elements.phone.value = address?.phone || "";
  modalForm.elements.city.value = address?.city || "";
  modalForm.elements.district.value = address?.district || "";
  modalForm.elements.ward.value = address?.ward || "";
  modalForm.elements.street.value = address?.street || "";
  modalForm.elements.isDefault.checked = Boolean(address?.isDefault);

  modalBackdrop.classList.add("is-open");
  modalForm.elements.name.focus();
}

function closeModal() {
  modalBackdrop.classList.remove("is-open");
  clearPhoneError();
  editingId = null;
}

function normalizeAddressLabel(address, index) {
  return address.isDefault ? `Địa chỉ ${index + 1} (Mặc định)` : `Địa chỉ ${index + 1}`;
}

function validatePhone(phone) {
  return /^0\d{9}$/.test(phone.replace(/\s/g, ""));
}

function showPhoneError(message) {
  let errorEl = modalForm.querySelector(".phone-error-msg");
  if (!errorEl) {
    errorEl = document.createElement("span");
    errorEl.className = "phone-error-msg";
    errorEl.style.cssText = "display:block;color:#d0021b;font-size:12px;margin-top:4px;";
    const phoneInput = modalForm.elements.phone;
    phoneInput.parentNode.insertBefore(errorEl, phoneInput.nextSibling);
  }
  errorEl.textContent = message;
  modalForm.elements.phone.style.borderColor = "#d0021b";
  modalForm.elements.phone.focus();
}

function clearPhoneError() {
  const errorEl = modalForm.querySelector(".phone-error-msg");
  if (errorEl) errorEl.textContent = "";
  if (modalForm.elements.phone) modalForm.elements.phone.style.borderColor = "";
}

function saveAddress(event) {
  event.preventDefault();

  const formData = new FormData(modalForm);
  const phone = formData.get("phone").trim().replace(/\s/g, "");

  if (!phone) {
    showPhoneError("Vui lòng nhập số điện thoại.");
    return;
  }
  if (!/^\d+$/.test(phone)) {
    showPhoneError("Số điện thoại chỉ được chứa chữ số.");
    return;
  }
  if (!validatePhone(phone)) {
    showPhoneError("Số điện thoại không hợp lệ. Phải bắt đầu bằng 0 và đủ 10 chữ số (VD: 0912345678).");
    return;
  }
  clearPhoneError();

  const isDefault = formData.get("isDefault") === "on";

  if (isDefault) {
    addresses.forEach((address) => {
      address.isDefault = false;
    });
  }

  const payload = {
    name: formData.get("name").trim(),
    phone: formData.get("phone").trim(),
    city: formData.get("city").trim(),
    district: formData.get("district").trim(),
    ward: formData.get("ward").trim(),
    street: formData.get("street").trim(),
    isDefault,
  };

  if (mode === "edit" && editingId) {
    const target = addresses.find((address) => address.id === editingId);
    if (target) {
      Object.assign(target, payload);
    }
  } else {
    addresses.push({
      id: Date.now(),
      label: "",
      ...payload,
    });
  }

  addresses.forEach((address, index) => {
    address.label = normalizeAddressLabel(address, index);
  });

  renderAddressDropdown();
  selectAddress(mode === "edit" && editingId ? editingId : addresses[addresses.length - 1].id);
  closeModal();
}

addressTrigger.addEventListener("click", () => {
  addressSelect.classList.toggle("is-open");
});

addressDropdown.addEventListener("click", (event) => {
  const selectButton = event.target.closest("[data-select-address]");
  const editButton = event.target.closest("[data-edit-address]");
  const addButton = event.target.closest("[data-add-address]");

  if (selectButton) {
    selectAddress(Number(selectButton.dataset.selectAddress));
  }

  if (editButton) {
    openModal("edit", Number(editButton.dataset.editAddress));
  }

  if (addButton) {
    openModal("add");
  }
});

modalCloseButtons.forEach((button) => {
  button.addEventListener("click", closeModal);
});

modalBackdrop.addEventListener("click", (event) => {
  if (event.target === modalBackdrop) {
    closeModal();
  }
});

modalForm.addEventListener("submit", saveAddress);

modalForm.elements.phone.addEventListener("input", clearPhoneError);

document.addEventListener("click", (event) => {
  if (!addressSelect.contains(event.target)) {
    addressSelect.classList.remove("is-open");
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    addressSelect.classList.remove("is-open");
    closeModal();
  }
});

renderAddressDropdown();
