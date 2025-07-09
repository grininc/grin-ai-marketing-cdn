jQuery(document).ready(function ($) {
  // Open modal
  $('[class^="open-modal-"]').on("click", function () {
    var classList = $(this).attr("class").split(/\s+/);
    var modalNumber;

    console.log("clicked" + classList);

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

  // Close modal
  $(".modal .close").on("click", function () {
    $(this).closest(".modal").removeClass("active");
  });
});
