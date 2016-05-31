var reqwest = require('reqwest');
var $ = require('qwery');
var bonzo = require('bonzo');
var bean = require('bean');
var queryString = require('query-string');
var formSerialize = require('form-serialize')

var interactiveApi = 'https://interactive.guardianapis.com';
var interactiveHost = 'https://interactive.guim.co.uk';
var idFromQueryString = getIdFromQueryString()

var option1;
var option2;
var title;

function compressJson(json){
    var raw = (JSON.stringify(json));
    return JSON.parse(raw.replace(/\s+/g, "").toLowerCase());
}

function getIdFromQueryString(){
    var parsedQueryString = queryString.parse(location.search);
    return parsedQueryString.id != undefined ? parsedQueryString.id : "test"
}



function getPreviousPollSubmission() {
    var id = idFromQueryString
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
        var polls = JSON.parse(localStorage.getItem('pollsSubmitted'))
        polls.push({id: id, answer: answer})
        localStorage.setItem('pollsSubmitted', JSON.stringify(polls))
    }
}

function renderPoll() {
    reqwest({
        url: interactiveHost + '/docsdata-test/10RGbEQiyWIw_6EvtdVwoK3HQr2W0ipeIlfq1Jb6Dw-g.json'
        , type: 'json'
    })
        .then(function (resp) {
            var compressed = compressJson(resp)
            if (resp.sheets[idFromQueryString] != undefined) {
                option1 = [resp.sheets[idFromQueryString][0].a1, compressed.sheets[idFromQueryString][0].a1]
                option2 = [resp.sheets[idFromQueryString][0].a2, compressed.sheets[idFromQueryString][0].a2]
                title = resp.sheets[idFromQueryString][0].title
                bonzo($('.title')[0]).html(title)
                var previousSubmission = getPreviousPollSubmission()
                if (previousSubmission) {
                    renderResultsFromPollJson(previousSubmission.id, previousSubmission.answer)
                }
                else
                {
                    renderPollForm(idFromQueryString)
                }
            }
            else {
                    bonzo($('.form-body')[0]).replaceWith(
                    '<div class="pseudo-radio__header q1">No poll found with ID: '+idFromQueryString+'</div>'
                    )
               }
        });
}


function renderPollForm() {

    var id = idFromQueryString
                bonzo($('.q1')[0]).html(option1[0])
                bonzo($('.q2')[0]).html(option2[0])
                bonzo($('#q1-input')).attr("value", option1[1])
                bonzo($('#q2-input')).attr("value", option2[1])
            }

            bean.on($('.submit')[0], 'click',  function(event)
            {
                var submission = formSerialize($('#form')[0],{ hash: true })
                var answer = submission.option
                event.preventDefault();
                submitPoll(idFromQueryString, answer)
            });


function renderResultsFromPollJson(id, answer) {
    reqwest({
        url: interactiveHost + '/participation/poll-results.json'
        ,method: 'get'
        ,type: 'json'
        ,success: function (resp) {
            if(resp[id] != null) {
                var a1Count = resp[id][option1[1]] ? resp[id][option1[1]] : 0
                var a2Count = resp[id][option2[1]] ? resp[id][option2[1]] : 0
                var total = a1Count + a2Count
                var a1Percentage = Math.round(a1Count / total * 100)
                var a2Percentage = Math.round(a2Count / total * 100)
                var userAnswer = option1.indexOf(answer) != -1 ? option1[0] : option2[0]

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
    savePollSubmissionInLocalStorage(id, answer)
    var postData = {"answers": {"question": id, "answer": answer}}
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

renderPoll(idFromQueryString)








