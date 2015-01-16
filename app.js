var express = require('express');
var path = require('path');
var csv = require('csv-stream');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var busboy = require('connect-busboy');
var bodyParser = require('body-parser');
var brain = require('brain');
var _ = require('lodash');

var routes = require('./routes/index');
var users = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(busboy());
app.use(cookieParser());
app.use(require('less-middleware')(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', users);

app.post('/train', function(req, res) {
  var fstream;
  req.pipe(req.busboy);
  req.busboy.on('file', function (fieldname, file, filename) {
    console.log("Uploading: " + filename); 

    var options = {
      escapeChar : '"', // default is an empty string
      enclosedChar : '"' // default is an empty string
    }
    
    var rows = [];
    var csvStream = csv.createStream(options);
    file.pipe(csvStream);
    csvStream.on('data', function (row) {
      rows.push(_.values(row).filter(function(x) { return x !== '';} ).map(function(x) { return parseFloat(x, 10); }));
    });

    csvStream.on('end', function() {
      var maxLength = _.max(_.map(rows, function(row) { return row.length; }));
      var trainingRows = _.filter(rows, function(row) { return row.length === maxLength; });
      var predictionRows = _.filter(rows, function(row) { return row.length < maxLength; });
      var trainingData = trainingRows.map(function(tr) {
        var expected = tr.pop();
        return {input: tr, output: [expected]};
      });

      var net = new brain.NeuralNetwork();

      net.train(trainingData);
      var predictions = predictionRows.map(function(metrics) {
        metrics.push(net.run(metrics));
        return metrics;
      });
      res.json({
        training: trainingData,
        predictions: predictions
      });
    });
  });
});

app.get('/train', function(req, res) {
  res.render('train');
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;
