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
        label: 'breathe in',
        seconds: 6000,
        next: skipZero(() => {
            return {
                name: 'pause-in',
                label: 'pause',
                seconds: 0,
                next: skipZero(() => {
                    return {
                        name: 'out',
                        label: 'breathe out',
                        seconds: 4000,
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
            elm.innerHTML = `<svg width="180" viewBox="0 0 80 80" class="timer ${"timer--" + $mode.value().name}">
            <circle cx="50%" cy="50%" r="${RADIUS}" stroke-width="10" style="stroke-dasharray: ${CIRCUMFERENCE}; stroke-dashoffset:${$dashOffset}; transform: rotate(90deg) translate(0%, -100%)" fill="transparent"></circle>
            <text x="50%" y="50%" font-size="40px" text-anchor="middle" dy=".3em">${$seconds}</text>
            <text x="50%" y="60" font-size="4px" text-anchor="middle" stroke-width="2px" stroke="none">${$mode.value().label}</text>
        </svg>`;
            var e0 = getElm(elm, 0);
            var e1 = getElm(elm, 0, 1);
            $dashOffset.on((value) => chStyle(e1, 'stroke-dashoffset', value));
            var e2 = getElm(elm, 0, 3);
            $seconds.on((value) => chText(e2, value));
            $mode.on((value) => chAttr(e0, 'class', "timer timer--" + value.name));
            var e3 = getElm(elm, 0, 5);
            $mode.on((value) => chText(e3, value.label));
        })(this);

    }
}

customElements.define('my-breath', MyBreath);

class SvgBreath extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.render();
    }

    disconnectedCallback() {
    }

    render() {
        var from = Math.round(CIRCUMFERENCE);
        var to = 0;
        var inTime = this.getAttribute('in') || '5s';
        var outTime = this.getAttribute('out') || '5s';
        var inInt = parseInt(inTime);
        var outInt = parseInt(outTime);
        var maxSeconds = Math.max(inInt, outInt);
        var secondsHtml = [...Array(maxSeconds).keys()].map(i => {
            var num = maxSeconds - i;
            return `
                <tspan class="hidden">
                ${num}
                    <set 
                        attributeName="class" 
                        to="active" 
                        begin="${num <= inInt ? `circ-in.begin + ${inInt - num}s;`:''}${num <= outInt ? `circ-out.begin + ${outInt - num}s`:''}"
                        dur="1s"
                        fill="remove"
                    />
                </tspan>
            `;
        }).join("\n");
        console.log(secondsHtml);
        this.innerHTML = `<svg width="180" viewBox="0 0 80 80" class="timer">
        <style>
            .in {
                fill: hsl(217, 62%, 62%);
                stroke: hsl(217, 62%, 62%);
            }
            .out {
                fill: hsl(0, 62%, 62%);
                stroke: hsl(0, 62%, 62%);
            }
            .hidden {
                display: none;
            }
        </style>
        <g class="in">
            <circle id="prog" cx="50%" cy="50%" r="${RADIUS}" stroke-width="10" style="stroke-dasharray: ${CIRCUMFERENCE}; stroke-dashoffset:0; transform: rotate(90deg) translate(0%, -100%)" fill="transparent"></circle>
            <text x="50%" y="50%" font-size="40px" text-anchor="middle" dy=".3em">
                ${secondsHtml}
            </text>
            <text x="50%" y="60" font-size="4px" text-anchor="middle" stroke-width="2px" stroke="none">
                <tspan class="hidden">
                    breathe in
                    <set 
                        attributeName="class" 
                        to="active" 
                        dur="${inTime}"
                        begin="circ-in.begin + 0s"
                    />
                </tspan>
                <tspan class="hidden">
                    breathe out
                    <set 
                        attributeName="class" 
                        to="active" 
                        dur="${outTime}"
                        begin="circ-out.begin + 0s"
                    />
                </tspan>
            </text>
            <set 
                attributeName="class" 
                to="out" 
                begin="circ-out.begin + 0s"
            />
            <set 
                attributeName="class" 
                to="in" 
                begin="circ-in.begin + 0s"
            />
        </g>
        <animate xlink:href="#prog" 
            attributeType="CSS"
            attributeName="stroke-dashoffset"
            from="${from}"
            to="${to}"
            dur="${inTime}"
            begin="0s; circ-out.end + 0s"
            fill="freeze"
            id="circ-in"
        />
        <animate xlink:href="#prog" 
            attributeType="CSS"
            attributeName="stroke-dashoffset"
            from="${from}"
            to="${to}"
            dur="${outTime}"
            begin="circ-in.end + 0s"
            fill="freeze"
            id="circ-out"
        />
        </svg>`;
    }
}

customElements.define('svg-breath', SvgBreath);
