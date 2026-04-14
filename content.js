function extractStyles() {
  const colors = new Set();
  const fonts = new Set();

  const colorProps = [
    "color", "background-color", "border-color",
    "border-top-color", "border-bottom-color",
    "border-left-color", "border-right-color",
    "outline-color", "text-decoration-color", "fill", "stroke"
  ];

  function normalizeColor(val) {
    if (!val) return null;
    val = val.trim();
    if (["transparent","inherit","initial","unset","rgba(0, 0, 0, 0)","currentcolor","currentColor"].includes(val)) return null;
    const rgbMatch = val.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1]);
      const g = parseInt(rgbMatch[2]);
      const b = parseInt(rgbMatch[3]);
      if (r === 0 && g === 0 && b === 0) return null;
      return "#" + [r, g, b].map(x => x.toString(16).padStart(2, "0")).join("").toUpperCase();
    }
    if (val.startsWith("#")) return val.toUpperCase();
    return null;
  }

  function cleanFont(val) {
    if (!val) return [];
    return val.split(",")
      .map(f => f.trim().replace(/['"]/g, ""))
      .filter(f => f && !["inherit","initial","unset","serif","sans-serif","monospace",
        "cursive","fantasy","system-ui","-apple-system","BlinkMacSystemFont"].includes(f));
  }

  document.querySelectorAll("*").forEach(el => {
    try {
      const style = window.getComputedStyle(el);
      colorProps.forEach(prop => {
        const color = normalizeColor(style.getPropertyValue(prop));
        if (color) colors.add(color);
      });
      cleanFont(style.getPropertyValue("font-family")).forEach(f => fonts.add(f));
    } catch (e) {}
  });

  try {
    Array.from(document.styleSheets).forEach(sheet => {
      try {
        Array.from(sheet.cssRules || []).forEach(rule => {
          if (rule.style) {
            colorProps.forEach(prop => {
              const color = normalizeColor(rule.style.getPropertyValue(prop));
              if (color) colors.add(color);
            });
            cleanFont(rule.style.getPropertyValue("font-family")).forEach(f => fonts.add(f));
          }
          if (rule.constructor.name === "CSSFontFaceRule" && rule.style) {
            const family = rule.style.getPropertyValue("font-family");
            if (family) fonts.add(family.replace(/['"]/g, "").trim());
          }
        });
      } catch (e) {}
    });
  } catch (e) {}

  return {
    colors: Array.from(colors),
    fonts: Array.from(fonts),
    pageTitle: document.title,
    pageUrl: window.location.href
  };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "extractStyles") {
    sendResponse(extractStyles());
  }
});