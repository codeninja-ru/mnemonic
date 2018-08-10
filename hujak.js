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
        parent.appendChild(item);
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

    if (isPromise(value)) {
        val = initValue;
        value.then((r) => this.val = r);
    } else {
        val = value;
    }
}

function variable(v, initValue) { return new _Variable(v, initValue); }

function isVar(val) {
    return val instanceof _Variable;
}

function tag(name, attrs, nodes = []) {
    var elm = document.createElement(name);
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
        } else {
            if (isVar(val)) {
                elm.setAttribute(prop, val.val);
                val.watch((v) => elm.setAttribute(prop, v))
            } else {
                elm.setAttribute(prop, val);
            }
        }
    }

    array(nodes).forEach(function(node) {
        elm.appendChild(node);
    });

    return elm;
}

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

function span(attrs, nodes = []) {
    return tag('span', attrs, nodes);
}

function input(attrs, nodes = []) {
    return tag('input', attrs, nodes);
}

function form(attrs, nodes = []) {
    return tag('form', attrs, nodes);
}

function comp(func) {
    return func;
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


function hujak(parent, nodes) {
    return replaceAllChildren(parent, nodes);
}
