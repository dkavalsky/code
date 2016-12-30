var express       = require('express');
var bodyParser    = require('body-parser');
var request       = require('request');
var dotenv        = require('dotenv');
var SpotifyWebApi = require('spotify-web-api-node');

dotenv.load();

var spotifyApi = new SpotifyWebApi({
  clientId     : "c9a79be7057d4d4b9179084b5fcc1dd6",
  clientSecret : "0369c30e319242058f75ce9707e47074",
  redirectUri  : "https://www.ioninteractive.com"
});

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

app.get('/', function(req, res) {
  if (spotifyApi.getAccessToken()) {
    return res.send('You are logged in.');
  }
  return res.send('<a href="/authorize">Authorise</a>');
});

app.get('/authorize', function(req, res) {
  var scopes = ['playlist-modify-public', 'playlist-modify-private'];
  var state  = new Date().getTime();
  var authorizeURL = spotifyApi.createAuthorizeURL(scopes, state);
  res.redirect(authorizeURL);
});

app.get('/callback', function(req, res) {
  spotifyApi.authorizationCodeGrant(req.query.code)
    .then(function(data) {
      spotifyApi.setAccessToken(data.body['access_token']);
      spotifyApi.setRefreshToken(data.body['refresh_token']);
      return res.redirect('/');
    }, function(err) {
      return res.send(err);
    });
});

app.use('/store', function(req, res, next) {
  if (req.body.token !== "SHXFzFefl0MoquNpWA9l4Ktn") {
    return res.status(500).send('Cross site request forgerizzle!');
  }
  next();
});

app.post('/store', function(req, res) {
  spotifyApi.refreshAccessToken()
    .then(function(data) {
      spotifyApi.setAccessToken(data.body['access_token']);
      if (data.body['refresh_token']) { 
        spotifyApi.setRefreshToken(data.body['refresh_token']);
      }
      if(req.body.text.indexOf(' - ') === -1) {
        var query = 'track:' + req.body.text;
      } else { 
        var pieces = req.body.text.split(' - ');
        var query = 'artist:' + pieces[0].trim() + ' track:' + pieces[1].trim();
      }
      spotifyApi.searchTracks(query)
        .then(function(data) {
          var results = data.body.tracks.items;
          if (results.length === 0) {
            return res.send('Could not find that track.');
          }
          var track = results[0];
          spotifyApi.addTracksToPlaylist("dsky0921", "0nlbyGne4EJig2j6FdtTGx", ['spotify:track:' + track.id])
            .then(function(data) {
              return res.send('Track added: *' + track.name + '* by *' + track.artists[0].name + '*');
            }, function(err) {
              return res.send(err.message);
            });
        }, function(err) {
          return res.send(err.message);
        });
    }, function(err) {
      return res.send('Could not refresh access token. You probably need to re-authorise yourself from your app\'s homepage.');
    });
});

app.set('port', (process.env.PORT || 5000));
app.listen(app.get('port'));
