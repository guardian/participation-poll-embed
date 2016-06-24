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

    var answersObj = {};
    var metaObj = {};


    iframeMessenger.enableAutoResize();


    function compressString(string) {
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
        catch (e) {
            return false;
        }
    }

    function getIdFromQueryString() {
        var parsedQueryString = queryString.parse(location.search);
        return parsedQueryString.id != undefined ? parsedQueryString.id : 'test';
    }

    function getPreviousPollSubmission() {
        function getPollById(data, id) {
            function byId(value) {
                return value.id == id;
            }

            return data.filter(byId)[0];
        }

        if (hasLocalStorage() && localStorage.getItem(localStorageKey) != null) {
            var polls = JSON.parse(localStorage.getItem(localStorageKey));
            return getPollById(polls, id);
        } else {
            return null;
        }
    }

    function savePollSubmissionInLocalStorage(id, answer) {
        if (hasLocalStorage()) {
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
                    var options = resp.sheets[id][0];

                    for (var key in options) {
                        if (options.hasOwnProperty(key)) {
                            if (/^a\d+/.test(key)) {
                                var compressed = (compressString(options[key]));
                                answersObj[compressed] = options[key];
                            } else if (key == 'title') {
                                metaObj['title'] = options[key];
                            } else if (key == 'isClosed') {
                                metaObj['isClosed'] = options[key].toLowerCase();
                            }
                        }
                    }

                    bonzo($('.title')[0]).html(metaObj['title']);
                    bonzo($('#form')).removeClass('form-is-hidden');
                    var previousSubmission = getPreviousPollSubmission();
                    if (previousSubmission || metaObj['isClosed'] == 'true') {
                        renderResultsFromPollJson(previousSubmission.id, previousSubmission.answer);
                    } else {
                        renderPollForm(id);
                    }
                } else {
                    // eslint-disable-next-line
                    console && console.warn('No poll found with ID: ' + id);
                }
            }, function (err, msg) {
                // eslint-disable-next-line
                console && console.warn('Something went wrong : ' + msg);
            });
    }

    function renderPollForm() {
        var pollOptionHtml = '';

        for (var key in answersObj) {
            if (answersObj.hasOwnProperty(key)) {
                pollOptionHtml += '<label class="label" for="' + key + '"> <input type="radio" class="pseudo-radio-input" name="option" id="' + key + '" value="' + key + '" data-link-name="poll-id : ' + id + ' : poll-option : ' + key + '" required="required"> <div class="pseudo-radio"> <div class="q1"></div>' + answersObj[key] + '</div> </label>';
            }
        }

        bonzo($('.form-field')[0]).html(pollOptionHtml);
    }

    bean.on($('#form')[0], 'submit', function (event) {
        var submission = formSerialize($('#form')[0], {hash: true});
        var answer = submission.option;
        event.preventDefault();
        if (answer) {
            submitPoll(id, answer);
        } else {
            // eslint-disable-next-line
            console && console.warn('no answer submitted');
        }
    });

    function renderResultsFromPollJson(id, answer) {
        reqwest({
            url: interactiveHost + '/participation/poll-results.json'
            , method: 'get'
            , type: 'json'
            , success: function (resp) {
                if (resp[id] != null) {
                    var resultsForId = resp[id];
                    var total = 0;


                    for (var result in resultsForId) {
                        if (resultsForId.hasOwnProperty(result)) {
                            total += resultsForId[result];
                        }
                    }

                    bonzo($('.total')).html(total + ' votes in total');

                    var userAnswer = answersObj[answer];
                    var barHtml = '<span class="bar__outer"><span class="bar__inner js-bar__inner"></span></span>';

                    var barsHtml = '';
                    var percentages = [];
                    for (var key in answersObj) {
                        if (answersObj.hasOwnProperty(key)) {
                            var count = resultsForId[key];
                            if (count) {
                                var percentage = Math.round(count / total * 100);
                                percentages.push(percentage);
                            } else {
                                //if there are no results then default to 0
                                percentages.push(0);
                                percentage = 0;
                            }
                            barsHtml += '<span class="bar__wrap pseudo-radio__note"><span class="bar__label">' + answersObj[key] + '</span>' + barHtml + '<span class="bar__label--percentage">' + percentage + '%</span></span>';
                        }
                    }

                    bonzo($('.form-body')[0]).replaceWith(
                        '<div class="bar">' +
                        '<h3 class="pseudo-radio__header ">You voted for "' + userAnswer + '"</h3>' +
                        barsHtml +
                        '</div>'
                    );
                    raf(function () {
                        var $bars = $('.js-bar__inner');
                        // Animate bars to correct position
                        for (var i = 0; i < $bars.length; i++) {
                            $bars[i].style.transform = 'translateX(' + percentages[i] + '%)';
                        }
                    });

                } else {
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
                postMessageToParent();
            }
            // eslint-disable-next-line
            , error: console.error
        });
    }

    function postMessageToParent() {
        var messageObj = {
                type: 'pollPost'
            };

        window.parent.postMessage(JSON.stringify(messageObj), '*');
    }

    renderPoll(id);
}());
