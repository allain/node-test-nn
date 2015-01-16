var express = require('express');
var router = express.Router();

var brain = require('brain');
var _ = require('lodash');
var csv = require('csv-stream');

router.get('/', function(req, res) {
  res.render('train');
});

router.post('/', function(req, res) {
  var fstream;
  req.pipe(req.busboy);
  req.busboy.on('file', function (fieldname, file, filename) {
    console.log("Uploading: " + filename); 

    parseCSVFile(file, function(err, batch) {
      var net = new brain.NeuralNetwork();

      net.train(batch.trainingData);

      var predictions = batch.predictionRows.map(function(metrics) {
        var output = net.run(metrics);
        return { 
          input: metrics,
          output: [output]
        };
      });

      res.render('predictions', {
        columns: batch.columns,
        training: batch.trainingData,
        predictions: predictions
      });
    });
  });
});

function parseCSVFile(file, cb) {
  var rows = [];
  
  var options = {
    escapeChar : '"', // default is an empty string
    enclosedChar : '"' // default is an empty string
  };
    
  var csvStream = csv.createStream(options);
  file.pipe(csvStream);

  var columns = [];
  csvStream.on('data', function (row) {
    columns = Object.keys(row);

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

    cb(null, {
      columns: columns,
      trainingData: trainingData,
      predictionRows: predictionRows
    });
  });
}

module.exports = router;
