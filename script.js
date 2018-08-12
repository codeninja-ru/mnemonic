(function(window) {
    var testFrame = document.getElementById('testFrame');

    var testDb = {
        words1: {
            "count": {
                min: 3,
                max: 255
            },
            dictionary: ['words1.txt', 'words2.txt']
        }
    };

    var answerChackerComp = comp(function(attrs) {
        var props = {
            answer: variable(""),
            correctAnswers: variable([])
        };

        function onSubmitFn() {
            var val = props.answer.val;
            var countOfCorrectAnswers = props.correctAnswers.val.length;
            var nextAnswer = _.chain(attrs.sample.val.split(','))
                .map(v => v.trim(v))
                .drop(countOfCorrectAnswers)
                .head()
                .value();

            if (nextAnswer && nextAnswer == val) {
                props.correctAnswers.val = props.correctAnswers.val.concat(nextAnswer);
            }

            props.answer.val = "";
        }

        return div({'class': 'text-answers'}, [
            span({'class': 'correct-answers'}, text(props.correctAnswers.apply(v => v.join(', ').trim()))),
            span({'class': 'attempts'}, form({'onsubmit': onSubmitFn}, input({'type': 'text', 'name': 'answer', 'bind': props.answer, 'autocomplete': 'off'})))
        ]);
    });

    var timerComp = comp(function(attrs) {
        var RADIUS = 34;
        var CIRCUMFERENCE = 2 * Math.PI * RADIUS;

        var dashoffset = variable(function(update) {
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
    });

    var mnemoTextComp = comp(function(attrs) {
        var sample = variable(fetch('words2.txt')
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
                    .take(attrs.wordCount)
                    .value();
                return words.join(', ').trim();
            }));

        var timeout = variable((update) => {
            setTimeout(() => update(true), attrs.timeout);
        }, false);
            
        return ifElse(
            timeout, 
            answerChackerComp({'sample': sample}),
            lazyDiv({}, [
                div({'class': 'text-test'}, text(sample)),
                timerComp({timeout: attrs.timeout})
            ])
        );
    });

    var appComp = comp(function(attrs) {
        return mnemoTextComp({wordCount: 10, timeout: 1000 * 10});
    });

    hujak(testFrame, appComp());

})(window);
