function isPromise(obj) {
    return obj instanceof Promise;
}

function array(elm) {
    if (Array.isArray(elm)) {
        return elm;
    } else {
        return [elm];
    }
}

function replaceAllChildren(parent, nodes) {
    // https://stackoverflow.com/questions/3955229/remove-all-child-elements-of-a-dom-node-in-javascript
    var fc = parent.firstChild;

    while( fc ) {
        parent.removeChild( fc );
        fc = parent.firstChild;
    }


    array(nodes).forEach(function(item) {
        parent.appendChild(unwrap(item));
    });

    return parent;
}

function _Variable(value, initValue) {
    var val;
    var listeners = [];
    Object.defineProperty(this, "val", {
        get: function() {
            return val;
        },
        set: function(v) {
            if (val != v) {
                val = v;
                listeners.forEach((fn) => fn.call(this, v));
            }
        }
    });
    this.watch = function(fn) {
        listeners.push(fn);
    };
    this.apply = (fn) => {
        var newVr = variable(fn(this.val));
        this.watch((v) => newVr.val = fn(this.val));
        return newVr;
    };

    if (initValue) {
        val = initValue;
    }

    if (isPromise(value)) {
        value.then((r) => this.val = r);
    } else if (typeof value == 'function') {
        //TODO vmayorov: what if the return value will be an initValue?
        value((newValue) => this.val = newValue);
    } else {
        val = value;
    }
}

/**
 * Creates a variable
 * @param {any|function|Promise} 
 * @return {_Variable}
 *
 * @example
 * var v = variable(10);
 * v.val = 11
 *
 * @example
 * var ajax = variable(fetch("http://test/some.json"))
 *
 * @example
 * var timeout = variable(funciton(update) {
 *  setTimeout(function() {
 *      update(true);
 *  }
 * }, false);
 */
function variable(v, initValue) { return new _Variable(v, initValue); }

function isVar(val) {
    return val instanceof _Variable;
}

function lazy(fn) {
    var me = this;
    return function() {
        var args = arguments;
        return function() {
            return fn.apply(me, args);
        };
    };
}

function unwrap(node) {
    if (typeof node == 'function') {
        return unwrap(node());
    } else {
        return node;
    }
}

function _tag(elm, attrs, nodes) {
    for (let prop in attrs) {
        let val = attrs[prop];
        if (prop == 'onsubmit') {
            elm.addEventListener("submit", function(e) {
                event.preventDefault();
                val(e);
            });
        } else if (prop == 'bind') {
            if (!isVar(val)) {
                console.log(prop + ' must be a varable()');
            } else {
                elm.addEventListener("change", function(event) {
                    val.val = event.target.value;
                });
                val.watch((v) => elm.value = v);
            }
        } else if (prop == 'style' && typeof val == 'object') {
            for (let k in val) {
                let v = val[k];
                if (isVar(v)) {
                    elm.style[k] = v.val;
                    v.watch((newVal) => elm.style[k] = newVal);
                } else {
                    elm.style[k] = v;
                }
            }
        } else {
            if (isVar(val)) {
                elm.setAttribute(prop, val.val);
                val.watch((v) => elm.setAttribute(prop, v))
            } else {
                elm.setAttribute(prop, val);
            }
        }
    }

    if (typeof nodes == 'string') {
        elm.innerHTML = nodes;
    } else {
        array(nodes).forEach(function(node) {
            elm.appendChild(unwrap(node));
        });
    }

    return elm;
}

/**
 * Creates a tag
 * @param {string} name - name of the tag (div, span, etc)
 * @param {Object} attrs - a list attributes of the tag
 * @param {Array|string} nodes - a list of child components or one component or a list of Element objects or plain html
 *
 * @return {Element}
 */
function tag(name, attrs, nodes = []) {
    var elm = document.createElement(name);
    return _tag(elm, attrs, nodes);
}

/**
 * Create a tag in SVG name space
 * @param {string} name - name of the tag (div, span, etc)
 * @param {Object} attrs - a list attributes of the tag
 * @param {Array|string} nodes - a list of child components or one component or a list of Element objects or plain html
 *
 * @return {Element}
 *
 * @example
 * svg({class: 'progress', width: 40, height: 40, "viewBox": "0 0 80 80"}, svg('circle', {class: "progress__value", cx: 40, cy: 40, r: 34, "stroke-width": 12})));
 */
function svg(name, attrs, nodes = []) {
    //TODO vmayorov: create tagNS
    var elm = document.createElementNS('http://www.w3.org/2000/svg', name);
    return _tag(elm, attrs, nodes);
}

function lazyText(str) {
    return lazy(text)(str);
}

/**
 * Creates a text Node
 * @param {string|Variable} str - text for the text node
 * @return text node
 *
 * @example
 * text("Hello World")
 */
function text(str) {
    if (isVar(str)) {
        var elm = document.createTextNode(str.val);
        str.watch((val) => {
            elm.textContent = val;
        });
        return elm;
    } else {
        return document.createTextNode(str);
    }
    return elm;
}

function div(attrs, nodes = []) {
    return tag('div', attrs, nodes);
}

function lazyDiv(attrs, nodes = []) {
    return lazy(div)(attrs, nodes);
}

function span(attrs, nodes = []) {
    return tag('span', attrs, nodes);
}

function input(attrs, nodes = []) {
    return tag('input', attrs, nodes);
}

function form(attrs, nodes = []) {
    return tag('form', attrs, nodes);
}

/**
 * Creates Hujak Component
 * @param {function} func - Component function
 * @return {function} Hujak component
 *
 * @example
 * var helloWorldComp = comp(function(attrs) {
 *  return text("Hujak! Hujak!");
 * });
 */
function comp(func) {
    return function() {
        var me = this;
        var args = arguments;
        return function() {
            return func.apply(me, args);
        };
    };
}

function ifElse(cond, thenElm, elseElm) {
    if (isVar(cond)) {
        var wrap = div({}, cond.val ? thenElm : elseElm);
        cond.watch((v) => replaceAllChildren(wrap, v ? thenElm : elseElm));
        return wrap;
    } else {
        return cond ? thenElm : elseElm;
    }
}

/**
 * Attaches the component to DOM
 * Init your application with this
 * @param {Element} parent - container for your app 
 * @param {Component} comp - Nujak component
 *
 * @example hujak(document.getElementById('appId'), helloWorldComp());
 */
function hujak(parent, comp) {
    return replaceAllChildren(parent, comp);
}
