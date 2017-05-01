var express = require('express');
var elasticService = require('../services/elasticService.js');
var logger = require('../utils/logger');

module.exports.showLinkedLog = function(req, res) {
    elasticService.get(req.query.id, function(log) {
        if (log == null) {
            req.flash("error", "INVALID LOG ID - YOU HAVE BEEN REDIRECTED TO HOME");
            res.redirect('dashboard');
        }
        res.render('linked-log', {currentUrl: 'replays', log: log});
    });
};
module.exports.updateStep = function(req, res) {
    var updateId = req.body.updateId;
    var index = req.body.index;
    var step = req.body.step;
    var correlationId = req.body.correlationId;
    var text = req.body.text;
    var queue = req.body.queue;
    elasticService.update(index, updateId, step == null ? "Fixed" : step, function() {
        if (step != null && step !== "Fixed") {
          elasticService.retry(correlationId, text, queue, function() {
            res.end();
          });
        } else {
          res.end();
        }
    });
};
module.exports.updateAllAsFixed = function(req, res) {
    var queue = req.body.queue;
    elasticService.poll('replay', queue, 10000, function(logs, err) {
        if (logs === 'undefined' || logs == null) {
            req.flash('error', err);
        }
        for (var i = 0; i < logs.length; i++) {
            elasticService.update(logs[i]._index, logs[i]._id, 'Fixed', function() {
            })
        }
        res.send("done");
    });

};

module.exports.retry = function(req, res) {
    var roleMessage = req.body.roleMessage;
    var role = req.body.role;
    var connector = req.body.connector;

    if (connector === 'KafkaConnector') {
        elasticService.sendToKafka({
            topic: 'forklift-role-' + role,
            message: {
                value: Buffer.from(roleMessage, 'base64')
            }
        }, function() {
            res.end();
        });
    } else if (connector === 'ActiveMQConnector') {
        elasticService.sendToActiveMq({
            queue: 'forklift-role-' + role,
            body: roleMessage,
            jmsHeaders: {}
        }, function() {
            res.end();
        });
    } else {
        var queue = req.body.queue;
        var text = req.body.text;
        var correlationId = req.body.correlationId;

        logger.warn('Assuming unrecognized connector is a legacy retry for activemq queue "' + queue + '"');
        elasticService.sendToActiveMq({
            queue: queue,
            body: text,
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
        var hits = [];
        for (var i = 0; i < logs.length; i++) {
            hits.push(logs[i]);
        }
        res.render('log-display', {currentUrl: 'retries', hits: hits})
    });
};
module.exports.showReplays = function(req, res) {
    elasticService.poll('replay', null, 50, function(logs, err) {
        if (logs === 'undefined' || logs == null) {
            req.flash('error', err);
        }
        var hits = [];
        for (var i = 0; i < logs.length; i++) {
            hits.push(logs[i]);
        }
        res.render('log-display', {currentUrl: 'replays', hits: hits})
    });
};
module.exports.showFilteredResults = function(req, res) {
    var service = req.query.service;
    var queue = req.query.queue;

    var tempService = service == 'retries' ? 'retry' : 'replay';
    elasticService.poll(tempService, queue, 50, function(logs, err) {
        if (logs === 'undefined' || logs == null) {
            req.flash('error', err);
        }
        var hits = [];
        for (var i = 0; i < logs.length; i++) {
            hits.push(logs[i]);
        }
        res.render('log-display', {currentUrl: service, hits: hits});
    });
};
