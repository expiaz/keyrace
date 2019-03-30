const WebSocket = require('ws')
const faker = require('faker')

const colors = [
    'green',
    'red',
    'blue',
    'yellow',
    'purple'
]

function generateCorpus() {
    return [... Array(faker.random.number({ min: 5, max: 25 })).keys()]
        .map(_ => faker.random.words(faker.random.number({ min: 5, max: 25 })))
        .map(s => s[0].toUpperCase() + s.slice(1).toLowerCase())
        .join('. ') + '.'
}

const state = {
    corpus: generateCorpus(), 
    players: []
}

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', function connection(ws) {
    console.log('connection')
    ws.on('message', msg => {
        try {
            const {type, payload} = JSON.parse(msg)
            receive(type, payload, ws)
        } catch (e) {
            console.error(e)
        }
    })
});

function send(ws, type, payload = null) {
    console.log('sending %s %o to %s', type, payload, ws.color)
    ws.send(JSON.stringify({ type, payload }), err => {
        err && console.error(err)
    })
}

function receive(type, payload, ws) {
    console.log('received %s %o', type, payload)
    switch(type) {
        case 'INIT': {
            const player = {
                position: 0,
                checkpoints: [],
                color: colors[state.players.length]
            }
            ws.index = state.players.length
            ws.color = player.color
            state.players.push(player)
            send(ws, 'INIT', {
                corpus: state.corpus,
                color: player.color
            })
            break
        }

        case 'KEYSTROKE': {
            const player = state.players.find((_, i) => i === ws.index)
            const key = payload
            // the key pressed is the good one
            if (state.corpus[player.position] === key) {
                // checkpoint at each beginning of a word:
                // last cursor is a space and next is a letter
                if (state.corpus[player.position - 1] === ' '
                    && /\w/.test(state.corpus[player.position])) {
                        player.checkpoints.push(player.position)
                }
                // update player postion
                player.position = player.position + 1

                if (player.position === state.corpus.length) {
                    // winning condition
                    wss.clients.forEach(client => {
                        send(client, 'WIN', player.color)
                    })
                    break
                }
            } else {
                // key pressed is bad
                player.position = player.checkpoints.pop() || 0
            }
            // broadcast event
            const update = {
                players: state.players
                    .map(({ position, color }) => ({
                        position,
                        color
                    }))
                    .sort((a, b) => a.position - b.position)
            }
            wss.clients.forEach(client => {
                send(client, 'UPDATE', update)
            })
            break
        }
    }
}