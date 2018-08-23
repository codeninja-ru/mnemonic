//TODO vmayorov: read-only Variables
//TODO vmayorov: disposing of variables

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

function addDisposer(elm, disposer) {
    if (elm instanceof Node) {
        if (Array.isArray(elm.hujakDisposers)) {
            elm.hujakDisposers.push(disposer);
        } else {
            elm.hujakDisposers = array(disposer);
        }
    }
}

function appendNodes(parent, nodes) {
    array(nodes).forEach(function(item) {
        if (item != undefined) {
            array(unwrap(item)).forEach((v) => {
                var elm = unwrap(v);
                if (elm instanceof Component) {
                    var elements = unwrap(elm.elements());
                    parent.appendChild(elements)
                    setTimeout(function() {
                        elm.up(elements);
                    }, 0);
                } else {
                    parent.appendChild(elm)
                }
            });
        }
    });

    return parent;
}

function removeNode(parent, nodeToRemove) {
    // here we clear all our hooks and hujaks
    function disposeOf(node) {
        if (node.hujakDisposers) {
            node.hujakDisposers.forEach(fn => fn());
        }
        node.childNodes.forEach(disposeOf);
    }
    setTimeout(function() {
        disposeOf(nodeToRemove);
    }, 0);
    parent.removeChild(nodeToRemove);
}

function replaceAllChildren(parent, nodes) {
    // https://stackoverflow.com/questions/3955229/remove-all-child-elements-of-a-dom-node-in-javascript
    var fc = parent.firstChild;

    while (fc) {
        removeNode(parent, fc);
        fc = parent.firstChild;
    }

    return appendNodes(parent, nodes);
}

/**
 * @class Variable
 * the class for variables, init it with h
 * @see h
 */
