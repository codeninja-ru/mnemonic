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

    var settingsComp = comp(function(attrs) {
        function onSettingsButtonClick() {
            alert(1);
        }
        return div({class: 'settings-button'}, span({'click': onSettingsButtonClick}, tag('i', {class: 'fas fa-cog'})));
    });

    var answerChackerComp = comp(function(attrs) {
        var props = {
            answer: h(""),
            correctAnswers: h([]),
            wrongAnswersCount: h(0),
        };

        function levenshteinDistance(a, b) {
            if(a.length == 0) return b.length; 
            if(b.length == 0) return a.length; 

            var matrix = [];

            // increment along the first column of each row
            var i;
            for(i = 0; i <= b.length; i++){
                matrix[i] = [i];
            }

            // increment each column in the first row
            var j;
            for(j = 0; j <= a.length; j++){
                matrix[0][j] = j;
            }

            // Fill in the rest of the matrix
            for(i = 1; i <= b.length; i++){
                for(j = 1; j <= a.length; j++){
                    if(b.charAt(i-1) == a.charAt(j-1)){
                        matrix[i][j] = matrix[i-1][j-1];
                    } else {
                        matrix[i][j] = Math.min(matrix[i-1][j-1] + 1, // substitution
                            Math.min(matrix[i][j-1] + 1, // insertion
                                matrix[i-1][j] + 1)); // deletion
                    }
                }
            }

            return matrix[b.length][a.length];
        }
  
  
        function onSubmitFn() {
            var val = props.answer.val;
            var countOfCorrectAnswers = props.correctAnswers.val.length;
            // sample must be a constant
            var nextAnswer = _.chain(attrs.sample.val.split(','))
                .map(v => v.trim(v))
                .drop(countOfCorrectAnswers)
                .head()
                .value();

            if (nextAnswer && levenshteinDistance(nextAnswer, val) <= 1) {
                props.correctAnswers.val = props.correctAnswers.val.concat(nextAnswer);
            } else {
                console.log(nextAnswer);
                props.wrongAnswersCount.val++;
            }

            props.answer.val = "";
        }

        var unsolved = props.correctAnswers.apply((answers) => {
            var countOfCorrectAnswers = props.correctAnswers.val.length;
            var str = _.chain(attrs.sample.val.split(','))
                .map(v => v.trim(v))
                .drop(countOfCorrectAnswers)
                .value()
                .join(', ')
                .trim();

            return _.isEmpty(str) ? "" : ', ' + str;
        });

        var isTestFailed = props.wrongAnswersCount.apply(count => count >= attrs.maxWrongAnswers);
        var isTestPassed = props.correctAnswers.apply((answers) => {
            return answers.length == attrs.sample.val.split(',').length;
        });

        return div({'class': 'text-answers'}, [
            span({'class': 'correct-answers'}, [
                text(props.correctAnswers.apply(v => v.join(', ').trim())),
                when(isTestFailed, span({'class': 'unsolved'}, text(unsolved)))
            ]),
            when(
                and(not(isTestFailed), not(isTestPassed)),
                span({'class': 'attempts'}, form({'submit': onSubmitFn}, input({'type': 'text', 'name': 'answer', 'bind': props.answer, 'autocomplete': 'off'})))
            ),
            when(and(not(isTestPassed), not(isTestFailed)), div({class: 'wrong-answers-count'}, text(props.wrongAnswersCount.apply(count => attrs.maxWrongAnswers - count)))),
            when(isTestPassed, div({class: 'final'}, text('You did it!'))),
            when(and(not(isTestPassed), isTestFailed), div({class: 'final'}, text('You can do better!'))),
        ]);
    });

    var settingsCop = comp(function(attrs) {
        const elm = a('#', {class: 'settingsBtn'}, span({}));
        
        return elm;
    });

    var timerComp = comp(function(attrs) {
        var RADIUS = 34;
        var CIRCUMFERENCE = 2 * Math.PI * RADIUS;

        var dashoffset = h(function(update) {
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
        var sample = h(fetch('words2.txt')
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
                    .take(attrs.wordCount.val)
                    .value();
                return words.join(', ').trim();
            }));

        var timeout = h((update) => {
            setTimeout(() => update(true), attrs.timeout.val);
        }, false);
            
        return when(
            timeout, 
            answerChackerComp({'sample': sample, 'maxWrongAnswers': 3}),
            lazyDiv({}, [
                div({'class': 'text-test'}, text(sample)),
                timerComp({timeout: attrs.timeout.val})
            ])
        );
    });

    var appComp = comp(function(attrs) {
        var settings = {
            wordCount: h(10),
            timeout: h(7000 * 10)
        };

        hujakAppend(document.body, settingsComp(settings));

        return [
            tag('h1', {}, text('Can you rememeber?')),
            mnemoTextComp(settings),
        ];
    });

    hujak(document.getElementById('appComp'), appComp());

})(window);
