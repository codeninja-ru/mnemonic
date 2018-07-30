(function(window) {
    var testFrame = document.getElementById('testFrame');

    function generateWords1(count) {
        fetch('words1.txt')
            .then(function(resp) {
                return resp.text();
            })
            .then(function(text) {
                var arr = text.split("\n");
                var words = _.chain(arr)
                    .map(function(val) {
                        return val.trim();
                    })
                    .shuffle()
                    .take(count)
                    .value();
                testFrame.innerHTML = words.join(', ').trim();
            });
    }

    generateWords1(25);


})(window);
