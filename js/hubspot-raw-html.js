(function () {
  if (window.__hsRawHtmlInitAttached) return;
  window.__hsRawHtmlInitAttached = true;

  const $ = window.jQuery; // Webflow usually provides this

  const TARGET_FORM_ID = "a6ebbb2f-561c-41cc-8750-aa2d40b0210c";
  const VIEW_PATH_PREFIX = "/virtual/form-view/";
  const VIEW_TITLE = "Form Viewed (virtual)";

  function addRecaptchaDisclosureAfterContainer($container) {
    if ($container.next(".recaptcha-disclosure").length) return;

    var $notice = $(
      '<p class="recaptcha-disclosure">' +
        "This site is protected by reCAPTCHA and the Google " +
        '<a href="https://www.google.com/intl/en/policies/privacy/" target="_blank" rel="noopener noreferrer">Privacy Policy</a> ' +
        "and " +
        '<a href="https://www.google.com/intl/en/policies/terms/" target="_blank" rel="noopener noreferrer">Terms of Service</a> apply.' +
        "</p>"
    );

    $container.after($notice);
  }

  function hsVirtualPageview(path, title) {
    window._hsq = window._hsq || [];
    if (title) window._hsq.push(["setDocumentTitle", title]);
    window._hsq.push(["setPath", path]);
    window._hsq.push(["trackPageView"]);
  }

  function viewKey(formId) {
    return `hs_form_viewed_${formId}`;
  }
  function submittedKey(formId) {
    return `hs_form_submitted_${formId}`;
  }

  window.__HS_FORM_DONE = window.__HS_FORM_DONE || new Set();
  window.__HS_FORM_LOC = window.__HS_FORM_LOC || {};

  (function attachHubSpotMessageListener() {
    if (window.__hsMsgListenerAttached) return;
    window.__hsMsgListenerAttached = true;

    window.addEventListener("message", function (event) {
      const d = event && event.data;
      if (!d || d.type !== "hsFormCallback") return;
      if (d.eventName !== "onFormSubmitted" || !d.id || !d.id.formId) return;

      const formId = d.id.formId;
      if (window.__HS_FORM_DONE.has(formId)) return;

      try {
        sessionStorage.setItem(submittedKey(formId), "1");
      } catch (e) {}

      try {
        if (typeof window.gaDataPushForHubspotForm === "function") {
          window.gaDataPushForHubspotForm(formId, d.data || {});
        }
        if ($) $(".hide-after-submission").hide();
      } catch (e) {
        console.warn("GA push error", e);
      }

      window.__HS_FORM_DONE.add(formId);
    });
  })();

  function initializeHubSpotRawHtmlForm($container, $form) {
    const formEl = $form.get(0);
    if (!formEl || formEl.tagName !== "FORM") return;

    const formId = ($container.data("form-id") || "").trim();
    const formLocation = ($container.data("location") || "default").trim();

    if (formId) window.__HS_FORM_LOC[formId] = formLocation;

    const visitedPagesField = $form.find('input[name="visited_pages"]');
    if (visitedPagesField.length) {
      try {
        const visitedPages = JSON.parse(
          sessionStorage.getItem("visitedPages") || "[]"
        );
        visitedPagesField.val(visitedPages.join("\n"));
      } catch (e) {}
    }

    $container.attr({ "data-silktide": "ignore" });

    let submitted = false;
    $form.on("submit", function () {
      submitted = true;
    });

    const mo = new MutationObserver(() => {
      if (!submitted || !formId || window.__HS_FORM_DONE.has(formId)) return;

      const hasSuccess = $container.find(".hsfc-PostSubmit").length > 0;
      if (!hasSuccess) return;

      try {
        sessionStorage.setItem(submittedKey(formId), "1");
      } catch (e) {}

      try {
        if (typeof window.gaDataPushForHubspotForm === "function") {
          window.gaDataPushForHubspotForm(formId, { submissionValues: {} });
        }
        if ($) $(".hide-after-submission").hide();
      } catch (e) {}

      window.__HS_FORM_DONE.add(formId);
      mo.disconnect();
    });

    mo.observe($container.get(0), { childList: true, subtree: true });

    if (formId === TARGET_FORM_ID) {
      try {
        const k = viewKey(formId);
        if (!sessionStorage.getItem(k)) {
          const path = `${VIEW_PATH_PREFIX}${formId}${window.location.pathname}`;
          hsVirtualPageview(path, VIEW_TITLE);
          sessionStorage.setItem(k, "1");
        }
      } catch (e) {
        console.warn("Virtual view error", e);
      }
    }

    // Optional WP helper: keep only if you also define it on Webflow
    if (typeof window.deDupeIds === "function") {
      try {
        window.deDupeIds();
      } catch (e) {}
    }

    try {
      addRecaptchaDisclosureAfterContainer($container);
    } catch (e) {
      console.warn("Failed to add reCAPTCHA disclosure", e);
    }
  }

  function observeHsRawHtmlContainers() {
    if (!$) {
      console.warn("This script expects jQuery (Webflow usually provides it).");
      return;
    }

    const process = ($c) => {
      if ($c.data("hsInited")) return;

      const $form = $c.find("form").first();
      if ($form.length) {
        initializeHubSpotRawHtmlForm($c, $form);
        $c.data("hsInited", true).attr("data-hs-inited", "1");
        return;
      }

      const mo = new MutationObserver(() => {
        const $f = $c.find("form").first();
        if ($f.length) {
          initializeHubSpotRawHtmlForm($c, $f);
          $c.data("hsInited", true).attr("data-hs-inited", "1");
          mo.disconnect();
        }
      });
      mo.observe($c.get(0), { childList: true, subtree: true });
    };

    $(".hs-form-html").each(function () {
      process($(this));
    });

    const pageMo = new MutationObserver((muts) => {
      muts.forEach((m) => {
        (m.addedNodes || []).forEach((n) => {
          if (n.nodeType !== 1) return;
          const $n = $(n);
          if ($n.is(".hs-form-html")) process($n);
          $n.find(".hs-form-html").each(function () {
            process($(this));
          });
        });
      });
    });

    pageMo.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  // Webflow-safe boot
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", observeHsRawHtmlContainers);
  } else {
    observeHsRawHtmlContainers();
  }
})();
