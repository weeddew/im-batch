
const QUEUE_URL = 'amqp://3.38.107.113';
const NODE_ID = process.env.NODE_ID
const { cpus } = require('os')
const cluster = require('cluster')

const numCPUs = cpus().length;

console.log("NODE_ID : %s", NODE_ID);
console.log("CPUs : %d", numCPUs);

var amqp = require('amqplib/callback_api');
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

        // SEND 큐에서 메세지를 가져옴
        channel.consume('SEND', async function(msg) {
            console.log(" [x] Received %s", msg.content.toString());
            const obj = JSON.parse(msg.content.toString());

            // 계산작업 대신 sleep
            await sleep(obj.value*1000);

            console.log("calc complete");
            channel.ack(msg);

            // RECEIVE 큐로 작업결과 메세지를 보냄
            // 작업한 노드ID와 value 를 제곱한 결과값을 result 에 셋팅
            channel.sendToQueue('RECEIVE', Buffer.from(JSON.stringify({
                ...obj,
                result: `NODE[` + NODE_ID + `] : ${obj.value} * ${obj.value} = ${obj.value * obj.value}`
            })));
        });
    });
});

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
