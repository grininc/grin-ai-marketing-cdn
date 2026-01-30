(function ($) {
  if (window.__hsRawHtmlInitAttached) return;
  window.__hsRawHtmlInitAttached = true;

  // *** ADDED *** Config: which form to track + paths/titles
  const TARGET_FORM_ID = "a6ebbb2f-561c-41cc-8750-aa2d40b0210c";
  const VIEW_PATH_PREFIX = "/virtual/form-view/"; // becomes /virtual/form-view/<id>/<pathname>
  const VIEW_TITLE = "Form Viewed (virtual)";

  // Add reCAPTCHA disclosure just AFTER a HubSpot raw HTML form container
  function addRecaptchaDisclosureAfterContainer($container) {
    // avoid duplicates: only add if the *next* sibling is not already the disclosure
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

  // *** ADDED *** HS virtual pageview + session keys
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

  // Per-form success guard + location lookup
  window.__HS_FORM_DONE = window.__HS_FORM_DONE || new Set();
  window.__HS_FORM_LOC = window.__HS_FORM_LOC || {}; // { formId: locationId }

  // 1) Global success listener (fires for raw-HTML and iframe forms)
  (function attachHubSpotMessageListener() {
    if (window.__hsMsgListenerAttached) return;
    window.__hsMsgListenerAttached = true;

    window.addEventListener("message", function (event) {
      const d = event && event.data;
      if (!d || d.type !== "hsFormCallback") return;
      if (d.eventName !== "onFormSubmitted" || !d.id || !d.id.formId) return;

      const formId = d.id.formId;
      if (window.__HS_FORM_DONE.has(formId)) return; // already handled

      // *** ADDED *** mark submitted (for your own session logic / debugging)
      try {
        sessionStorage.setItem(submittedKey(formId), "1");
      } catch (e) {}

      // SUCCESS-ONLY actions here
      try {
        gaDataPushForHubspotForm(formId, d.data || {});
        jQuery(".hide-after-submission").hide();
        console.log("HS form_submission dataLayer push (postMessage)");
      } catch (e) {
        console.warn("GA push error", e);
      }

      const loc = window.__HS_FORM_LOC[formId] || "default";
      $.post(
        (window.hubspot_ajax && hubspot_ajax.ajaxurl) ||
          "/wp-admin/admin-ajax.php",
        { action: "custom_site_tracking_store_entry", location_id: loc }
      );

      window.__HS_FORM_DONE.add(formId);
    });
  })();

  function initializeHubSpotRawHtmlForm($container, $form) {
    try {
      const formEl = $form.get(0);
      if (!formEl || formEl.tagName !== "FORM") return;

      const formId = ($container.data("form-id") || "").trim();
      const formLocation = ($container.data("location") || "default").trim();
      const thankYouAttr = ($container.data("thankyou") || "").trim();

      // Remember location for postMessage hook
      if (formId) window.__HS_FORM_LOC[formId] = formLocation;

      // Example: visited pages hydrate
      const visitedPagesField = $form.find('input[name="visited_pages"]');
      if (visitedPagesField.length) {
        const visitedPages = JSON.parse(
          sessionStorage.getItem("visitedPages") || "[]"
        );
        visitedPagesField.val(visitedPages.join("\n"));
      }

      $container.attr({ "data-silktide": "ignore" });

      // We do NOT fire GA / AJAX in submit; we just mark that a submit happened.
      let submitted = false;
      $form.on("submit", function () {
        submitted = true;
      });

      // 2) Fallback success detector (DOM swap success message)
      const mo = new MutationObserver(() => {
        if (!submitted || !formId || window.__HS_FORM_DONE.has(formId)) return;

        const hasSuccess = $container.find(".hsfc-PostSubmit").length > 0;
        if (!hasSuccess) return;

        // *** ADDED *** mark submitted (for your own session logic / debugging)
        try {
          sessionStorage.setItem(submittedKey(formId), "1");
        } catch (e) {}

        // SUCCESS-ONLY actions (fallback path)
        try {
          gaDataPushForHubspotForm(formId, { submissionValues: {} });
          jQuery(".hide-after-submission").hide();
          console.log("HS form_submission dataLayer push (DOM success)");
        } catch (e) {}

        $.post(
          (window.hubspot_ajax && hubspot_ajax.ajaxurl) ||
            "/wp-admin/admin-ajax.php",
          {
            action: "custom_site_tracking_store_entry",
            location_id: formLocation,
          }
        );

        window.__HS_FORM_DONE.add(formId);
        mo.disconnect();
      });

      mo.observe($container.get(0), { childList: true, subtree: true });

      // *** ADDED *** Fire a one-time (per-session) virtual pageview for the target form
      if (formId === TARGET_FORM_ID) {
        try {
          const k = viewKey(formId);
          if (!sessionStorage.getItem(k)) {
            const path = `${VIEW_PATH_PREFIX}${formId}${window.location.pathname}`;
            hsVirtualPageview(path, VIEW_TITLE);
            sessionStorage.setItem(k, "1");
            // console.log("Virtual view fired for", formId, path);
          }
        } catch (e) {
          console.warn("Virtual view error", e);
        }
      }

      if (window.deDupeIds) {
        try {
          window.deDupeIds();
        } catch (e) {}
      }

      // === Add reCAPTCHA disclosure after this form container ===
      try {
        addRecaptchaDisclosureAfterContainer($container);
      } catch (e) {
        console.warn("Failed to add reCAPTCHA disclosure (raw HTML)", e);
      }
    } catch (e) {
      console.error("HubSpot raw-HTML init failed:", e);
    }
  }

  function observeHsRawHtmlContainers(ctx) {
    const root = ctx || document;
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

    $(".hs-form-html", root).each(function () {
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

  $(observeHsRawHtmlContainers);
})(jQuery);
