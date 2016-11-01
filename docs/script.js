/* eslint-disable */ // const and let, etc. can't be used here.
(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', main);

  function main () {
    var nav = new Menu(document.querySelector('#navigration'));
    var pages = new Content(
      document.querySelectorAll('section'),
      function (section) { return section.getAttribute('id'); }
    );
    var drop = new FileDrop(document.querySelector('#drop-zone'), 'file-hover');
    var error = new ErrorHandler(document.querySelector('#drop-zone .error'));

    nav.onclick = function (li) {
      nav.highlight(li);
      pages.show(li.dataset.show);
    };

    drop.onfile = function (err, type, file) {
      if (err) return error.set(err);

      // convert type to encoding
      const encoding = ({
        'json': 'text',
        'gzip-json': 'base64'
      })[type];

      filecontent(file, encoding, function (err, content) {
        if (err) return error.set(err);

        window.sessionStorage.setItem('dprof-format', type);
        window.sessionStorage.setItem('dprof-data', content);
        window.location = 'visualizer/';
      });
    };

    window.viewExample = function () {
      xhr('example/dprof.json', function (err, response) {
        if (err) throw err;

        window.sessionStorage.setItem('dprof-format', 'json');
        window.sessionStorage.setItem('dprof-data', response);
        window.location = 'visualizer/';
      });
    };
  }

  function ErrorHandler(element) {
    this.element = element;
  }

  ErrorHandler.prototype.set = function (err) {
    this.element.innerHTML = err.message;
    console.error(err);
  };

  function filecontent(file, encoding, callback) {
    var reader = new FileReader();
    reader.onload = function () {

      if (encoding === 'base64') {
        callback(null, reader.result.slice(reader.result.indexOf(',') + 1));
      } else if (encoding === 'text') {
        callback(null, reader.result);
      }
    };
    reader.onerror = function () {
      callback(reader.error);
    };

    if (encoding === 'base64') {
      reader.readAsDataURL(file);
    } else if (encoding === 'text') {
      reader.readAsText(file);
    } else {
      throw new Error('invalid encoding ' + encoding);
    }
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

  function FileDrop(node, hoverclass) {
    var self = this;
    this.node = node;

    this.node.ondragover = function (event) {
      self.node.classList.add(hoverclass);
      event.stopPropagation();
      event.preventDefault();
    };
    this.node.ondragend = function (event) {
      self.node.classList.remove(hoverclass);
      event.stopPropagation();
      event.preventDefault();
    };
    this.node.ondrop = function (event) {
      self.node.classList.remove(hoverclass);
      event.preventDefault();

      self._onfiles(null, event.dataTransfer.files);
    }
  }

  FileDrop.prototype._onfiles = function (err, files) {
    if (err) return this.onfile(err);

    for (var i = 0; i < files.length; i++) {
      if (files[i].name.slice(-5) === '.json' &&
          files[i].type === 'application/json') {
        this.onfile(null, 'json', files[i]);
        return;
      }

      if (files[i].name.slice(-8) === '.json.gz' &&
          files[i].type === 'application/x-gzip') {
        this.onfile(null, 'gzip-json', files[i]);
        return;
      }
    }

    this.onfile(new Error('file must be .json or .json.gz'));
  };

  function Content (pages, identifyer) {
    var self = this;
    this.pages = {};
    this.selected = null;
    Array.from(pages).forEach(function (page) {
      self.pages[identifyer(page)] = page;
      if (!page.hasAttribute('hidden')) {
        self.selected = page;
      }
    });
  }
  Content.prototype.show = function (id) {
    this.selected.setAttribute('hidden', '');
    this.pages[id].removeAttribute('hidden');
    this.selected = this.pages[id];
  };

  function Menu (node) {
    var self = this;
    this.element = node;
    this.selected = null;

    Array.from(node.getElementsByTagName('li')).forEach(function (li) {
      if (li.classList.contains('selected')) {
        self.selected = li;
      }

      li.addEventListener('click', function (e) {
        if (self.onclick) self.onclick(li, e);
      }, false);
    });
  }

  Menu.prototype.highlight = function (select) {
    // swtich selected class
    this.selected.classList.remove('selected');
    select.classList.add('selected');

    // update state
    this.selected = select;
  };
})();