function Variable(value, initValue) {
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
    /**
     * Watchs the changes of the value
     * @param {Function(v)} fn - callback function where the argument is a new value
     * @return {Function} function that stops the watching
     */
    this.watch = function(fn) {
        listeners.push(fn);
        return function() {
            var idx = listeners.indexOf(fn);
            if (idx != -1) {
                delete listeners[idx];
            }
        };
    };
    /**
     * Produces a new Variable by apply the function to it
     * @param {Function(x)} fn - a simple functions
     * @return {Variable}
     *
     * @example
     * var name = h("John");
     * var sayHallo = name.apply(n => "Hello, " + v); // Hello, John
     */
    this.apply = (fn) => {
        var newVr = h(fn(this.val));
        this.watch((v) => newVr.val = fn(this.val));
        return newVr;
    };
    /**
     * Combines two Variable's into one
     * @param {Variable|any} v - the second variable, if it's not a Variable, this function is equivalent of apply @see apply
     * @param {Function(v1, v2)} fn - function takes two arguments and produces one
     * @return {Variable}
     *
     * @example
     * var val1 = h(1);
     * var val2 = h(2);
     * var sum = val1.combine(val2, (v1, v2) => v1 + v2); // 1 + 2 = 3
     */
    this.combine = (v, fn) => {
        if (isVar(v)) {
            var newVr = h(fn(this.val, v.val));
            this.watch(v1 => newVr.val = fn(v1, v.val));
            v.watch(v2 => newVr.val = fn(this.val, v2));
            return newVr;
        } else {
            return this.apply(v1 => fn(v1, v));
        }
    };

    /**
     * Produces a new Variable that compares the underlying Variable with the value
     * @param {any} value - a value to compare with
     * @return {RVariable} returns read-only Variable
     * @todo read-only
     *
     * @example
     * var name = h('John');
     * var isJohn = name.is('John');
     */
    this.is = (value) => {
        var newVr = h(this.val == value);
        this.watch((v) => {
            newVr.val == this.val == value;
        });
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
 * @param {Variable} b - a Variable containing boolean value
 * @return {BoolVariable}
 */
function not(b) {
    return b.apply(v => !v);
}

/**
 * && operation on b1 and b2
 * @param {Variable} b1
 * @param {Variable} b2
 * @return {Variable}
 */
function and(b1, b2) {
    return b1.combine(b2, (v1, v2) => v1 && v2);
}

/**
 * || operation on b1 and b2
 * @param {Variable} b1
 * @param {Variable} b2
 * @return {Variable}
 */
function or(b1, b2) {
    return b1.combine(b2, (v1, v2) => v1 || v2);
}

/**
 * @class Component
 * @see comp
 * @example
 * class HelloWorldComponent extends Component {
 * }
 *
 * var helloWorldComp = new HelloWorldComponent({say: 'Hello'});
 * var parent = document.body;
 * parent.appendChild(helloWorldComp(parent));
 *
 * @todo
 */
function Component(elements, upFn, downFn) {
    var _elm;
    this.up = function() {
        if (typeof upFn == 'function') {
            //TODO vmayorov: refactor
            upFn.apply(this, arguments);
        }
    };
    this.down = function() {
        if (typeof downFn == 'function') {
            downFn.apply(this, arguments);
        }
    };
    this.elements = function() {
        return elements;
    };
}

/**
 * a builder for a Component object
 * @class element
 * @param {any} elm - element, usually a tag element or component
 * @param {Function} upFn - a callback that is called when the elm is append to the DOM
 * @param {Function} downFn - a callback that is called when the elm is removed from the DOM
 *
 * @example 
 * var helloWorld = comp(function(attrs) {
 *  return el(div({class: 'test-class'}, [
 *      text('Name'),
 *      el(input({type: 'text'})).up(function(elm) { this.focus(); // set focus on the input }).down(function() { alert('Good bye'); })
 *  ])).down(function() {
 *      // free your resurces here
 *  });
 * };
 */
//TODO vmayorov: rename
function element(elm, upFn, downFn) {
    this.up = function(fn) {
        return new element(elm, fn, downFn);

    };
    this.down = function(fn) {
        return new element(elm, upFn, fn);
    };
    this.build = function() {
        return new Component(elm, upFn, downFn);
    };
}

/**
 * a helper for element
 * @see element
 * @param {Element} elm
 */
function el(elm) {
    return new element(elm);
}

/**
 * Creates a Variable
 * @param {any|function|Promise} 
 * @return {Variable}
 *
 * @example
 * var v = h(10);
 * v.val = 11
 *
 * @example
 * var ajax = h(fetch("http://test/some.json"))
 *
 * @example
 * var timeout = h(funciton(update) {
 *  setTimeout(function() {
 *      update(true);
 *  }
 * }, false);
 */
function h(v, initValue) { return new Variable(v, initValue); }

function isVar(val) {
    return val instanceof Variable;
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
    } else if (node instanceof element) {
        return node.build();
    } else {
        return node;
    }
}

function _tag(elm, attrs, nodes) {
    for (let prop in attrs) {
        let val = attrs[prop];
        if (prop == 'submit') {
            elm.addEventListener("submit", function(e) {
                event.preventDefault();
                val(e);
            });
        } else if (prop == 'click') {
            elm.addEventListener("click", function(e) {
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
                addDisposer(elm, val.watch((v) => elm.value = v));
            }
        } else if (prop == 'style' && typeof val == 'object') {
            for (let k in val) {
                let v = val[k];
                if (isVar(v)) {
                    elm.style[k] = v.val;
                    addDisposer(v.watch((newVal) => elm.style[k] = newVal));
                } else {
                    elm.style[k] = v;
                }
            }
        } else {
            if (isVar(val)) {
                elm.setAttribute(prop, val.val);
                addDisposer(elm, val.watch((v) => elm.setAttribute(prop, v)));
            } else {
                elm.setAttribute(prop, val);
            }
        }
    }

    if (typeof nodes == 'string') {
        elm.innerHTML = nodes;
    } else {
        appendNodes(elm, nodes);
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
        addDisposer(elm, str.watch((val) => {
            elm.textContent = val;
        }));
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

function a(src, attrs = {}, nodes = []) {
    return tag('a', Object({}, {'src': src}, attrs), nodes);
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

/**
 * if else component
 * @param {Variable} cond - condition Variable
 * @param {Component|Element|lazy} thenElm - element and condition that's rendered when the condition is true
 * @param {Component|Element|lazy} elseElm - element and condition that's rendered when the condition is false
 *
 * @example
 * var data = h(fetch('http://test/data.json');
 * var isDataLoaded = h.apply(d => d != undefined);
 * when(
 *      idDataLoaded,
 *      [div({}, text('Wow! data =')), text(data)],
 *      text('Loading...')
 * );
 */
function when(cond, thenElm, elseElm) {
    if (isVar(cond)) {
        var wrap = span({}, cond.val ? thenElm : elseElm);
        addDisposer(wrap, cond.watch((v) => replaceAllChildren(wrap, v ? thenElm : elseElm)));
        return wrap;
    } else {
        return cond ? thenElm : elseElm;
    }
}

/**
 * Attaches the component to DOM
 * Init your application with this
 * @param {Element|Array} parent - container for your app 
 * @param {Component|Array<Component>} comp - Nujak component or array of components
 *
 * @example hujak(document.getElementById('appId'), helloWorldComp());
 */
function hujak(parent, comp) {
    return replaceAllChildren(parent, comp);
}

/**
 * Does the same as @see hujuak but instead of relecing of all the elements inseide the parent, it appends
 * Useful when you want append components to the end of document.body
 * @param {Element|Array} parent - container for your app 
 * @param {Component|Array<Component>} comp - Nujak component or array of components
 *
 * @example hujakAppend(document.body, hiddenModelWindowComp());
 */
function hujakAppend(parent, comp) {
    return appendNodes(parent, comp);
}
