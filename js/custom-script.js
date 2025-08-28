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
      $(".navbar:not(.absolute)").css({
        transform: "translateY(-90px)",
        transition: "transform 0.3s ease",
      });
    } else {
      // scrolling up → show navbar
      $(".navbar:not(.absolute)").css({
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
  // iOS detection (simple heuristic)
  var iOS = !!navigator.platform && /iPad|iPhone|iPod/.test(navigator.platform);

  // Webflow nav overlay (may not exist immediately)
  var overlay = document.querySelector(".w-nav-overlay");

  // ---- lock manager (shared across overlay + modals) ----
  var locked = false;
  var lastScrollY = 0;

  function shouldLock() {
    var overlayVisible = false;
    if (overlay) {
      overlayVisible =
        window.getComputedStyle(overlay).getPropertyValue("display") !== "none";
    }
    var modalActive = document.querySelectorAll(".modal.active").length > 0;
    return overlayVisible || modalActive;
  }

  function lockScroll() {
    if (locked) return;
    locked = true;

    if (iOS) {
      // preserve current scroll position
      lastScrollY = Math.round(
        window.pageYOffset ||
          document.documentElement.scrollTop ||
          document.body.scrollTop ||
          0
      );
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.top = "-" + lastScrollY + "px";
      document.body.style.width = "100vw";
    } else {
      document.body.style.overflow = "hidden";
    }
  }

  function unlockScroll() {
    if (!locked) return;
    locked = false;

    if (iOS) {
      document.body.style.overflow = "auto";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "100vw";
      // restore scroll position
      window.scrollTo(0, lastScrollY);
    } else {
      document.body.style.overflow = "";
    }
  }

  function updateLock() {
    if (shouldLock()) {
      lockScroll();
    } else {
      unlockScroll();
    }
  }

  // ---- Observe Webflow nav overlay (style changes) ----
  if (overlay) {
    var overlayObserver = new MutationObserver(function (mutations) {
      for (var m of mutations) {
        if (m.attributeName === "style") {
          updateLock();
        }
      }
    });
    overlayObserver.observe(overlay, {
      attributes: true,
      attributeFilter: ["style"],
    });
  }

  // ---- Observe any .modal becoming active/inactive ----
  // Watch the whole body for class changes and added/removed nodes.
  var modalObserver = new MutationObserver(function (mutations) {
    // If any mutation could affect .modal.active presence, re-evaluate.
    for (var m of mutations) {
      if (
        (m.type === "attributes" && m.attributeName === "class") ||
        m.type === "childList"
      ) {
        updateLock();
        break;
      }
    }
  });
  modalObserver.observe(document.body, {
    attributes: true,
    attributeFilter: ["class"],
    subtree: true,
    childList: true,
  });

  // Initial evaluation (covers initial states)
  updateLock();
}
