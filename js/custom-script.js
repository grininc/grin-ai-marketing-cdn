jQuery(document).ready(function ($) {
  navScrollingBehavior();
  disableScrollOnOpenModal();

  // Open modal
  $(document).on("click", "[class*='open-modal-']", function () {
    var classList = $(this).attr("class").split(/\s+/);
    var modalNumber;

    classList.forEach(function (className) {
      var match = className.match(/^open-modal-(\d+)$/);
      if (match) {
        modalNumber = match[1];
      }
    });

    if (modalNumber) {
      $("#modal-" + modalNumber).addClass("active");
    }
  });

  // Close modal via close button
  $(document).on("click", ".modal .close", function () {
    $(this).closest(".modal").removeClass("active");
  });

  // Close modal via click outside form-div
  $(document).on("click", ".modal", function (e) {
    if (!$(e.target).closest(".form-div").length) {
      $(this).removeClass("active");
    }
  });

  // Count-up animation
  $(".count-up-number").each(function () {
    var $counter = $(this);
    var target = parseInt($counter.data("count-to")) || 0;
    var duration = parseInt($counter.data("duration")) || 2000;
    var start = 0;
    var startTime = null;

    function animate(timestamp) {
      if (!startTime) startTime = timestamp;
      var progress = timestamp - startTime;
      var percent = Math.min(progress / duration, 1);
      var current = Math.floor(percent * target);

      $counter.text(current.toLocaleString());

      if (percent < 1) {
        requestAnimationFrame(animate);
      }
    }

    // Trigger when in view
    var observer = new IntersectionObserver(
      function (entries, observer) {
        if (entries[0].isIntersecting) {
          requestAnimationFrame(animate);
          observer.unobserve(entries[0].target);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(this);
  });

  var wordsArray = [
    "Get your free affiliate marketing proposal.",
    "Access brand, audience, and competitor insights.",
    "See how Gia would run your program for maximum impact.",
    "Uncover your fastest paths to growth.",
    "Discover what Gia can do for you today.",
  ];

  if ($(".rotation-text").length > 0) {
    executeTextRotation(wordsArray);
  }

  // This determines if the click was outside the popup box for gated links
  $(".gated-link-popup").click(function (event) {
    if ($(event.target).hasClass("gated-link-popup")) {
      closeCustomPopup(".gated-link-popup");
    }
  });
  // This determines if the click was outside the custom popup
  $(".custom-popup").click(function (event) {
    if ($(event.target).hasClass("custom-popup")) {
      closeCustomPopup(".custom-popup");
    }
  });

  // Run only if URL contains /blog/
  if (window.location.pathname.indexOf("/blog/") !== -1) {
    generateTOC();
  }
});

function executeTextRotation(wordsArray) {
  var count = 0;

  // Rotation text
  setInterval(function () {
    count++;
    $(".rotation-text").fadeOut(600, function () {
      $(this)
        .html(wordsArray[count % wordsArray.length])
        .fadeIn(400);
    });
  }, 3500);
}

function openCustomPopup(popupQuery) {
  jQuery(popupQuery).addClass("open");
}

function closeCustomPopup(popupQuery) {
  jQuery(popupQuery).removeClass("open");
}

function navScrollingBehavior() {
  var lastScrollTop = 0;

  $(window).on("scroll", function () {
    var st = $(this).scrollTop();

    if (st > lastScrollTop) {
      // scrolling down → hide navbar
      $(".navbar").css({
        transform: "translateY(-90px)",
        transition: "transform 0.3s ease",
      });
    } else {
      // scrolling up → show navbar
      $(".navbar").css({
        transform: "translateY(0)",
        transition: "transform 0.3s ease",
      });
    }

    lastScrollTop = st;
  });
}

function generateTOC() {
  var $tocContainer = $("#table-of-contents");
  var $tocHeading = $("#TOC-heading");
  var $list = $("<ul></ul>");

  $("#post-content h2").each(function () {
    var headingText = $(this).text().trim();
    // Create a safe ID by lowercasing, replacing spaces with hyphens, and removing non-alphanumeric chars
    var headingId = headingText
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "") // remove non-alphanumeric except spaces
      .replace(/\s+/g, "-"); // replace spaces with dashes

    // Set the ID on the H2 if it doesn’t have one yet
    $(this).attr("id", headingId);

    // Create the link
    var $link = $("<a></a>")
      .attr("href", "#" + headingId)
      .text(headingText);

    // Add to list
    $list.append($("<li></li>").append($link));
  });

  // Append after #TOC-heading inside #table-of-contents
  $tocHeading.after($list);
}

function disableScrollOnOpenModal() {
  // Detecting if it is an iOS device, true/false
  var iOS = !!navigator.platform && /iPad|iPhone|iPod/.test(navigator.platform);

  // Defining that "overlay" is the element that has a changing display value
  var overlay = document.querySelector(".w-nav-overlay");

  // Creating our mutation observer, which we attach to overlay later
  var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutationRecord) {
      // Checking if it's the style attribute got changed and if display value now set to 'none'?
      if (
        mutationRecord.attributeName === "style" &&
        window.getComputedStyle(overlay).getPropertyValue("display") !== "none"
      ) {
        //Overlay's  display value is no longer 'none', now changing the "body" styles:
        if (iOS) {
          // for iOS devices:
          var x = $(window).scrollTop().toFixed();

          $("body").css({
            overflow: "hidden",
            position: "fixed",
            top: "-" + x + "px",
            width: "100vw",
          });
        }
        // for all other devices:
        $("body").css("overflow", "hidden");
      }
      //Overlay's  display value back to 'none' , now changing the "body" styles again:
      else {
        if (iOS) {
          //  for iOS devices:
          var t = $("body").css("top").replace("-", "").replace("px", "");
          $("body").css({ overflow: "auto", position: "", width: "100vw" });
          $("body").animate({ scrollTop: t }, 0);
        }
        // for all other devices:
        $("body").css("overflow", "");
      }
    });
  });
  // Attach the mutation observer to overlay, and only when attribute values change
  observer.observe(overlay, { attributes: true, attributeFilter: ["style"] });
}
