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
            dispatch(value);
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
        filter: (fn) => {
            return $svet(update => {
                //todo init value???
                this.on(value => {
                    if (fn(value)) {
                        update(value);
                    }
                });
            });
        },
        map: (fn) => {
            return $svet(update => {
                this.on(value => fn(value));
                return fn(this.value());
            });
        }
    };
}

var RADIUS = 34;
var CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function dashTimer(secondsFn, direction = 1) {
    return $svet((update) => {
        var progress = (value) => {
            var progress = value / 100;
            var dashoffset = CIRCUMFERENCE * (1 - progress);
            update(dashoffset);
        }
        var stepInt = secondsFn() * 1000 / 100;

        var pr = direction == 1 ? 0 : 100;
        progress(pr);
        var stop = setInterval(() => {
            if (direction == 1) {
                progress(pr++);
            } else {
                progress(pr--);
            }
            if (pr > 100 || pr < 0) {
                clearInterval(stop);
            }
        }, stepInt);

        return 0;
    });
}

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
        seconds: 5,
        next: skipZero(() => {
            return {
                name: 'pause-in',
                seconds: 0,
                next: skipZero(() => {
                    return {
                        name: 'out',
                        seconds: 5,
                        next: skipZero(() => {
                            return {
                                name: 'pause-out',
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

class MyTimer extends HTMLElement {
    constructor() {
        super();
        this.seconds = 10;
    }

    connectedCallback() {
        this.render();
    }

    disconnectedCallback() {
        window.cancelAnimationFrame(this.frameId);
    }

    render() {
        var $frameAnimation = $svet(update => {
            var tick = () => {
                this.frameId = window.requestAnimationFrame(timestamp => {
                    update(timestamp);
                    tick();
                });
            };
        });

        var $mode = $svet(update => {
            return inState(); // in, pause-in, out, pause-out
        });
        var $dashOffset = dashTimer(() => $mode.value().seconds);
        var $seconds = $svet((update) => {
            var tick = (count) => {
                if (count > 0) {
                    setTimeout(() => update(tick(count - 1)), 1000);
                }
                return count;
            };
            return tick($mode.value().seconds);
        });
        $seconds.on(value => {
            if (value == 0) {
                $mode.set($mode.value().next());
                setTimeout(() => {
                    $seconds.reset();
                    $dashOffset.reset();
                });
            }
        });

        (function(elm) {
            elm.innerHTML = `<svg width="180" height="180" viewBox="0 0 80 80" class="timer ${"timer--" + $mode.value().name}">
            <circle cx="50%" cy="50%" r="${RADIUS}" stroke-width="12" stroke="#eee" style="stroke-dasharray: ${CIRCUMFERENCE}; stroke-dashoffset:${$dashOffset}; transform: rotate(90deg) translate(0%, -100%)"></circle>
            <text x="50%" y="50%" fill="#eee" font-size="40px" text-anchor="middle" dy=".3em">${$seconds}</text>
        </svg>`;
            var e0 = getElm(elm, 0);
            var e1 = getElm(elm, 0, 1);
            $dashOffset.on((value) => chStyle(e1, 'stroke-dashoffset', value));
            var e2 = getElm(elm, 0, 3);
            $seconds.on((value) => chText(e2, value));
            $mode.on((value) => chAttr(e0, 'class', "timer timer--" + value.name));
        })(this);

    }
}

class MyBreath extends HTMLElement {
    connectedCallback() {
        this.render();
    }

    render() {
        (function(elm) {
            elm.innerHTML = `<my-timer seconds="10"></my-timer>`;

            var e1 = getElm(elm, 0);
            e1.addEventListener('finished', (e) => {
                alert(1);
            });
        })(this);
    }
}

customElements.define('my-timer', MyTimer);
customElements.define('my-breath', MyBreath);
