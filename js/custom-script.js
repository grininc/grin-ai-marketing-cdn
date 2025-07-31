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
    "See how you show up online.",
    "Compare your brand against competitors.",
    "Uncover top keywords across your market.",
    "Identify customer feedback trends.",
    "Learn how affiliate marketing can grow your brand. ",
    "Discover what Gia can do for you today.",
    "Get early access to Gia.",
  ];

  if ($(".rotation-text").length > 0) {
    executeTextRotation(wordsArray);
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
