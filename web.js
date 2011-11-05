var everyauth = require('everyauth');
var express  = require('express');

var FacebookClient = require('facebook-client').FacebookClient;
var facebook = new FacebookClient();

var conf = require('./conf');

everyauth.facebook
    .appId(conf.FACEBOOK_APP_ID)
    .appSecret(conf.FACEBOOK_SECRET)
    .entryPath('/')
    .redirectPath('/home')
    .findOrCreateUser(function() {
        return {};
    });

var app = express.createServer(
    express.logger(),
    express.static(__dirname + '/public'),
    express.cookieParser(),
    express.session({ secret: conf.session_secret }),
    // insert a middleware to set the facebook redirect hostname to
    // http/https dynamicaly
    function(req, res, next) {
        var method = req.headers['x-forwarded-proto'] || 'http';
        everyauth.facebook.myHostname(method + '://' + req.headers.host);
        next();
    },
    everyauth.middleware(),
    require('facebook').Facebook()
);

app.configure(function() {
    app.set('view engine', 'jade');
});

app.listen(conf.port, function() {
    console.log('Listening on port ' + conf.port);
});

// middleware for requiring auth and automatically redirecting
function login_required(req, res, next) {
    if (req.session.auth) {
        return next();
    }
    res.redirect('/');
}

app.get('/home', login_required, function(req, res) {
    // detect the http method uses so we can replicate it on redirects
    var method = req.headers['x-forwarded-proto'] || 'http';

    // if we have facebook auth credentials
    if (req.session.auth) {
        // initialize facebook-client with the access token to gain access
        // to helper methods for the REST api
        var token = req.session.auth.facebook.accessToken;
        facebook.getSessionByAccessToken(token)(function(session) {
            res.render('home', {
                token:    token,
                app:      app,
                user:     req.session.auth.facebook.user,
                home:     method + '://' + req.headers.host + '/',
                redirect: method + '://' + req.headers.host + req.url,
            });
        });
    }
});
