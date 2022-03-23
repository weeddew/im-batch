
const { cpus } = require('os')
const cluster = require('cluster')
const process = require('process');

const NODE_ID = process.env.NODE_ID
const numCPUs = cpus().length;
const QUEUE_URL = 'amqp://3.38.107.113';

console.log("NODE_ID : %s", NODE_ID);
console.log("CPUs : %d", numCPUs);

// Primary 는 자식 프로세스를 포크하는 기능만 함
if (cluster.isPrimary) {
    console.log(`Primary ${process.pid} is running`);

    // CPU(코어)수 만큼 Fork workers.
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        console.log(`worker ${worker.process.pid} died`);
    });
}
// 자식 프로세스가 실제 계산 수행
else {
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

                // 계산 작업 시작 (랜덤 시간 sleep)
                await sleep(obj.value*1000);
                // 계산 작업 종료

                console.log("calc complete");
                channel.ack(msg);

                // RECEIVE 큐로 작업결과 메세지를 보냄
                // 작업한 주체[노드ID-자식프로세스ID]와 계산결과(value 를 제곱한 결과값)를 result 에 셋팅
                channel.sendToQueue('RECEIVE', Buffer.from(JSON.stringify({
                    ...obj,
                    result: `NODE[${NODE_ID}-${process.pid}] : ${obj.value} * ${obj.value} = ${obj.value * obj.value}`
                })));
            });
        });
    });

    console.log(`Worker ${process.pid} started`);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
