// QR make page: everything runs in this page; nothing is sent anywhere (the CSP allows no connections).
// The texts inside codes match the Android app (C:/AI/Projects/Programs/QR, Make.kt Content).
"use strict";
qrcode.stringToBytes = qrcode.stringToBytesFuncs["UTF-8"];

const ES = {
  "Make a QR code": "Crear un código QR",
  "Everything happens in this page: what you type is never sent anywhere. Codes made here never expire.":
    "Todo pasa en esta página: lo que escribís no se envía a ningún lado. Los códigos creados acá no vencen nunca.",
  "Squares": "Cuadraditos", "Background": "Fondo", "Save picture": "Guardar imagen", "Save as SVG": "Guardar como SVG",
  "To scan codes, and to put a picture in the middle, get the Android app:": "Para escanear códigos y poner una imagen en el centro, bajá la app de Android:",
  "source code": "código fuente", "Privacy": "Privacidad", "A problem or an idea? Write to": "¿Un problema o una idea? Escribí a",
  "Codes are made with qrcode-generator by Kazuhiko Arase (MIT). QR Code is a registered trademark of DENSO WAVE.":
    "Los códigos se crean con qrcode-generator de Kazuhiko Arase (MIT). QR Code es una marca registrada de DENSO WAVE.",
  "Link": "Enlace", "Wi-Fi": "Wi-Fi", "Text": "Texto", "Email": "Email", "Phone": "Teléfono", "Text message": "Mensaje de texto", "Contact": "Contacto",
  "Web address": "Dirección web", "Network name": "Nombre de la red", "Password (empty for an open network)": "Contraseña (vacía para una red abierta)",
  "Security": "Seguridad", "Hidden network": "Red oculta", "Email address": "Dirección de email", "Subject": "Asunto", "Message": "Mensaje",
  "Phone number": "Número de teléfono", "Name": "Nombre", "Company": "Empresa", "Website": "Sitio web", "Address": "Dirección",
  "Fill in the fields to see your code.": "Completá los campos para ver tu código.",
  "Too much for one code. Shorten it.": "Es demasiado para un código. Acortalo.",
  "The squares must be darker than the background, or many cameras won't read it.":
    "Los cuadraditos tienen que ser más oscuros que el fondo, o muchas cámaras no lo van a leer.",
  "These colors are too close. Pick a darker color or a lighter background.":
    "Estos colores se parecen demasiado. Elegí un color más oscuro o un fondo más claro.",
  "Your code": "Tu código",
};
const spanish = (navigator.language || "").toLowerCase().startsWith("es");
const tr = (s) => (spanish && ES[s]) || s;
if (spanish) document.documentElement.lang = "es";
document.querySelectorAll("[data-t]").forEach((el) => { el.textContent = tr(el.dataset.t); });
document.title = tr("Make a QR code") + " · QR";

