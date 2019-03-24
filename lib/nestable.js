
// implemention de roots par les mainteneurs de hyperapp
// beaucoup plus simple, mais pas propre ni opti

/*
instance jamais clean ? (voir sous chrome)
updates a chaque changement du parent (onupdate::el._$r()) non conditionnel

ne revoit pas la meme vnode pour empecher l'update du parent vers l'enfant
mais utilise le meme nom de vnode pour ne faire un update que des attributs de
la vnode container

surcharge l'element container créer (el) pour retrouver les props & childrens,
fonctions proxy (render, uninit)

var view = (state, actions) => (props, children) => <div></div>
var state = {id: 0}
var actions = {
    init: (props, children) => state from props / falsy value,
    hydrate: (oldProps, newProps) => state from props / falsy value,
    uninit: () => void
}

var Component = nestable('Component', state, actions, view)

<Component  oncreate={el => void} 
            onupdate={el => void}
            onremove={(el, done) => done()} />

onremove (virtual dom lifecycle)
This event is fired before the element is removed from the DOM. Use it to create slide/fade out animations. Call done inside the function to remove the element. This event is not called in its child elements.

ondestroy (uninit method lifecycle)
This event is fired after the element has been removed from the DOM, either directly or as a result of a parent being removed. Use it for invalidating timers, canceling a network request, removing global events listeners, etc.

*/

function nestable (name, state, actions, view) {
    actions._$r = function () {return {}}
    var component = function (props, children) {
        return h('div', {
            key: props.key,
            id: props.id,
            class: props.class,
            oncreate: function (el) {
                var wired = app(
                    state,
                    actions,
                    function (s, a) {
                        var v = view(s, a)
                        if (typeof v === 'function') v = v(el._$p, el._$c)
                        return v
                    },
                    el
                )
                el._$p = props
                el._$c = children
                el._$r = wired._$r
                el._$d = wired.uninit
                el._$h = wired.hydrate || wired._$r
                wired.init && wired.init(props, children)
                props.oncreate && props.oncreate(el)
            },
            /**
             * Fonction utilisée pour l'hydratation des props
             * depuis le parent
             * 
             * Cela fonctionne car la fonction
             * de rendu de hyperapp utilise 'onupdate' sur
             * une vnode si sont tag est le même
             * Elle ne prend pas en compte le changement de
             * props, si celles-ci sont les mêmes alors la vnode
             * ne sera pas modifiée donc pas re-rendue
             * @param {DOMElement} el 
             */
            onupdate: function (el) {
                //var oldProps = el._$p
                el._$p = props
                el._$c = children
                el._$r()
                /*
                il est inutile d'avoir une fonction
                comme react componentWillReceiveProps car
                les props sont accessibles dans la fonction render (vue)
                il est donc inutile de dérivé le state des props avant
                le render

                Cela pose comme inconvénient de ne pas pouvoir lancer d'appel asynchrone lors d'update de props avant le premier rendu apres l'hydratation du composant
                */
                //el._$h(oldProps, props)
                props.onupdate && props.onupdate(el)
            },
            ondestroy: function (el) {
                el._$d && el._$d()
            },
            onremove: function (el, done) {
               if (!props.onremove) return done()

               props.onremove(el, done)
            }
        })
    }
    if (name) Object.defineProperty(component, 'name', {value: name})
    return component
}