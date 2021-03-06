function getElm(elm, ...idxs) {
    var e = elm;
    for (const idx of idxs) {
        e = e.childNodes[idx];
    }

    return e;
}

function chAttr(elm, name, value) {
    if (name == 'value') {
        elm.value = value;
    } else {
        elm.setAttribute(name, value);
    }
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
        return updateFn((value) => {
            if (store != value) {
                dispatch(value);
            }

            return value;
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
        scan: function(fn, initValue) {
            var result = this.value();
            if (initValue) {
                result = initValue;
            }
            return $svet(update => {
                this.on(value => {
                    result = fn(value, result);
                    update(result);
                });

                return result;
            });
        }
    };
}

var RADIUS = 34;
var CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function states(sIn, sPauseIn, sOut, sPauseOut) {
    var progressInOut = (progress) => {
        return Math.round(CIRCUMFERENCE * (1 - progress));
    };
    var progressPause = (progress) => {
        return Math.floor(CIRCUMFERENCE);
    };
    var skipZero = (fn) => {
        return () => {
            var result = fn();
            if (result.seconds == 0) {
                return result.next();
            }
            return result;
        };
    };
    var makePlaySoundFn = (freq) => {
        return function(sec) {
            let audioContext = new (window.AudioContext || window.webkitAudioContext)();
            var osc = audioContext.createOscillator();
            osc.frequency.value = freq + sec * 20;
            osc.type = 'sine';
            var gain = audioContext.createGain();
            gain.gain.value = 0.3;
            osc.connect(gain).connect(audioContext.destination);
            osc.start();
            osc.stop(audioContext.currentTime + 0.1);
        };
    };
    var root = {
        name: 'in',
        label: 'breathe in',
        color: 'hsl(217, 62%, 62%)',
        seconds: sIn,
        play: makePlaySoundFn(430.65),
        calcDashOffset: progressInOut,
        next: skipZero(() => {
            return {
                name: 'pause-in',
                label: 'pause',
                color: 'hsl(127, 62%, 62%)',
                seconds: sPauseIn,
                play: () => {},
                calcDashOffset: progressPause,
                next: skipZero(() => {
                    return {
                        name: 'out',
                        label: 'breathe out',
                        color: 'hsl(0, 62%, 62%)',
                        seconds: sOut,
                        play: makePlaySoundFn(100),
                        calcDashOffset: progressInOut,
                        next: skipZero(() => {
                            return {
                                name: 'pause-out',
                                label: 'pause',
                                color: 'hsl(127, 62%, 62%)',
                                seconds: sPauseOut,
                                play: () => {},
                                calcDashOffset: progressPause,
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

function makeFrameTimer() {
    var handler;
    var timer = $svet(update => {
        var loop = (prev) => {
            handler = window.requestAnimationFrame((timestamp) => {
                timestamp = performance.now();
                update(timestamp - prev);
                loop(timestamp);
            });
        };
        loop(performance.now());
        return update(0);
    });

    timer.destroy = function() {
        window.cancelAnimationFrame(handler);
    };

    return timer;
}

function makeIntervalTimer() {
    const STEP = 30;
    var handler;
    var timer = $svet(update => {
        var prev = Date.now();
        handler = window.setInterval(() => {
            var now = Date.now();
            update(now - prev);
            prev = now;
        }, STEP);

        return update(0);
    });

    timer.destroy = function() {
        window.clearInterval(handler);
    };

    return timer;
}

class MyBreath extends HTMLElement {
    constructor() {
        super();
        this.timerWorking = true;
    }

    connectedCallback() {
        this.render();
        var favicon = document.querySelector('link[rel="icon"]');
        if (favicon && favicon.href) {
            this.originalIcon = favicon.href;
        }
    }

    disconnectedCallback() {
        this.$timer.destroy();
        if (this.originalIcon) {
            var icon = document.querySelector('link[rel="icon"]');
            icon.href = this.originalIcon;
        }
    }

    render() {
        var $mode = $svet(update => {
            return states(this.getAttribute('in') * 1000, this.getAttribute('pause-in') * 1000, this.getAttribute('out') * 1000, this.getAttribute('pause-out') * 1000); // in, pause-in, out, pause-out
        });

        this.$timer = makeFrameTimer();//makeIntervalTimer();

        var $timer = this.$timer.scan((value, result) => {
            var sum = result + value;
            if ($mode.value().seconds <= sum) {
                $mode.set($mode.value().next());
                return value;
            }
            return sum;
        });

        var $progress = $timer.map((value) => (value / ($mode.value().seconds) % 1));
        
        var $dashOffset = $progress
            .filter(() => !document.hidden)
            .map((progress) => {
                return $mode.value().calcDashOffset(progress);
            });

        var $seconds = $timer.map(value => Math.ceil(($mode.value().seconds - (value % $mode.value().seconds)) / 1000));
        $seconds.on((sec) => $mode.value().play(sec));

        (function(elm) {
            elm.innerHTML = `<svg width="180" viewBox="0 0 80 80" class="timer ${"timer--" + $mode.value().name}">
            <circle cx="50%" cy="50%" r="${RADIUS}" stroke-width="10" style="stroke-dasharray: ${Math.floor(CIRCUMFERENCE)}; stroke-dashoffset:${$dashOffset}; transform: rotate(90deg) translate(0%, -100%);" fill="transparent"></circle>
            <text x="50%" y="50%" font-size="40px" text-anchor="middle" dy=".3em">${$seconds}</text>
            <text x="50%" y="60" font-size="4px" text-anchor="middle" stroke-width="2px" stroke="none">${$mode.value().label}</text>
        </svg>
        <canvas width="32" height="32" hidden></canvas>`;
            var e0 = getElm(elm, 0);
            var e1 = getElm(elm, 0, 1);
            $dashOffset.on((value) => chStyle(e1, 'stroke-dashoffset', value));
            var e2 = getElm(elm, 0, 3);
            $seconds.on((value) => chText(e2, value));
            $mode.on((value) => chAttr(e0, 'class', "timer timer--" + value.name));
            var e3 = getElm(elm, 0, 5);
            $mode.on((value) => chText(e3, value.label));
        })(this);

        //var icon = document.querySelector('link[rel="icon"]');
        //if (icon) {
        //    this.querySelectorAll('canvas').forEach((canvas) => {
        //        var inColor = $mode.value().color;
        //        var ctx = canvas.getContext('2d');
        //        ctx.imageSmoothingEnabled = false;
        //        ctx.fillStyle = inColor;
        //        ctx.strokeStyle = inColor;

        //        ctx.font = '20px monospace';
        //        ctx.textBaseline = 'middle';
        //        ctx.textAlign = 'center';
        //        ctx.lineWidth = 4;

        //        $progress
        //            .filter(() => document.hidden)
        //            .scan((value, prev) => {
        //                var seconds = Math.ceil($mode.value().seconds * (1 - value) / 1000);
        //                var inColor = $mode.value().color;
        //                ctx.beginPath();
        //                ctx.fillStyle = inColor;
        //                ctx.strokeStyle = inColor;

        //                if (seconds != prev) {
        //                    // redraw seconds
        //                    ctx.clearRect(0, 0, canvas.width, canvas.height);
        //                    ctx.fillText(seconds, 15, 15);
        //                }
        //                ctx.arc(15, 15, 11, 0.5 * Math.PI, 0.5 * Math.PI + 2 * value * Math.PI);
        //                ctx.stroke();

        //                icon.href = canvas.toDataURL('image/png');

        //                return value;
        //            }, 0);
        //    });

        //    
        //}
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
            by="5"
            from="${from}"
            to="${to}"
            calcMode="paced"
            dur="${inTime}"
            begin="0s; circ-out.end + 0s"
            fill="freeze"
            id="circ-in"
        />
        <animate xlink:href="#prog" 
            attributeType="CSS"
            attributeName="stroke-dashoffset"
            from="${from}"
            by="5"
            to="${to}"
            calcMode="paced"
            dur="${outTime}"
            begin="circ-in.end + 0s"
            fill="freeze"
            id="circ-out"
        />
        </svg>`;
    }
}

customElements.define('svg-breath', SvgBreath);

function html2elm(html) {
    var tmpl = document.createElement('template');
    tmpl.innerHTML = html;
    if (tmpl.content.childNodes[0]) {
        return tmpl.content.cloneNode(true).childNodes[0];
    } else {
        return document.createTextNode('');
    }
}

function $fromEvent(elm, eventName) {
    return $svet(update => {
        elm.addEventListener(eventName, e => update(e));
    });
}

function parseUrlHash() {
    var d = window.location.hash.substr(1).split(':').map(v => parseInt(v));
    return {
        in: d[0] || 5,
        pauseIn: d[1] || 0,
        out: d[2] || 5,
        pauseOut: d[3] || 0,
    };
}

const initSettings = parseUrlHash();
var $in = $svet(() => initSettings.in);
var $pauseIn = $svet(() => initSettings.pauseIn);
var $out = $svet(() => initSettings.out);
var $pauseOut = $svet(() => initSettings.pauseOut);
var $buttonState = $svet(() => false);

function updateUrlHash() {
    window.location.hash = `${$in}:${$pauseIn}:${$out}:${$pauseOut}`;
}
$in.on(updateUrlHash);
$pauseIn.on(updateUrlHash);
$out.on(updateUrlHash);
$pauseOut.on(updateUrlHash);
(function(root) {
    var e0 = getElm(root, 1); // form
    var e1 = getElm(root, 1, 1, 2); // in(s)
    var e2 = getElm(root, 1, 3, 2); // pause-in(s)
    var e3 = getElm(root, 1, 5, 2); // out(s)
    var e4 = getElm(root, 1, 7, 2); // pause-out(s)
    var e5 = getElm(root, 1, 9); // button
    var comp = getElm(root, 3); // place for my-breath component

    // init values
    chAttr(e1, 'value', $in);
    chAttr(e2, 'value', $pauseIn);
    chAttr(e3, 'value', $out);
    chAttr(e4, 'value', $pauseOut);

    // bind actions
    $in.on(value => chAttr(e1, 'value', value));
    $pauseIn.on(value => chAttr(e2, 'value', value));
    $out.on(value => chAttr(e3, 'value', value));
    $pauseOut.on(value => chAttr(e4, 'value', value));
    $buttonState.map(value => value ? 'Stop!' : 'Start!').on(value => chText(e5, value));
    $buttonState.on(value => {
        if (value) {
            let newComp = html2elm(`<my-breath class="box" in=${$in} pause-in=${$pauseIn} out=${$out} pause-out=${$pauseOut}></my-breath>`);
            root.replaceChild(newComp, comp);
            comp = newComp;
        } else {
            let newComp = html2elm('<!--my-breah></my-breath-->');
            root.replaceChild(newComp, comp);
            comp = newComp;
        }
    });

    $fromEvent(e1, 'change').on(e => $in.set(parseInt(e.target.value)));
    $fromEvent(e2, 'change').on(e => $pauseIn.set(parseInt(e.target.value)));
    $fromEvent(e3, 'change').on(e => $out.set(parseInt(e.target.value)));
    $fromEvent(e4, 'change').on(e => $pauseOut.set(parseInt(e.target.value)));
    $fromEvent(e0, 'submit').on(e => {
        e.preventDefault();
        $buttonState.set(!$buttonState.value());
    });

})(document.getElementById('breathApp'));
