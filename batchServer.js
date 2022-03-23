const express = require('express')
const amqp = require("amqplib/callback_api");
const app = express()
const port = 3000

const LENGH = 10;
const MAX_VALUE = 10;
const QUEUE_URL = 'amqp://3.38.107.113';

app.get('/', (req, res) => {
    res.send('Hello World!')
})

/**
 * 데이터 생성 후 SEND 큐로 보냄
 */
app.get('/start', (req, res) => {
    let data = Array.from({length: LENGH}, (v,i) => {return {id: i, value: Math.floor(Math.random() * MAX_VALUE)+1}});

    amqp.connect(QUEUE_URL, function(error0, connection) {
        if (error0) {
            throw error0;
        }
        connection.createChannel(function(error1, channel) {
            if (error1) {
                throw error1;
            }
            data.map(item => {
                channel.sendToQueue('SEND', Buffer.from(JSON.stringify(item)));
            });
        });
    });
    res.send(JSON.stringify(data))
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})

/**
 * RECEIVE 큐에서 데이터를 가져옴
 */
amqp.connect(QUEUE_URL, function(error0, connection) {
    if (error0) {
        throw error0;
    }
    connection.createChannel(function(error1, channel) {
        if (error1) {
            throw error1;
        }

        console.log(" [*] Waiting for messages in %s. To exit press CTRL+C");
        channel.consume('RECEIVE', function(msg) {
            console.log(" [x] Received %s", msg.content.toString());
        }, {
            noAck: true
        });
    });
});