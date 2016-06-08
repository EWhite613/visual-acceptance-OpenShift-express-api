var express = require('express');

var app = express();
var bodyParser = require('body-parser');
var fs = require('fs')
var request = require('sync-request')
var clientId = 'e39f00905b80937'

var port = process.env.OPENSHIFT_NODEJS_PORT ||
    process.env.OPENSHIFT_INTERNAL_PORT || 8080

var ipaddress = process.env.OPENSHIFT_NODEJS_IP ||
    process.env.OPENSHIFT_INTERNAL_IP


if (typeof ipaddress === "undefined") {
    //  Log errors on OpenShift but continue w/ 127.0.0.1 - this
    //  allows us to run/test the app locally.
    console.warn('No OPENSHIFT_*_IP var, using 127.0.0.1')

    ipaddress = "127.0.0.1"
}

// httpRequest header
var imgurApiOptions = {
    'headers': {
        'Content-Type': 'application/json',
        'Authorization': 'Client-ID ' + clientId
    }
}

app.use(function(req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
    res.header('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS')
    next()
})

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({
    limit: '50mb',
    extended: true,
    parameterLimit: 50000
}))
app.use(bodyParser.json({
    limit: '50mb'
}))

function uploadToImgur(image) {
    // console.log(req.body.image)
    var response = request('POST', 'https://api.imgur.com/3/image?type=base64&image=' + encodeURIComponent(image.replace('data:image\/\w+;base64,', '')), imgurApiOptions)
    return JSON.parse(response.getBody())
}

function commentOnPR(req, res) {
    var repoSlug = req.body.repoSlug
    var prNumber = req.body.prNumber
    var image = req.body.report
    var imgurResponse = uploadToImgur(image)
    var githubApiOptions = {
        'headers': {
            'user-agent': 'visual-acceptance',
            'Authorization': 'token ' + process.env.ghToken
        },
        'json': {
            'body': '![PR ember-cli-visual-acceptance Report](' + imgurResponse.data.link + ')'
        }
    }
    var url = 'https://api.github.com/repos/' + repoSlug + '/issues/' + prNumber + '/comments'

    var response = request('POST', url, githubApiOptions)
    res.send(JSON.parse(response.getBody()))
}

app.post('/comment', function(req, res) {
    commentOnPR(req, res)
})

app.listen(port, ipaddress, function() {
    console.log('%s: Node server started on %s:%d ...',
        Date(Date.now()), ipaddress, port)
});