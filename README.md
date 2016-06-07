# Poll embed

Prototype lightweight polls embed

## To run locally

`npm install`

`npm install -g watchify`

`watchify main.js -o bundle.js`

`python -m SimpleHTTPServer`

## To deploy

`./deploy.sh`

## To embed in article

Add poll URL in Composer e.g. https://interactive.guim.co.uk/participation/poll/embed/?id=test where `test` is the name of the sheet tab for the poll you want to embed

## Archiecture

Polls are populated in [gudocs](https://github.com/guardian/gudocs)

Poll submissions are persisted and aggregated by [interactive-question-server](https://github.com/guardian/interactive-question-server)