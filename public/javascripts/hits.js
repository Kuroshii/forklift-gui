
$('[data-toggle="tooltip"]').tooltip();

var pathnameSize = window.location.pathname.split('/').length - 1;
if (window.location.pathname.split('/')[pathnameSize] == "replays" ||
    (window.location.pathname.split('/')[pathnameSize] == "filtered" &&
     window.location.search.split("&")[0] == "?service=replays")) {
    $(".mouseOver").mouseover(function () {
        var errorHtml = $(this).parent().parent().find(".msgError pre").html();

        $(this).parent().parent().find(".errorHoverDisplay").html(errorHtml);
        $(this).parent().parent().find(".errorHoverDisplay").show();
    }).mouseout(function () {
        $(this).parent().parent().find(".errorHoverDisplay").hide();
    });
}

$('.modifyBtns').click(function (evt) {
    evt.stopPropagation();
});
$("#filterButton").click(function() {
    var service = $(this).attr('service');
    swal({
        title: "Filter by Queue",
        text: "Input the queue you would like to view logs for",
        type: "input",
        showCancelButton: true,
        closeOnConfirm: false,
        inputPlaceholder: "desired queue..."
    }, function(inputValue) {
        if (inputValue === false) return false;
        if (inputValue === "") {
            swal.showInputError("You need to provide a queue");
            return false;
        }
        window.location = "filtered?service="+service+"&queue="+inputValue;
        swal.close();
    });
});
$("#fixAllButton").click(function() {
    swal({
        title: "Fix All",
        text: "Set all logs as fixed for desired role, no going back",
        type: "input",
        showCancelButton: true,
        closeOnConfirm: false,
        inputPlaceholder: "desired role..."
    }, function(inputValue) {
        if (inputValue === false) return false;
        if (inputValue === "") {
            swal.showInputError("You need to provide a role");
            return false;
        }
        $.post('fixAll', {
            role: inputValue
        }, function() {
            setTimeout(function() {
                location.reload();
            }, 2000);
        });

        swal.close();
    });
});
$('.retryButton').click(function () {
    var messageId = $(this).attr('messageId');

    var connector  = $(this).attr('connector');
    var version = $(this).attr('version');
    var role = $(this).attr('role');
    var destination  = $(this).attr('destination');
    var roleMessage  = $(this).attr('roleMessage');

    var correlationId = $(this).attr('correlationId');

    var retryMsg = {
        connector: connector,
        role: role,
        destination: destination,
        roleMessage: roleMessage,
        version: version,
        // carry this on for AMQ
        correlationId: correlationId
    };

    $.post('retry', retryMsg, function() {
        $("#"+messageId).remove();
    });
});
$('.fixButton').click(function () {
    var messageId = $(this).attr('messageId');
    var updateId = $(this).attr('logId');
    var index = $(this).attr('index');
    var stepCount = $(this).attr('stepCount');

    $.post('updateStep', {
        updateId: updateId,
        index: index,
        step: "Fixed",
        stepCount: stepCount
    }, function() {
        $("#"+messageId).remove();
    });
});
$('.changeQueueButton').click(function () {
    var messageId = $(this).attr('messageId');
    var correlationId = $(this).attr('correlationId');
    var text = $(this).attr('text');
    swal({
        title: "Change Queue",
        text: "please input the queue you'd like this document to be sent",
        type: "input",
        showCancelButton: true,
        closeOnConfirm: false,
        inputPlaceholder: "desired queue..."
    }, function(inputValue) {
        if (inputValue === false) return false;
        if (inputValue === "") {
            swal.showInputError("You need to provide a queue");
            return false;
        }
        $.post('retry', {
            correlationId: correlationId,
            text: text,
            queue: inputValue
        }, function() {
            $("#"+messageId).remove();
        });
        swal.close();
    });
});

$('.changeStepButton').click(function () {
    var logId = $(this).attr('logId');
    var messageId = $(this).attr('messageId');
    var index = $(this).attr('index');

    var connector  = $(this).attr('connector');
    var version = $(this).attr('version');
    var role = $(this).attr('role');
    var destination  = $(this).attr('destination');
    var roleMessage  = $(this).attr('roleMessage');

    var stepCount = $(this).attr('stepCount');

    var correlationId = $(this).attr('correlationId');

    swal({
        title: "Change Step",
        text: "please enter the step name for this log",
        type: "input",
        showCancelButton: true,
        closeOnConfirm: false,
        inputPlaceholder: "Fixed, Error, or Pending"
    }, function(inputValue) {
        if (inputValue === false) return false;
        if (inputValue === "") {
            swal.showInputError("You need to provide a step name");
            return false;
        }
        if (inputValue !== "Fixed" &&
            inputValue !== "Error" &&
            inputValue !== "Pending") {
            swal.showInputError("Please enter [Fixed, Error, Pending] as the value.");
            return false;
        }
        $.post('updateStep', {
            updateId: logId,
            index: index,
            step: inputValue,
            stepCount: stepCount,

            // retry info
            connector: connector,
            role: role,
            destination: destination,
            roleMessage: roleMessage,
            version: version,
            // carry this on for AMQ
            correlationId: correlationId
        }, function () {
            $("#" + messageId).remove();
        });
        swal.close();
    });
});
