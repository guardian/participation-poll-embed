var redis = require('redis');
var AWS = require('aws-sdk');
var _ = require('lodash');

var client = redis.createClient();
var s3 = new AWS.S3();

var key = process.argv[2];
client.lrange(key, 0, -1, (err, items) => {
    //console.log(items);
var raw = (JSON.stringify(items));
items = JSON.parse(raw.replace(/\s+/g, '').toLowerCase());
var counts = _(items)
    .map(item => JSON.parse(item))
    .groupBy("question")
    .mapValues(function(item, itemId) {
        return _.countBy(item, 'answer')
    })
    .value();
console.log(JSON.stringify(counts));

s3.putObject({
    'Bucket': 'gdn-cdn',
    'Key': 'participation/poll-results.json',
    'CacheControl': 'max-age=30',
    'ContentType': 'application/json',
    'ACL': 'public-read',
    'Body': JSON.stringify(counts)
}, function (err, data) {
    console.log(new Date(), err, data);
    process.exit();
});
});