function getElm(elm, ...idxs) {
    var e = elm;
    for (const idx of idxs) {
        e = e.childNodes[idx];
    }

    return e;
}

function chAttr(elm, name, value) {
    elm.setAttribute(name, value);
}

function chStyle(elm, name, value) {
    elm.style[name] = value;
}

function chText(elm, value) {
    elm.textContent = value;
}

function $svet(updateFn) {
    var listeners = [];
    var dispatch = (value) => {
        store = value;
        listeners.forEach((fn) => {
            fn(value);
        });
    };
    var newStore = () => {
        return  updateFn((value) => {
            if (store != value) {
                dispatch(value);
            }
        });
    };
    var store = newStore();
    return {
        on: (forEachFn) => {
            listeners.push(forEachFn);
            return function() {
                var i = listeners.indexOf(forEachFn);
                if (i != -1) {
                    delete listeners[i];
                }
            };
        },
        set: (value) => {
            dispatch(value);
        },
        value: () => {
            return store;
        },
        toString: function() {
            return this.value();
        },
        filter: function (fn) {
            return $svet(update => {
                //todo init value???
                this.on(value => {
                    if (fn(value)) {
                        update(value);
                    }
                });
            });
        },
        map: function(fn) {
            return $svet(update => {
                this.on(value => update(fn(value)));
                return fn(this.value());
            });
        },
        scan: function(fn) {
            var result = this.value();
            return $svet(update => {
                this.on(value => {
                    result = fn(value, result);
                    update(result);
                });
            });
        }
    };
}

var RADIUS = 34;
var CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function inState() {
    var skipZero = (fn) => {
        return () => {
            var result = fn();
            if (result.seconds == 0) {
                return result.next();
            }
            return result;
        };
    };
    var root = {
        name: 'in',
        label: 'breath in',
        seconds: 5000,
        next: skipZero(() => {
            return {
                name: 'pause-in',
                label: 'pause',
                seconds: 0,
                next: skipZero(() => {
                    return {
                        name: 'out',
                        label: 'breath out',
                        seconds: 5000,
                        next: skipZero(() => {
                            return {
                                name: 'pause-out',
                                label: 'pause',
                                seconds: 0,
                                next: skipZero(() => root)
                            };
                        })
                    };
                })
            };
        })
    };

    return root;
}

class MyBreath extends HTMLElement {
    constructor() {
        super();
        this.timerWorking = true;
    }

    connectedCallback() {
        this.render();
    }

    disconnectedCallback() {
        this.timerWorking = false;
    }

    render() {
        var $mode = $svet(update => {
            return inState(); // in, pause-in, out, pause-out
        });
        var $timer = $svet(update => {
            var tick = (ms) => {
                update(ms);
                var prev = Date.now();
                window.requestAnimationFrame(() => {
                    if (this.timerWorking) {
                        tick(Date.now() - prev);
                    }
                });

                return ms;
            };

            return tick(0);
        })
        .scan((value, result) => {
            if ($mode.value().seconds < result) {
                $mode.set($mode.value().next());
                return value;
            }
            return result + value;
        });
        
        var $dashOffset = $timer.map((value) => {
            var progress = value / ($mode.value().seconds);
            return Math.round(CIRCUMFERENCE * (1 - progress));
        });


        var $seconds = $timer.map(value => Math.ceil(($mode.value().seconds - value) / 1000));


        (function(elm) {
            elm.innerHTML = `<svg width="180" height="180" viewBox="0 0 80 80" class="timer ${"timer--" + $mode.value().name}">
            <circle cx="50%" cy="50%" r="${RADIUS}" stroke-width="12" style="stroke-dasharray: ${CIRCUMFERENCE}; stroke-dashoffset:${$dashOffset}; transform: rotate(90deg) translate(0%, -100%)" fill="transparent"></circle>
            <text x="50%" y="50%" font-size="40px" text-anchor="middle" dy=".3em">${$seconds}</text>
        </svg><div style="display: none">${$mode.value().label}</div>`;
            var e0 = getElm(elm, 0);
            var e1 = getElm(elm, 0, 1);
            $dashOffset.on((value) => chStyle(e1, 'stroke-dashoffset', value));
            var e2 = getElm(elm, 0, 3);
            $seconds.on((value) => chText(e2, value));
            $mode.on((value) => chAttr(e0, 'class', "timer timer--" + value.name));
            var e3 = getElm(elm, 1);
            $mode.on((value) => chText(e3, value.label));
        })(this);

    }
}

customElements.define('my-breath', MyBreath);
