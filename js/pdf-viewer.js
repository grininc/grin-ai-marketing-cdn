(function () {
  const BASE_PDFJS_URL =
    "https://cdn.jsdelivr.net/gh/grininc/grin-ai-marketing-cdn@69e34d2/js/pdfjs-3.11.174-dist/build/";
  const PDF_JS_URL = `${BASE_PDFJS_URL}/pdf.min.js`;
  const PDF_WORKER_URL = `${BASE_PDFJS_URL}/pdf.worker.min.js`;

  // Slick (only if not already on the page)
  const SLICK_CSS =
    "https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick.css";
  const SLICK_JS =
    "https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick.min.js";

  const ARROW_IMG =
    "https://cdn.prod.website-files.com/686bf8b543c9e02cde4ff419/68a7998709105b554a757a63_SliderArrow.webp";

  // ---------- tiny utilities ----------
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      // avoid duplicates
      if ([...document.scripts].some((s) => s.src === src)) return resolve();
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function loadStyle(href) {
    return new Promise((resolve, reject) => {
      // avoid duplicates
      if (
        [...document.querySelectorAll('link[rel="stylesheet"]')].some(
          (l) => l.href === href
        )
      )
        return resolve();
      const l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = href;
      l.onload = resolve;
      l.onerror = reject;
      document.head.appendChild(l);
    });
  }

  function debounce(fn, wait) {
    let t;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, wait);
    };
  }

  // simple cookie helpers (replaces jQuery.cookie)
  const Cookie = {
    get(name) {
      return document.cookie
        .split("; ")
        .find((r) => r.startsWith(name + "="))
        ?.split("=")[1];
    },
    set(name, value, days = 7, path = "/") {
      const d = new Date();
      d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
      document.cookie = `${name}=${value}; expires=${d.toUTCString()}; path=${path}`;
    },
    remove(name, path = "/") {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}`;
    },
  };

  // ---------- one-time CSS  ----------
  const STYLE_ID = "pdf-viewer-core-style";
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
#pdf-viewer, .pdf-viewer-shell { width: 100%; height: 100%; position: relative; padding-bottom: 35px; }
.textLayer{ display:none; }
.pdf-page-canvas { display:block; margin:6px auto; border-radius:8px; }
.slick-slider .pdf-page-canvas { cursor:grab; margin:0 auto; }
.slick-slider .pdf-page-canvas:active { cursor:grab; }
.pdf-viewer-shell .slick-list{ margin:0 20px; overflow-y:visible; overflow-x:hidden; box-shadow:0 4px 12px rgb(0 0 0 / 25%); border-radius:8px; }
.slick-arrow img{ width:20px; transition:.3s; }
.slick-arrow img:hover, .slick-arrow.slick-disabled img{ opacity:.5; }
.shadow-arrows .slick-arrow img{ background:#33333322; box-shadow:0 0 12px 9px #33333322; }
.slick-next img{ transform:rotate(180deg); }
.slick-dots{ position:absolute; bottom:10px; left:50%; transform:translate(-50%,0); display:flex; list-style:none; }
.slick-dots li{ width:20px; display:flex; justify-content:center; margin:0 5px; }
.slick-dots li button{ background-color:rgba(98,103,255,.6); border-radius:20px; transition:.3s; width:8px; height:8px; }
.slick-dots li.slick-active button, .slick-dots li:hover button{ background-color:rgba(98,103,255,1); }
.last-page-form-container{ display:none; flex-direction:column; position:absolute; top:0; left:0; width:100%; align-items:center; padding:20px; z-index:10; overflow:auto; }
.background-blur{ z-index:8; -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); background:rgba(255,255,255,.67); position:absolute; top:0; left:0; width:100%; height:100%; }
.last-page-form-container p{ font-size:14px; line-height:18px; text-align:center; margin-bottom:20px; }
.last-page-form-container h1, .last-page-form-container h3{ text-align:center; font-weight:600; }
.slick-slide.last-preview-page{ position:relative; overflow:hidden; background:rgba(255,255,255,.67) }
.screen-reader-pdf-text{ position:absolute; left:-10000px; top:auto; width:1px; height:1px; overflow:hidden; }
.pdf-download-link{ display:none; }

/* media-query logic previously keyed by form_id */
@media screen and (max-width: 650px){
  .last-page-form-container{ height:unset; }
}
@media screen and (min-width: 992px) and (max-width: 1180px){
  .last-page-form-container{ height:unset; }
}
    `;
    document.head.appendChild(style);
  }

  // ---------- core renderer ----------
  async function ensureDeps() {
    // Slick
    await loadStyle(SLICK_CSS);
    await loadScript(SLICK_JS);
    // PDF.js
    await loadScript(PDF_JS_URL);
    if (window["pdfjsLib"]) {
      window["pdfjsLib"].GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
    }
  }

  function isInt(v) {
    return !isNaN(v) && parseInt(Number(v)) == v && !isNaN(parseInt(v, 10));
  }

  async function buildViewer(el) {
    const ds = el.dataset;
    const url = ds.link || "";
    let pageLimit = ds.pageLimit || "";
    const formId = ds.formId || "";
    const assetId = ds.assetId || "";
    const thankYou = ds.thankYouPage || "";
    const extraClasses = ds.classes || "";
    const autoDownload = (ds.autoDownload || "false") === "true";
    const arrowsInDots = (ds.arrowsInDots || "false") === "true";

    if (!url) {
      console.warn("pdf-viewer: missing data-link");
      return;
    }

    // shell structure
    el.innerHTML = `
      <a class="pdf-download-link" ${autoDownload ? "" : 'style="display:none"'} href="${url}" download></a>
      <div class="pdf-viewer-shell"></div>
      <div class="last-page-form-container">
        <h3 class="download-header">Download Full Version</h3>
        <p>You reached the end of the preview. It takes 10 seconds to download the full pdf.</p>
        <div class="form-target content ${extraClasses}"
             data-form-id="${formId}"
             data-assetid="${assetId}"
             data-thankyou="${thankYou}"></div>
      </div>
    `;

    const shell = el.querySelector(".pdf-viewer-shell");

    // Auto-download if your cookie is present
    if (autoDownload) {
      const dl = el.querySelector(".pdf-download-link");
      if (Cookie.get("filled-pdf-form") !== undefined) {
        dl?.click();
        Cookie.remove("filled-pdf-form", "/");
      }
    }

    await ensureDeps();
    const pdfjsLib = window["pdfjsLib"];
    const doc = await pdfjsLib.getDocument(url).promise;

    // resolve page limit
    let pagesAreLimited = true;
    if (!isInt(pageLimit)) {
      pageLimit = doc.numPages;
      pagesAreLimited = false;
    } else {
      pageLimit = parseInt(pageLimit, 10);
      pageLimit = Math.max(1, Math.min(pageLimit, doc.numPages));
    }

    // render pages
    const viewerWidth = shell.clientWidth || el.clientWidth || 900;
    let resolutionMultiplier = viewerWidth <= 850 ? 4 : 1; // match your heuristic
    const scaleBase = 3;

    function renderPage(pageNumber, canvas, mult) {
      return doc.getPage(pageNumber).then((page) => {
        let viewport = page.getViewport({ scale: scaleBase });
        viewport = page.getViewport({
          scale: (viewerWidth / viewport.width) * scaleBase * mult,
        });
        const hMult = viewport.height / viewport.width;
        canvas.width = viewerWidth * mult;
        canvas.height = viewerWidth * hMult * mult;
        canvas.style.width = "100%";
        return page.render({ canvasContext: canvas.getContext("2d"), viewport })
          .promise;
      });
    }

    // add canvases
    for (let p = 1; p <= pageLimit; p++) {
      const canvas = document.createElement("canvas");
      canvas.className = "pdf-page-canvas";
      shell.appendChild(canvas);
      // fire and forget; sequencing not required
      renderPage(p, canvas, resolutionMultiplier);
    }

    // After last page: add overlay, init slick, add a11y text
    const finalize = async () => {
      if (pagesAreLimited) {
        const lastCanvas = shell.querySelector(".pdf-page-canvas:last-of-type");
        if (lastCanvas) {
          const lastWrap = document.createElement("div");
          lastWrap.className = "last-preview-page";
          lastCanvas.insertAdjacentElement("afterend", lastWrap);

          // move overlay into the slide
          const overlay = el.querySelector(".last-page-form-container");
          lastWrap.appendChild(overlay);
          // show overlay if it's a real form
          if (
            (overlay.querySelector("form")?.getAttribute("data-formid") ||
              formId) !== "form_id"
          ) {
            overlay.style.display = "flex";
          }

          // blur layer
          setTimeout(() => {
            const blur = document.createElement("div");
            blur.className = "background-blur";
            lastWrap.appendChild(blur);
          }, 100);

          // init slick if >1 page
          if (
            pageLimit > 1 &&
            typeof jQuery !== "undefined" &&
            typeof jQuery(shell).slick === "function"
          ) {
            jQuery(shell).slick({
              dots: true,
              infinite: false,
              adaptiveHeight: true,
            });
            jQuery(".slick-arrow").html(`<img src="${ARROW_IMG}"/>`);
            jQuery(".slick-dots button").html("");
            if (arrowsInDots) positionArrows(shell);
            window.addEventListener(
              "resize",
              debounce(() => {
                if (arrowsInDots) positionArrows(shell);
                centerFormOnSlider(overlay, lastWrap);
              }, 250)
            );
          } else {
            // single page – nothing to init
          }

          // center form
          centerFormOnSlider(overlay, lastWrap);

          // safari tweak (as in your code)
          setTimeout(() => {
            const isSafari = /^((?!chrome|android).)*safari/i.test(
              navigator.userAgent
            );
            if (isSafari) {
              const bg = lastWrap.querySelector(".background-blur");
              if (bg) bg.style.webkitBackdropFilter = "blur(11px)";
            }
          }, 5000);
        }
      }

      // a11y text extraction (lightweight version)
      try {
        const textDoc = await pdfjsLib.getDocument(url).promise;
        const texts = [];
        for (let j = 1; j <= Math.min(pageLimit, textDoc.numPages); j++) {
          const page = await textDoc.getPage(j);
          const tc = await page.getTextContent();
          texts.push(tc.items.map((s) => s.str).join(" "));
        }
        texts.forEach((t, idx) => {
          const h = document.createElement("h4");
          h.className = "screen-reader-pdf-text";
          h.textContent = `PDF Page ${idx + 1}`;
          const p = document.createElement("p");
          p.className = "screen-reader-pdf-text";
          p.textContent = t;
          shell.appendChild(h);
          shell.appendChild(p);
        });
      } catch (e) {
        console.warn("Text extraction failed:", e);
      }
    };

    // helper: center overlay
    function centerFormOnSlider(overlayEl, slideEl) {
      if (!overlayEl || !slideEl) return;
      const sliderH = slideEl.getBoundingClientRect().height;
      const formH = overlayEl.getBoundingClientRect().height;
      if (!sliderH || !formH) return;
      if (formH < sliderH) {
        const pad = (sliderH - formH) / 2;
        overlayEl.style.paddingTop = pad + "px";
        overlayEl.style.paddingBottom = pad + "px";
        overlayEl.style.height = "";
      } else {
        overlayEl.style.height = "100%";
      }
    }

    // helper: arrows position near dots
    function positionArrows(scope) {
      const dots = (
        scope.closest(".pdf-viewer-shell") || document
      ).querySelector(".slick-dots");
      if (!dots) return;
      const dotsWidth = dots.getBoundingClientRect().width || 0;
      const margin = 20;
      const leftPos = `calc(50% - ${dotsWidth / 2 + margin}px)`;
      const rightPos = `calc(50% - ${dotsWidth / 2 + margin}px)`;
      const prev = (
        scope.closest(".pdf-viewer-shell") || document
      ).querySelector(".slick-prev");
      const next = (
        scope.closest(".pdf-viewer-shell") || document
      ).querySelector(".slick-next");
      if (prev) prev.style.left = leftPos;
      if (next) {
        next.style.left = "unset";
        next.style.right = rightPos;
      }
    }

    // give the DOM a moment so widths are correct, then finalize
    setTimeout(finalize, 300);
  }

  // ---------- Public API (your “shortcode” initializer) ----------
  async function initPdfViewers(root = document) {
    // If any viewer wants slick, make sure it’s available first (safe to call even if none exist)
    await Promise.all([loadStyle(SLICK_CSS), loadScript(SLICK_JS)]);
    const nodes = root.querySelectorAll("[data-pdf-viewer]");
    for (const n of nodes) await buildViewer(n);
  }

  // Expose globally so you can call it after Webflow/HubsSpot scripts run, etc.
  window.initPdfViewers = initPdfViewers;

  // Auto-init on DOM ready if any viewers exist
  document.addEventListener("DOMContentLoaded", () => {
    const any = document.querySelector("[data-pdf-viewer]");
    if (any) initPdfViewers();
    // resize centering behavior is handled per-instance
  });
})();
