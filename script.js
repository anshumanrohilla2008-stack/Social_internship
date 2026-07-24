const state = {
  shop: null,
  companies: [],
  filteredCompanies: [],
  categories: [],
  activeCategory: "All",
  searchTerm: "",
  status: null,
  stats: null,
};

const menuToggle = document.querySelector(".menu-toggle");
const menu = document.querySelector(".menu");
const currentYear = document.querySelector("#current-year");
const searchInput = document.querySelector("#search-input");
const filterChips = document.querySelector("#filter-chips");
const companyGrid = document.querySelector("#company-grid");
const featuredGrid = document.querySelector("#featured-grid");
const statsGrid = document.querySelector("#stats-grid");
const serviceGrid = document.querySelector("#service-grid");
const highlightsList = document.querySelector("#highlights-list");
const serviceNotePills = document.querySelector("#service-note-pills");
const emptyState = document.querySelector("#empty-state");
const callbackForm = document.querySelector("#callback-form");
const formStatus = document.querySelector("#form-status");
const heroTechGrid = document.querySelector("#hero-tech-grid");

if (currentYear) {
  currentYear.textContent = new Date().getFullYear();
}

if (menuToggle && menu) {
  menuToggle.addEventListener("click", () => {
    const isOpen = menu.classList.toggle("is-open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      menu.classList.remove("is-open");
      menuToggle.setAttribute("aria-expanded", "false");
    });
  });
}

function setText(selector, value) {
  const node = document.querySelector(selector);
  if (node) {
    node.textContent = value;
  }
}

function setLink(selector, phone) {
  const node = document.querySelector(selector);
  if (node) {
    node.href = `tel:${phone.replace(/\s+/g, "")}`;
  }
}

function joinLines(items) {
  return Array.isArray(items) ? items.join(" ") : "";
}

function renderShop(shop, status) {
  setText("#shop-name", shop.name);
  setText("#shop-tagline", shop.tagline);
  setText("#shop-phone", shop.phone);
  setText("#shop-address", shop.address);
  setText("#shop-hours", `${shop.hours.days} | ${shop.hours.open} - ${shop.hours.close}`);
  setText("#hero-note", shop.heroNote || "");
  setText("#contact-phone", shop.phone);
  setText("#contact-address", shop.address);
  setText("#contact-hours", `${shop.hours.days} | ${shop.hours.open} - ${shop.hours.close}`);
  setText("#contact-status-text", status.label);
  setText("#footer-name", shop.name);

  setLink("#call-link", shop.phone);
  setLink("#contact-call-link", shop.phone);

  const badge = document.querySelector("#status-badge");
  if (badge) {
    badge.textContent = status.label;
    badge.classList.toggle("is-open", Boolean(status.isOpenNow));
    badge.classList.toggle("is-closed", !status.isOpenNow);
  }

  highlightsList.innerHTML = "";
  (shop.highlights || []).forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    highlightsList.appendChild(li);
  });

  serviceNotePills.innerHTML = "";
  (shop.serviceNotes || []).forEach((item) => {
    const span = document.createElement("span");
    span.className = "note-pill";
    span.textContent = item;
    serviceNotePills.appendChild(span);
  });
}

function renderStats(stats) {
  const cards = [
    { label: "Brands Available", value: stats.brandCount },
    { label: "Category Groups", value: stats.categoryCount },
    { label: "Featured Brands", value: stats.featuredCount },
    { label: "Support Services", value: stats.serviceCount },
  ];

  statsGrid.innerHTML = "";
  cards.forEach((card) => {
    const article = document.createElement("article");
    article.className = "stat-card";
    article.innerHTML = `
      <p>${card.label}</p>
      <strong>${card.value}</strong>
    `;
    statsGrid.appendChild(article);
  });
}

function renderFeatured(companies) {
  featuredGrid.innerHTML = "";
  companies.filter((company) => company.featured).forEach((company) => {
    const card = document.createElement("article");
    card.className = "featured-card";
    card.innerHTML = `
      <div class="featured-topline">
        <p class="company-label">${company.id}</p>
        <span class="featured-dot"></span>
      </div>
      <h3>${company.name}</h3>
      <p>${company.description}</p>
      <div class="featured-tags">
        ${company.categories.slice(0, 2).map((category) => `<span>${category}</span>`).join("")}
      </div>
    `;
    featuredGrid.appendChild(card);
  });
}

function renderServices(items) {
  serviceGrid.innerHTML = "";
  items.forEach((item, index) => {
    const article = document.createElement("article");
    article.className = index === 0 ? "service-card service-card-emphasis" : "service-card";
    article.innerHTML = `
      <p class="section-tag">Support ${String(index + 1).padStart(2, "0")}</p>
      <p>${item}</p>
    `;
    serviceGrid.appendChild(article);
  });
}