const wifiEscape = (s) => s.replace(/([\\;,":])/g, "\\$1");
const v = (s) => s.trim().replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\r?\n/g, "\\n");
const enc = (s) => encodeURIComponent(s);

// [id, label, fields [name, label, type], content(values)]
const KINDS = [
  ["link", "Link", [["url", "Web address", "url"]],
    (f) => { const t = f.url.trim(); return !t ? "" : /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(t) ? t : "https://" + t; }],
  ["wifi", "Wi-Fi", [["ssid", "Network name"], ["pass", "Password (empty for an open network)"], ["sec", "Security", "select", ["WPA", "WEP"]], ["hidden", "Hidden network", "checkbox"]],
    (f) => {
      if (!f.ssid) return "";
      const t = f.pass ? f.sec : "nopass";
      return "WIFI:T:" + t + ";S:" + wifiEscape(f.ssid) + ";" + (t !== "nopass" ? "P:" + wifiEscape(f.pass) + ";" : "") + (f.hidden ? "H:true;" : "") + ";";
    }],
  ["text", "Text", [["text", "Text", "textarea"]], (f) => f.text],
  ["email", "Email", [["to", "Email address", "email"], ["subject", "Subject"], ["body", "Message", "textarea"]],
    (f) => {
      if (!f.to.trim()) return "";
      const q = [f.subject.trim() && "subject=" + enc(f.subject), f.body.trim() && "body=" + enc(f.body)].filter(Boolean);
      return "mailto:" + f.to.trim() + (q.length ? "?" + q.join("&") : "");
    }],
  ["phone", "Phone", [["num", "Phone number", "tel"]], (f) => { const n = f.num.replace(/[^0-9+*#]/g, ""); return n ? "tel:" + n : ""; }],
  ["sms", "Text message", [["num", "Phone number", "tel"], ["body", "Message", "textarea"]],
    (f) => { const n = f.num.replace(/[^0-9+]/g, ""); return n ? "SMSTO:" + n + ":" + f.body : ""; }],
  ["contact", "Contact", [["name", "Name"], ["phone", "Phone number", "tel"], ["email", "Email address", "email"], ["org", "Company"], ["url", "Website", "url"], ["addr", "Address"]],
    (f) => {
      const n = f.name.trim();
      if (!n && !f.phone.trim() && !f.email.trim()) return "";
      const i = n.lastIndexOf(" ");
      const last = i < 0 ? "" : n.slice(i + 1), first = i < 0 ? n : n.slice(0, i);
      let s = "BEGIN:VCARD\r\nVERSION:3.0\r\nN:" + v(last) + ";" + v(first) + ";;;\r\nFN:" + v(n) + "\r\n";
      if (f.org.trim()) s += "ORG:" + v(f.org) + "\r\n";
      if (f.phone.trim()) s += "TEL:" + f.phone.trim() + "\r\n";
      if (f.email.trim()) s += "EMAIL:" + f.email.trim() + "\r\n";
      if (f.url.trim()) s += "URL:" + f.url.trim() + "\r\n";
      if (f.addr.trim()) s += "ADR:;;" + v(f.addr) + ";;;;\r\n";
      return s + "END:VCARD";
    }],
];

const $ = (id) => document.getElementById(id);
let kind = KINDS[0];
let svgUrl = null;

function buildForm() {
  const form = $("form");
  form.replaceChildren();
  for (const [name, label, type, opts] of kind[2]) {
    const l = document.createElement("label");
    let input;
    if (type === "textarea") { input = document.createElement("textarea"); input.rows = 3; }
    else if (type === "select") {
      input = document.createElement("select");
      for (const o of opts) { const op = document.createElement("option"); op.value = op.textContent = o; input.append(op); }
    } else { input = document.createElement("input"); input.type = type || "text"; }
    input.name = name;
    input.addEventListener("input", render);
    if (type === "checkbox") { l.className = "check"; l.append(input, document.createTextNode(tr(label))); }
    else l.append(document.createTextNode(tr(label)), input);
    form.append(l);
  }
  form.querySelector("input,textarea")?.focus();
}

function values() {
  const f = {};
  for (const el of $("form").elements) f[el.name] = el.type === "checkbox" ? el.checked : el.value;
  return f;
}

// WCAG relative luminance, as in the app's Codes.luminance
function lum(hex) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function colorProblem(fg, bg) {
  const a = lum(fg), b = lum(bg);
  if (a >= b) return "The squares must be darker than the background, or many cameras won't read it.";
  if ((b + 0.05) / (a + 0.05) < 4) return "These colors are too close. Pick a darker color or a lighter background.";
  return null;
}

function setSaving(on) {
  for (const id of ["png", "svg"]) {
    $(id).setAttribute("aria-disabled", on ? "false" : "true");
    if (!on) $(id).removeAttribute("href");
  }
}

function render() {
  const text = kind[3](values());
  const fg = $("fg").value, bg = $("bg").value;
  const problem = colorProblem(fg, bg);
  $("problem").textContent = problem ? tr(problem) : "";
  $("preview").replaceChildren();
  $("note").textContent = "";
  setSaving(false);
  if (!text) { $("note").textContent = tr("Fill in the fields to see your code."); return; }
  let q;
  try { q = qrcode(0, "M"); q.addData(text); q.make(); } catch (e) { $("note").textContent = tr("Too much for one code. Shorten it."); return; }
  const n = q.getModuleCount(), quiet = 4, side = n + quiet * 2;
  const scale = Math.max(4, Math.ceil(1024 / side));
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = side * scale;
  const g = canvas.getContext("2d");
  g.fillStyle = bg; g.fillRect(0, 0, canvas.width, canvas.height);
  g.fillStyle = fg;
  let path = "";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) {
    g.fillRect((c + quiet) * scale, (r + quiet) * scale, scale, scale);
    path += "M" + (c + quiet) + " " + (r + quiet) + "h1v1h-1z";
  }
  const img = document.createElement("img");
  img.alt = tr("Your code");
  img.src = canvas.toDataURL("image/png");
  $("preview").append(img);
  const name = "qr-" + Math.floor(Date.now() / 1000);
  if (!problem) {
    $("png").href = img.src; $("png").download = name + ".png";
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + side + " " + side + '" shape-rendering="crispEdges">' +
      '<rect width="100%" height="100%" fill="' + bg + '"/><path fill="' + fg + '" d="' + path + '"/></svg>';
    if (svgUrl) URL.revokeObjectURL(svgUrl);
    svgUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    $("svg").href = svgUrl; $("svg").download = name + ".svg";
    setSaving(true);
  }
}

for (const k of KINDS) {
  const b = document.createElement("button");
  b.type = "button"; b.role = "tab"; b.textContent = tr(k[1]);
  b.setAttribute("aria-selected", k === kind ? "true" : "false");
  b.addEventListener("click", () => {
    kind = k;
    $("kinds").querySelectorAll("button").forEach((x) => x.setAttribute("aria-selected", x === b ? "true" : "false"));
    buildForm(); render();
  });
  $("kinds").append(b);
}
$("fg").addEventListener("input", render);
$("bg").addEventListener("input", render);
$("form").addEventListener("submit", (e) => e.preventDefault());
buildForm();
render();
