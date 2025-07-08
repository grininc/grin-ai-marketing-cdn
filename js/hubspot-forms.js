jQuery(document).ready(function ($) {
  var region = "na1";
  var portalId = "45956814";

  function activateOnValidEmailInput(form, targetClass) {
    // Find the email input element within the form
    var emailInput = $('input[name="email"]', form);

    // Check if the email input exists in the form
    if (emailInput.length) {
      // Listen for input events on the email input field
      emailInput.on("input", function () {
        var targetElement = $(form).find("." + targetClass);

        // Get the current value of the email input
        var emailValue = $(this).val();

        // Email validation regex
        var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        // Validate the email and toggle the 'active' class
        if (emailRegex.test(emailValue)) {
          targetElement.addClass("active");
        } else {
          targetElement.removeClass("active");
        }
      });
    }
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

  // Function to populate UTM parameters
  function populateUtmParameters(form) {
    try {
      var hsContext = form.querySelector('input[name="hs_context"]').value;
      var contextData = JSON.parse(hsContext);

      if (contextData.urlParams) {
        $('input[name="source_last_utm_campaign__c"]', form).val(
          contextData.urlParams.utm_campaign || ""
        );
        $('input[name="source_last_utm_term__c"]', form).val(
          contextData.urlParams.utm_term || ""
        );
        $('input[name="source_last_utm_content__c"]', form).val(
          contextData.urlParams.utm_content || ""
        );
        $('input[name="source_last_utm_medium__c"]', form).val(
          contextData.urlParams.utm_medium || ""
        );
        $('input[name="source_last_utm_source__c"]', form).val(
          contextData.urlParams.utm_source || ""
        );
        $('input[name="gclid__c"]', form).val(
          contextData.urlParams.gclid || ""
        );
      }
    } catch (e) {
      console.error("Failed to parse hs_context:", e);
    }
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

      hbspt.forms.create({
        region: region,
        portalId: portalId,
        formId: formId,
        target: "#" + uniqueTargetId,
        formInstanceId: uniqueTargetId,
        onFormReady: function ($form) {
          var form = $form.get(0);
          var isDemo = false;

          activateOnValidEmailInput(form, "hs_how_did_you_hear_about_us"); //makes this field appear when email is filled in

          addFilledInClass(form);
          handleInputChanges(form);

          // Delay Chili Piper deploy to ensure form is fully rendered
          //   setTimeout(function () {
          //     // Check if this is the form that needs Chili Piper deploy
          //     if (form.id.includes("f33b536d-0861-486a-b700-d64d5c811821")) {
          //       ChiliPiper.deploy("grin", "inbound-demo", {
          //         query: 'form[id*="f33b536d-0861-486a-b700-d64d5c811821"]',
          //       });
          //     }
          //     if (form.id.includes("1c127825-94d4-4152-8ca1-62d8bf73699f")) {
          //       ChiliPiper.deploy("grin", "jerrell-router", {
          //         query: 'form[id*="1c127825-94d4-4152-8ca1-62d8bf73699f"]',
          //       });
          //     }
          //   }, 500); // Adjust delay as needed

          populateUtmParameters(form);
          populateLiFatId(form); //populate linked in id from url param

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
        },
        onFormSubmitted: function ($form, data) {
          //SUCCESSFUL SUBMISSION

          //gaDataPushForHubspotForm(formId, data);

          if (
            formId == "f33b536d-0861-486a-b700-d64d5c811821" ||
            formId == "d74c91d6-df0d-4096-8c02-9ced0df2471a" ||
            formId == "1c127825-94d4-4152-8ca1-62d8bf73699f" //This is the Feb 2025 version of the demo form
          ) {
            //these forms never redirect under this logic but can still redirect under chilipiper logic:
          } else {
            // Redirect to a custom thank you page if redirectUrl is not set
            if (!data.redirectUrl) {
              var thankYouPage = "/thank-you";
              var newThankYou = "";

              if (target.getAttribute("data-thankyou")) {
                newThankYou = target.getAttribute("data-thankyou");
                thankYouPage = newThankYou;
              }

              //If the form isn't specified to a thank you page or 'none' thank you page
              //then it will go to /inbound-thank-you if its the demo form, the essential in-app form, or the event meetign request form
              //otherwise, it will go to /thank-you
              if (thankYouPage != "none") {
                if (formId == "bc12bce7-3426-4bd0-bd4b-73436c77b2ee") {
                  if (newThankYou == "") {
                    thankYouPage = "/inbound-thank-you";
                  }
                }
                window.location.href = thankYouPage;
              } else {
                if (jQuery(target).hasClass("toggle-switch")) {
                  jQuery(".toggle-block").toggleClass("active");
                }
              }
            }
          }
        },
      });
    }
  });
});

//function for pushing to dataLayer for Google Analytics
function gaDataPushForHubspotForm(formId, data) {
  let formsData = {
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

function populateLiFatId(form) {
  // parse the URL params
  var params = new URLSearchParams(window.location.search);
  var liFatId = params.get("li_fat_id");
  if (liFatId) {
    // set the hidden input’s value
    $('input[name="li_fat_id"]', form).val(liFatId);
  }
}
