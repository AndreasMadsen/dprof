/* eslint-disable */ // const and let, etc. can't be used here.
(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', main);

  function main() {
    var id = window.location.hash.slice(1);
    var error = new ErrorHandler(document.querySelector('#viewer .error'));

    // https://developer.github.com/v3/gists/#get-a-single-gist
    xhr('https://api.github.com/gists/' + id, function (err, responseText) {
        if (err) return error.set(err);

        var response = JSON.parse(responseText);
        if (response.message) {
          return error.set(new Error(response.message));
        }

        var files = response.files;
        if (!files.hasOwnProperty('dprof.json.gz.base64')) {
          return error.set(new Error('could not find a dprof dump'));
        }

        var rawurl = files['dprof.json.gz.base64'].raw_url;
        xhr(rawurl, function (err, dump) {
          if (err) return error.set(err);

          window.sessionStorage.setItem('dprof-format', 'gzip-json');
          window.sessionStorage.setItem('dprof-data', dump);
          window.location = '../visualizer/';
        });
    });
  }

  function xhr(url, callback) {
    var xhr = new window.XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onload = function () {
      callback(null, xhr.response);
    };
    xhr.onerror = function (err) {
      callback(err);
    };
    xhr.send(null);
  }

  function ErrorHandler(element) {
    this.element = element;
  }

  ErrorHandler.prototype.set = function (err) {
    this.element.innerHTML = err.message;
    console.error(err);
  };
})();
