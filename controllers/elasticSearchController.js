var express = require('express');
var elasticService = require('../services/elasticService.js');
var logger = require('../utils/logger');


var extractLog = function(log, i) {
    var val = log._source;

    return {
        val: val,

        logId: log._id,
        logIndex: log._index,
        time: val.time,

        connector: val["destination-connector"] || "ActiveMQConnector",
        destination: val["destination-name"] || val["queue"],
        role: val["role"] || val["queue"],
        roleMessage: val["destination-message"] || val["text"],
        text: val["text"],
        version: val["forklift-replay-version"] || val["forklift-retry-version"] || "1",
        stepCount: val["forklift-replay-step-count"],

        retryCount: val["forklift-retry-count"],
        maxRetryCount: val["forklift-retry-max-retries"],
        // a bit hacky, ensures logs display when there are no retry properties
        retriesDone: val["forklift-retry-count"] == val["forklift-retry-max-retries"],

        messageId: "message-" + i,
        correlationId: log._id
    };
};

module.exports.showLinkedLog = function(req, res) {
    elasticService.get(req.query.id, function(log) {
        if (log == null) {
            req.flash("error", "INVALID LOG ID - YOU HAVE BEEN REDIRECTED TO HOME");
            res.redirect('dashboard');
        }
        res.render('linked-log', {currentUrl: 'replays', log: log, extractLog: extractLog});
    });
};
module.exports.updateStep = function(req, res) {
    var updateId = req.body.updateId;
    var index = req.body.index;
    var step = req.body.step;
    var stepCount = req.body.stepCount;

    elasticService.update(index, updateId, step == null ? "Fixed" : step, stepCount, function() {
        if (step != null && step == "Pending") {
            module.exports.retry(req, res);
        } else {
            res.end();
        }
    });
};
module.exports.updateAllAsFixed = function(req, res) {
    var role = req.body.role;
    elasticService.poll('replay', role, 10000, function(logs, err) {
        if (logs === 'undefined' || logs == null) {
            req.flash('error', err);
        }
        for (var i = 0; i < logs.length; i++) {
            var stepCount = logs[i]._source['forklift-replay-step-count'];
            elasticService.update(logs[i]._index, logs[i]._id, 'Fixed', stepCount, function() {
            })
        }
        res.send("done");
    });

};

module.exports.retry = function(req, res) {
    var connector = req.body.connector;
    var version = req.body.version;

    var destination = req.body.destination;
    var roleMessage = req.body.roleMessage;

    var role = req.body.role;
    var correlationId = req.body.correlationId;

    if (version && version == '2') {
        logger.info('Retrying message for role "' + role + '" to connector "' + connector + '"');
        if (connector === 'KafkaConnector') {
            elasticService.sendToKafka({
                topic: destination,
                message: {
                    value: Buffer.from(roleMessage, 'base64')
                }
            }, function() {
                res.end();
            });
        } else if (connector === 'ActiveMQConnector') {
            elasticService.sendToActiveMq({
                queue: destination,
                body: roleMessage,
                jmsHeaders: {'correlation-id': correlationId}
            }, function() {
                res.end();
            });
        }
    } else {
        logger.info('Assuming message with unrecognized version "' + version + '" is a legacy message for activemq queue "' + destination + '"');
        elasticService.sendToActiveMq({
            queue: destination,
            body: roleMessage,
            jmsHeaders: {'correlation-id': correlationId}
        }, function() {
            res.end();
        });
    }
};

module.exports.retryAll = function(req, res) {
    var queue = req.body.queue;
    elasticService.poll('replay', queue, 10000, function(logs, err) {
        if (logs === 'undefined' || logs == null) {
            req.flash('error', err);
        }
        for (var i = 0; i < logs.length; i++) {
            elasticService.retry(logs[i]._id, logs[i]._source.text, queue, function() {
            })
        }
        res.send("done");
    });
};

module.exports.showRetries = function(req, res) {
    elasticService.poll('retry', null, 50, function(logs, err) {
        if (logs === 'undefined' || logs == null) {
            req.flash('error', err);
        }
        res.render('log-display', {currentUrl: 'retries', hits: logs, extractLog: extractLog});
    });
};
module.exports.showReplays = function(req, res) {
    elasticService.poll('replay', null, 50, function(logs, err) {
        if (logs === 'undefined' || logs == null) {
            req.flash('error', err);
        }
        res.render('log-display', {currentUrl: 'replays', hits: logs, extractLog: extractLog});
    });
};
module.exports.showFilteredResults = function(req, res) {
    var service = req.query.service;
    var role = req.query.role;

    var tempService = service == 'retries' ? 'retry' : 'replay';
    elasticService.poll(tempService, role, 50, function(logs, err) {
        if (logs === 'undefined' || logs == null) {
            req.flash('error', err);
        }
        res.render('log-display', {currentUrl: service, hits: logs, extractLog: extractLog});
    });
};
