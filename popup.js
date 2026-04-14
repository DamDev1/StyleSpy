const GOOGLE_FONTS_LIST = [
  "Roboto","Open Sans","Lato","Montserrat","Raleway","Oswald","Source Sans Pro",
  "Poppins","Noto Sans","Ubuntu","PT Sans","Playfair Display","Lora","Merriweather",
  "Nunito","Rubik","Work Sans","Fira Sans","Quicksand","Mulish","Josefin Sans",
  "Libre Baskerville","Inter","DM Sans","DM Mono","DM Serif Display","Syne",
  "Space Grotesk","Space Mono","Plus Jakarta Sans","Outfit","Manrope",
  "Karla","Barlow","Titillium Web","Cabin","Asap","Exo 2","Dosis","Pacifico",
  "Dancing Script","Caveat","Lobster","Bebas Neue","Anton","Alfa Slab One",
  "Abril Fatface","Cinzel","Cormorant Garamond","EB Garamond","Spectral",
  "Crimson Text","Cardo","Vollkorn","Arvo","Bitter","Zilla Slab","Neuton",
  "IBM Plex Sans","IBM Plex Mono","IBM Plex Serif","Inconsolata","Source Code Pro",
  "Fira Code","JetBrains Mono","Roboto Mono","Noto Serif","Chakra Petch",
  "Lexend","Figtree","Instrument Sans","Instrument Serif","Fraunces",
  "Cabinet Grotesk","Clash Display","General Sans","Satoshi"
];

const SYSTEM_FONTS = [
  "-apple-system","BlinkMacSystemFont","Segoe UI","Helvetica Neue","Arial",
  "Helvetica","Verdana","Tahoma","Geneva","Times New Roman","Georgia",
  "Courier New","Courier","Lucida Console","system-ui","ui-sans-serif","ui-serif",
  "ui-monospace","ui-rounded","Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji"
];

let extractedData = null;

document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(`${tab.dataset.tab}-panel`).classList.add("active");
  });
});

document.getElementById("scanBtn").addEventListener("click", async () => {
  const btn = document.getElementById("scanBtn");
  btn.disabled = true;
  btn.textContent = "Scanning…";
  showLoading();
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
    } catch (e) {}
    const response = await chrome.tabs.sendMessage(tab.id, { action: "extractStyles" });
    if (response) { extractedData = response; renderResults(response); }
  } catch (err) { showError(err.message); }
  btn.disabled = false;
  btn.textContent = "Re-scan";
});

function showLoading() {
  const html = `<div class="empty"><div class="spinner"></div><div class="empty-text">Scanning…</div></div>`;
  document.getElementById("colors-panel").innerHTML = html;
  document.getElementById("fonts-panel").innerHTML = html;
}

function showError(msg) {
  const html = `<div class="empty"><div class="empty-icon">⚠️</div>
    <div class="empty-text">Could not scan</div>
    <div class="empty-sub">${msg || "Try reloading the page."}</div></div>`;
  document.getElementById("colors-panel").innerHTML = html;
  document.getElementById("fonts-panel").innerHTML = html;
}

function renderResults(data) {
  const pageInfo = document.getElementById("pageInfo");
  pageInfo.classList.add("visible");
  try {
    const hostname = new URL(data.pageUrl).hostname;
    document.getElementById("siteName").textContent = data.pageTitle || hostname;
    document.getElementById("siteUrl").textContent = data.pageUrl;
  } catch(e) {}
  document.getElementById("tabBar").style.display = "flex";
  document.getElementById("exportBar").classList.add("visible");
  renderColors(data.colors);
  renderFonts(data.fonts);
}

function getLuminance(hex) {
  hex = hex.replace("#", "");
  const r = parseInt(hex.slice(0,2),16)/255;
  const g = parseInt(hex.slice(2,4),16)/255;
  const b = parseInt(hex.slice(4,6),16)/255;
  return 0.2126*r + 0.7152*g + 0.0722*b;
}

function groupColors(colors) {
  const groups = { Dark: [], Light: [], Accent: [] };
  colors.forEach(c => {
    const lum = getLuminance(c);
    if (lum < 0.15) groups.Dark.push(c);
    else if (lum > 0.7) groups.Light.push(c);
    else groups.Accent.push(c);
  });
  return groups;
}