function renderHeroCategories(companies) {
  if (!heroTechGrid) {
    return;
  }

  const categories = Array.from(
    new Set(companies.flatMap((company) => company.categories))
  ).slice(0, 4);

  heroTechGrid.innerHTML = "";
  categories.forEach((category, index) => {
    const card = document.createElement("article");
    card.className = `hero-tech-card tone-${(index % 4) + 1}`;
    card.innerHTML = `
      <p class="section-tag">Category</p>
      <h3>${category}</h3>
      <p>Available across trusted electronics brands in this shop catalog.</p>
    `;
    heroTechGrid.appendChild(card);
  });
}

function renderCompanies(companies) {
  companyGrid.innerHTML = "";

  companies.forEach((company, index) => {
    const article = document.createElement("article");
    article.className = "company-card";
    article.innerHTML = `
      <div class="company-meta">
        <p class="company-label">Brand ${String(index + 1).padStart(2, "0")}</p>
        <h3>${company.name}</h3>
        <p class="company-description">${company.description}</p>
      </div>
      <ul class="tag-list">
        ${company.categories.map((category) => `<li>${category}</li>`).join("")}
      </ul>
      <div class="company-footer">
        <span>${company.categories.length} categories</span>
        <a href="${document.querySelector("#call-link")?.getAttribute("href") || "tel:+919876543210"}">Call for stock</a>
      </div>
    `;
    companyGrid.appendChild(article);
  });

  emptyState.classList.toggle("hidden", companies.length > 0);
}

function renderFilters(categories) {
  filterChips.innerHTML = "";
  ["All", ...categories].forEach((category) => {
    const button = document.createElement("button");
    button.className = "chip";
    button.type = "button";
    button.textContent = category;
    button.dataset.category = category;
    button.classList.toggle("active", category === state.activeCategory);
    button.addEventListener("click", () => {
      state.activeCategory = category;
      renderFilters(state.categories);
      applyFilters();
    });
    filterChips.appendChild(button);
  });
}

function applyFilters() {
  const term = state.searchTerm.trim().toLowerCase();
  const category = state.activeCategory;

  state.filteredCompanies = state.companies.filter((company) => {
    const matchesSearch =
      !term ||
      company.name.toLowerCase().includes(term) ||
      company.description.toLowerCase().includes(term) ||
      company.categories.some((item) => item.toLowerCase().includes(term));

    const matchesCategory =
      category === "All" || company.categories.some((item) => item === category);

    return matchesSearch && matchesCategory;
  });

  renderCompanies(state.filteredCompanies);
}

async function submitInquiry(event) {
  event.preventDefault();
  formStatus.textContent = "Submitting request...";
  formStatus.className = "form-status";

  const formData = new FormData(callbackForm);
  const payload = {
    name: String(formData.get("name") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    brandInterest: String(formData.get("brandInterest") || "").trim(),
    message: String(formData.get("message") || "").trim(),
  };

  try {
    const response = await fetch("/api/inquiries", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Could not submit the request.");
    }

    formStatus.textContent = result.message || "Request submitted successfully.";
    formStatus.classList.add("success");
    callbackForm.reset();
  } catch (error) {
    formStatus.textContent = error.message;
    formStatus.classList.add("error");
  }
}

async function bootstrapPage() {
  try {
    const response = await fetch("/api/bootstrap");
    if (!response.ok) {
      throw new Error("Could not load shop data.");
    }

    const data = await response.json();
    state.shop = data.shop;
    state.companies = data.companies;
    state.stats = data.stats;
    state.status = data.status;
    state.categories = Array.from(
      new Set(data.companies.flatMap((company) => company.categories))
    ).sort((left, right) => left.localeCompare(right));

    renderShop(data.shop, data.status);
    renderStats(data.stats);
    renderFeatured(data.companies);
    renderHeroCategories(data.companies);
    renderServices(data.shop.serviceNotes || []);
    renderFilters(state.categories);
    applyFilters();
  } catch (error) {
    companyGrid.innerHTML = `<p class="error-panel">${error.message}</p>`;
    featuredGrid.innerHTML = "";
    statsGrid.innerHTML = "";
  }
}

if (searchInput) {
  searchInput.addEventListener("input", (event) => {
    state.searchTerm = event.target.value;
    applyFilters();
  });
}

if (callbackForm) {
  callbackForm.addEventListener("submit", submitInquiry);
}

bootstrapPage();
