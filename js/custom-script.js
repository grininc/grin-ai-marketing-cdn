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
});
