(function(window) {
    var testFrame = document.getElementById('testFrame');

    function array(elm) {
        if (Array.isArray(elm)) {
            return elm;
        } else {
            return [elm];
        }
    }

    function tag(name, attrs, nodes = []) {
        var elm = document.createElement(name);
        for (var prop in attrs) {
            elm.setAttribute(prop, attrs[prop]);
        }

        array(nodes).forEach(function(node) {
            elm.appendChild(node);
        });

        return elm;
    }

    function text(str) {
        return document.createTextNode(str);
    }

    function div(attrs, nodes = []) {
        return tag('div', attrs, nodes);
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

    var testDb = {
        words1: {
            "count": {
                min: 3,
                max: 255
            },
            dictionary: ['words1.txt', 'words2.txt']
        }
    };

    function generateWords1(count) {
        // http://dict.ruslang.ru/
        fetch('words2.txt')
            .then(function(resp) {
                return resp.text();
            })
            .then(function(str) {
                var arr = str.split("\n");
                var words = _.chain(arr)
                    .map(function(val) {
                        return val.trim();
                    })
                    .shuffle()
                    .take(count)
                    .value();
                var sample = words.join(', ').trim();
                replaceAllChildren(testFrame, div({'class': 'text-test', 'data-sample': sample}, text(sample)));
            });
    }

    generateWords1(5);

})(window);