function renderColors(colors) {
  const panel = document.getElementById("colors-panel");
  document.getElementById("colorCount").textContent = colors.length;
  if (!colors.length) {
    panel.innerHTML = `<div class="empty"><div class="empty-icon">🎨</div><div class="empty-text">No colors found</div></div>`;
    return;
  }
  const groups = groupColors(colors);
  let html = "";
  Object.entries(groups).forEach(([name, list]) => {
    if (!list.length) return;
    html += `<div class="section-label">${name} tones (${list.length})</div><div class="color-grid">`;
    list.forEach(color => {
      html += `<div class="color-swatch" data-color="${color}" title="Click to copy ${color}">
        <div class="swatch-color" style="background:${color}"></div>
        <div class="swatch-hex">${color}</div>
      </div>`;
    });
    html += `</div>`;
  });
  panel.innerHTML = html;
  panel.querySelectorAll(".color-swatch").forEach(swatch => {
    swatch.addEventListener("click", () => {
      navigator.clipboard.writeText(swatch.dataset.color);
      showToast(`Copied ${swatch.dataset.color}`);
    });
  });
}

function isGoogleFont(name) {
  return GOOGLE_FONTS_LIST.some(f => f.toLowerCase() === name.toLowerCase());
}
function isSystemFont(name) {
  return SYSTEM_FONTS.some(f => f.toLowerCase() === name.toLowerCase());
}

function getFontLinks(name) {
  const encoded = encodeURIComponent(name);
  const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  return [
    { label: "Google Fonts", className: "google", url: `https://fonts.google.com/specimen/${name.replace(/\s+/g, "+")}`, emoji: "G" },
    { label: "Adobe Fonts", className: "adobe", url: `https://fonts.adobe.com/fonts?query=${encoded}`, emoji: "A" },
    { label: "Font Squirrel", className: "fontsquirrel", url: `https://www.fontsquirrel.com/fonts/${slug}`, emoji: "S" },
    { label: "DaFont", className: "dafont", url: `https://www.dafont.com/${slug}.font`, emoji: "D" }
  ];
}

function renderFonts(fonts) {
  const panel = document.getElementById("fonts-panel");
  document.getElementById("fontCount").textContent = fonts.length;
  if (!fonts.length) {
    panel.innerHTML = `<div class="empty"><div class="empty-icon">✦</div><div class="empty-text">No custom fonts found</div></div>`;
    return;
  }
  const systemFonts = fonts.filter(f => isSystemFont(f));
  const webFonts = fonts.filter(f => !isSystemFont(f));
  let html = "";
  if (webFonts.length) {
    html += `<div class="section-label">Web / Custom Fonts</div>`;
    webFonts.forEach(font => {
      const links = getFontLinks(font);
      html += `<div class="font-card">
        <div class="font-name">${font}
          <span class="font-type-badge badge-web">${isGoogleFont(font) ? "Google" : "Custom"}</span>
        </div>
        <div class="font-preview" style="font-family:'${font}',sans-serif;">The quick brown fox</div>
        <div style="font-size:10px;color:var(--text-dim);margin-bottom:8px;">Find & Download:</div>
        <div class="font-links">
          ${links.map(l => `<a class="font-link ${l.className}" href="${l.url}" target="_blank">${l.emoji} ${l.label}</a>`).join("")}
        </div>
      </div>`;
    });
  }
  if (systemFonts.length) {
    html += `<div class="section-label" style="margin-top:${webFonts.length?"10px":"0"}">System Fonts</div>`;
    systemFonts.forEach(font => {
      html += `<div class="font-card">
        <div class="font-name">${font} <span class="font-type-badge badge-system">System</span></div>
        <div class="font-preview" style="font-family:'${font}',sans-serif;">The quick brown fox</div>
        <div style="font-size:10px;color:var(--text-dim);margin-top:6px;">System font — pre-installed on most devices. No download needed.</div>
      </div>`;
    });
  }
  panel.innerHTML = html;
}

document.getElementById("exportCss").addEventListener("click", () => {
  if (!extractedData) return;
  const { colors, fonts } = extractedData;
  let css = ":root {\n";
  colors.forEach((c, i) => { css += `  --color-${i+1}: ${c};\n`; });
  fonts.forEach((f, i) => { css += `  --font-${i+1}: '${f}', sans-serif;\n`; });
  css += "}";
  navigator.clipboard.writeText(css);
  showToast("CSS variables copied!");
});

document.getElementById("exportJson").addEventListener("click", () => {
  if (!extractedData) return;
  const json = JSON.stringify({ url: extractedData.pageUrl, title: extractedData.pageTitle, colors: extractedData.colors, fonts: extractedData.fonts }, null, 2);
  navigator.clipboard.writeText(json);
  showToast("JSON copied!");
});

let toastTimer;
function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 1800);
}