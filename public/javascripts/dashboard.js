$('[data-toggle="tooltip"]').tooltip();
$(".fixBtn").click(function() {
    var role = $(this).attr('role');
    swal({
        title: "Are you sure?",
        text: "This will set all [ " + role + " ] replay logs as fixed.",
        type: "warning",
        showCancelButton: true,
        confirmButtonText: 'Yes, Fix them!'
    }, function() {
        $.post('fixAll', {
            role: role
        }, function() {
            setTimeout(function() {
                location.reload();
            }, 2000);
        });
    });
});
$(".retryBtn").click(function() {
    var role = $(this).attr('role');
    swal({
        title: "Are you sure?",
        text: "This will retry all [ " + role + " ] replay logs.",
        type: "warning",
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, Retry them!'
    }, function() {
        $.post('retryAll', {
            role: role
        }, function() {
            setTimeout(function() {
                location.reload();
            }, 2000);
        });
    });
});
