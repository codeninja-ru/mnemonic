(function(window) {
    var url = hujakUrl();

    var testDb = {
        words1: {
            "count": {
                min: 3,
                max: 255
            },
            dictionary: ['words1.txt', 'words2.txt']
        }
    };

    function timerComp($, attrs) {
        var RADIUS = 34;
        var CIRCUMFERENCE = 2 * Math.PI * RADIUS;

        var dashoffset = $(function(update) {
            function progress(value) {
                var progress = value / 100;
                var dashoffset = CIRCUMFERENCE * (1 - progress);
                update(dashoffset);
            }
            var stepInt = attrs.timeout/100;

            var pr = 0;
            progress(pr);
            var stop = setInterval(function() {
                progress(pr++);
                if (pr >= 100) {
                    clearInterval(stop);
                }
            }, stepInt);

        });

        return div({class: 'timerComp'}, svg('svg', {class: 'progress', width: 40, height: 40, "viewBox": "0 0 80 80"}, svg('circle', {class: "progress__value", cx: 40, cy: 40, r: RADIUS, "stroke-width": 12, style: {strokeDasharray: CIRCUMFERENCE, strokeDashoffset: dashoffset}})));
    };


    function mnemoTextComp($, attrs) {
        var timeout = $((update) => {
            setTimeout(() => update(true), attrs.timeout.val);
        }, false);
            
        return comp(timerComp)({timeout: attrs.timeout.val});
    };

    function appComp($, attrs) {
        var settings = {
            wordCount: $(10),
            timeout: $(7000 * 10)
        };


        //hujakAppend(document.body, settingsComp(settings));

        return [
            tag('h1', {}, text('Can you rememeber?')),
            comp(mnemoTextComp(settings))
        ]
    };

    hujak(document.getElementById('appComp'), comp(appComp)());

})(window);
