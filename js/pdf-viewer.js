// Disable Canvas Image Downloading
//document.addEventListener('contextmenu', event => event.preventDefault());

// Loaded via <script> tag, create shortcut to access PDF.js exports.
var pdfjsLib = window["pdfjs-dist/build/pdf"];

// The workerSrc property shall be specified.
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "/wp-content/themes/cwicly-child/js/pdfjs-3.11.174-dist/build/pdf.worker.js";

var url = document.getElementById("pdf-src").value; // your file location and file name with ext.
var pageLimit = document.getElementById("pdf-page-limit").value;
var thePdf = null;
var viewer = null;
var scale = 3;
var resolutionMultiplier = 1;

jQuery(document).ready(function () {
  if (jQuery("#pdf-download-link").length > 0) {
    if (jQuery.cookie("filled-pdf-form") != undefined) {
      //if cookie exists, that means they filled out a pdf form so the pdf should download. then delete the cookie
      document.getElementById("pdf-download-link").click();
      jQuery.removeCookie("filled-pdf-form", { path: "/" });
    }
  }

  jQuery(window).resize(
    debounce(function () {
      centerFormOnSlider();
    }, 250)
  );
});

pdfjsLib.getDocument(url).promise.then(function (pdf) {
  thePdf = pdf;
  viewer = document.getElementById("pdf-viewer");

  var formIsSeparated = jQuery(
    ".last-page-form-container .form-target"
  ).hasClass("form-is-separated");
  console.log("Is true? " + formIsSeparated);

  if (viewer.clientWidth <= 850) {
    //if it's a small pdf size, render at a higher resolution
    resolutionMultiplier = 4;
  }

  pageLimit = parseInt(pageLimit, 10);
  var pagesAreLimited = true;
  if (!isInt(pageLimit)) {
    pageLimit = pdf.numPages;
    pagesAreLimited = false;
  }

  for (let page = 1; page <= pageLimit; page++) {
    canvas = document.createElement("canvas");
    canvas.className = "pdf-page-canvas";
    viewer.appendChild(canvas);
    renderPage(page, canvas, resolutionMultiplier);
    if (page === pageLimit) {
      if (pagesAreLimited) {
        var lastPagePreviewFormId = jQuery(
          ".last-page-form-container form"
        ).attr("data-formid");
        var isSafari = /^((?!chrome|android).)*safari/i.test(
          navigator.userAgent
        );

        if (pageLimit > 1) {
          if (formIsSeparated) {
            jQuery(".pdf-page-canvas:last").after(
              "<div class='last-preview-page separated-last-page'></div>"
            );
            jQuery(jQuery(".last-page-form-container").detach()).appendTo(
              ".last-preview-page"
            );
          } else {
            jQuery(".pdf-page-canvas:last").wrap(
              "<div class='last-preview-page'></div>"
            );
            jQuery(jQuery(".last-page-form-container").detach()).appendTo(
              ".last-preview-page"
            );
          }

          setTimeout(function () {
            jQuery("<div>", {
              class: "background-blur",
            }).appendTo(".last-preview-page");
          }, 100);

          if (lastPagePreviewFormId != "form_id") {
            jQuery(".last-page-form-container").css("display", "flex");
          }

          jQuery("#pdf-viewer").slick({
            dots: true,
            infinite: false,
            adaptiveHeight: true,
          });

          jQuery(".slick-arrow").html(
            '<img src="https://grin.co/wp-content/uploads/2022/11/SliderArrow.webp"/>'
          );
          jQuery(".slick-dots button").html("");

          if (jQuery("#pdf-viewer").hasClass("arrows-in-dots")) {
            positionArrows();

            jQuery(window).resize(function () {
              positionArrows();
            });
          }

          setTimeout(function () {
            if (isSafari) {
              jQuery(".background-blur").css(
                "-webkit-backdrop-filter",
                "blur(11px)"
              );
            }
          }, 5000);
        }
        if (pageLimit === 1) {
          jQuery("#pdf-viewer").addClass("single-page-pdf");
        }
      }
      // waiting on gettext to finish completion, or error
      setTimeout(function () {
        gettext(url).then(function (text) {
          var pageArray = text.split(" PAGEBREAK ");
          for (var t = 0; t < pageLimit; t++) {
            jQuery(
              '<h4 class="screen-reader-pdf-text">PDF Page ' +
                (t + 1) +
                '</h4><p class="screen-reader-pdf-text">' +
                pageArray[t] +
                "</p>"
            ).appendTo("#pdf-viewer");
          }
        });
        centerFormOnSlider();
      }, 1200);
    }
  }
});

