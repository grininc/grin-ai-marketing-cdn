jQuery(document).ready(function ($) {
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

  $(document).ready(function () {
    $(".nav-modal").addClass("prepare");
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
