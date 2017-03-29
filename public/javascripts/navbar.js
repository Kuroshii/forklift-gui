$("#viewLog").on('click', function(event) {
  swal({
    title: "Search for Log",
    text: "Enter a log id for the log you'd like to view:",
    type: "input",
    showCancelButton: true,
    confirmButtonText: 'Show me the log!',
    inputPlaceholder: "Log Id",
    closeOnConfirm: false
  }, function(input) {
    if (input === false) return false;
    if (input === "") {
      swal.showInputError("Please enter a log id!");
      return false;
    }
    window.open("log?id="+input, "_blank");
    swal.close();
  });
});

