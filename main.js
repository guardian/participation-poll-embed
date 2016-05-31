(function () {
    'use strict';
    var reqwest = require('reqwest');
    var $ = require('qwery');
    var bonzo = require('bonzo');
    var bean = require('bean');
    var queryString = require('query-string');
    var formSerialize = require('form-serialize');
    var iframeMessenger = require('iframe-messenger');

    var interactiveApi = 'https://interactive.guardianapis.com';
    var interactiveHost = 'https://interactive.guim.co.uk';
    var id = getIdFromQueryString();

    var option1;
    var option2;
    var title;

    iframeMessenger.enableAutoResize();

    function compressString(string){
        return string.replace(/[\s+|\W]/g, "").toLowerCase();
    }

    function getIdFromQueryString(){
        var parsedQueryString = queryString.parse(location.search);
        return parsedQueryString.id != undefined ? parsedQueryString.id : "test"
    }

    function getPreviousPollSubmission() {
        function getPollById(data, id){
            function byId(value) {
                return value.id == id;
            }
            return data.filter(byId)[0]
        }

        if (localStorage.getItem("pollsSubmitted") != null) {
            var polls = JSON.parse(localStorage.getItem("pollsSubmitted"));
            return getPollById(polls, id)
        }
        else {
            return null
        }
    }

    function savePollSubmissionInLocalStorage(id, answer){

        if(!localStorage.getItem('pollsSubmitted')) {
            localStorage.setItem('pollsSubmitted', JSON.stringify([{id: id, answer: answer}]))
        } else {
            var polls = JSON.parse(localStorage.getItem('pollsSubmitted'));
            polls.push({id: id, answer: answer});
            localStorage.setItem('pollsSubmitted', JSON.stringify(polls))
        }
    }

    function renderPoll() {
        reqwest({
            url: interactiveHost + '/docsdata-test/10RGbEQiyWIw_6EvtdVwoK3HQr2W0ipeIlfq1Jb6Dw-g.json'
            , type: 'json'
        })
            .then(function (resp) {
                console.log("IN HERE")
                    var option1FromJson = resp.sheets[id][0].a1;
                    console.log(option1FromJson)
                    var option2FromJson = resp.sheets[id][0].a2;
                if (resp.sheets && resp.sheets[id]) {
                    option1 = [option1FromJson, compressString(resp.sheets[id][0].a1)];
                    option2 = [option2FromJson, compressString(resp.sheets[id][0].a2)];
                    title = resp.sheets[id][0].title;
                    bonzo($('.title')[0]).html(title);
                    bonzo($('#form')).removeClass('form-is-hidden');
                    var previousSubmission = getPreviousPollSubmission();
                    if (previousSubmission) {
                        renderResultsFromPollJson(previousSubmission.id, previousSubmission.answer)
                    }
                    else
                    {
                        renderPollForm(id)
                    }
                }
                else {
                   console && console.warn('No poll found with ID: '+id);
                }
            },  function (err, msg) {
                console && console.warn('Something went wrong : ' + msg)
            });
    }

    function renderPollForm() {

        bonzo($('.q1')[0]).html(option1[0]);
        bonzo($('.q2')[0]).html(option2[0]);
        bonzo($('#q1-input')).attr("value", option1[1]);
        bonzo($('#q2-input')).attr("value", option2[1]);
    }

    bean.on($('.submit')[0], 'click',  function(event)
    {
        var submission = formSerialize($('#form')[0],{ hash: true });
        var answer = submission.option;
        event.preventDefault();
        submitPoll(id, answer)
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
                    var a1Percentage = Math.round(a1Count / total * 100);
                    var a2Percentage = Math.round(a2Count / total * 100);
                    var userAnswer = option1.indexOf(answer) != -1 ? option1[0] : option2[0];

                    bonzo($('.form-body')[0]).replaceWith(
                        '<div class="pseudo-radio__header q1">You voted for '+ userAnswer + '<br />'
                        +    option1[0] + ' ' + a1Percentage + '%<br />' +
                        '' + option2[0] + ' ' + a2Percentage + '%</div>'
                    )
                }
                else
                //there will be up to 60 seconds latency before first results are published
                {
                    bonzo($('.form-body')[0]).replaceWith(
                        '<div class="pseudo-radio__header q1">Thank you for voting, come back soon to see the results</div>'
                    )
                }
                bonzo($('.submit')[0]).remove()
            }
        });
    }

    function submitPoll(id, answer) {
        savePollSubmissionInLocalStorage(id, answer);
        var postData = {"answers": {"question": id, "answer": answer}};
        reqwest({
            url: interactiveApi + '/quiz/?key=poll'
            , contentType: 'application/json'
            , method: 'post'
            , data: JSON.stringify(postData)
            , crossOrigin: true
            , success: function (resp) {
                renderResultsFromPollJson(id, answer)
            }
            , error: function (error) {
                console.log(error)
            }
        })

    }

    renderPoll(id)
}());
