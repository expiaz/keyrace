!(function () {

    const state = {
        winner: null,
        corpus: '',
        players: [],
        offset: 0,
        color: ''
    }

    const $container = document.querySelector('#game')

    let $cursor
    const minOffset = 5 * 60 + 60 // 5 lines + current one

    const actions = {
        init: ({ color, corpus }) => ({ color, corpus }),

        update: ({ players }) => ({ offset }) => {
            if ($cursor) {
                let newOffset = parseInt(
                    window.getComputedStyle($cursor, ':after')
                        .top.slice(0, -2),
                    10
                ) - minOffset
                offset = Math.max(0, newOffset)
            }

            return {
                players,
                offset
            }
        },

        win: color => ({
            winner: color
        })
    }

    function oncreate($el) {
        $cursor = $el
    }

    function view({ corpus, players, offset, color, winner }, actions) {

        if (winner) {
            return h('div', null, `winner is ${winner}`)
        }

        const slices = [
            ...players.map((player, i, arr) => h(
                'span.cursor',
                {
                    class: player.color.concat(
                        player.color === color ? ' blinking' : ''
                    ),
                    key: player.color,
                    oncreate: player.color === color && oncreate,
                    style: player.color === color && 'z-index: 99'
                },
                corpus.slice(
                    arr[i - 1] ? arr[i - 1].position : 0,
                    player.position
                )
            )),
            h(
                'span',
                {
                    class: 'grey',
                    key: 'grey'
                },
                corpus.slice(
                    players.length > 0
                        ? players[players.length - 1].position
                        : 0
                )
            )
        ]

        return h('main', null, [
            h('header', null, [color]),
            h('div.corpus-container', null, [
                h(
                    'section.corpus',
                    { style: `margin-top: -${offset}px` },
                    slices
                )
            ])
        ])
    }

    const main = app(state, actions, view, $container)

    /**
        Websockets
    */

    const ws = new WebSocket('ws://localhost:8080')

    ws.onopen = () => {
        send('INIT')
    }

    ws.onmessage = event => {
        try {
            const { type, payload } = JSON.parse(event.data)
            receive(type, payload, ws)
        } catch (e) {
            console.error(e)
        }
    }

    function send(type, payload = null) {
        ws.send(JSON.stringify({ type, payload }))
    }

    function receive(type, payload) {
        switch (type) {
            case 'INIT':
                main.init(payload)
                window.addEventListener('keypress', e => {
                    e.preventDefault()
                    send('KEYSTROKE', e.key)
                    //main.keypressed(e.key)
                })
                break

            case 'UPDATE':
                main.update(payload)
                break

            case 'WIN':
                main.win(payload)
                break

            default:
                break
        }
    }

    /*
    var interval
    var position = 0
    window.addEventListener('keypress', e => {
        e.preventDefault()
        if (e.key === ' ') {
            if (interval) {
                clearInterval(interval)
                interval = null
            }
            
            interval = setInterval(() => {
                main.update({ players: [{ color: 'green', position: position++ }]})
            }, 100)
        }
    })
    */

})();