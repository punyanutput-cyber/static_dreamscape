/* ==========================================================
   Dream Core — script.js (ใช้ร่วมกันทุกหน้า)
   ตรวจจาก element ที่มีในหน้า แล้วเริ่มทำงานเฉพาะส่วนที่เกี่ยวข้อง
   - product.html : #filter-bar, #product-list
   - order.html   : #orderForm, #customerName, #contact, #items, #total, #note
   - admin.html   : #ordersTable tbody
   ========================================================== */

const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbys8BD2x0yyC-5WfMoDXRzjFqr5XQOoYry5rX4N73YDxWajwsXEhmKs8zAkif4zyr8vxw/exec";

const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRQXpo0OaxqZOwvsn8keel89L7BTyPzMmT_XkVByvAvNBE6Mm1dRNAU7PfqVbFBqkez7sfNxWk-DS_f/pub?gid=0&single=true&output=csv";

const MOODS = [
  { key: "all", label: "ทั้งหมด" },
  { key: "fresh", label: "Fresh" },
  { key: "sweet", label: "Sweet" },
  { key: "confident", label: "Confident" },
  { key: "romance", label: "Romance" },
];

/* ---------- Helpers ---------- */

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function formatPrice(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString("th-TH") : String(value);
}

/* ==========================================================
   1) หน้า product.html
   ========================================================== */

function initProductPage() {
  const filterBar = document.getElementById("filter-bar");
  const list = document.getElementById("product-list");
  if (!filterBar || !list) return;

  let products = [];
  let currentMood = "all";

  function buildOrderUrl(p) {
    const itemName = p.size ? p.name + " " + p.size : p.name;
    const params = new URLSearchParams({ item: itemName, price: p.price });
    return "order.html?" + params.toString();
  }

  function createCard(p) {
    const card = el("article", "product-card");
    card.dataset.mood = p.mood;

    const media = el("div", "product-card__media");
    const img = el("img");
    img.src = p.image;
    img.alt = p.name;
    img.loading = "lazy";
    media.appendChild(img);

    const body = el("div", "product-card__body");
    const moodLabel = el(
      "span",
      "product-card__mood",
      p.mood.charAt(0).toUpperCase() + p.mood.slice(1)
    );
    const title = el("h3", "product-card__title", p.name);

    const meta = el("div", "product-card__meta");
    meta.appendChild(el("span", "product-card__size", p.size || ""));
    meta.appendChild(
      el("span", "product-card__price", formatPrice(p.price) + " บาท")
    );

    const btn = el("a", "btn btn--accent", "สั่งซื้อ");
    btn.href = buildOrderUrl(p);

    body.append(moodLabel, title, meta, btn);
    card.append(media, body);
    return card;
  }

  function render() {
    list.replaceChildren();
    const shown =
      currentMood === "all"
        ? products
        : products.filter((p) => p.mood === currentMood);

    if (shown.length === 0) {
      list.appendChild(el("p", "text-center", "ไม่พบสินค้าในหมวดนี้"));
      return;
    }
    shown.forEach((p) => list.appendChild(createCard(p)));
  }

  function setMood(mood, updateUrl) {
    currentMood = MOODS.some((m) => m.key === mood) ? mood : "all";

    filterBar.querySelectorAll(".filter-btn").forEach((btn) => {
      const active = btn.dataset.mood === currentMood;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", String(active));
    });

    if (updateUrl) {
      const url = new URL(window.location.href);
      if (currentMood === "all") url.searchParams.delete("mood");
      else url.searchParams.set("mood", currentMood);
      history.replaceState(null, "", url);
    }
    render();
  }

  function buildFilterBar() {
    filterBar.replaceChildren();
    filterBar.classList.add("filters");
    MOODS.forEach((m) => {
      const btn = el("button", "filter-btn");
      btn.type = "button";
      btn.dataset.mood = m.key;
      if (m.key !== "all") btn.appendChild(el("span", "dot dot--" + m.key));
      btn.appendChild(document.createTextNode(m.label));
      btn.addEventListener("click", () => setMood(m.key, true));
      filterBar.appendChild(btn);
    });
  }

  buildFilterBar();
  list.appendChild(el("p", "text-center", "กำลังโหลดสินค้า..."));

  fetch("products.json")
    .then((res) => {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then((data) => {
      products = data;
      const initial = new URLSearchParams(window.location.search).get("mood");
      setMood(initial ? initial.toLowerCase() : "all", false);
    })
    .catch((error) => {
      console.error(error);
      list.replaceChildren(
        el("p", "text-center", "ไม่สามารถโหลดรายการสินค้าได้ กรุณาลองใหม่อีกครั้ง")
      );
    });
}

/* ==========================================================
   2) หน้า order.html
   ========================================================== */

function initOrderPage() {
  const form = document.getElementById("orderForm");
  if (!form) return;

  const itemsInput = document.getElementById("items");
  const totalInput = document.getElementById("total");

  // เติมค่าจาก URL parameter ลงทั้งช่อง items และ total
  const params = new URLSearchParams(window.location.search);
  const item = params.get("item");
  const price = params.get("price");
  if (item && itemsInput) itemsInput.value = item;
  if (price && totalInput) totalInput.value = price;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const payload = {
      customerName: document.getElementById("customerName").value.trim(),
      contact: document.getElementById("contact").value.trim(),
      items: itemsInput.value.trim(),
      total: totalInput.value.trim(),
      note: document.getElementById("note").value.trim(),
    };

    const submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(payload)
    })
    .then(() => { window.location.href = 'thankyou.html'; })
    .catch(error => {
      console.error(error);
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
      if (submitBtn) submitBtn.disabled = false;
    });
  });
}

