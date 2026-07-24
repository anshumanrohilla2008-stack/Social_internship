const shopForm = document.querySelector("#shop-form");
const companiesForm = document.querySelector("#companies-form");
const companiesJson = document.querySelector("#companies-json");
const inquiryTableBody = document.querySelector("#inquiry-table-body");
const inquiryEmpty = document.querySelector("#inquiry-empty");
const shopStatus = document.querySelector("#shop-status");
const companiesStatus = document.querySelector("#companies-status");

function setStatus(node, message, type = "") {
  node.textContent = message;
  node.className = "form-status";
  if (type) {
    node.classList.add(type);
  }
}

function arrayToLines(value) {
  return Array.isArray(value) ? value.join("\n") : "";
}

function linesToArray(value) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function fillShopForm(shop) {
  shopForm.elements.name.value = shop.name || "";
  shopForm.elements.tagline.value = shop.tagline || "";
  shopForm.elements.phone.value = shop.phone || "";
  shopForm.elements.address.value = shop.address || "";
  shopForm.elements.open.value = shop.hours?.open || "";
  shopForm.elements.close.value = shop.hours?.close || "";
  shopForm.elements.days.value = shop.hours?.days || "";
  shopForm.elements.closedDays.value = (shop.hours?.closedDays || []).join(", ");
  shopForm.elements.heroNote.value = shop.heroNote || "";
  shopForm.elements.highlights.value = arrayToLines(shop.highlights);
  shopForm.elements.serviceNotes.value = arrayToLines(shop.serviceNotes);
}

function renderInquiries(inquiries) {
  inquiryTableBody.innerHTML = "";
  inquiryEmpty.classList.toggle("hidden", inquiries.length > 0);

  inquiries.forEach((inquiry) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${inquiry.name}</td>
      <td>${inquiry.phone}</td>
      <td>${inquiry.brandInterest || "-"}</td>
      <td>${inquiry.message || "-"}</td>
      <td>${new Date(inquiry.submittedAt).toLocaleString()}</td>
    `;
    inquiryTableBody.appendChild(row);
  });
}

async function loadAdminData() {
  const [bootstrapResponse, inquiriesResponse] = await Promise.all([
    fetch("/api/bootstrap"),
    fetch("/api/inquiries"),
  ]);

  if (!bootstrapResponse.ok || !inquiriesResponse.ok) {
    throw new Error("Could not load admin data.");
  }

  const bootstrap = await bootstrapResponse.json();
  const inquiries = await inquiriesResponse.json();

  fillShopForm(bootstrap.shop);
  companiesJson.value = JSON.stringify(bootstrap.companies, null, 2);
  renderInquiries(inquiries);
}

async function saveShop(event) {
  event.preventDefault();
  setStatus(shopStatus, "Saving shop details...");

  const payload = {
    name: shopForm.elements.name.value.trim(),
    tagline: shopForm.elements.tagline.value.trim(),
    phone: shopForm.elements.phone.value.trim(),
    address: shopForm.elements.address.value.trim(),
    hours: {
      open: shopForm.elements.open.value,
      close: shopForm.elements.close.value,
      days: shopForm.elements.days.value.trim(),
      closedDays: shopForm.elements.closedDays.value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    },
    heroNote: shopForm.elements.heroNote.value.trim(),
    highlights: linesToArray(shopForm.elements.highlights.value),
    serviceNotes: linesToArray(shopForm.elements.serviceNotes.value),
  };

  try {
    const response = await fetch("/api/shop", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "Could not save shop details.");
    }

    setStatus(shopStatus, result.message || "Shop details saved.", "success");
  } catch (error) {
    setStatus(shopStatus, error.message, "error");
  }
}

async function saveCompanies(event) {
  event.preventDefault();
  setStatus(companiesStatus, "Saving company data...");

  try {
    const payload = JSON.parse(companiesJson.value);
    const response = await fetch("/api/companies", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "Could not save company data.");
    }

    companiesJson.value = JSON.stringify(payload, null, 2);
    setStatus(companiesStatus, result.message || "Company data saved.", "success");
  } catch (error) {
    setStatus(companiesStatus, error.message, "error");
  }
}

if (shopForm) {
  shopForm.addEventListener("submit", saveShop);
}

if (companiesForm) {
  companiesForm.addEventListener("submit", saveCompanies);
}

loadAdminData().catch((error) => {
  setStatus(shopStatus, error.message, "error");
  setStatus(companiesStatus, error.message, "error");
});
