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
        text: "Set all logs as fixed for desired queue, no going back",
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
        $.post('fixAll', {
            queue: inputValue
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
    var correlationId = $(this).attr('correlationId');
    var text = $(this).attr('text');
    var queue = $(this).attr('queue');
    var connector  = $(this).attr('connector')
    var serializedMessage = $(this).attr('serializedMessage')

    var retryMsg = {
        connector: connector,
        queue: queue,
        correlationId: correlationId,
        text: text,
        serializedMessage: serializedMessage
    }

    $.post('retry', retryMsg, function() {
        $("#"+messageId).parent().remove();
    });
});
$('.fixButton').click(function () {
    var messageId = $(this).attr('messageId');
    var updateId = $(this).attr('logId');
    var index = $(this).attr('index');
    $.post('updateStep', {
        updateId: updateId,
        index: index,
        step: "Fixed"
    }, function() {
        $("#"+messageId).parent().remove();
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
            $("#"+messageId).parent().remove();
        });
        swal.close();
    });
});

$('.changeStepButton').click(function () {
  var messageId = $(this).attr('messageId');
  var updateId = $(this).attr('logId');
  var index = $(this).attr('index');
  var correlationId = $(this).attr('correlationId');
  var text = $(this).attr('text');
  var queue = $(this).attr('queue');
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
      updateId: updateId,
      index: index,
      step: inputValue,
      correlationId: correlationId,
      text: text,
      queue: queue
    }, function () {
      $("#" + messageId).parent().remove();
    });
    swal.close();
  });
});
