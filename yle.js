#!/usr/bin/env node

var request = require('request');
var FeedParser = require('feedparser');
var ImageToAscii = require('image-to-ascii');
var moment = require('moment');
var ylesections = require('./ylesections.json');

var asciiNews = function(options,asciiNewsDone) {

  var outputElements = {
    headerImage: null,
    list: null
  };

  var getNewsList = function(rsspath,callback) {

    var newsfeedParser = new FeedParser();
    var list = [];
    
    request
      .get(rsspath)
      .on('error', function (err) {
        callback(err);
      })
      .pipe(newsfeedParser);

    newsfeedParser
      .on('error',function (err) {
        callback(err);
      })
      .on('readable', function() {
        list.push(this.read());
      })
      .on('end', function() {
        callback(null,list);
      });

  };

  var getAsciiImage = function(imagepath,callback) {

    var options = {
      path: imagepath,
      pixels: '.:■ ',
      size: {
        height: '50%'
      }
    };

    ImageToAscii(options, function(err, imagestring) {
      if(err) callback(err);
      callback(null,imagestring); 
    });

  };

  var finalizeOutput = function() {
    if(outputElements.headerImage && outputElements.list) {

      var parsedList = outputElements.list.map(function(item,index){
        var time = moment(item.pubDate).fromNow();
        return ' ' + time + '\t' + item.title+'\n';
      });

      if(process.argv[2] === 'paauutiset' || process.argv[2] === 'luetuimmat') {
        parsedList = parsedList.join('');
      }
      else {
        parsedList = parsedList.reverse().join('');
      }

      var headerText = '\t\t' + outputElements.list[0].meta['rss:title']['#'] + '\n' + '\n';

      var asciiOutput = outputElements.headerImage + headerText + parsedList;
      asciiNewsDone(asciiOutput);
    }
  };

  getNewsList(options.rsspath, function(err,list) {
    if(err) throw err;
    outputElements.list = list;
    finalizeOutput();
  });

  getAsciiImage(options.imagepath, function(err,imagestring){
    if(err) throw err;
    outputElements.headerImage = imagestring;
    finalizeOutput();
  });

};

var selectedSection = process.argv[2] && ylesections.indexOf(process.argv[2]) !== -1 ? process.argv[2] : 'uutiset';

var rsspath = 'http://yle.fi/uutiset/rss/uutiset.rss?osasto='+selectedSection;

if(selectedSection === 'paauutiset' || selectedSection === 'uutiset' || selectedSection === 'luetuimmat') {
  rsspath = 'http://yle.fi/uutiset/rss/'+selectedSection+'.rss';
}

var options = {
  rsspath: rsspath,
  imagepath: __dirname+'/yle.png'
};

asciiNews(options, function (asciiOutput) {
  if(ylesections.indexOf(process.argv[2]) === -1 && typeof process.argv[2] !== 'undefined') {
    console.log('');
    console.log('Osastoa ' + '\"' + process.argv[2] + '\"' + ' ei ole. Valittavissa olevat osastot:');
    console.log(ylesections.join(', '));
  }
  console.log(asciiOutput);
});