/* ==========================================================
   3) หน้า admin.html
   ========================================================== */

// parse CSV เอง: รองรับ "ข้อความในเครื่องหมายคำพูด", "" (quote ซ้อน),
// เครื่องหมายจุลภาคและขึ้นบรรทัดใหม่ภายในช่อง, และ CRLF
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // ตัด BOM

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

function initAdminPage() {
  const tbody = document.querySelector("#ordersTable tbody");
  if (!tbody) return;

  const COLUMNS = 6;

  function showMessage(message) {
    tbody.replaceChildren();
    const tr = el("tr");
    const td = el("td", "", message);
    td.colSpan = COLUMNS;
    td.style.textAlign = "center";
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  showMessage("กำลังโหลดข้อมูล...");

  fetch(SHEET_CSV_URL + "&t=" + Date.now())
    .then((res) => {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.text();
    })
    .then((text) => {
      const rows = parseCSV(text);

      // ตัดแถวหัวตารางออก (ถ้าช่องที่ 5 ไม่ใช่ตัวเลข ถือว่าเป็นหัวตาราง)
      if (rows.length > 0) {
        const totalCell = (rows[0][4] || "").replace(/,/g, "").trim();
        if (totalCell === "" || isNaN(Number(totalCell))) rows.shift();
      }

      if (rows.length === 0) {
        showMessage("ยังไม่มีรายการสั่งซื้อ");
        return;
      }

      // Apps Script เพิ่มแถวใหม่ต่อท้ายชีตเสมอ จึงกลับลำดับให้ล่าสุดขึ้นก่อน
      rows.reverse();

      tbody.replaceChildren();
      rows.forEach((r) => {
        const tr = el("tr");
        for (let i = 0; i < COLUMNS; i++) {
          let value = (r[i] || "").trim();
          if (i === 4 && value !== "" && !isNaN(Number(value.replace(/,/g, "")))) {
            value = formatPrice(value.replace(/,/g, ""));
          }
          tr.appendChild(el("td", "", value));
        }
        tbody.appendChild(tr);
      });
    })
    .catch((error) => {
      console.error(error);
      showMessage("ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง");
    });
}

/* ---------- Start ---------- */

document.addEventListener("DOMContentLoaded", () => {
  initProductPage();
  initOrderPage();
  initAdminPage();
});
