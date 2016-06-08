(function () {
    'use strict';
    var reqwest = require('reqwest');
    var $ = require('qwery');
    var bonzo = require('bonzo');
    var bean = require('bean');
    var queryString = require('query-string');
    var formSerialize = require('form-serialize');
    var iframeMessenger = require('iframe-messenger');
    var raf = require('raf');
    var useStaticPoll = false;

    var interactiveApi = 'https://interactive.guardianapis.com';
    var interactiveHost = 'https://interactive.guim.co.uk';
    var localStorageKey = 'gu.polls.submitted';
    var id = getIdFromQueryString();

    var option1;
    var option2;
    var title;

    iframeMessenger.enableAutoResize();

    function compressString(string){
        return string.replace(/[\s+|\W]/g, '').toLowerCase();
    }

    function hasLocalStorage() {
        try {
            var storage = window['localStorage'],
                x = '__storage_test__';
            storage.setItem(x, x);
            storage.removeItem(x);
            return true;
        }
        catch(e) {
            return false;
        }
    }

    function getIdFromQueryString(){
        var parsedQueryString = queryString.parse(location.search);
        return parsedQueryString.id != undefined ? parsedQueryString.id : 'test';
    }

    function getPreviousPollSubmission() {
        function getPollById(data, id){
            function byId(value) {
                return value.id == id;
            }
            return data.filter(byId)[0];
        }

        if (localStorage.getItem(localStorageKey) != null) {
            var polls = JSON.parse(localStorage.getItem(localStorageKey));
            return getPollById(polls, id);
        }
        else {
            return null;
        }
    }

    function savePollSubmissionInLocalStorage(id, answer){
        if(hasLocalStorage) {
            if (!localStorage.getItem(localStorageKey)) {
                localStorage.setItem(localStorageKey, JSON.stringify([{id: id, answer: answer}]));
            } else {
                var polls = JSON.parse(localStorage.getItem(localStorageKey));
                polls.push({id: id, answer: answer});
                localStorage.setItem(localStorageKey, JSON.stringify(polls));
            }
        }
    }

    function renderPoll() {
        reqwest({
            url: useStaticPoll ? 'poll-static.json' : interactiveHost + '/docsdata/10RGbEQiyWIw_6EvtdVwoK3HQr2W0ipeIlfq1Jb6Dw-g.json'
            , type: 'json'
        })
            .then(function (resp) {
                if (resp.sheets && resp.sheets[id]) {
                    var option1FromJson = resp.sheets[id][0].a1;
                    var option2FromJson = resp.sheets[id][0].a2;
                    option1 = [option1FromJson, compressString(option1FromJson)];
                    option2 = [option2FromJson, compressString(option2FromJson)];
                    title = resp.sheets[id][0].title;
                    bonzo($('.title')[0]).html(title);
                    bonzo($('#form')).removeClass('form-is-hidden');
                    var previousSubmission = getPreviousPollSubmission();
                    if (previousSubmission) {
                        renderResultsFromPollJson(previousSubmission.id, previousSubmission.answer);
                    }
                    else {
                        renderPollForm(id);
                    }
                }
                else {
                    // eslint-disable-next-line
                    console && console.warn('No poll found with ID: '+ id);
                }
            },  function (err, msg) {
                // eslint-disable-next-line
                console && console.warn('Something went wrong : ' + msg);
            });
    }

    function renderPollForm() {

        bonzo($('.q1')[0]).html(option1[0]);
        bonzo($('.q2')[0]).html(option2[0]);
        bonzo($('#q1-input')).attr('value', option1[1]);
        bonzo($('#q2-input')).attr('value', option2[1]);
    }

    bean.on($('#form')[0], 'submit',  function(event)
    {
        var submission = formSerialize($('#form')[0], {hash: true});
        var answer = submission.option;
        event.preventDefault();
        if(answer) {
            submitPoll(id, answer);
        }
        else {
            // eslint-disable-next-line
            console && console.warn('no answer submitted');
        }
    });

    function renderResultsFromPollJson(id, answer) {
        reqwest({
            url: interactiveHost + '/participation/poll-results.json'
            ,method: 'get'
            ,type: 'json'
            ,success: function (resp) {
                if(resp[id] != null) {
                    var a1Count = resp[id][option1[1]] ? resp[id][option1[1]] : 0;
                    var a2Count = resp[id][option2[1]] ? resp[id][option2[1]] : 0;
                    var total = a1Count + a2Count;
                    var percentages = [Math.round(a1Count / total * 100) + '%', Math.round(a2Count / total * 100) + '%'];
                    var userAnswer = option1.indexOf(answer) != -1 ? option1[0] : option2[0];

                    var barHtml = '<span class="bar__outer"><span class="bar__inner js-bar__inner"></span></span>';
                    var barsHtml = [
                        '<span class="bar__label">' + option1[0] + '</span>' + barHtml + percentages[0],
                        '<span class="bar__label">' + option2[0] + '</span>' + barHtml + percentages[1]
                    ];

                    bonzo($('.form-body')[0]).replaceWith(
                        '<div class="bar">' +
                            '<h3 class="pseudo-radio__header ">You voted for "'+ userAnswer + '"</h3>' +
                            '<span class="bar__wrap pseudo-radio__note">' + barsHtml[0] + '</span>' +
                            '<span class="bar__wrap pseudo-radio__note">' + barsHtml[1] + '</span>' +
                        '</div>'
                    );

                    raf(function(){
                        var $bars = $('.js-bar__inner');

                        // Animate bars to correct position
                        for (var i = 0; i < $bars.length; i++) {
                            $bars[i].style.transform = 'translateX(' + percentages[i] + ')';
                        }
                    });

                }
                else {
                //there will be up to 60 seconds latency before first results are published
                    bonzo($('.form-body')[0]).replaceWith(
                        '<div class="pseudo-radio__header q1">Thank you for voting, come back soon to see the results</div>'
                    );
                }
            }
        });
    }

    function submitPoll(id, answer) {
        savePollSubmissionInLocalStorage(id, answer);
        var postData = {'answers': {'question': id, 'answer': answer}};
        reqwest({
            url: interactiveApi + '/quiz/?key=poll'
            , contentType: 'application/json'
            , method: 'post'
            , data: JSON.stringify(postData)
            , crossOrigin: true
            , success: function () {
                renderResultsFromPollJson(id, answer);
            }
            // eslint-disable-next-line
            , error: console.error
        });

    }

    renderPoll(id);
}());