function renderPage(pageNumber, canvas, resolutionMultiplier) {
  thePdf.getPage(pageNumber).then(function (page) {
    viewport = page.getViewport({ scale: scale });
    viewport = page.getViewport({
      scale:
        (viewer.clientWidth / viewport.width) * scale * resolutionMultiplier,
    });
    multiplierForHeight = viewport.height / viewport.width; //multiply this number by width to get the height
    canvas.width = viewer.clientWidth * resolutionMultiplier;
    canvas.height =
      viewer.clientWidth * multiplierForHeight * resolutionMultiplier;
    canvas.style.width = "100%";
    page.render({ canvasContext: canvas.getContext("2d"), viewport: viewport });
  });
}

function gettext(pdfUrl) {
  var pdf = pdfjsLib.getDocument(pdfUrl);
  return pdf.promise.then(function (pdf) {
    // get all pages text
    var maxPages = pdf.numPages;
    var countPromises = []; // collecting all page promises
    for (var j = 1; j <= maxPages; j++) {
      var page = pdf.getPage(j);

      var txt = "";
      countPromises.push(
        page.then(function (page) {
          // add page promise
          var textContent = page.getTextContent();
          return textContent.then(function (text) {
            // return content promise
            return text.items
              .map(function (s) {
                return s.str;
              })
              .join(" "); // value page text
          });
        })
      );
    }
    // Wait for all pages and join text
    return Promise.all(countPromises).then(function (texts) {
      return texts.join(" PAGEBREAK ");
    });
  });
}

function isInt(value) {
  return (
    !isNaN(value) &&
    parseInt(Number(value)) == value &&
    !isNaN(parseInt(value, 10))
  );
}

function scrollToFinalSlide() {
  jQuery("#pdf-viewer.slick-slider li")
    .last()
    .find("button")
    .first()
    .trigger("click");
  jQuery("html, body").animate(
    {
      scrollTop: jQuery("#pdf-viewer").offset().top - 100,
    },
    500
  );
}

function centerFormOnSlider() {
  //The following will center the form on the last preview page of a pdf slider
  let sliderHeight = jQuery(".last-preview-page").height();
  let formHeight = jQuery(".last-page-form-container").height();
  if (formHeight != undefined && sliderHeight != undefined)
    if (formHeight < sliderHeight) {
      let fillerPadding = (sliderHeight - formHeight) / 2;
      jQuery(".last-page-form-container").css("padding-top", fillerPadding);
      jQuery(".last-page-form-container").css("padding-bottom", fillerPadding);
    } else {
      jQuery(".last-page-form-container").css("height", "100%");
    }
}

function debounce(func, wait) {
  let timeout;
  return function () {
    clearTimeout(timeout);
    timeout = setTimeout(func, wait);
  };
}

// Function to position the arrows
function positionArrows() {
  // Get the width of the slick-dots
  var dotsWidth = jQuery(".slick-dots").outerWidth();

  // Define the margin between the dots and the arrows
  var margin = 20; // adjust this value as needed

  // Calculate the positions for the arrows
  var leftArrowPos = `calc(50% - ${dotsWidth / 2 + margin}px)`;
  var rightArrowPos = `calc(50% - ${dotsWidth / 2 + margin}px)`;

  // Set the positions
  jQuery(".slick-prev").css("left", leftArrowPos);
  jQuery(".slick-next").css("left", "unset");
  jQuery(".slick-next").css("right", rightArrowPos);
}
