const express = require('express')
const amqp = require("amqplib/callback_api");
const app = express()
const port = 3000

const LENGH = 100;
const MAX_VALUE = 10;
const QUEUE_URL = 'amqp://3.38.107.113';

/**
 * index 페이지
 */
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
})

/**
 * 시작 요청
 * 데이터 생성 후 SEND 큐로 보냄
 */
app.get('/start', (req, res) => {
    let data = Array.from({length: LENGH}, (v,i) => {return {id: i, value: Math.floor(Math.random() * MAX_VALUE)+1}});

    // 5초후 실행
    setTimeout(() => {
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
    }, 5000);

    res.send(JSON.stringify(data))
})

/**
 * events 요청 (SSE 사용)
 * RECEIVE 큐에 데이터가 쌓일 때마다 SSE 를 보내서 화면 업데이트함
 */
app.get('/events', async function(req, res) {
    console.log('Got /events');
    res.set({
        'Cache-Control': 'no-cache',
        'Content-Type': 'text/event-stream',
        'Connection': 'keep-alive'
    });
    res.flushHeaders();

    // Tell the client to retry every 10 seconds if connectivity is lost
    res.write('retry: 10000\n\n');
    let count = 0;

    // RECEIVE 큐에서 데이터를 가져옴
    amqp.connect(QUEUE_URL, function(error0, connection) {
        if (error0) {
            throw error0;
        }
        connection.createChannel(function(error1, channel) {
            if (error1) {
                throw error1;
            }

            channel.prefetch(1)
            console.log(" [*] Waiting for messages in %s. To exit press CTRL+C");
            channel.consume('RECEIVE', function(msg) {
                count++;
                console.log(" [x] Received %s", msg.content.toString());
                const obj = JSON.parse(msg.content.toString());
                // res.write(msg.content.toString());
                res.write(`data: ${JSON.stringify(obj)}\n\n`);

                channel.ack(msg);

                // SEND 큐에 보낸만큼 RECEIVE 큐에서 받았으면 종료
                if(count == LENGH) {
                    connection.close();
                    res.end();
                }
            });
        });
    });
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})

