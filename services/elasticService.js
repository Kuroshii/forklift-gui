var elasticsearch = require('elasticsearch');
var consul = require('consul')({
    host: process.env.NODE_IP,
    port: 8500
});
var Stomp = require('stomp-client');
var logger = require('../utils/logger');
var kafka = require('no-kafka');

var client = new elasticsearch.Client({
    host: (process.env.FORKLIFT_GUI_ES_HOST || 'localhost') + ":" + (process.env.FORKLIFT_GUI_ES_PORT || 9200)
});

var kafkaClient;
consul.catalog.service.nodes('kafka', function(err, result) {
    if (err) {
        logger.error("Error fetching IP from consul: " + err);
        return;
    }
    var node = result[0];
    var connectAddress = node['Address'] + ':' + node['ServicePort'];
    logger.info("Connecting to kafka at: " + connectAddress);
    kafkaClient = new kafka.Producer({
        connectionString: connectAddress
    });
    kafkaClient.init();
});


var stompClient;
var service = {};

stompConnect();

function stompConnect() {
    logger.info("Connecting stomp client...");
    stompClient = new Stomp(process.env.FORKLIFT_GUI_STOMP_HOST || 'localhost', process.env.FORKLIFT_GUI_STOMP_PORT || 61613, null, null, null, null, {retries: 5, delay: 10000});
    stompClient.connect(function() {
        logger.info("Stomp client connected!");
    });
    stompClient.on('error', function(err) {
        logger.error('STOMP: ' + err.message);
    })
}
service.ping = function(done) {
    client.ping({
        // ping usually has a 3000ms timeout
        requestTimeout: 3000
    }, function (error) {
        if (error) {
            done(false);
        } else {
            done(true);
        }
    });
};

service.get = function(id, done) {
    var index = 'forklift-replay*';
    client.search({
        index: index,
        size: 1,
        body: {
            query: {
                term: {
                    '_id': id
                }
            }
        }
    }).then(function (resp) {
        done(resp.hits.hits[0]);
    }, function(err) {
        done(null);
    });
};
service.poll = function(service, role, size, done) {
    var index = 'forklift-'+service+'*';

    var query;
    if (role == null) {
        query = {
            query_string: {
                query: "Error",
                fields: ["step"]
            }
        };
    } else {
        query = {
            bool: {
                must: {match: {"step": "Error"}},
                should: [
                    {match: {"queue": role}},
                    {match: {"role": role}}
                ],
                minimum_should_match: 1
            }
        };
    }
    client.search({
        index: index,
        size: size,
        body: {
            query: query,
            "sort": [{
                "time": {"order": "desc"}
            }]
        }
    }).then(function (resp) {
        done(resp.hits.hits);
    }, function(err) {
        logger.error(err.message);
        done(null, err.message);
    });
};

service.update = function(index, updateId, step, version, done) {
    var updateRequest = {
        index: index,
        id: updateId,
        type: 'log',
        body:  {
            doc: {
                step: step
            }
        },
        versionType: 'force',
        version: version || 1
    };

    client.update(updateRequest, function (err) {
        if (err) {
            logger.error(err);
        }
        done();
    });
};


service.sendToActiveMq = function(msg, done) {
    if (msg.jmsHeaders['correlation-id']) {
        logger.info('Sending AMQ message: ' + msg.jmsHeaders['correlation-id']);
    } else {
        logger.info('Sending AMQ message');
    }
    // messages to the stomp connector should persist through restarts
    msg.jmsHeaders['persistent'] = 'true';
    // special tag to allow non binary msgs
    msg.jmsHeaders['suppress-content-length'] = 'true';
    stompClient.publish(msg.queue, msg.body, msg.jmsHeaders);
    done();
}

service.sendToKafka = function(msg, done) {
    logger.info('Sending Kafka message to ' + msg.topic);
    kafkaClient.send(msg).then(function(res) {
        if (res.err) {
            logger.error("Error sending message to kafka: " + JSON.stringify(res.err));
        } else {
            logger.info("Kafka message successfully sent: " + JSON.stringify(res));
        }
    }, function(err) {
        logger.error("Error sending message to kafka: " + JSON.stringify(err));
    });
    done();
}

service.stats = function(done) {
    getStats('forklift-retry*', function(retryStats) {
        getStats('forklift-replay*', function(replayStats) {
            done({
                replay: replayStats,
                retry: retryStats
            })
        })
    })
};

service.retry = function(log, done) {
    if (!log.version && !log.connector) {
        logger.info('Assuming message with undefined connector is a legacy message for activemq queue "' + destination + '"');
        log.connector = "ActiveMQConnector"
    }

    if (log.connector === 'KafkaConnector') {
        service.sendToKafka({
            topic: log.destination,
            message: {
                value: Buffer.from(log.roleMessage, 'base64')
            }
        }, done);
    } else if (log.connector === 'ActiveMQConnector') {
        service.sendToActiveMq({
            queue: log.destination,
            body: log.roleMessage,
            jmsHeaders: {'correlation-id': log.correlationId}
        }, done);
    }
}

var getStats = function(index, done) {
    client.search({
        index: index,
        size: 10000,
        body: {
            query: {
                query_string: {
                    query: "Error",
                    fields: ["step"]
                }
            },
            "sort": [{
                "time": {"order": "desc"}
            }]
        }
    }).then(function (resp) {
        var size = resp.hits.hits.length;
        var roleTotals = {};
        resp.hits.hits.forEach(function(hit, i) {
            hit = hit._source;

            var role = hit['role'] || hit['queue'];
            roleTotals[role] = (roleTotals[role] || 0) + 1;

        });
        done({
            totalLogs: size,
            roleTotals: roleTotals
        });

    }, function(err) {
        logger.error(err.message);
        done(null);
    });
};
module.exports = service;
