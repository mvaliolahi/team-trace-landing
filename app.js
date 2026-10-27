/* team·trace landing — behavior: language toggle, preview, reveal, email copy. */
"use strict";

(function () {
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const STORE_KEY = "tt-lang";
  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── language ─────────────────────────────────────────── */
  let lang = "fa";

  function t(key) {
    return (I18N[lang] && I18N[lang][key]) || I18N.fa[key] || "";
  }

  function applyLang(next) {
    lang = next;
    const rtl = lang === "fa";
    document.documentElement.lang = lang;
    document.documentElement.dir = rtl ? "rtl" : "ltr";
    document.title = t("meta.title");
    const md = $('meta[name="description"]');
    if (md) md.setAttribute("content", t("meta.desc"));
    $$("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (I18N[lang][key] !== undefined) el.textContent = I18N[lang][key];
    });
    $$("[data-i18n-attr]").forEach((el) => {
      el.getAttribute("data-i18n-attr").split(";").forEach((pair) => {
        const [attr, key] = pair.split(":").map((s) => s.trim());
        if (attr && key && I18N[lang][key] !== undefined) el.setAttribute(attr, I18N[lang][key]);
      });
    });
    const toggle = $("#lang-toggle");
    if (toggle) {
      toggle.textContent = rtl ? "EN" : "فا";
      toggle.setAttribute("aria-label", rtl ? "Switch to English" : "تغییر به فارسی");
    }
    try { localStorage.setItem(STORE_KEY, lang); } catch (e) { /* private mode */ }
    renderPreview();
  }

  const toggle = $("#lang-toggle");
  if (toggle) {
    toggle.addEventListener("click", () => {
      applyLang(lang === "fa" ? "en" : "fa");
    });
  }

  /* ── hero preview ─────────────────────────────────────── */
  const stack = $("#pv-stack");
  const nameEl = $("#pv-name");
  let activeRole = "cto";
  let rotateTimer = null;
  let paused = 0;

  function barHeights(values) {
    const peak = Math.max.apply(null, values);
    return values.map((v) => (peak > 0 ? Math.max(8, Math.round((v / peak) * 100)) : 8));
  }

  function paneHTML(roleId) {
    const d = PV_DATA[lang][roleId];
    const metrics = d.metrics
      .map(
        (m) => `<div class="pv-card"><dt>${m.label}</dt><dd>
          <strong class="tone-${m.tone}">${m.value}</strong>
          <span>${m.note}</span></dd></div>`
      )
      .join("");
    const bars = barHeights(d.trend)
      .map((h, i) => `<i style="height:${h}%"${i === d.trend.length - 1 ? ' class="is-last"' : ""}></i>`)
      .join("");
    const findings = d.findings
      .map(
        (f) => `<li><span class="pv-tone tone-${f.tone}">${t("pv.tone" + (f.tone === "good" ? "Good" : "Watch"))}</span>
          <p>${f.text}</p><em>${f.source}</em></li>`
      )
      .join("");
    return `<div class="pv-pane" data-pane="${roleId}" role="tabpanel">
      <div class="pv-card pv-verdict">
        <span class="pv-ring" style="--score:${PV_ROLE_SCORE[roleId]}"><b>${d.score}</b></span>
        <span class="pv-verdict-copy">
          <small>${t("pv.health")} · ${t("pv.of")}</small>
          <strong>${d.verdict}</strong>
          <span>${d.detail}</span>
        </span>
      </div>
      <dl class="pv-metrics">${metrics}</dl>
      <div class="pv-card pv-trend">
        <small>${d.trendLabel}</small>
        <div class="pv-bars">${bars}</div>
      </div>
      <div class="pv-card pv-findings">
        <small>${t("pv.findings")}</small>
        <ul>${findings}</ul>
      </div>
    </div>`;
  }

  function renderPreview() {
    if (!stack) return;
    const roles = ["cto", "cpo", "lead"];
    const scroll = window.scrollY;
    stack.innerHTML = roles.map(paneHTML).join("");
    activate(activeRole, false);
    if (nameEl) nameEl.textContent = PV_DATA[lang][activeRole].name;
    window.scrollTo(window.scrollX, scroll);
    bindRoleButtons();
  }

  function activate(roleId, updateName) {
    activeRole = roleId;
    $$(".pv-pane", stack).forEach((p) => {
      p.classList.toggle("is-active", p.getAttribute("data-pane") === roleId);
    });
    $$(".pv-roles button").forEach((b) => {
      const on = b.getAttribute("data-role") === roleId;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    if (updateName && nameEl) nameEl.textContent = PV_DATA[lang][activeRole].name;
  }

  function bindRoleButtons() {
    $$(".pv-roles button").forEach((b) => {
      const pick = () => {
        stopRotation();
        activate(b.getAttribute("data-role"), true);
      };
      b.addEventListener("click", pick);
      b.addEventListener("mouseenter", pauseRotation);
      b.addEventListener("mouseleave", resumeRotation);
      b.addEventListener("focusin", pauseRotation);
      b.addEventListener("focusout", resumeRotation);
    });
  }

  function nextRole() {
    const order = ["cto", "cpo", "lead"];
    activate(order[(order.indexOf(activeRole) + 1) % order.length], true);
  }
  function startRotation() {
    stopRotation();
    if (REDUCED) return;
    rotateTimer = setInterval(() => {
      if (!document.hidden && isPreviewVisible()) nextRole();
    }, 6000);
  }
  function stopRotation() { if (rotateTimer) { clearInterval(rotateTimer); rotateTimer = null; } }
  function pauseRotation() { paused += 1; stopRotation(); }
  function resumeRotation() {
    paused = Math.max(0, paused - 1);
    if (paused === 0) startRotation();
  }
  function isPreviewVisible() {
    const el = $("#preview");
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < innerHeight;
  }

  const previewEl = $("#preview");
  if (previewEl) {
    previewEl.addEventListener("mouseenter", pauseRotation);
    previewEl.addEventListener("mouseleave", resumeRotation);
    previewEl.addEventListener("focusin", pauseRotation);
    previewEl.addEventListener("focusout", resumeRotation);
  }

  /* ── reveal on scroll ─────────────────────────────────── */
  function setupReveal() {
    const targets = [
      [$(".section-head"), "reveal"],
      [$(".source-inner"), "reveal"],
      [$(".path"), "stagger"],
      [$(".role-grid"), "stagger"],
      [$(".bento"), "stagger"],
      [$(".ask-grid"), "stagger"],
      [$(".how-grid"), "stagger"],
      [$(".deploy-grid"), "stagger"],
      [$(".order-steps"), "stagger"],
      [$(".evidence-card"), "reveal"],
      [$(".evidence-copy"), "reveal"],
      [$(".order-cta"), "reveal"],
      [$(".closing-panel"), "reveal"],
      [$(".hero-copy"), "reveal"]
    ];
    targets.forEach(([el, cls]) => { if (el) el.classList.add(cls); });

    if (REDUCED || !("IntersectionObserver" in window)) {
      $$(".reveal,.stagger").forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    $$(".reveal,.stagger").forEach((el) => io.observe(el));
  }

  /* ── email copy toast ─────────────────────────────────── */
  const toast = $("#toast");
  let toastTimer = null;
  function showToast() {
    if (!toast) return;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
  }
  const copyBtn = $("#copy-email");
  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      const text = copyBtn.getAttribute("data-copy");
      const done = () => showToast();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(done);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); } catch (e) { /* noop */ }
        document.body.removeChild(ta);
        done();
      }
    });
  }

  /* ── boot ─────────────────────────────────────────────── */
  let saved = null;
  try { saved = localStorage.getItem(STORE_KEY); } catch (e) { /* noop */ }
  if (saved === "en" || saved === "fa") {
    if (saved !== "fa") applyLang(saved); else renderPreview();
  } else {
    renderPreview();
  }
  setupReveal();
  startRotation();
})();
