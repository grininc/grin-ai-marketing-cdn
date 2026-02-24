/*! Global reCAPTCHA response neutralizer (handles textarea + input, incl. late injections) */
(function ($) {
  if (window.__recaptchaNeutralizerSetup) return; // guard against double-setup
  window.__recaptchaNeutralizerSetup = true;

  const esc = (s) =>
    window.CSS && CSS.escape ? CSS.escape(s) : String(s).replace(/"/g, '\\"');

  function neutralizeRecaptchaEverywhere(ctx = document) {
    const $ctx = $(ctx);

    $ctx
      .find(
        'textarea.g-recaptcha-response, textarea[name="g-recaptcha-response"], input[name="g-recaptcha-response"]'
      )
      .each(function (i, el) {
        const $el = $(el);
        const id = el.id || "";
        const tag = el.tagName.toLowerCase();

        // Detach any labels targeting this control
        if (id) {
          $ctx
            .find(`label[for="${esc(id)}"]`)
            .removeAttr("for")
            .attr("aria-hidden", "true")
            .addClass("sr-only");
        }

        // Keep out of accessibility tree/tab order
        $el.attr({
          "aria-hidden": "true",
          tabindex: "-1",
          "data-silktide": "ignore",
        });

        // Visually hide / truly hide
        if (tag === "input") {
          el.type = "hidden";
        } else {
          // textarea (Google expects a textarea tag to remain)
          $el.attr("hidden", "").css("display", "none");
        }

        // Hide likely wrappers so scanners don’t surface them
        $el
          .closest(
            ".hs_recaptcha, .g-recaptcha, .grecaptcha-badge, .hs-form-field, .field, .input, div"
          )
          .attr({ "aria-hidden": "true", role: "presentation" });
      });
  }

  // Expose for manual calls
  window.neutralizeRecaptchaResponse = neutralizeRecaptchaEverywhere;

  // Initial pass on the whole document
  $(neutralizeRecaptchaEverywhere);

  // Observe DOM for late-inserted reCAPTCHA nodes
  const mo = new MutationObserver((muts) => {
    for (const m of muts) {
      for (const n of m.addedNodes) {
        if (n.nodeType !== 1) continue;
        if (
          n.matches?.(
            'textarea.g-recaptcha-response,[name="g-recaptcha-response"]'
          ) ||
          $(n).find(
            'textarea.g-recaptcha-response,[name="g-recaptcha-response"]'
          ).length
        ) {
          neutralizeRecaptchaEverywhere();
          return;
        }
      }
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
})(jQuery);

/* ===== Duplicate reCAPTCHA/HubSpot id de-duper =====
   - Keeps the first element's id as-is
   - Renames 2nd+ matches to <base>-2, <base>-3, ...
   - Covers: script#recaptcha AND input/textarea#hs-recaptcha-response
==================================================== */
(function deDupeIds() {
  function renameDupesFor(baseId, selector) {
    const nodes = document.querySelectorAll(selector);
    if (nodes.length <= 1) return;

    // start at 2 for the second instance
    let n = 2;

    // Leave nodes[0] alone; rename the rest
    for (let i = 1; i < nodes.length; i++) {
      let newId;
      // find a free id (skip if taken by something else already)
      do {
        newId = `${baseId}-${n++}`;
      } while (document.getElementById(newId));
      nodes[i].id = newId;
    }
  }

  function renameAll() {
    renameDupesFor("recaptcha", "script#recaptcha");
    renameDupesFor(
      "hs-recaptcha-response",
      "textarea#hs-recaptcha-response, input#hs-recaptcha-response"
    );
  }

  // Run immediately (handles already-duplicated DOM)
  renameAll();

  // Watch for future injections (HubSpot / Google)
  const obs = new MutationObserver((muts) => {
    let needsRun = false;

    for (const m of muts) {
      for (const n of m.addedNodes || []) {
        if (n.nodeType !== 1) continue; // ELEMENT_NODE

        // direct matches
        if (
          n.id === "recaptcha" ||
          n.id === "hs-recaptcha-response" ||
          (n.tagName === "SCRIPT" &&
            /recaptcha\/enterprise\.js/i.test(n.src || ""))
        ) {
          needsRun = true;
          break;
        }

        // descendants added
        if (
          n.querySelector &&
          n.querySelector(
            "script#recaptcha, textarea#hs-recaptcha-response, input#hs-recaptcha-response"
          )
        ) {
          needsRun = true;
          break;
        }
      }
      if (needsRun) break;
    }

    if (needsRun) renameAll();
  });

  obs.observe(document.documentElement, { childList: true, subtree: true });
})();

jQuery(document).ready(function ($) {
  //Form ID: af00997b-b586-4eaa-81cc-a126f4f154cb = Content
  //Form ID: f33b536d-0861-486a-b700-d64d5c811821 = Demo
  //Form ID: 1c127825-94d4-4152-8ca1-62d8bf73699f = Demo (Feb 2025)
  //Form ID: d74c91d6-df0d-4096-8c02-9ced0df2471a = Essential In-App Demo
  //Form ID: bc12bce7-3426-4bd0-bd4b-73436c77b2ee = Event Meeting Request
  //Form ID: 9234b3f9-7a3d-453c-a226-c317cfc34ba2 = 2024 Preference Center
  //Form ID: 86ceff14-8f74-4f56-ae78-60ce628ec857 = 3 Minute Quick Demo
  //Form ID: f586fbb0-bc6a-4f6d-9b9c-c275fc77b0d9 = 2024 Preference Opt In
  //Form ID: 2c959d00-95a8-415b-b8a2-636b151836a0 = Content - Long
  //Form ID: 69371849-5f43-4232-95df-83206daeb3d4 = Podcast Subscription
  //Form ID: 0713e698-2689-4e8a-9737-1e0dab734525 = Newsletter Subscription
  //Form ID: 75ddf51c-84df-420c-a04d-96c1911b3aaa = Mini Demo Form
  //Form ID: 17bb7dd5-50bc-45d8-8ace-231f15e1fe7d = Creator Waitlist Form
  //Form ID: 35667a37-a3ee-44b2-9e61-c2cd4c1f7211 = Blog Subscription
  //Form ID: 697c4ece-3901-4c9d-9b31-0ae94d4d06f5 = Customer - ProServe Interest
  //Form ID: 5f1fc3af-290c-47fa-9229-6fe673c6b020 = Customer Referral
  //Form ID: 4abd1dc0-ae33-470d-b642-cf85e3e16b34 = Campaign Finder Opt-In

  var region = "na1";
  var portalId = "45956814";

  /**
   * Known eTLDs (effective TLDs / public suffixes) for URL validation.
   * Single-part (e.g. com, org) and multi-part (e.g. co.uk, com.au).
   * Subset of the Public Suffix List for common / viable TLDs.
   */
  var KNOWN_ETLDS = (function () {
    var single =
      "ac ad ae aero af ag ai al am ao aq ar as at au aw ax az ba bb bd be bf bg bh bi biz bj bm bn bo br bs bt bw by bz ca cat cc cd cf cg ch ci ck cl cm cn co com coop cr cu cv cw cx cy cz de dev dj dk dm do dz ec edu ee eg es et eu fi fj fm fo fr ga gb gd ge gf gg gh gi gl gm gn gov gp gq gr gs gt gu gw gy hk hm hn hr ht hu id ie il im in info int io iq ir is it je jm jo jp ke kg kh ki km kn kp kr kw ky kz la lb lc li lk lr ls lt lu lv ly ma mc md me mg mh mil mk ml mm mn mo mobi mp mq mr ms mt mu museum mv mw mx my mz na name nc ne net nf ng ni nl no np nr nu nz om org pa pe pf pg ph pk pl pm pn pr pro ps pt pw py qa re ro rs ru rw sa sb sc sd se sg sh si sk sl sm sn so sr st su sv sx sy sz tc td tf tg th tj tk tl tm tn to tr travel tt tv tw tz ua ug uk us uy uz va vc ve vg vi vn vu wf ws xxx ye za zm zw app blog cloud digital email fit host link live me site space store tech online website wiki work".split(
        " "
      );
    var multi =
      "co.uk org.uk me.uk net.uk ac.uk gov.uk com.au net.au org.au edu.au gov.au id.au asn.au co.au com.br net.br org.br gov.br co.nz net.nz org.nz ac.nz co.za net.za org.za web.za gov.za ac.za com.mx co.jp ne.jp or.jp ac.jp go.jp com.ar com.co com.es co.at co.il co.kr com.my com.ph com.sg com.tr com.tw com.ve com.vn co.id co.th co.nz com.ng com.pk com.ua com.eg com.sa com.do com.ec com.pt com.cu com.py com.uy com.bo com.ec com.gt com.hn com.sv com.ni com.cr com.pa com.ve".split(
        " "
      );
    var set = Object.create(null);
    single.forEach(function (t) {
      set[t.toLowerCase()] = true;
    });
    multi.forEach(function (t) {
      set[t.toLowerCase()] = true;
    });
    return set;
  })();

  /**
   * Get the effective TLD (public suffix) from a hostname, e.g. "co.uk" or "com".
   * Returns null if no known eTLD found.
   */
  function getEtld(hostname) {
    if (!hostname || hostname.indexOf(".") === -1) return null;
    var parts = hostname.toLowerCase().split(".");
    var n = parts.length;
    if (n >= 2) {
      var two = parts.slice(-2).join(".");
      if (KNOWN_ETLDS[two]) return two;
    }
    if (n >= 1) {
      var one = parts[n - 1];
      if (KNOWN_ETLDS[one]) return one;
    }
    return null;
  }

  /**
   * Returns true if the string looks like a valid URL (with or without protocol)
   * and has a viable eTLD (effective top-level domain).
   * @param {string} value
   * @returns {boolean}
   */
  function isValidUrl(value) {
    if (!value || !String(value).trim()) return false;
    var trimmed = String(value).trim();
    try {
      var toParse = trimmed.match(/^https?:\/\//i)
        ? trimmed
        : "https://" + trimmed;
      var url = new URL(toParse);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        return false;
      }
      var hostname = (url.hostname || "").toLowerCase();
      var eTLD = getEtld(hostname);
      var ok = !!eTLD;
      return ok;
    } catch (e) {
      return false;
    }
  }

  /**
   * Attach validation for brand_website: prevent submit if value is not URL-shaped.
   * Call only for forms that contain input[name="brand_website"].
   */
  function attachBrandWebsiteValidation($form) {
    var form = $form.get(0);
    var $input = $form.find('input[name="brand_website"]');
    if (!$input.length) return;

    var $field = $input.closest(".hs-form-field, .field");
    var errorClass = "brand-website-url-error";
    var $existingError = $field.find("." + errorClass);
    if (!$existingError.length) {
      $input.after(
        '<span class="' +
          errorClass +
          '" style="display: none; color: #f95717; font-size: 0.9em; margin-top: 4px;">Please enter a valid URL (e.g. example.com)</span>'
      );
    }
    var $error = $field.find("." + errorClass);

    function validateAndShowError() {
      var val = $input.val();
      var isEmpty = !val.trim();
      var urlValid = isValidUrl(val);
      var valid = isEmpty || urlValid;
      if (!valid) {
        $error.show();
        return false;
      }
      $error.hide();
      return true;
    }

    $input.on("input change blur", function () {
      if ($error.is(":visible") && isValidUrl($input.val())) {
        $error.hide();
      }
    });

    form.addEventListener(
      "submit",
      function (e) {
        if (!validateAndShowError()) {
          e.preventDefault();
          e.stopPropagation();
          $input.one("focus", function () {
            $error.show();
          });
          $input[0].focus();
          return false;
        }
      },
      true
    );
    // Also intercept submit button click in case HubSpot submits via click, not form submit
    form.addEventListener(
      "click",
      function (e) {
        var t = e.target;
        if (
          (t.tagName === "INPUT" && t.getAttribute("type") === "submit") ||
          (t.tagName === "BUTTON" && t.getAttribute("type") === "submit")
        ) {
          if (!validateAndShowError()) {
            e.preventDefault();
            e.stopPropagation();
            $error.show();
            $input[0].focus();
            return false;
          }
        }
      },
      true
    );
  }

  function removeLabelsForHiddenInputs(form) {
    const $f = jQuery(form);
    const esc = (s) =>
      window.CSS && CSS.escape ? CSS.escape(s) : s.replace(/"/g, '\\"');

    $f.find('input[type="hidden"]').each(function () {
      const $input = jQuery(this);
      const id = this.id || "";
      const $field = $input.closest(".hs-form-field, .field, .input");

      // Remove labels that point to this input (handle hyphen/underscore variants HubSpot sometimes emits)
      const candidates = [
        id,
        id.replace(/_/g, "-"),
        id.replace(/-/g, "_"),
      ].filter(Boolean);
      candidates.forEach((v) => $f.find(`label[for="${esc(v)}"]`).remove());

      // Also remove any label inside the same field wrapper
      $field.find("label").remove();

      // Keep it out of the accessibility tree (hidden inputs aren’t labelable anyway)
      $field.attr({ "aria-hidden": "true", role: "presentation" });
      // If needed, ensure it can’t be revealed by scanners that force visibility:
      // $field.attr('hidden', '').css('display','none');
    });
  }

  // Function to add 'float-label' class to parent of pre-filled inputs
  function addFilledInClass(form) {
    form
      .querySelectorAll(
        'input[type="text"], input[type="email"], input[type="tel"], input[type="number"]'
      )
      .forEach(function (input) {
        if (input.value) {
          input.closest(".hs-form-field").classList.add("float-label");
        }
      });
  }

  // Function to handle input changes dynamically
  function handleInputChanges(form) {
    $(form).on(
      "input",
      'input[type="text"], input[type="email"], input[type="tel"], input[type="number"]',
      function () {
        if ($(this).val()) {
          $(this).closest(".hs-form-field").addClass("float-label");
        } else {
          $(this).closest(".hs-form-field").removeClass("float-label");
        }
      }
    );

    $(form).on(
      "focus",
      'input[type="text"], input[type="email"], input[type="tel"], input[type="number"]',
      function () {
        $(this).closest(".hs-form-field").addClass("float-label");
      }
    );

    $(form).on(
      "blur",
      'input[type="text"], input[type="email"], input[type="number"]',
      function () {
        if (!$(this).val()) {
          $(this).closest(".hs-form-field").removeClass("float-label");
        }
      }
    );
  }

  // Helper that sets value, mirrors to attribute, and fires events
  function setFieldAndNotify(form, name, val) {
    const $inputs = jQuery(`input[name="${name}"]`, form);
    if (!$inputs.length) return false;
    $inputs
      .val(val)
      .attr("value", val)
      .each(function () {
        this.dispatchEvent(new Event("input", { bubbles: true }));
        this.dispatchEvent(new Event("change", { bubbles: true }));
      });
    return true;
  }

  function populateUtmParameters(form) {
    let contextData;
    try {
      const hsContext =
        form.querySelector('input[name="hs_context"]')?.value || "{}";
      contextData = JSON.parse(hsContext);
    } catch (e) {
      console.error("Failed to parse hs_context:", e);
      return;
    }

    const p = (contextData && contextData.urlParams) || {};
    // Nothing to do?
    if (!p || Object.keys(p).length === 0) return;

    const mappings = [
      ["source_last_utm_campaign__c", p.utm_campaign || ""],
      ["source_last_utm_term__c", p.utm_term || ""],
      ["source_last_utm_content__c", p.utm_content || ""],
      ["source_last_utm_medium__c", p.utm_medium || ""],
      ["source_last_utm_source__c", p.utm_source || ""],
      ["gclid__c", p.gclid || ""],
    ];

    // A single application pass
    const apply = () => {
      mappings.forEach(([name, val]) => {
        if (val === "") return; // skip empty
        setFieldAndNotify(form, name, val);
      });
    };

    // 1) Apply immediately
    apply();

    // 2) Retry a few times (handles late field injections by ZoomInfo/HS)
    [1000, 3000].forEach((ms) => setTimeout(apply, ms));
  }

  // Select all divs with the class 'form-target'
  var targets = document.querySelectorAll(".form-target");

  targets.forEach(function (target, index) {
    var formId = target.getAttribute("data-form-id");

    if (formId) {
      //make sure formId exists

      // Create a unique ID for each target div
      var uniqueTargetId = "hs-form-" + index;
      target.id = uniqueTargetId;

      var formLocation = "default"; // Initialize with 'default'

      hbspt.forms.create({
        region: region,
        portalId: portalId,
        formId: formId,
        target: "#" + uniqueTargetId,
        formInstanceId: uniqueTargetId,
        onFormReady: function ($form) {
          var form = $form.get(0);
          var isDemo = false;

          jQuery(form)
            .find('input[name="compliance_explicit_opt_in__c"]')
            .parent()
            .attr("data-silktide", "ignore");

          ensureFieldsetLegends(form);

          // Sync the revenue fields
          if (formId == "1c127825-94d4-4152-8ca1-62d8bf73699f") {
            syncRevenueFields(form);
            isDemo = true;
            // Attach validations and error displays
            attachCombinedValidation($form, isDemo);
            attachSubmitClickError($form, isDemo);
          }

          addFilledInClass(form);
          handleInputChanges(form);
          neutralizeRecaptchaResponse();

          // Check if the data-assetid attribute exists
          var assetId = target.getAttribute("data-assetid");
          if (assetId) {
            // Set the value of the existing asset_identifier field
            $('input[name="asset_identifier"]', form).val(assetId);
          }

          populateUtmParameters(form);

          removeLabelsForHiddenInputs(form);

          attachBrandWebsiteValidation($form);

          // Populate the visited_pages field if it exists
          var visitedPagesField = $('input[name="visited_pages"]', form);
          if (visitedPagesField.length) {
            // Get visited pages from session storage and join them with line breaks
            var visitedPages = JSON.parse(
              sessionStorage.getItem("visitedPages") || "[]"
            );
            visitedPagesField.val(visitedPages.join("\n"));
          }

          if (typeof Choices !== "undefined") {
            form.querySelectorAll("select").forEach(function (selectEl) {
              new Choices(selectEl, {
                searchEnabled: false,
                itemSelectText: "",
                shouldSort: false,
              });
            });
          }

          // === Add reCAPTCHA disclosure BELOW the form embed ===
          try {
            const $target = $form.parent(); // .form-target wrapper

            // Only add once per form container
            if (!$target.next().hasClass("recaptcha-disclosure")) {
              var disclosureHtml = $(
                '<p class="recaptcha-disclosure">' +
                  "This site is protected by reCAPTCHA and the Google " +
                  '<a href="https://www.google.com/intl/en/policies/privacy/" target="_blank" rel="noopener noreferrer">Privacy Policy</a> ' +
                  "and " +
                  '<a href="https://www.google.com/intl/en/policies/terms/" target="_blank" rel="noopener noreferrer">Terms of Service</a> apply.' +
                  "</p>"
              );

              $target.after(disclosureHtml);
            }
          } catch (e) {
            console.error("Failed to add reCAPTCHA disclosure", e);
          }
        },
        onFormSubmitted: function ($form, data) {
          //SUCCESSFUL SUBMISSION
          if ($("#unboxed-gate").length) {
            $("#unboxed-gate").hide();
          }

          gaDataPushForHubspotForm(formId, data);

          // Redirect to a custom thank you page if redirectUrl is not set
          if (!data.redirectUrl) {
            var thankYouPage = "/thank-you";
            var newThankYou = "";

            if (target.getAttribute("data-thankyou")) {
              newThankYou = target.getAttribute("data-thankyou");
              thankYouPage = newThankYou;
            }

            //this cookie will make the pdf download automatically
            if (thankYouPage.indexOf("/pdf/") !== -1) {
              if (Cookiebot.consent.preferences) {
                //check if they consented to preference cookies
                if (jQuery.cookie("filled-pdf-form") == undefined) {
                  //if cookie doesn't exist, create it
                  jQuery.cookie("filled-pdf-form", 1, {
                    expires: 30,
                    path: "/",
                  });
                }
              } else {
                //This case means they did not consent to preference cookies
                if (jQuery.cookie("filled-pdf-form") != undefined) {
                  //if cookie exists, delete it
                  jQuery.removeCookie("filled-pdf-form", { path: "/" });
                }
              }
            }

            //If the form isn't specified to a thank you page or 'none' thank you page
            //then it will go to /inbound-thank-you if its the demo form, the essential in-app form, or the event meetign request form
            //otherwise, it will go to /thank-you
            if (thankYouPage != "none") {
              if (
                formId == "bc12bce7-3426-4bd0-bd4b-73436c77b2ee" ||
                formId == "1c127825-94d4-4152-8ca1-62d8bf73699f"
              ) {
                if (newThankYou == "") {
                  thankYouPage = "/inbound-thank-you";
                }
              }

              if (jQuery(target).hasClass("get-report")) {
                var websiteInput = data.submissionValues.brand_website;

                if (websiteInput) {
                  const separator = thankYouPage.includes("?") ? "&" : "?";
                  thankYouPage +=
                    separator +
                    "brandUrl=" +
                    encodeURIComponent(websiteInput.trim());
                }
              }

              window.location.href = thankYouPage;
            } else {
              if (jQuery(target).hasClass("toggle-switch")) {
                jQuery(".toggle-block").toggleClass("active");
                jQuery(".post-sub-hide").css("display", "none");
              }
            }
          }
        },
      });
    }
  });

  //this gives the functions to the window so other files can see them
  // window.HubspotHelpers = {
  //   populateUtmParameters,
  // };
});

//function for pushing to dataLayer for Google Analytics
function gaDataPushForHubspotForm(formId, data) {
  let formsData = {
    "dbec66e2-3a0e-4852-a731-e6001c67d340": {
      name: "GRIN Essentials - Plan Update Request",
      type: "plan update request",
    },
    "a6ebbb2f-561c-41cc-8750-aa2d40b0210c": {
      name: "GRIN Essentials Free Trial Request",
      type: "free trial sign up",
    },
    "745d5fcf-e7fd-4007-b63f-32d3e35f2211": {
      name: "Join Waitlist (Phase 1)",
      type: "waitlist",
    },
    "cfd14c16-675a-447e-aaf1-eea4ebba1006": {
      name: "Get Report Form",
      type: "get report",
    },
    "f33b536d-0861-486a-b700-d64d5c811821": { name: "Demo", type: "demo" },
    "1c127825-94d4-4152-8ca1-62d8bf73699f": { name: "Demo", type: "demo" }, //this is the feb 2025 version of the demo form
    "af00997b-b586-4eaa-81cc-a126f4f154cb": {
      name: "Content",
      type: "resource download",
    },
    "86ceff14-8f74-4f56-ae78-60ce628ec857": {
      name: "3 Minute Quick Demo",
      type: "demo",
    },
    "0713e698-2689-4e8a-9737-1e0dab734525": {
      name: "Newsletter Subscription",
      type: "subscription",
    },
    "35667a37-a3ee-44b2-9e61-c2cd4c1f7211": {
      name: "Blog Subscription",
      type: "subscription",
    },
    "69371849-5f43-4232-95df-83206daeb3d4": {
      name: "Podcast Subscription",
      type: "subscription",
    },
    "2c959d00-95a8-415b-b8a2-636b151836a0": {
      name: "Content - Long",
      type: "resource download",
    },
    "75ddf51c-84df-420c-a04d-96c1911b3aaa": {
      name: "Mini Demo Form",
      type: "demo",
    },
    "5f1fc3af-290c-47fa-9229-6fe673c6b020": {
      name: "Customer Referral",
      type: "referral",
    },
    "bc12bce7-3426-4bd0-bd4b-73436c77b2ee": {
      name: "Event Meeting Request",
      type: "event",
    },
    "d74c91d6-df0d-4096-8c02-9ced0df2471a": {
      name: "Essential In-App Demo",
      type: "demo",
    },
    "17bb7dd5-50bc-45d8-8ace-231f15e1fe7d": {
      name: "Creator Waitlist Form",
      type: "subscription",
    },
    "697c4ece-3901-4c9d-9b31-0ae94d4d06f5": {
      name: "Customer - ProServe Interest",
      type: "subscription",
    },
    "9234b3f9-7a3d-453c-a226-c317cfc34ba2": {
      name: "2024 Preference Center",
      type: "subscription",
    },
    "4abd1dc0-ae33-470d-b642-cf85e3e16b34": {
      name: "Campaign Finder Opt-In",
      type: "subscription",
    },
    "f586fbb0-bc6a-4f6d-9b9c-c275fc77b0d9": {
      name: "2024 Preference Opt In",
      type: "subscription",
    },
  };
  console.log("HS form_submission dataLayer push");

  try {
    dataLayer.push({
      event: "form_submission",
      form_action: "success",
      form_type: formsData[formId].type,
      form_title: formsData[formId].name,
      prospect_type: data.submissionValues.prospect_type__c,
      number_of_employees: data.submissionValues.company_number_of_employees,
    });
  } catch {
    console.log("Error pushing data layer");
  }
}

function ensureFieldsetLegends(formEl) {
  const form = formEl instanceof jQuery ? formEl.get(0) : formEl;
  if (!form) return;

  // per-form counter, only for fieldsets missing a legend
  let n = 1;

  const addLegends = () => {
    form.querySelectorAll("fieldset").forEach((fs) => {
      // ignore hidden/presentational groups
      if (fs.matches('[aria-hidden="true"], [hidden], [role="presentation"]'))
        return;

      // already has a (direct child) legend?
      if ([...fs.children].some((ch) => ch.tagName === "LEGEND")) return;

      const legend = document.createElement("legend");
      // if you prefer visible legends, remove this class
      legend.className = "sr-only";
      legend.textContent = `Fieldset ${n++}`;
      fs.insertBefore(legend, fs.firstChild);
    });
  };

  // initial pass
  addLegends();

  // watch for HubSpot injecting more fieldsets/fields
  const mo = new MutationObserver(() => addLegends());
  mo.observe(form, { childList: true, subtree: true });
}

function syncRevenueFields(form) {
  var $form = jQuery(form);
  var $companyRevenue = $form.find('input[name="company_revenue"]');
  var $annualRevenue = $form.find('input[name="annual_revenue__c"]');

  // Only proceed if both fields exist
  if (!$companyRevenue.length || !$annualRevenue.length) {
    return;
  }

  // Create a MutationObserver to watch for value changes on the hidden field
  var observer = new MutationObserver(function (mutationsList) {
    for (var mutation of mutationsList) {
      // Check if the 'value' attribute changed
      if (
        mutation.type === "attributes" &&
        mutation.attributeName === "value"
      ) {
        // The hidden field's value changed
        var newValue = $companyRevenue.val();

        // 1) Set the input's .value property (what gets submitted)
        $annualRevenue.val(newValue);

        // 2) Also set the "value" attribute if you want devtools to reflect it
        $annualRevenue.attr("value", newValue);

        // 3) Dispatch input/change events so any watchers or frameworks see the update
        $annualRevenue[0].dispatchEvent(new Event("input", { bubbles: true }));
        $annualRevenue[0].dispatchEvent(new Event("change", { bubbles: true }));

        $annualRevenue.closest(".hs-annual_revenue__c").addClass("float-label");
        console.log("company_revenue changed → annual_revenue__c updated");
      }
    }
  });

  // Start observing the hidden field for attribute changes
  observer.observe($companyRevenue[0], {
    attributes: true,
    attributeFilter: ["value"],
  });
}

function attachCombinedValidation($form, isDemo) {
  // Ensure the email error message exists
  if ($form.find(".custom-error").length === 0) {
    var errorMessage = jQuery(
      '<p class="custom-error" style="display: none; color: #ea5662;">.edu emails are not allowed</p>'
    );
    $form.find('input[name="email"]').after(errorMessage);
  }

  // Validate when the email input changes
  $form.find('input[name="email"]').on("input", function () {
    validateSubmission($form, isDemo);
  });

  // Validate when the compliance checkbox changes
  $form
    .find('input[name="compliance_explicit_opt_in__c"]')
    .on("change", function () {
      validateSubmission($form, isDemo);
    });

  // Run validation once on load in case of pre-filled values
  validateSubmission($form, isDemo);
}

function validateSubmission($form, isDemo) {
  var email = $form.find('input[name="email"]').val().trim();
  var submitButton = $form.find('input[type="submit"]');

  // Email validation
  var emailIsNotEmpty = email.length > 0;
  var emailHasEdu = emailIsNotEmpty && email.toLowerCase().endsWith(".edu");
  var emailValid = emailIsNotEmpty && !emailHasEdu;

  // Compliance checkbox validation (if it exists)
  var complianceValid = true;
  if ($form.find('input[name="compliance_explicit_opt_in__c"]').length > 0) {
    complianceValid = $form
      .find('input[name="compliance_explicit_opt_in__c"]')
      .is(":checked");
  }

  // Show/hide the .edu error message
  var errorMessage = $form.find(".custom-error");
  if (emailIsNotEmpty && emailHasEdu) {
    errorMessage.show();
  } else {
    errorMessage.hide();
  }

  // Enable the submit button only if email and compliance are valid.
  if (emailValid && complianceValid) {
    submitButton.prop("disabled", false);
    submitButton.parent().css("opacity", "1");
  } else {
    submitButton.prop("disabled", true);
    submitButton.parent().css("opacity", "0.6");
  }
}

function attachSubmitClickError($form, isDemo) {
  // Attach a hover (mouseenter) event to the container with class "hs_submit"
  jQuery($form).on("mouseenter", ".hs_submit", function () {
    var submitButton = $form.find("input[type='submit']");
    // Only proceed if the submit button is disabled
    if (submitButton.prop("disabled")) {
      // Compliance checkbox validation error
      if (
        $form.find('input[name="compliance_explicit_opt_in__c"]').length > 0
      ) {
        if (
          !$form
            .find('input[name="compliance_explicit_opt_in__c"]')
            .is(":checked")
        ) {
          var complianceLabel = $form.find(
            "label[for^='compliance_explicit_opt_in__c']"
          );
          if (complianceLabel.find(".checkbox-error").length === 0) {
            complianceLabel
              .find(".hs-form-required")
              .after(
                '<span class="checkbox-error" style="color: #ea5662; margin-left: 10px;">Please check this box.</span>'
              );
          } else {
            complianceLabel.find(".checkbox-error").show();
          }
        }
      }
    }
  });

  // Hide the compliance error when the checkbox state changes
  if ($form.find('input[name="compliance_explicit_opt_in__c"]').length > 0) {
    $form
      .find('input[name="compliance_explicit_opt_in__c"]')
      .on("change", function () {
        var complianceLabel = $form.find(
          "label[for^='compliance_explicit_opt_in__c']"
        );
        complianceLabel.find(".checkbox-error").hide();
      });
  }
}
