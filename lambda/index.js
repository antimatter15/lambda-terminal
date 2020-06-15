const AWS = require('aws-sdk')
const fs = require('fs')
const os = require('os')
const WebSocket = require('ws')
const { spawn } = require('child_process')

exports.handler = async (event, context) => {
    const payload = JSON.parse(event.body)
    const ENDPOINT = process.env.WEBSOCKET_ENDPOINT
    const connectionId = payload.connectionId
    const agws = new AWS.ApiGatewayManagementApi({
        apiVersion: '2018-11-29',
        endpoint: 'https://' + ENDPOINT,
    })
    const sendMessage = message =>
        agws
            .postToConnection({ ConnectionId: connectionId, Data: JSON.stringify(message) })
            .promise()
    const ws = new WebSocket('wss://' + ENDPOINT)
    ws.onopen = e => ws.send('info')
    ws.onmessage = e => {
        let data = JSON.parse(e.data)
        if (data.action === 'connectionInfo') {
            sendMessage({
                action: 'start',
                connectionId: data.connectionId,
                logStream: context.logStreamName,
            })
        } else if (data.action === 'write') {
            proc.stdin.write(data.data)
        } else if (data.action === 'resize') {
        } else if (data.action === 'quit') {
            sendMessage({ action: 'close' }).then(() => process.exit())
        }
    }

    function buffer(send, timeout) {
        let s = ''
        let sender = null
        return data => {
            s += data
            if (!sender) {
                sender = setTimeout(() => {
                    send(s)
                    s = ''
                    sender = null
                }, timeout)
            }
        }
    }

    const bufferedWrite = buffer(data => sendMessage({ action: 'write', data: data }), 50)
    const proc = spawn('/bin/sh', ['-i'], {
        stdio: 'pipe',
        shell: true,
    })

    proc.stdout.on('data', function(data) {
        process.stdout.write(data)
        bufferedWrite(data.toString())
    })

    proc.stderr.on('data', function(data) {
        process.stdout.write(data)
        bufferedWrite(data.toString())
    })

    proc.on('close', e => {
        console.log(e)
        sendMessage({ action: 'close' }).then(() => process.exit())
    })

    await new Promise(resolve => {})
}
