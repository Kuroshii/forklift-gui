$('[data-toggle="tooltip"]').tooltip();
$(".fixBtn").click(function() {
    var queue = $(this).attr('queue');
    swal({
        title: "Are you sure?",
        text: "This will set all [ " + queue + " ] replay logs as fixed.",
        type: "warning",
        showCancelButton: true,
        confirmButtonText: 'Yes, Fix them!'
    }, function() {
        $.post('fixAll', {
            queue: queue
        }, function() {
            setTimeout(function() {
                location.reload();
            }, 2000);
        });
    });
});
$(".retryBtn").click(function() {
    var queue = $(this).attr('queue');
    swal({
        title: "Are you sure?",
        text: "This will retry all [ " + queue + " ] replay logs.",
        type: "warning",
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, Retry them!'
    }, function() {
        $.post('retryAll', {
            queue: queue
        }, function() {
            setTimeout(function() {
                location.reload();
            }, 2000);
        });
    });
});
$("#viewLog").on('click', function(event) {
  swal({
    title: "Search for Log",
    text: "Enter a log id for the log you'd like to view:",
    type: "input",
    showCancelButton: true,
    confirmButtonText: 'Show me the log!',
    inputPlaceholder: "Log Id"
  }, function(input) {
      if (input === false) return false;
      if (input === "") {
        swal.showInputError("Please enter a log id!");
        return false;
      }
      window.open("log?id="+input, "_blank");
  });
});
