import React from 'react'
import ReactDOM from 'react-dom'
import AWS from 'aws-sdk/global'
import Lambda from 'aws-sdk/clients/lambda'
import STS from 'aws-sdk/clients/sts'
import APIGatewayWebsocket from 'aws-sdk/clients/apigatewaymanagementapi'
import APIGateway from 'aws-sdk/clients/apigateway'
import 'xterm/css/xterm.css'
import { expose } from './util'
import { Terminal } from 'xterm'
import { RequestSigner } from 'aws4'
import { AwsClient } from 'aws4fetch'

async function connect(config: {
    Region: string
    AccessKey: string
    SecretKey: string
    WebSocket: string
    WSStage: string
    Lambda: string
}) {
    const awsCredentials = {
        accessKeyId: config.AccessKey,
        secretAccessKey: config.SecretKey,
    }
    AWS.config.update({
        region: config.Region,
        credentials: awsCredentials,
    })

    var sts = new STS({ apiVersion: '2011-06-15' })
    await sts.getCallerIdentity().promise()

    const wsEndpoint = `${config.WebSocket}.execute-api.${config.Region}.amazonaws.com/${config.WSStage}`

    const sendAW3 = async (message, connectionId) => {
        return await awsFetch.fetch('https://' + wsEndpoint + '/@connections/' + connectionId, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(message),
            aws: {
                signQuery: true,
            },
        })
    }
    expose('sendAW3', sendAW3)

    const awsFetch = new AwsClient(awsCredentials)
    const lambda = new Lambda({ apiVersion: '2015-03-31' })
    expose('lambda', lambda)

    const ws = new WebSocket('wss://' + wsEndpoint)
    let myConnectionId
    let lastClient

    ws.onmessage = e => {
        let data = JSON.parse(e.data)
        console.log(data)
        if (data.action === 'connectionInfo') {
            myConnectionId = data.connectionId
            ;(window as any).conn = myConnectionId
            lambda
                .invoke({
                    FunctionName: config.Lambda,
                    Payload: JSON.stringify({
                        body: JSON.stringify({ connectionId: myConnectionId }),
                    }),
                })
                .promise()
                .then(data => console.log(data))
        } else if (data.action === 'start') {
            lastClient = data.connectionId
        } else if (data.action === 'write') {
            term.write(data.data.replace(/\n/g, '\r\n'))
        }
    }

    ws.onopen = e => {
        console.log('websocket opened')
        ws.send('info')
    }
    expose('ws', ws)

    var term = new Terminal()
    term.open(document.getElementById('root'))
    term.resize(80, 30)
    term.onData(data => {
        sendAW3({ action: 'write', data: data }, lastClient)
    })
}

function App() {
    const [text, setText] = React.useState('')
    const [error, setError] = React.useState(null)
    const [loggedIn, setLoggedIn] = React.useState(false)
    let config = Object.fromEntries(
        text
            .trim()
            .split(';')
            .map(k => k.trim().split(/\s*:\s*/))
    )
    let isValid =
        config.AccessKey &&
        config.SecretKey &&
        config.Region &&
        config.WebSocket &&
        config.WSStage &&
        config.Lambda

    console.log(config)

    if (loggedIn) return null

    return (
        <div>
            <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="AccessKey: AK328NIAJJ32871ZZ; SecretKey: 3t+QEji3AKLNiewjKNLKeiow3JdkwL1; Region: us-east-1; WebSocket: sj382nxk; WSStage: main; Lambda: LambdaTerminal-LambdaTerminalLambda-584E8W12WEB"
            />
            <br />
            {error && <div>{error}</div>}
            <button
                onClick={async e => {
                    if (!isValid) return
                    try {
                        await connect(config)
                        setLoggedIn(true)
                    } catch (err) {
                        setError(err.toString())
                    }
                }}
                disabled={!isValid}
            >
                Connect
            </button>
        </div>
    )
}

ReactDOM.render(<App />, document.getElementById('root'))
