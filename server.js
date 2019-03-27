const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

function wrap(ws, onmessage, onerror) {
    ws.on('message', msg => {
        try {
            const {type, payload} = JSON.parse(msg)
            onmessage.call(ws, type, payload)
        } catch (e) {
            onerror.call(ws, e)
        }
    })

    return function send(type, payload = null) {
        ws.send(JSON.stringify({ type, payload }), err => {
            err && onerror.call(ws, err, type, payload)
        })
    }
}

const state = {
    corpus: 'Hello there. How are you ?', 
    players: []
}

wss.on('connection', function connection(ws) {
    ws.on('message', msg => {
        try {
            const {type, payload} = JSON.parse(msg)
            receive(type, payload, ws)
        } catch (e) {
            //error(e, ws)
        }
    })
});



function send(ws, type, payload = null) {
    ws.send(JSON.stringify({ type, payload }), err => {
        err && onerror.call(ws, err, type, payload)
    })
}

function receive(type, payload, ws) {
    switch(type) {
        case 'INIT':
            ws.index = players.push({
                ws,
                cursor: 0,
                checkpoints: []
            })
            break;

        case 'KEYSTROKE':
            const {corpus, players} = state
            const player = players.find((_, i) => i === ws.index)
            const {cursor, checkpoints} = player
            const key = payload

            // the key pressed is the good one
            if (corpus[cursor] === key) {
                // checkpoint at each beginning of a word:
                // last cursor is a space and next is a letter
                if (corpus[cursor - 1] === ' '
                    && /\w/.test(corpus[cursor])) {
                        checkpoints.push(cursor)
                }
                // update player postion
                player.cursor = cursor + 1
            } else {
                // key pressed is bad
                player.cursor = checkpoints.pop() || 0
            }
            
            const cursors = players.map(p => p.cursor)
            wss.clients.forEach(client => {
                send(client, 'UPDATE', {
                    cursors,
                    index: client.index
                })
            })
    }
}

function error(err, ws) {

}