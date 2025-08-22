(function () {
  const BASE_PDFJS_URL =
    "https://cdn.jsdelivr.net/gh/grininc/grin-ai-marketing-cdn@69e34d2/js/pdfjs-3.11.174-dist/build/";
  const PDF_JS_URL = BASE_PDFJS_URL + "pdf.min.js";
  const PDF_WORKER_URL = BASE_PDFJS_URL + "pdf.worker.min.js";

  // Slick (only if not already on the page)
  const SLICK_CSS =
    "https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick.css";
  const SLICK_JS =
    "https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick.min.js";

  const ARROW_IMG =
    "https://cdn.prod.website-files.com/686bf8b543c9e02cde4ff419/68a7998709105b554a757a63_SliderArrow.webp";

  // ---------- tiny utilities ----------
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      // avoid duplicates
      var scripts = document.scripts;
      for (var i = 0; i < scripts.length; i++) {
        if (scripts[i].src === src) return resolve();
      }
      var s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function loadStyle(href) {
    return new Promise(function (resolve, reject) {
      var links = document.querySelectorAll('link[rel="stylesheet"]');
      for (var i = 0; i < links.length; i++) {
        if (links[i].href === href) return resolve();
      }
      var l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = href;
      l.onload = resolve;
      l.onerror = reject;
      document.head.appendChild(l);
    });
  }

  function debounce(fn, wait) {
    var t;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, wait);
    };
  }

  // simple cookie helpers (no optional chaining)
  var Cookie = {
    get: function (name) {
      var parts = document.cookie.split("; ");
      for (var i = 0; i < parts.length; i++) {
        if (parts[i].indexOf(name + "=") === 0) {
          return parts[i].split("=")[1];
        }
      }
      return undefined;
    },
    set: function (name, value, days, path) {
      if (days == null) days = 7;
      if (!path) path = "/";
      var d = new Date();
      d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
      document.cookie =
        name + "=" + value + "; expires=" + d.toUTCString() + "; path=" + path;
    },
    remove: function (name, path) {
      if (!path) path = "/";
      document.cookie =
        name + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=" + path;
    },
  };

  // ---------- core renderer ----------
  async function ensureDeps() {
    // Slick
    await loadStyle(SLICK_CSS);
    await loadScript(SLICK_JS);
    // PDF.js
    await loadScript(PDF_JS_URL);
    var lib = resolvePdfLib();
    if (lib && lib.GlobalWorkerOptions) {
      lib.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
    }
  }

  function isInt(v) {
    return !isNaN(v) && parseInt(Number(v)) == v && !isNaN(parseInt(v, 10));
  }

  // One place to get/guard pdfjsLib and handle Safari fallback
  async function getDocSafe(url, opts) {
    var lib = resolvePdfLib();

    if (!lib || typeof lib.getDocument !== "function") {
      throw new Error("[pdf-viewer] pdfjsLib not available yet");
    }

    // Base options
    var base = opts || { url: url };

    // Safari compatibility: avoid cross-origin worker/range/stream issues
    var isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (isSafari) {
      // Prefer running without the worker on Safari (more reliable)
      lib.disableWorker = true;
      // Reduce CORS surface in Safari
      base.disableRange = true;
      base.disableStream = true;
      base.nativeImageDecoderSupport = "none";
    }

    try {
      return await lib.getDocument(base).promise;
    } catch (e) {
      console.warn(
        "[pdf-viewer] first getDocument failed, retrying no-worker",
        e
      );
      try {
        lib.disableWorker = true; // ensure fallback even if not Safari
        return await lib.getDocument(base).promise;
      } catch (e2) {
        console.error("[pdf-viewer] getDocument failed after fallback", e2);
        throw e2;
      }
    }
  }

  async function buildViewer(el) {
    var ds = el.dataset;
    var url = ds.link || "";
    var pageLimit = ds.pageLimit || "";
    var formId = ds.formId || "";
    var assetId = ds.assetId || "";
    var thankYou = ds.thankYouPage || "";
    var extraClasses = ds.classes || "";
    var autoDownload = (ds.autoDownload || "false") === "true";
    var arrowsInDots = (ds.arrowsInDots || "false") === "true";

    if (!url) {
      console.warn("pdf-viewer: missing data-link");
      return;
    }

    // shell structure
    el.innerHTML =
      '<a class="pdf-download-link"' +
      (autoDownload ? "" : ' style="display:none"') +
      ' href="' +
      url +
      '" download></a>' +
      '<div class="pdf-viewer-shell"></div>' +
      '<div class="last-page-form-container">' +
      '  <h3 class="download-header">Download Full Version</h3>' +
      "  <p>You reached the end of the preview. It takes 10 seconds to download the full pdf.</p>" +
      '  <div class="form-target content ' +
      extraClasses +
      '"' +
      '       data-form-id="' +
      formId +
      '"' +
      '       data-assetid="' +
      assetId +
      '"' +
      '       data-thankyou="' +
      thankYou +
      '"></div>' +
      "</div>";

    var shell = el.querySelector(".pdf-viewer-shell");

    // Auto-download if your cookie is present
    if (autoDownload) {
      var dl = el.querySelector(".pdf-download-link");
      if (Cookie.get("filled-pdf-form") !== undefined) {
        if (dl) dl.click(); // no optional chaining
        Cookie.remove("filled-pdf-form", "/");
      }
    }

    await ensureDeps();
    var lib = resolvePdfLib();
    if (!lib || typeof lib.getDocument !== "function") {
      console.error("[pdf-viewer] pdfjsLib failed to load");
      return;
    }

    // Load the document
    var doc = await getDocSafe(url);
    console.log("[pdf-viewer] loaded doc:", { numPages: doc.numPages, url });

    // ✅ mark as initialized only after doc is open
    el.setAttribute("data-pdf-init", "1");

    // resolve page limit
    var pagesAreLimited = true;
    if (!isInt(pageLimit)) {
      pageLimit = doc.numPages;
      pagesAreLimited = false;
    } else {
      pageLimit = parseInt(pageLimit, 10);
      pageLimit = Math.max(1, Math.min(pageLimit, doc.numPages));
    }

    // render pages
    await new Promise((r) => setTimeout(r, 50));
    var viewerWidth = shell.clientWidth || el.clientWidth || 900;
    var resolutionMultiplier = viewerWidth <= 850 ? 4 : 1; // match your heuristic
    var scaleBase = 3;

    function renderPage(pageNumber, canvas, mult) {
      console.log("[pdf-viewer] render page", pageNumber);

      return doc.getPage(pageNumber).then(function (page) {
        var viewport = page.getViewport({ scale: scaleBase });
        viewport = page.getViewport({
          scale: (viewerWidth / viewport.width) * scaleBase * mult,
        });
        var hMult = viewport.height / viewport.width;
        canvas.width = viewerWidth * mult;
        canvas.height = viewerWidth * hMult * mult;
        canvas.style.width = "100%";
        console.log("[pdf-viewer] canvas size", {
          viewerWidth: viewerWidth,
          mult: mult,
        });

        return page
          .render({
            canvasContext: canvas.getContext("2d"),
            viewport: viewport,
          })
          .promise.catch(function (e) {
            console.error("[pdf-viewer] render failed p" + pageNumber, e);
          });
      });
    }

    // add canvases
    for (var p = 1; p <= pageLimit; p++) {
      var canvas = document.createElement("canvas");
      canvas.className = "pdf-page-canvas";
      shell.appendChild(canvas);
      // fire and forget; sequencing not required
      renderPage(p, canvas, resolutionMultiplier);
    }

    // After last page: add overlay, init slick, add a11y text
    var finalize = async function () {
      if (pagesAreLimited) {
        var lastCanvas = shell.querySelector(".pdf-page-canvas:last-of-type");
        if (lastCanvas) {
          var lastWrap = document.createElement("div");
          lastWrap.className = "last-preview-page";
          lastCanvas.insertAdjacentElement("afterend", lastWrap);

          // move overlay into the slide
          var overlay = el.querySelector(".last-page-form-container");
          lastWrap.appendChild(overlay);

          // show overlay if it's a real form (no optional chaining)
          var overlayForm = overlay ? overlay.querySelector("form") : null;
          var overlayFormId = overlayForm
            ? overlayForm.getAttribute("data-formid")
            : null;
          if ((overlayFormId || formId) !== "form_id") {
            overlay.style.display = "flex";
          }

          // blur layer
          setTimeout(function () {
            var blur = document.createElement("div");
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
            jQuery(".slick-arrow").html('<img src="' + ARROW_IMG + '"/>');
            jQuery(".slick-dots button").html("");
            if (arrowsInDots) positionArrows(shell);
            window.addEventListener(
              "resize",
              debounce(function () {
                if (arrowsInDots) positionArrows(shell);
                centerFormOnSlider(overlay, lastWrap);
              }, 250)
            );
          }

          // center form
          centerFormOnSlider(overlay, lastWrap);

          // safari tweak
          setTimeout(function () {
            var isSafari = /^((?!chrome|android).)*safari/i.test(
              navigator.userAgent
            );
            if (isSafari) {
              var bg = lastWrap.querySelector(".background-blur");
              if (bg) bg.style.webkitBackdropFilter = "blur(11px)";
            }
          }, 5000);
        }
      }

      // a11y text extraction (reuse the same doc)
      try {
        var max = Math.min(pageLimit, doc.numPages);
        for (var j = 1; j <= max; j++) {
          var page = await doc.getPage(j);
          var tc = await page.getTextContent();
          var text = tc.items
            .map(function (s) {
              return s.str;
            })
            .join(" ");
          var h = document.createElement("h4");
          h.className = "screen-reader-pdf-text";
          h.textContent = "PDF Page " + j;
          var pEl = document.createElement("p");
          pEl.className = "screen-reader-pdf-text";
          pEl.textContent = text;
          shell.appendChild(h);
          shell.appendChild(pEl);
        }
      } catch (e) {
        console.warn("Text extraction failed:", e);
      }
    };

    // helper: center overlay
    function centerFormOnSlider(overlayEl, slideEl) {
      if (!overlayEl || !slideEl) return;
      var sliderH = slideEl.getBoundingClientRect().height;
      var formH = overlayEl.getBoundingClientRect().height;
      if (!sliderH || !formH) return;
      if (formH < sliderH) {
        var pad = (sliderH - formH) / 2;
        overlayEl.style.paddingTop = pad + "px";
        overlayEl.style.paddingBottom = pad + "px";
        overlayEl.style.height = "";
      } else {
        overlayEl.style.height = "100%";
      }
    }

    // helper: arrows position near dots
    function positionArrows(scope) {
      var container = scope.closest ? scope.closest(".pdf-viewer-shell") : null;
      var dots = (container || document).querySelector(".slick-dots");
      if (!dots) return;
      var dotsWidth = dots.getBoundingClientRect().width || 0;
      var margin = 20;
      var leftPos = "calc(50% - " + (dotsWidth / 2 + margin) + "px)";
      var rightPos = "calc(50% - " + (dotsWidth / 2 + margin) + "px)";
      var prev = (container || document).querySelector(".slick-prev");
      var next = (container || document).querySelector(".slick-next");
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
  async function initPdfViewers(root) {
    if (!root) root = document;
    // If any viewer wants slick, make sure it’s available first (safe even if none exist)
    await Promise.all([loadStyle(SLICK_CSS), loadScript(SLICK_JS)]);
    var nodes = root.querySelectorAll(
      "[data-pdf-viewer]:not([data-pdf-init='1'])"
    );

    for (var i = 0; i < nodes.length; i++) {
      await buildViewer(nodes[i]);
    }
  }

  // Expose globally so you can call it after Webflow/HubSpot scripts run, etc.
  window.initPdfViewers = initPdfViewers;

  // Robust auto-init whether DOM is already loaded or not
  function bootPdfViewers() {
    var any = document.querySelector("[data-pdf-viewer]");
    if (any) initPdfViewers();
  }

  function resolvePdfLib() {
    return window["pdfjsLib"] || window["pdfjs-dist/build/pdf"] || null;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootPdfViewers);
  } else {
    // DOM is already ready -> run now
    bootPdfViewers();
  }

  // Build viewers that appear later (CMS, tabs, IX, etc.)
  var mo = new MutationObserver(function (muts) {
    for (var i = 0; i < muts.length; i++) {
      var added = muts[i].addedNodes;
      for (var j = 0; j < added.length; j++) {
        var n = added[j];
        if (n.nodeType !== 1) continue;
        if (
          n.matches &&
          n.matches("[data-pdf-viewer]:not([data-pdf-init='1'])")
        ) {
          buildViewer(n);
        }
        var q =
          n.querySelectorAll &&
          n.querySelectorAll("[data-pdf-viewer]:not([data-pdf-init='1'])");
        if (q && q.length) {
          for (var k = 0; k < q.length; k++) buildViewer(q[k]);
        }
      }
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
})();
