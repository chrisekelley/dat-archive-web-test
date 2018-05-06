(function (f) {
  if (typeof exports === "object" && typeof module !== "undefined") {
    module.exports = f()
  } else if (typeof define === "function" && define.amd) {
    define([], f)
  } else {
    var g;
    if (typeof window !== "undefined") {
      g = window
    } else if (typeof global !== "undefined") {
      g = global
    } else if (typeof self !== "undefined") {
      g = self
    } else {
      g = this
    }
    g.DemoServer = f()
  }
})(function () {
  var define, module, exports;
  return (function () {
    function r(e, n, t) {
      function o(i, f) {
        if (!n[i]) {
          if (!e[i]) {
            var c = "function" == typeof require && require;
            if (!f && c) return c(i, !0);
            if (u) return u(i, !0);
            var a = new Error("Cannot find module '" + i + "'");
            throw a.code = "MODULE_NOT_FOUND", a
          }
          var p = n[i] = {exports: {}};
          e[i][0].call(p.exports, function (r) {
            var n = e[i][1][r];
            return o(n || r)
          }, p, p.exports, r, e, n, t)
        }
        return n[i].exports
      }

      for (var u = "function" == typeof require && require, i = 0; i < t.length; i++) o(t[i]);
      return o
    }

    return r
  })()({
    1: [function (require, module, exports) {
      const RPC = require('../../rpc')
      const idb = require('random-access-idb')

      const DEFAULT_SELECT_MESSAGE = 'Select an archive'

      const frame = document.getElementById('client-frame')
      const form = document.getElementById('selection-form')
      const selectionItems = document.getElementById('selection-items')

      const selectQueue = []
      let currentSelection = null

      const storage = idb('dat://storage')

      const server = new RPC.Server(window, frame.contentWindow, {
        storage,
        addArchive,
        selectArchive
      })

      form.addEventListener('submit', handleSelected)

      window.gatewayServer = server
      window.gatewayStorage = storage

      function addArchive(key, secretKey, options, callback) {
        const archiveList = getArchives()
        archiveList.push({
          key,
          secretKey,
          details: options
        })
        setArchives(archiveList)
      }

      function selectArchive(options, callback) {
        selectQueue.push({
          options: options,
          callback: callback
        })

        showNext()
      }

      function showSelection(selectionItem) {
        currentSelection = selectionItem
        const archiveList = getArchives()
        const renderedItems = archiveList.map((archive) => {
          return `
    <label class="select-item">
      <input type="checkbox" value="${archive.key}">
      ${archive.details.title || archive.key}
    </label>
`
        })
        const toRender = `
    <div class="select-message">
      ${selectionItem.options.title || DEFAULT_SELECT_MESSAGE}
    </div>
    ${renderedItems.join('\n')}
`

        selectionItems.innerHTML = toRender
        form.classList.remove('hidden')
      }

      function showNext() {
        if (!currentSelection) {
          showSelection(selectQueue.shift())
        }
      }

      function hideForm() {
        form.classList.add('hidden')
      }

      function handleSelected(e) {
        e.preventDefault()

        if (currentSelection) {
          const input = form.querySelector('input:checked')
          const url = `dat://${input.value}`
          currentSelection.callback(false, url)
          currentSelection = null
        }

        if (selectQueue.length === 0) {
          hideForm()
        } else {
          showNext()
        }
      }

      function setArchives(newList) {
        window.localStorage.archives = JSON.stringify(newList)
      }

      function getArchives() {
        return JSON.parse(window.localStorage.archives || '[]')
      }

    }, {"../../rpc": 38, "random-access-idb": 23}],
    2: [function (require, module, exports) {
      (function (Buffer, process) {
        var EventEmitter = require('events').EventEmitter
        var inherits = require('inherits')

        var noop = function () {
        }

        module.exports = Abstract
        inherits(Abstract, EventEmitter)

        function Abstract(opts) {
          if (!(this instanceof Abstract)) return new Abstract(opts)
          EventEmitter.call(this)

          this.opened = false
          this._opening = null
          this._closing = null

          if (opts) {
            if (opts.read) this._read = opts.read
            if (opts.write) this._write = opts.write
            if (opts.open) this._open = opts.open
            if (opts.close) this._close = opts.close
            if (opts.end) this._end = opts.end
            if (opts.unlink) this._unlink = opts.unlink
          }
        }

        Abstract.prototype.open = function (callback) {
          if (!callback) callback = noop
          if (this.opened) return process.nextTick(callback)

          var self = this

          if (this._opening) {
            this._opening.push(callback)
          } else {
            this._opening = [callback]
            this._open(opened)
          }

          function opened(err) {
            if (!err) self.opened = true
            var cbs = self._opening
            self._opening = null
            self.emit('open')
            for (var i = 0; i < cbs.length; i++) cbs[i](err)
          }
        }

        Abstract.prototype._open = function (callback) {
          process.nextTick(callback)
        }

        Abstract.prototype.write = function (offset, buffer, callback) {
          if (!callback) callback = noop

          if (typeof offset !== 'number') throw new Error('Scalar offset')
          if (!Buffer.isBuffer(buffer)) throw new Error('Buffer')

          if (!this.opened) return openAndWrite(this, offset, buffer, callback)
          this._write(offset, buffer, callback)
        }

        Abstract.prototype._write = function (offset, buffer, callback) {
          process.nextTick(function () {
            callback(new Error('Write not implemented'))
          })
        }

        Abstract.prototype.read = function (offset, length, callback) {
          if (typeof offset !== 'number') throw new Error('Scalar offset')
          if (typeof length !== 'number') throw new Error('Scalar length')
          if (typeof callback !== 'function') throw new Error('Callback')

          if (!this.opened) return openAndRead(this, offset, length, callback)
          this._read(offset, length, callback)
        }

        Abstract.prototype._read = function (offset, length, callback) {
          process.nextTick(function () {
            callback(new Error('Read not implemented'))
          })
        }

        Abstract.prototype.close = function (callback) {
          if (!callback) callback = noop

          var self = this

          if (!this.opened) this.open(next)
          else next()

          function next(err) {
            if (err) return callback(err)

            if (self._closing) {
              self._closing.push(callback)
            } else {
              self._closing = [callback]
              self._close(closed)
            }
          }

          function closed(err) {
            if (!err) self.opened = false
            var cbs = self._closing
            self._closing = null
            self.emit('close')
            for (var i = 0; i < cbs.length; i++) cbs[i](err)
          }
        }

        Abstract.prototype._close = function (callback) {
          process.nextTick(callback)
        }

        Abstract.prototype.end = function (options, callback) {
          if (typeof options === 'function') return this.end(null, options)
          if (!callback) callback = noop

          var self = this

          if (!this.opened) this.open(next)
          else next()

          function next(err) {
            if (err) return callback(err)
            self._end(options, callback)
          }
        }

        Abstract.prototype._end = function (options, callback) {
          process.nextTick(callback)
        }

        Abstract.prototype.unlink = function (callback) {
          if (!callback) callback = noop

          var self = this

          if (!this.opened) this.open(next)
          else next()

          function next(err) {
            if (err) return callback(err)
            self._unlink(callback)
          }
        }

        Abstract.prototype._unlink = function (callback) {
          process.nextTick(callback)
        }

        function openAndWrite(self, offset, buffer, callback) {
          self.open(function (err) {
            if (err) return callback(err)
            self.write(offset, buffer, callback)
          })
        }

        function openAndRead(self, offset, length, callback) {
          self.open(function (err) {
            if (err) return callback(err)
            self.read(offset, length, callback)
          })
        }

      }).call(this, {"isBuffer": require("../is-buffer/index.js")}, require('_process'))
    }, {"../is-buffer/index.js": 14, "_process": 4, "events": 9, "inherits": 13}],
    3: [function (require, module, exports) {
      'use strict'

      exports.byteLength = byteLength
      exports.toByteArray = toByteArray
      exports.fromByteArray = fromByteArray

      var lookup = []
      var revLookup = []
      var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

      var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
      for (var i = 0, len = code.length; i < len; ++i) {
        lookup[i] = code[i]
        revLookup[code.charCodeAt(i)] = i
      }

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
      revLookup['-'.charCodeAt(0)] = 62
      revLookup['_'.charCodeAt(0)] = 63

      function getLens(b64) {
        var len = b64.length

        if (len % 4 > 0) {
          throw new Error('Invalid string. Length must be a multiple of 4')
        }

        // Trim off extra bytes after placeholder bytes are found
        // See: https://github.com/beatgammit/base64-js/issues/42
        var validLen = b64.indexOf('=')
        if (validLen === -1) validLen = len

        var placeHoldersLen = validLen === len
          ? 0
          : 4 - (validLen % 4)

        return [validLen, placeHoldersLen]
      }

// base64 is 4/3 + up to two characters of the original data
      function byteLength(b64) {
        var lens = getLens(b64)
        var validLen = lens[0]
        var placeHoldersLen = lens[1]
        return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
      }

      function _byteLength(b64, validLen, placeHoldersLen) {
        return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
      }

      function toByteArray(b64) {
        var tmp
        var lens = getLens(b64)
        var validLen = lens[0]
        var placeHoldersLen = lens[1]

        var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

        var curByte = 0

        // if there are placeholders, only get up to the last complete 4 chars
        var len = placeHoldersLen > 0
          ? validLen - 4
          : validLen

        for (var i = 0; i < len; i += 4) {
          tmp =
            (revLookup[b64.charCodeAt(i)] << 18) |
            (revLookup[b64.charCodeAt(i + 1)] << 12) |
            (revLookup[b64.charCodeAt(i + 2)] << 6) |
            revLookup[b64.charCodeAt(i + 3)]
          arr[curByte++] = (tmp >> 16) & 0xFF
          arr[curByte++] = (tmp >> 8) & 0xFF
          arr[curByte++] = tmp & 0xFF
        }

        if (placeHoldersLen === 2) {
          tmp =
            (revLookup[b64.charCodeAt(i)] << 2) |
            (revLookup[b64.charCodeAt(i + 1)] >> 4)
          arr[curByte++] = tmp & 0xFF
        }

        if (placeHoldersLen === 1) {
          tmp =
            (revLookup[b64.charCodeAt(i)] << 10) |
            (revLookup[b64.charCodeAt(i + 1)] << 4) |
            (revLookup[b64.charCodeAt(i + 2)] >> 2)
          arr[curByte++] = (tmp >> 8) & 0xFF
          arr[curByte++] = tmp & 0xFF
        }

        return arr
      }

      function tripletToBase64(num) {
        return lookup[num >> 18 & 0x3F] +
          lookup[num >> 12 & 0x3F] +
          lookup[num >> 6 & 0x3F] +
          lookup[num & 0x3F]
      }

      function encodeChunk(uint8, start, end) {
        var tmp
        var output = []
        for (var i = start; i < end; i += 3) {
          tmp =
            ((uint8[i] << 16) & 0xFF0000) +
            ((uint8[i + 1] << 8) & 0xFF00) +
            (uint8[i + 2] & 0xFF)
          output.push(tripletToBase64(tmp))
        }
        return output.join('')
      }

      function fromByteArray(uint8) {
        var tmp
        var len = uint8.length
        var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
        var parts = []
        var maxChunkLength = 16383 // must be multiple of 3

        // go through the array every three bytes, we'll deal with trailing stuff later
        for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
          parts.push(encodeChunk(
            uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)
          ))
        }

        // pad the end with zeros, but make sure to not forget the extra bytes
        if (extraBytes === 1) {
          tmp = uint8[len - 1]
          parts.push(
            lookup[tmp >> 2] +
            lookup[(tmp << 4) & 0x3F] +
            '=='
          )
        } else if (extraBytes === 2) {
          tmp = (uint8[len - 2] << 8) + uint8[len - 1]
          parts.push(
            lookup[tmp >> 10] +
            lookup[(tmp >> 4) & 0x3F] +
            lookup[(tmp << 2) & 0x3F] +
            '='
          )
        }

        return parts.join('')
      }

    }, {}],
    4: [function (require, module, exports) {
// shim for using process in browser
      var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

      var cachedSetTimeout;
      var cachedClearTimeout;

      function defaultSetTimout() {
        throw new Error('setTimeout has not been defined');
      }

      function defaultClearTimeout() {
        throw new Error('clearTimeout has not been defined');
      }

      (function () {
        try {
          if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
          } else {
            cachedSetTimeout = defaultSetTimout;
          }
        } catch (e) {
          cachedSetTimeout = defaultSetTimout;
        }
        try {
          if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
          } else {
            cachedClearTimeout = defaultClearTimeout;
          }
        } catch (e) {
          cachedClearTimeout = defaultClearTimeout;
        }
      }())

      function runTimeout(fun) {
        if (cachedSetTimeout === setTimeout) {
          //normal enviroments in sane situations
          return setTimeout(fun, 0);
        }
        // if setTimeout wasn't available but was latter defined
        if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
          cachedSetTimeout = setTimeout;
          return setTimeout(fun, 0);
        }
        try {
          // when when somebody has screwed with setTimeout but no I.E. maddness
          return cachedSetTimeout(fun, 0);
        } catch (e) {
          try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
          } catch (e) {
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
          }
        }


      }

      function runClearTimeout(marker) {
        if (cachedClearTimeout === clearTimeout) {
          //normal enviroments in sane situations
          return clearTimeout(marker);
        }
        // if clearTimeout wasn't available but was latter defined
        if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
          cachedClearTimeout = clearTimeout;
          return clearTimeout(marker);
        }
        try {
          // when when somebody has screwed with setTimeout but no I.E. maddness
          return cachedClearTimeout(marker);
        } catch (e) {
          try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
          } catch (e) {
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
          }
        }


      }

      var queue = [];
      var draining = false;
      var currentQueue;
      var queueIndex = -1;

      function cleanUpNextTick() {
        if (!draining || !currentQueue) {
          return;
        }
        draining = false;
        if (currentQueue.length) {
          queue = currentQueue.concat(queue);
        } else {
          queueIndex = -1;
        }
        if (queue.length) {
          drainQueue();
        }
      }

      function drainQueue() {
        if (draining) {
          return;
        }
        var timeout = runTimeout(cleanUpNextTick);
        draining = true;

        var len = queue.length;
        while (len) {
          currentQueue = queue;
          queue = [];
          while (++queueIndex < len) {
            if (currentQueue) {
              currentQueue[queueIndex].run();
            }
          }
          queueIndex = -1;
          len = queue.length;
        }
        currentQueue = null;
        draining = false;
        runClearTimeout(timeout);
      }

      process.nextTick = function (fun) {
        var args = new Array(arguments.length - 1);
        if (arguments.length > 1) {
          for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
          }
        }
        queue.push(new Item(fun, args));
        if (queue.length === 1 && !draining) {
          runTimeout(drainQueue);
        }
      };

// v8 likes predictible objects
      function Item(fun, array) {
        this.fun = fun;
        this.array = array;
      }

      Item.prototype.run = function () {
        this.fun.apply(null, this.array);
      };
      process.title = 'browser';
      process.browser = true;
      process.env = {};
      process.argv = [];
      process.version = ''; // empty string to avoid regexp issues
      process.versions = {};

      function noop() {
      }

      process.on = noop;
      process.addListener = noop;
      process.once = noop;
      process.off = noop;
      process.removeListener = noop;
      process.removeAllListeners = noop;
      process.emit = noop;
      process.prependListener = noop;
      process.prependOnceListener = noop;

      process.listeners = function (name) {
        return []
      }

      process.binding = function (name) {
        throw new Error('process.binding is not supported');
      };

      process.cwd = function () {
        return '/'
      };
      process.chdir = function (dir) {
        throw new Error('process.chdir is not supported');
      };
      process.umask = function () {
        return 0;
      };

    }, {}],
    5: [function (require, module, exports) {
      (function (Buffer) {
        var bufferFill = require('buffer-fill')
        var allocUnsafe = require('buffer-alloc-unsafe')

        module.exports = function alloc(size, fill, encoding) {
          if (typeof size !== 'number') {
            throw new TypeError('"size" argument must be a number')
          }

          if (size < 0) {
            throw new RangeError('"size" argument must not be negative')
          }

          if (Buffer.alloc) {
            return Buffer.alloc(size, fill, encoding)
          }

          var buffer = allocUnsafe(size)

          if (size === 0) {
            return buffer
          }

          if (fill === undefined) {
            return bufferFill(buffer, 0)
          }

          if (typeof encoding !== 'string') {
            encoding = undefined
          }

          return bufferFill(buffer, fill, encoding)
        }

      }).call(this, require("buffer").Buffer)
    }, {"buffer": 8, "buffer-alloc-unsafe": 6, "buffer-fill": 7}],
    6: [function (require, module, exports) {
      (function (Buffer) {
        function allocUnsafe(size) {
          if (typeof size !== 'number') {
            throw new TypeError('"size" argument must be a number')
          }

          if (size < 0) {
            throw new RangeError('"size" argument must not be negative')
          }

          if (Buffer.allocUnsafe) {
            return Buffer.allocUnsafe(size)
          } else {
            return new Buffer(size)
          }
        }

        module.exports = allocUnsafe

      }).call(this, require("buffer").Buffer)
    }, {"buffer": 8}],
    7: [function (require, module, exports) {
      (function (Buffer) {
        /* Node.js 6.4.0 and up has full support */
        var hasFullSupport = (function () {
          try {
            if (!Buffer.isEncoding('latin1')) {
              return false
            }

            var buf = Buffer.alloc ? Buffer.alloc(4) : new Buffer(4)

            buf.fill('ab', 'ucs2')

            return (buf.toString('hex') === '61006200')
          } catch (_) {
            return false
          }
        }())

        function isSingleByte(val) {
          return (val.length === 1 && val.charCodeAt(0) < 256)
        }

        function fillWithNumber(buffer, val, start, end) {
          if (start < 0 || end > buffer.length) {
            throw new RangeError('Out of range index')
          }

          start = start >>> 0
          end = end === undefined ? buffer.length : end >>> 0

          if (end > start) {
            buffer.fill(val, start, end)
          }

          return buffer
        }

        function fillWithBuffer(buffer, val, start, end) {
          if (start < 0 || end > buffer.length) {
            throw new RangeError('Out of range index')
          }

          if (end <= start) {
            return buffer
          }

          start = start >>> 0
          end = end === undefined ? buffer.length : end >>> 0

          var pos = start
          var len = val.length
          while (pos <= (end - len)) {
            val.copy(buffer, pos)
            pos += len
          }

          if (pos !== end) {
            val.copy(buffer, pos, 0, end - pos)
          }

          return buffer
        }

        function fill(buffer, val, start, end, encoding) {
          if (hasFullSupport) {
            return buffer.fill(val, start, end, encoding)
          }

          if (typeof val === 'number') {
            return fillWithNumber(buffer, val, start, end)
          }

          if (typeof val === 'string') {
            if (typeof start === 'string') {
              encoding = start
              start = 0
              end = buffer.length
            } else if (typeof end === 'string') {
              encoding = end
              end = buffer.length
            }

            if (encoding !== undefined && typeof encoding !== 'string') {
              throw new TypeError('encoding must be a string')
            }

            if (encoding === 'latin1') {
              encoding = 'binary'
            }

            if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
              throw new TypeError('Unknown encoding: ' + encoding)
            }

            if (val === '') {
              return fillWithNumber(buffer, 0, start, end)
            }

            if (isSingleByte(val)) {
              return fillWithNumber(buffer, val.charCodeAt(0), start, end)
            }

            val = new Buffer(val, encoding)
          }

          if (Buffer.isBuffer(val)) {
            return fillWithBuffer(buffer, val, start, end)
          }

          // Other values (e.g. undefined, boolean, object) results in zero-fill
          return fillWithNumber(buffer, 0, start, end)
        }

        module.exports = fill

      }).call(this, require("buffer").Buffer)
    }, {"buffer": 8}],
    8: [function (require, module, exports) {
      /*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
      /* eslint-disable no-proto */

      'use strict'

      var base64 = require('base64-js')
      var ieee754 = require('ieee754')

      exports.Buffer = Buffer
      exports.SlowBuffer = SlowBuffer
      exports.INSPECT_MAX_BYTES = 50

      var K_MAX_LENGTH = 0x7fffffff
      exports.kMaxLength = K_MAX_LENGTH

      /**
       * If `Buffer.TYPED_ARRAY_SUPPORT`:
       *   === true    Use Uint8Array implementation (fastest)
       *   === false   Print warning and recommend using `buffer` v4.x which has an Object
       *               implementation (most compatible, even IE6)
       *
       * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
       * Opera 11.6+, iOS 4.2+.
       *
       * We report that the browser does not support typed arrays if the are not subclassable
       * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
       * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
       * for __proto__ and has a buggy typed array implementation.
       */
      Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

      if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
        typeof console.error === 'function') {
        console.error(
          'This browser lacks typed array (Uint8Array) support which is required by ' +
          '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
        )
      }

      function typedArraySupport() {
        // Can typed array instances can be augmented?
        try {
          var arr = new Uint8Array(1)
          arr.__proto__ = {
            __proto__: Uint8Array.prototype, foo: function () {
              return 42
            }
          }
          return arr.foo() === 42
        } catch (e) {
          return false
        }
      }

      Object.defineProperty(Buffer.prototype, 'parent', {
        get: function () {
          if (!(this instanceof Buffer)) {
            return undefined
          }
          return this.buffer
        }
      })

      Object.defineProperty(Buffer.prototype, 'offset', {
        get: function () {
          if (!(this instanceof Buffer)) {
            return undefined
          }
          return this.byteOffset
        }
      })

      function createBuffer(length) {
        if (length > K_MAX_LENGTH) {
          throw new RangeError('Invalid typed array length')
        }
        // Return an augmented `Uint8Array` instance
        var buf = new Uint8Array(length)
        buf.__proto__ = Buffer.prototype
        return buf
      }

      /**
       * The Buffer constructor returns instances of `Uint8Array` that have their
       * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
       * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
       * and the `Uint8Array` methods. Square bracket notation works as expected -- it
       * returns a single octet.
       *
       * The `Uint8Array` prototype remains unmodified.
       */

      function Buffer(arg, encodingOrOffset, length) {
        // Common case.
        if (typeof arg === 'number') {
          if (typeof encodingOrOffset === 'string') {
            throw new Error(
              'If encoding is specified then the first argument must be a string'
            )
          }
          return allocUnsafe(arg)
        }
        return from(arg, encodingOrOffset, length)
      }

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
      if (typeof Symbol !== 'undefined' && Symbol.species &&
        Buffer[Symbol.species] === Buffer) {
        Object.defineProperty(Buffer, Symbol.species, {
          value: null,
          configurable: true,
          enumerable: false,
          writable: false
        })
      }

      Buffer.poolSize = 8192 // not used by this implementation

      function from(value, encodingOrOffset, length) {
        if (typeof value === 'number') {
          throw new TypeError('"value" argument must not be a number')
        }

        if (isArrayBuffer(value) || (value && isArrayBuffer(value.buffer))) {
          return fromArrayBuffer(value, encodingOrOffset, length)
        }

        if (typeof value === 'string') {
          return fromString(value, encodingOrOffset)
        }

        return fromObject(value)
      }

      /**
       * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
       * if value is a number.
       * Buffer.from(str[, encoding])
       * Buffer.from(array)
       * Buffer.from(buffer)
       * Buffer.from(arrayBuffer[, byteOffset[, length]])
       **/
      Buffer.from = function (value, encodingOrOffset, length) {
        return from(value, encodingOrOffset, length)
      }

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
      Buffer.prototype.__proto__ = Uint8Array.prototype
      Buffer.__proto__ = Uint8Array

      function assertSize(size) {
        if (typeof size !== 'number') {
          throw new TypeError('"size" argument must be of type number')
        } else if (size < 0) {
          throw new RangeError('"size" argument must not be negative')
        }
      }

      function alloc(size, fill, encoding) {
        assertSize(size)
        if (size <= 0) {
          return createBuffer(size)
        }
        if (fill !== undefined) {
          // Only pay attention to encoding if it's a string. This
          // prevents accidentally sending in a number that would
          // be interpretted as a start offset.
          return typeof encoding === 'string'
            ? createBuffer(size).fill(fill, encoding)
            : createBuffer(size).fill(fill)
        }
        return createBuffer(size)
      }

      /**
       * Creates a new filled Buffer instance.
       * alloc(size[, fill[, encoding]])
       **/
      Buffer.alloc = function (size, fill, encoding) {
        return alloc(size, fill, encoding)
      }

      function allocUnsafe(size) {
        assertSize(size)
        return createBuffer(size < 0 ? 0 : checked(size) | 0)
      }

      /**
       * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
       * */
      Buffer.allocUnsafe = function (size) {
        return allocUnsafe(size)
      }
      /**
       * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
       */
      Buffer.allocUnsafeSlow = function (size) {
        return allocUnsafe(size)
      }

      function fromString(string, encoding) {
        if (typeof encoding !== 'string' || encoding === '') {
          encoding = 'utf8'
        }

        if (!Buffer.isEncoding(encoding)) {
          throw new TypeError('Unknown encoding: ' + encoding)
        }

        var length = byteLength(string, encoding) | 0
        var buf = createBuffer(length)

        var actual = buf.write(string, encoding)

        if (actual !== length) {
          // Writing a hex string, for example, that contains invalid characters will
          // cause everything after the first invalid character to be ignored. (e.g.
          // 'abxxcd' will be treated as 'ab')
          buf = buf.slice(0, actual)
        }

        return buf
      }

      function fromArrayLike(array) {
        var length = array.length < 0 ? 0 : checked(array.length) | 0
        var buf = createBuffer(length)
        for (var i = 0; i < length; i += 1) {
          buf[i] = array[i] & 255
        }
        return buf
      }

      function fromArrayBuffer(array, byteOffset, length) {
        if (byteOffset < 0 || array.byteLength < byteOffset) {
          throw new RangeError('"offset" is outside of buffer bounds')
        }

        if (array.byteLength < byteOffset + (length || 0)) {
          throw new RangeError('"length" is outside of buffer bounds')
        }

        var buf
        if (byteOffset === undefined && length === undefined) {
          buf = new Uint8Array(array)
        } else if (length === undefined) {
          buf = new Uint8Array(array, byteOffset)
        } else {
          buf = new Uint8Array(array, byteOffset, length)
        }

        // Return an augmented `Uint8Array` instance
        buf.__proto__ = Buffer.prototype
        return buf
      }

      function fromObject(obj) {
        if (Buffer.isBuffer(obj)) {
          var len = checked(obj.length) | 0
          var buf = createBuffer(len)

          if (buf.length === 0) {
            return buf
          }

          obj.copy(buf, 0, 0, len)
          return buf
        }

        if (obj) {
          if (ArrayBuffer.isView(obj) || 'length' in obj) {
            if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
              return createBuffer(0)
            }
            return fromArrayLike(obj)
          }

          if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
            return fromArrayLike(obj.data)
          }
        }

        throw new TypeError('The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object.')
      }

      function checked(length) {
        // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
        // length is NaN (which is otherwise coerced to zero.)
        if (length >= K_MAX_LENGTH) {
          throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
            'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
        }
        return length | 0
      }

      function SlowBuffer(length) {
        if (+length != length) { // eslint-disable-line eqeqeq
          length = 0
        }
        return Buffer.alloc(+length)
      }

      Buffer.isBuffer = function isBuffer(b) {
        return b != null && b._isBuffer === true
      }

      Buffer.compare = function compare(a, b) {
        if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
          throw new TypeError('Arguments must be Buffers')
        }

        if (a === b) return 0

        var x = a.length
        var y = b.length

        for (var i = 0, len = Math.min(x, y); i < len; ++i) {
          if (a[i] !== b[i]) {
            x = a[i]
            y = b[i]
            break
          }
        }

        if (x < y) return -1
        if (y < x) return 1
        return 0
      }

      Buffer.isEncoding = function isEncoding(encoding) {
        switch (String(encoding).toLowerCase()) {
          case 'hex':
          case 'utf8':
          case 'utf-8':
          case 'ascii':
          case 'latin1':
          case 'binary':
          case 'base64':
          case 'ucs2':
          case 'ucs-2':
          case 'utf16le':
          case 'utf-16le':
            return true
          default:
            return false
        }
      }

      Buffer.concat = function concat(list, length) {
        if (!Array.isArray(list)) {
          throw new TypeError('"list" argument must be an Array of Buffers')
        }

        if (list.length === 0) {
          return Buffer.alloc(0)
        }

        var i
        if (length === undefined) {
          length = 0
          for (i = 0; i < list.length; ++i) {
            length += list[i].length
          }
        }

        var buffer = Buffer.allocUnsafe(length)
        var pos = 0
        for (i = 0; i < list.length; ++i) {
          var buf = list[i]
          if (ArrayBuffer.isView(buf)) {
            buf = Buffer.from(buf)
          }
          if (!Buffer.isBuffer(buf)) {
            throw new TypeError('"list" argument must be an Array of Buffers')
          }
          buf.copy(buffer, pos)
          pos += buf.length
        }
        return buffer
      }

      function byteLength(string, encoding) {
        if (Buffer.isBuffer(string)) {
          return string.length
        }
        if (ArrayBuffer.isView(string) || isArrayBuffer(string)) {
          return string.byteLength
        }
        if (typeof string !== 'string') {
          string = '' + string
        }

        var len = string.length
        if (len === 0) return 0

        // Use a for loop to avoid recursion
        var loweredCase = false
        for (; ;) {
          switch (encoding) {
            case 'ascii':
            case 'latin1':
            case 'binary':
              return len
            case 'utf8':
            case 'utf-8':
            case undefined:
              return utf8ToBytes(string).length
            case 'ucs2':
            case 'ucs-2':
            case 'utf16le':
            case 'utf-16le':
              return len * 2
            case 'hex':
              return len >>> 1
            case 'base64':
              return base64ToBytes(string).length
            default:
              if (loweredCase) return utf8ToBytes(string).length // assume utf8
              encoding = ('' + encoding).toLowerCase()
              loweredCase = true
          }
        }
      }

      Buffer.byteLength = byteLength

      function slowToString(encoding, start, end) {
        var loweredCase = false

        // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
        // property of a typed array.

        // This behaves neither like String nor Uint8Array in that we set start/end
        // to their upper/lower bounds if the value passed is out of range.
        // undefined is handled specially as per ECMA-262 6th Edition,
        // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
        if (start === undefined || start < 0) {
          start = 0
        }
        // Return early if start > this.length. Done here to prevent potential uint32
        // coercion fail below.
        if (start > this.length) {
          return ''
        }

        if (end === undefined || end > this.length) {
          end = this.length
        }

        if (end <= 0) {
          return ''
        }

        // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
        end >>>= 0
        start >>>= 0

        if (end <= start) {
          return ''
        }

        if (!encoding) encoding = 'utf8'

        while (true) {
          switch (encoding) {
            case 'hex':
              return hexSlice(this, start, end)

            case 'utf8':
            case 'utf-8':
              return utf8Slice(this, start, end)

            case 'ascii':
              return asciiSlice(this, start, end)

            case 'latin1':
            case 'binary':
              return latin1Slice(this, start, end)

            case 'base64':
              return base64Slice(this, start, end)

            case 'ucs2':
            case 'ucs-2':
            case 'utf16le':
            case 'utf-16le':
              return utf16leSlice(this, start, end)

            default:
              if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
              encoding = (encoding + '').toLowerCase()
              loweredCase = true
          }
        }
      }

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
      Buffer.prototype._isBuffer = true

      function swap(b, n, m) {
        var i = b[n]
        b[n] = b[m]
        b[m] = i
      }

      Buffer.prototype.swap16 = function swap16() {
        var len = this.length
        if (len % 2 !== 0) {
          throw new RangeError('Buffer size must be a multiple of 16-bits')
        }
        for (var i = 0; i < len; i += 2) {
          swap(this, i, i + 1)
        }
        return this
      }

      Buffer.prototype.swap32 = function swap32() {
        var len = this.length
        if (len % 4 !== 0) {
          throw new RangeError('Buffer size must be a multiple of 32-bits')
        }
        for (var i = 0; i < len; i += 4) {
          swap(this, i, i + 3)
          swap(this, i + 1, i + 2)
        }
        return this
      }

      Buffer.prototype.swap64 = function swap64() {
        var len = this.length
        if (len % 8 !== 0) {
          throw new RangeError('Buffer size must be a multiple of 64-bits')
        }
        for (var i = 0; i < len; i += 8) {
          swap(this, i, i + 7)
          swap(this, i + 1, i + 6)
          swap(this, i + 2, i + 5)
          swap(this, i + 3, i + 4)
        }
        return this
      }

      Buffer.prototype.toString = function toString() {
        var length = this.length
        if (length === 0) return ''
        if (arguments.length === 0) return utf8Slice(this, 0, length)
        return slowToString.apply(this, arguments)
      }

      Buffer.prototype.toLocaleString = Buffer.prototype.toString

      Buffer.prototype.equals = function equals(b) {
        if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
        if (this === b) return true
        return Buffer.compare(this, b) === 0
      }

      Buffer.prototype.inspect = function inspect() {
        var str = ''
        var max = exports.INSPECT_MAX_BYTES
        if (this.length > 0) {
          str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
          if (this.length > max) str += ' ... '
        }
        return '<Buffer ' + str + '>'
      }

      Buffer.prototype.compare = function compare(target, start, end, thisStart, thisEnd) {
        if (!Buffer.isBuffer(target)) {
          throw new TypeError('Argument must be a Buffer')
        }

        if (start === undefined) {
          start = 0
        }
        if (end === undefined) {
          end = target ? target.length : 0
        }
        if (thisStart === undefined) {
          thisStart = 0
        }
        if (thisEnd === undefined) {
          thisEnd = this.length
        }

        if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
          throw new RangeError('out of range index')
        }

        if (thisStart >= thisEnd && start >= end) {
          return 0
        }
        if (thisStart >= thisEnd) {
          return -1
        }
        if (start >= end) {
          return 1
        }

        start >>>= 0
        end >>>= 0
        thisStart >>>= 0
        thisEnd >>>= 0

        if (this === target) return 0

        var x = thisEnd - thisStart
        var y = end - start
        var len = Math.min(x, y)

        var thisCopy = this.slice(thisStart, thisEnd)
        var targetCopy = target.slice(start, end)

        for (var i = 0; i < len; ++i) {
          if (thisCopy[i] !== targetCopy[i]) {
            x = thisCopy[i]
            y = targetCopy[i]
            break
          }
        }

        if (x < y) return -1
        if (y < x) return 1
        return 0
      }

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
      function bidirectionalIndexOf(buffer, val, byteOffset, encoding, dir) {
        // Empty buffer means no match
        if (buffer.length === 0) return -1

        // Normalize byteOffset
        if (typeof byteOffset === 'string') {
          encoding = byteOffset
          byteOffset = 0
        } else if (byteOffset > 0x7fffffff) {
          byteOffset = 0x7fffffff
        } else if (byteOffset < -0x80000000) {
          byteOffset = -0x80000000
        }
        byteOffset = +byteOffset  // Coerce to Number.
        if (numberIsNaN(byteOffset)) {
          // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
          byteOffset = dir ? 0 : (buffer.length - 1)
        }

        // Normalize byteOffset: negative offsets start from the end of the buffer
        if (byteOffset < 0) byteOffset = buffer.length + byteOffset
        if (byteOffset >= buffer.length) {
          if (dir) return -1
          else byteOffset = buffer.length - 1
        } else if (byteOffset < 0) {
          if (dir) byteOffset = 0
          else return -1
        }

        // Normalize val
        if (typeof val === 'string') {
          val = Buffer.from(val, encoding)
        }

        // Finally, search either indexOf (if dir is true) or lastIndexOf
        if (Buffer.isBuffer(val)) {
          // Special case: looking for empty string/buffer always fails
          if (val.length === 0) {
            return -1
          }
          return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
        } else if (typeof val === 'number') {
          val = val & 0xFF // Search for a byte value [0-255]
          if (typeof Uint8Array.prototype.indexOf === 'function') {
            if (dir) {
              return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
            } else {
              return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
            }
          }
          return arrayIndexOf(buffer, [val], byteOffset, encoding, dir)
        }

        throw new TypeError('val must be string, number or Buffer')
      }

      function arrayIndexOf(arr, val, byteOffset, encoding, dir) {
        var indexSize = 1
        var arrLength = arr.length
        var valLength = val.length

        if (encoding !== undefined) {
          encoding = String(encoding).toLowerCase()
          if (encoding === 'ucs2' || encoding === 'ucs-2' ||
            encoding === 'utf16le' || encoding === 'utf-16le') {
            if (arr.length < 2 || val.length < 2) {
              return -1
            }
            indexSize = 2
            arrLength /= 2
            valLength /= 2
            byteOffset /= 2
          }
        }

        function read(buf, i) {
          if (indexSize === 1) {
            return buf[i]
          } else {
            return buf.readUInt16BE(i * indexSize)
          }
        }

        var i
        if (dir) {
          var foundIndex = -1
          for (i = byteOffset; i < arrLength; i++) {
            if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
              if (foundIndex === -1) foundIndex = i
              if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
            } else {
              if (foundIndex !== -1) i -= i - foundIndex
              foundIndex = -1
            }
          }
        } else {
          if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
          for (i = byteOffset; i >= 0; i--) {
            var found = true
            for (var j = 0; j < valLength; j++) {
              if (read(arr, i + j) !== read(val, j)) {
                found = false
                break
              }
            }
            if (found) return i
          }
        }

        return -1
      }

      Buffer.prototype.includes = function includes(val, byteOffset, encoding) {
        return this.indexOf(val, byteOffset, encoding) !== -1
      }

      Buffer.prototype.indexOf = function indexOf(val, byteOffset, encoding) {
        return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
      }

      Buffer.prototype.lastIndexOf = function lastIndexOf(val, byteOffset, encoding) {
        return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
      }

      function hexWrite(buf, string, offset, length) {
        offset = Number(offset) || 0
        var remaining = buf.length - offset
        if (!length) {
          length = remaining
        } else {
          length = Number(length)
          if (length > remaining) {
            length = remaining
          }
        }

        var strLen = string.length

        if (length > strLen / 2) {
          length = strLen / 2
        }
        for (var i = 0; i < length; ++i) {
          var parsed = parseInt(string.substr(i * 2, 2), 16)
          if (numberIsNaN(parsed)) return i
          buf[offset + i] = parsed
        }
        return i
      }

      function utf8Write(buf, string, offset, length) {
        return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
      }

      function asciiWrite(buf, string, offset, length) {
        return blitBuffer(asciiToBytes(string), buf, offset, length)
      }

      function latin1Write(buf, string, offset, length) {
        return asciiWrite(buf, string, offset, length)
      }

      function base64Write(buf, string, offset, length) {
        return blitBuffer(base64ToBytes(string), buf, offset, length)
      }

      function ucs2Write(buf, string, offset, length) {
        return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
      }

      Buffer.prototype.write = function write(string, offset, length, encoding) {
        // Buffer#write(string)
        if (offset === undefined) {
          encoding = 'utf8'
          length = this.length
          offset = 0
          // Buffer#write(string, encoding)
        } else if (length === undefined && typeof offset === 'string') {
          encoding = offset
          length = this.length
          offset = 0
          // Buffer#write(string, offset[, length][, encoding])
        } else if (isFinite(offset)) {
          offset = offset >>> 0
          if (isFinite(length)) {
            length = length >>> 0
            if (encoding === undefined) encoding = 'utf8'
          } else {
            encoding = length
            length = undefined
          }
        } else {
          throw new Error(
            'Buffer.write(string, encoding, offset[, length]) is no longer supported'
          )
        }

        var remaining = this.length - offset
        if (length === undefined || length > remaining) length = remaining

        if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
          throw new RangeError('Attempt to write outside buffer bounds')
        }

        if (!encoding) encoding = 'utf8'

        var loweredCase = false
        for (; ;) {
          switch (encoding) {
            case 'hex':
              return hexWrite(this, string, offset, length)

            case 'utf8':
            case 'utf-8':
              return utf8Write(this, string, offset, length)

            case 'ascii':
              return asciiWrite(this, string, offset, length)

            case 'latin1':
            case 'binary':
              return latin1Write(this, string, offset, length)

            case 'base64':
              // Warning: maxLength not taken into account in base64Write
              return base64Write(this, string, offset, length)

            case 'ucs2':
            case 'ucs-2':
            case 'utf16le':
            case 'utf-16le':
              return ucs2Write(this, string, offset, length)

            default:
              if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
              encoding = ('' + encoding).toLowerCase()
              loweredCase = true
          }
        }
      }

      Buffer.prototype.toJSON = function toJSON() {
        return {
          type: 'Buffer',
          data: Array.prototype.slice.call(this._arr || this, 0)
        }
      }

      function base64Slice(buf, start, end) {
        if (start === 0 && end === buf.length) {
          return base64.fromByteArray(buf)
        } else {
          return base64.fromByteArray(buf.slice(start, end))
        }
      }

      function utf8Slice(buf, start, end) {
        end = Math.min(buf.length, end)
        var res = []

        var i = start
        while (i < end) {
          var firstByte = buf[i]
          var codePoint = null
          var bytesPerSequence = (firstByte > 0xEF) ? 4
            : (firstByte > 0xDF) ? 3
              : (firstByte > 0xBF) ? 2
                : 1

          if (i + bytesPerSequence <= end) {
            var secondByte, thirdByte, fourthByte, tempCodePoint

            switch (bytesPerSequence) {
              case 1:
                if (firstByte < 0x80) {
                  codePoint = firstByte
                }
                break
              case 2:
                secondByte = buf[i + 1]
                if ((secondByte & 0xC0) === 0x80) {
                  tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
                  if (tempCodePoint > 0x7F) {
                    codePoint = tempCodePoint
                  }
                }
                break
              case 3:
                secondByte = buf[i + 1]
                thirdByte = buf[i + 2]
                if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
                  tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
                  if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
                    codePoint = tempCodePoint
                  }
                }
                break
              case 4:
                secondByte = buf[i + 1]
                thirdByte = buf[i + 2]
                fourthByte = buf[i + 3]
                if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
                  tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
                  if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
                    codePoint = tempCodePoint
                  }
                }
            }
          }

          if (codePoint === null) {
            // we did not generate a valid codePoint so insert a
            // replacement char (U+FFFD) and advance only 1 byte
            codePoint = 0xFFFD
            bytesPerSequence = 1
          } else if (codePoint > 0xFFFF) {
            // encode to utf16 (surrogate pair dance)
            codePoint -= 0x10000
            res.push(codePoint >>> 10 & 0x3FF | 0xD800)
            codePoint = 0xDC00 | codePoint & 0x3FF
          }

          res.push(codePoint)
          i += bytesPerSequence
        }

        return decodeCodePointsArray(res)
      }

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
      var MAX_ARGUMENTS_LENGTH = 0x1000

      function decodeCodePointsArray(codePoints) {
        var len = codePoints.length
        if (len <= MAX_ARGUMENTS_LENGTH) {
          return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
        }

        // Decode in chunks to avoid "call stack size exceeded".
        var res = ''
        var i = 0
        while (i < len) {
          res += String.fromCharCode.apply(
            String,
            codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
          )
        }
        return res
      }

      function asciiSlice(buf, start, end) {
        var ret = ''
        end = Math.min(buf.length, end)

        for (var i = start; i < end; ++i) {
          ret += String.fromCharCode(buf[i] & 0x7F)
        }
        return ret
      }

      function latin1Slice(buf, start, end) {
        var ret = ''
        end = Math.min(buf.length, end)

        for (var i = start; i < end; ++i) {
          ret += String.fromCharCode(buf[i])
        }
        return ret
      }

      function hexSlice(buf, start, end) {
        var len = buf.length

        if (!start || start < 0) start = 0
        if (!end || end < 0 || end > len) end = len

        var out = ''
        for (var i = start; i < end; ++i) {
          out += toHex(buf[i])
        }
        return out
      }

      function utf16leSlice(buf, start, end) {
        var bytes = buf.slice(start, end)
        var res = ''
        for (var i = 0; i < bytes.length; i += 2) {
          res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
        }
        return res
      }

      Buffer.prototype.slice = function slice(start, end) {
        var len = this.length
        start = ~~start
        end = end === undefined ? len : ~~end

        if (start < 0) {
          start += len
          if (start < 0) start = 0
        } else if (start > len) {
          start = len
        }

        if (end < 0) {
          end += len
          if (end < 0) end = 0
        } else if (end > len) {
          end = len
        }

        if (end < start) end = start

        var newBuf = this.subarray(start, end)
        // Return an augmented `Uint8Array` instance
        newBuf.__proto__ = Buffer.prototype
        return newBuf
      }

      /*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
      function checkOffset(offset, ext, length) {
        if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
        if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
      }

      Buffer.prototype.readUIntLE = function readUIntLE(offset, byteLength, noAssert) {
        offset = offset >>> 0
        byteLength = byteLength >>> 0
        if (!noAssert) checkOffset(offset, byteLength, this.length)

        var val = this[offset]
        var mul = 1
        var i = 0
        while (++i < byteLength && (mul *= 0x100)) {
          val += this[offset + i] * mul
        }

        return val
      }

      Buffer.prototype.readUIntBE = function readUIntBE(offset, byteLength, noAssert) {
        offset = offset >>> 0
        byteLength = byteLength >>> 0
        if (!noAssert) {
          checkOffset(offset, byteLength, this.length)
        }

        var val = this[offset + --byteLength]
        var mul = 1
        while (byteLength > 0 && (mul *= 0x100)) {
          val += this[offset + --byteLength] * mul
        }

        return val
      }

      Buffer.prototype.readUInt8 = function readUInt8(offset, noAssert) {
        offset = offset >>> 0
        if (!noAssert) checkOffset(offset, 1, this.length)
        return this[offset]
      }

      Buffer.prototype.readUInt16LE = function readUInt16LE(offset, noAssert) {
        offset = offset >>> 0
        if (!noAssert) checkOffset(offset, 2, this.length)
        return this[offset] | (this[offset + 1] << 8)
      }

      Buffer.prototype.readUInt16BE = function readUInt16BE(offset, noAssert) {
        offset = offset >>> 0
        if (!noAssert) checkOffset(offset, 2, this.length)
        return (this[offset] << 8) | this[offset + 1]
      }

      Buffer.prototype.readUInt32LE = function readUInt32LE(offset, noAssert) {
        offset = offset >>> 0
        if (!noAssert) checkOffset(offset, 4, this.length)

        return ((this[offset]) |
          (this[offset + 1] << 8) |
          (this[offset + 2] << 16)) +
          (this[offset + 3] * 0x1000000)
      }

      Buffer.prototype.readUInt32BE = function readUInt32BE(offset, noAssert) {
        offset = offset >>> 0
        if (!noAssert) checkOffset(offset, 4, this.length)

        return (this[offset] * 0x1000000) +
          ((this[offset + 1] << 16) |
            (this[offset + 2] << 8) |
            this[offset + 3])
      }

      Buffer.prototype.readIntLE = function readIntLE(offset, byteLength, noAssert) {
        offset = offset >>> 0
        byteLength = byteLength >>> 0
        if (!noAssert) checkOffset(offset, byteLength, this.length)

        var val = this[offset]
        var mul = 1
        var i = 0
        while (++i < byteLength && (mul *= 0x100)) {
          val += this[offset + i] * mul
        }
        mul *= 0x80

        if (val >= mul) val -= Math.pow(2, 8 * byteLength)

        return val
      }

      Buffer.prototype.readIntBE = function readIntBE(offset, byteLength, noAssert) {
        offset = offset >>> 0
        byteLength = byteLength >>> 0
        if (!noAssert) checkOffset(offset, byteLength, this.length)

        var i = byteLength
        var mul = 1
        var val = this[offset + --i]
        while (i > 0 && (mul *= 0x100)) {
          val += this[offset + --i] * mul
        }
        mul *= 0x80

        if (val >= mul) val -= Math.pow(2, 8 * byteLength)

        return val
      }

      Buffer.prototype.readInt8 = function readInt8(offset, noAssert) {
        offset = offset >>> 0
        if (!noAssert) checkOffset(offset, 1, this.length)
        if (!(this[offset] & 0x80)) return (this[offset])
        return ((0xff - this[offset] + 1) * -1)
      }

      Buffer.prototype.readInt16LE = function readInt16LE(offset, noAssert) {
        offset = offset >>> 0
        if (!noAssert) checkOffset(offset, 2, this.length)
        var val = this[offset] | (this[offset + 1] << 8)
        return (val & 0x8000) ? val | 0xFFFF0000 : val
      }

      Buffer.prototype.readInt16BE = function readInt16BE(offset, noAssert) {
        offset = offset >>> 0
        if (!noAssert) checkOffset(offset, 2, this.length)
        var val = this[offset + 1] | (this[offset] << 8)
        return (val & 0x8000) ? val | 0xFFFF0000 : val
      }

      Buffer.prototype.readInt32LE = function readInt32LE(offset, noAssert) {
        offset = offset >>> 0
        if (!noAssert) checkOffset(offset, 4, this.length)

        return (this[offset]) |
          (this[offset + 1] << 8) |
          (this[offset + 2] << 16) |
          (this[offset + 3] << 24)
      }

      Buffer.prototype.readInt32BE = function readInt32BE(offset, noAssert) {
        offset = offset >>> 0
        if (!noAssert) checkOffset(offset, 4, this.length)

        return (this[offset] << 24) |
          (this[offset + 1] << 16) |
          (this[offset + 2] << 8) |
          (this[offset + 3])
      }

      Buffer.prototype.readFloatLE = function readFloatLE(offset, noAssert) {
        offset = offset >>> 0
        if (!noAssert) checkOffset(offset, 4, this.length)
        return ieee754.read(this, offset, true, 23, 4)
      }

      Buffer.prototype.readFloatBE = function readFloatBE(offset, noAssert) {
        offset = offset >>> 0
        if (!noAssert) checkOffset(offset, 4, this.length)
        return ieee754.read(this, offset, false, 23, 4)
      }

      Buffer.prototype.readDoubleLE = function readDoubleLE(offset, noAssert) {
        offset = offset >>> 0
        if (!noAssert) checkOffset(offset, 8, this.length)
        return ieee754.read(this, offset, true, 52, 8)
      }

      Buffer.prototype.readDoubleBE = function readDoubleBE(offset, noAssert) {
        offset = offset >>> 0
        if (!noAssert) checkOffset(offset, 8, this.length)
        return ieee754.read(this, offset, false, 52, 8)
      }

      function checkInt(buf, value, offset, ext, max, min) {
        if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
        if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
        if (offset + ext > buf.length) throw new RangeError('Index out of range')
      }

      Buffer.prototype.writeUIntLE = function writeUIntLE(value, offset, byteLength, noAssert) {
        value = +value
        offset = offset >>> 0
        byteLength = byteLength >>> 0
        if (!noAssert) {
          var maxBytes = Math.pow(2, 8 * byteLength) - 1
          checkInt(this, value, offset, byteLength, maxBytes, 0)
        }

        var mul = 1
        var i = 0
        this[offset] = value & 0xFF
        while (++i < byteLength && (mul *= 0x100)) {
          this[offset + i] = (value / mul) & 0xFF
        }

        return offset + byteLength
      }

      Buffer.prototype.writeUIntBE = function writeUIntBE(value, offset, byteLength, noAssert) {
        value = +value
        offset = offset >>> 0
        byteLength = byteLength >>> 0
        if (!noAssert) {
          var maxBytes = Math.pow(2, 8 * byteLength) - 1
          checkInt(this, value, offset, byteLength, maxBytes, 0)
        }

        var i = byteLength - 1
        var mul = 1
        this[offset + i] = value & 0xFF
        while (--i >= 0 && (mul *= 0x100)) {
          this[offset + i] = (value / mul) & 0xFF
        }

        return offset + byteLength
      }

      Buffer.prototype.writeUInt8 = function writeUInt8(value, offset, noAssert) {
        value = +value
        offset = offset >>> 0
        if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
        this[offset] = (value & 0xff)
        return offset + 1
      }

      Buffer.prototype.writeUInt16LE = function writeUInt16LE(value, offset, noAssert) {
        value = +value
        offset = offset >>> 0
        if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
        this[offset] = (value & 0xff)
        this[offset + 1] = (value >>> 8)
        return offset + 2
      }

      Buffer.prototype.writeUInt16BE = function writeUInt16BE(value, offset, noAssert) {
        value = +value
        offset = offset >>> 0
        if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
        this[offset] = (value >>> 8)
        this[offset + 1] = (value & 0xff)
        return offset + 2
      }

      Buffer.prototype.writeUInt32LE = function writeUInt32LE(value, offset, noAssert) {
        value = +value
        offset = offset >>> 0
        if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
        this[offset + 3] = (value >>> 24)
        this[offset + 2] = (value >>> 16)
        this[offset + 1] = (value >>> 8)
        this[offset] = (value & 0xff)
        return offset + 4
      }

      Buffer.prototype.writeUInt32BE = function writeUInt32BE(value, offset, noAssert) {
        value = +value
        offset = offset >>> 0
        if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
        this[offset] = (value >>> 24)
        this[offset + 1] = (value >>> 16)
        this[offset + 2] = (value >>> 8)
        this[offset + 3] = (value & 0xff)
        return offset + 4
      }

      Buffer.prototype.writeIntLE = function writeIntLE(value, offset, byteLength, noAssert) {
        value = +value
        offset = offset >>> 0
        if (!noAssert) {
          var limit = Math.pow(2, (8 * byteLength) - 1)

          checkInt(this, value, offset, byteLength, limit - 1, -limit)
        }

        var i = 0
        var mul = 1
        var sub = 0
        this[offset] = value & 0xFF
        while (++i < byteLength && (mul *= 0x100)) {
          if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
            sub = 1
          }
          this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
        }

        return offset + byteLength
      }

      Buffer.prototype.writeIntBE = function writeIntBE(value, offset, byteLength, noAssert) {
        value = +value
        offset = offset >>> 0
        if (!noAssert) {
          var limit = Math.pow(2, (8 * byteLength) - 1)

          checkInt(this, value, offset, byteLength, limit - 1, -limit)
        }

        var i = byteLength - 1
        var mul = 1
        var sub = 0
        this[offset + i] = value & 0xFF
        while (--i >= 0 && (mul *= 0x100)) {
          if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
            sub = 1
          }
          this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
        }

        return offset + byteLength
      }

      Buffer.prototype.writeInt8 = function writeInt8(value, offset, noAssert) {
        value = +value
        offset = offset >>> 0
        if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
        if (value < 0) value = 0xff + value + 1
        this[offset] = (value & 0xff)
        return offset + 1
      }

      Buffer.prototype.writeInt16LE = function writeInt16LE(value, offset, noAssert) {
        value = +value
        offset = offset >>> 0
        if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
        this[offset] = (value & 0xff)
        this[offset + 1] = (value >>> 8)
        return offset + 2
      }

      Buffer.prototype.writeInt16BE = function writeInt16BE(value, offset, noAssert) {
        value = +value
        offset = offset >>> 0
        if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
        this[offset] = (value >>> 8)
        this[offset + 1] = (value & 0xff)
        return offset + 2
      }

      Buffer.prototype.writeInt32LE = function writeInt32LE(value, offset, noAssert) {
        value = +value
        offset = offset >>> 0
        if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
        this[offset] = (value & 0xff)
        this[offset + 1] = (value >>> 8)
        this[offset + 2] = (value >>> 16)
        this[offset + 3] = (value >>> 24)
        return offset + 4
      }

      Buffer.prototype.writeInt32BE = function writeInt32BE(value, offset, noAssert) {
        value = +value
        offset = offset >>> 0
        if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
        if (value < 0) value = 0xffffffff + value + 1
        this[offset] = (value >>> 24)
        this[offset + 1] = (value >>> 16)
        this[offset + 2] = (value >>> 8)
        this[offset + 3] = (value & 0xff)
        return offset + 4
      }

      function checkIEEE754(buf, value, offset, ext, max, min) {
        if (offset + ext > buf.length) throw new RangeError('Index out of range')
        if (offset < 0) throw new RangeError('Index out of range')
      }

      function writeFloat(buf, value, offset, littleEndian, noAssert) {
        value = +value
        offset = offset >>> 0
        if (!noAssert) {
          checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
        }
        ieee754.write(buf, value, offset, littleEndian, 23, 4)
        return offset + 4
      }

      Buffer.prototype.writeFloatLE = function writeFloatLE(value, offset, noAssert) {
        return writeFloat(this, value, offset, true, noAssert)
      }

      Buffer.prototype.writeFloatBE = function writeFloatBE(value, offset, noAssert) {
        return writeFloat(this, value, offset, false, noAssert)
      }

      function writeDouble(buf, value, offset, littleEndian, noAssert) {
        value = +value
        offset = offset >>> 0
        if (!noAssert) {
          checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
        }
        ieee754.write(buf, value, offset, littleEndian, 52, 8)
        return offset + 8
      }

      Buffer.prototype.writeDoubleLE = function writeDoubleLE(value, offset, noAssert) {
        return writeDouble(this, value, offset, true, noAssert)
      }

      Buffer.prototype.writeDoubleBE = function writeDoubleBE(value, offset, noAssert) {
        return writeDouble(this, value, offset, false, noAssert)
      }

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
      Buffer.prototype.copy = function copy(target, targetStart, start, end) {
        if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
        if (!start) start = 0
        if (!end && end !== 0) end = this.length
        if (targetStart >= target.length) targetStart = target.length
        if (!targetStart) targetStart = 0
        if (end > 0 && end < start) end = start

        // Copy 0 bytes; we're done
        if (end === start) return 0
        if (target.length === 0 || this.length === 0) return 0

        // Fatal error conditions
        if (targetStart < 0) {
          throw new RangeError('targetStart out of bounds')
        }
        if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
        if (end < 0) throw new RangeError('sourceEnd out of bounds')

        // Are we oob?
        if (end > this.length) end = this.length
        if (target.length - targetStart < end - start) {
          end = target.length - targetStart + start
        }

        var len = end - start

        if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
          // Use built-in when available, missing from IE11
          this.copyWithin(targetStart, start, end)
        } else if (this === target && start < targetStart && targetStart < end) {
          // descending copy from end
          for (var i = len - 1; i >= 0; --i) {
            target[i + targetStart] = this[i + start]
          }
        } else {
          Uint8Array.prototype.set.call(
            target,
            this.subarray(start, end),
            targetStart
          )
        }

        return len
      }

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
      Buffer.prototype.fill = function fill(val, start, end, encoding) {
        // Handle string cases:
        if (typeof val === 'string') {
          if (typeof start === 'string') {
            encoding = start
            start = 0
            end = this.length
          } else if (typeof end === 'string') {
            encoding = end
            end = this.length
          }
          if (encoding !== undefined && typeof encoding !== 'string') {
            throw new TypeError('encoding must be a string')
          }
          if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
            throw new TypeError('Unknown encoding: ' + encoding)
          }
          if (val.length === 1) {
            var code = val.charCodeAt(0)
            if ((encoding === 'utf8' && code < 128) ||
              encoding === 'latin1') {
              // Fast path: If `val` fits into a single byte, use that numeric value.
              val = code
            }
          }
        } else if (typeof val === 'number') {
          val = val & 255
        }

        // Invalid ranges are not set to a default, so can range check early.
        if (start < 0 || this.length < start || this.length < end) {
          throw new RangeError('Out of range index')
        }

        if (end <= start) {
          return this
        }

        start = start >>> 0
        end = end === undefined ? this.length : end >>> 0

        if (!val) val = 0

        var i
        if (typeof val === 'number') {
          for (i = start; i < end; ++i) {
            this[i] = val
          }
        } else {
          var bytes = Buffer.isBuffer(val)
            ? val
            : new Buffer(val, encoding)
          var len = bytes.length
          if (len === 0) {
            throw new TypeError('The value "' + val +
              '" is invalid for argument "value"')
          }
          for (i = 0; i < end - start; ++i) {
            this[i + start] = bytes[i % len]
          }
        }

        return this
      }

// HELPER FUNCTIONS
// ================

      var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

      function base64clean(str) {
        // Node takes equal signs as end of the Base64 encoding
        str = str.split('=')[0]
        // Node strips out invalid characters like \n and \t from the string, base64-js does not
        str = str.trim().replace(INVALID_BASE64_RE, '')
        // Node converts strings with length < 2 to ''
        if (str.length < 2) return ''
        // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
        while (str.length % 4 !== 0) {
          str = str + '='
        }
        return str
      }

      function toHex(n) {
        if (n < 16) return '0' + n.toString(16)
        return n.toString(16)
      }

      function utf8ToBytes(string, units) {
        units = units || Infinity
        var codePoint
        var length = string.length
        var leadSurrogate = null
        var bytes = []

        for (var i = 0; i < length; ++i) {
          codePoint = string.charCodeAt(i)

          // is surrogate component
          if (codePoint > 0xD7FF && codePoint < 0xE000) {
            // last char was a lead
            if (!leadSurrogate) {
              // no lead yet
              if (codePoint > 0xDBFF) {
                // unexpected trail
                if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
                continue
              } else if (i + 1 === length) {
                // unpaired lead
                if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
                continue
              }

              // valid lead
              leadSurrogate = codePoint

              continue
            }

            // 2 leads in a row
            if (codePoint < 0xDC00) {
              if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
              leadSurrogate = codePoint
              continue
            }

            // valid surrogate pair
            codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
          } else if (leadSurrogate) {
            // valid bmp char, but last char was a lead
            if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          }

          leadSurrogate = null

          // encode utf8
          if (codePoint < 0x80) {
            if ((units -= 1) < 0) break
            bytes.push(codePoint)
          } else if (codePoint < 0x800) {
            if ((units -= 2) < 0) break
            bytes.push(
              codePoint >> 0x6 | 0xC0,
              codePoint & 0x3F | 0x80
            )
          } else if (codePoint < 0x10000) {
            if ((units -= 3) < 0) break
            bytes.push(
              codePoint >> 0xC | 0xE0,
              codePoint >> 0x6 & 0x3F | 0x80,
              codePoint & 0x3F | 0x80
            )
          } else if (codePoint < 0x110000) {
            if ((units -= 4) < 0) break
            bytes.push(
              codePoint >> 0x12 | 0xF0,
              codePoint >> 0xC & 0x3F | 0x80,
              codePoint >> 0x6 & 0x3F | 0x80,
              codePoint & 0x3F | 0x80
            )
          } else {
            throw new Error('Invalid code point')
          }
        }

        return bytes
      }

      function asciiToBytes(str) {
        var byteArray = []
        for (var i = 0; i < str.length; ++i) {
          // Node's code seems to be doing this and not & 0x7F..
          byteArray.push(str.charCodeAt(i) & 0xFF)
        }
        return byteArray
      }

      function utf16leToBytes(str, units) {
        var c, hi, lo
        var byteArray = []
        for (var i = 0; i < str.length; ++i) {
          if ((units -= 2) < 0) break

          c = str.charCodeAt(i)
          hi = c >> 8
          lo = c % 256
          byteArray.push(lo)
          byteArray.push(hi)
        }

        return byteArray
      }

      function base64ToBytes(str) {
        return base64.toByteArray(base64clean(str))
      }

      function blitBuffer(src, dst, offset, length) {
        for (var i = 0; i < length; ++i) {
          if ((i + offset >= dst.length) || (i >= src.length)) break
          dst[i + offset] = src[i]
        }
        return i
      }

// ArrayBuffers from another context (i.e. an iframe) do not pass the `instanceof` check
// but they should be treated as valid. See: https://github.com/feross/buffer/issues/166
      function isArrayBuffer(obj) {
        return obj instanceof ArrayBuffer ||
          (obj != null && obj.constructor != null && obj.constructor.name === 'ArrayBuffer' &&
            typeof obj.byteLength === 'number')
      }

      function numberIsNaN(obj) {
        return obj !== obj // eslint-disable-line no-self-compare
      }

    }, {"base64-js": 3, "ieee754": 12}],
    9: [function (require, module, exports) {
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

      var objectCreate = Object.create || objectCreatePolyfill
      var objectKeys = Object.keys || objectKeysPolyfill
      var bind = Function.prototype.bind || functionBindPolyfill

      function EventEmitter() {
        if (!this._events || !Object.prototype.hasOwnProperty.call(this, '_events')) {
          this._events = objectCreate(null);
          this._eventsCount = 0;
        }

        this._maxListeners = this._maxListeners || undefined;
      }

      module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
      EventEmitter.EventEmitter = EventEmitter;

      EventEmitter.prototype._events = undefined;
      EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
      var defaultMaxListeners = 10;

      var hasDefineProperty;
      try {
        var o = {};
        if (Object.defineProperty) Object.defineProperty(o, 'x', {value: 0});
        hasDefineProperty = o.x === 0;
      } catch (err) {
        hasDefineProperty = false
      }
      if (hasDefineProperty) {
        Object.defineProperty(EventEmitter, 'defaultMaxListeners', {
          enumerable: true,
          get: function () {
            return defaultMaxListeners;
          },
          set: function (arg) {
            // check whether the input is a positive number (whose value is zero or
            // greater and not a NaN).
            if (typeof arg !== 'number' || arg < 0 || arg !== arg)
              throw new TypeError('"defaultMaxListeners" must be a positive number');
            defaultMaxListeners = arg;
          }
        });
      } else {
        EventEmitter.defaultMaxListeners = defaultMaxListeners;
      }

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
      EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
        if (typeof n !== 'number' || n < 0 || isNaN(n))
          throw new TypeError('"n" argument must be a positive number');
        this._maxListeners = n;
        return this;
      };

      function $getMaxListeners(that) {
        if (that._maxListeners === undefined)
          return EventEmitter.defaultMaxListeners;
        return that._maxListeners;
      }

      EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
        return $getMaxListeners(this);
      };

// These standalone emit* functions are used to optimize calling of event
// handlers for fast cases because emit() itself often has a variable number of
// arguments and can be deoptimized because of that. These functions always have
// the same number of arguments and thus do not get deoptimized, so the code
// inside them can execute faster.
      function emitNone(handler, isFn, self) {
        if (isFn)
          handler.call(self);
        else {
          var len = handler.length;
          var listeners = arrayClone(handler, len);
          for (var i = 0; i < len; ++i)
            listeners[i].call(self);
        }
      }

      function emitOne(handler, isFn, self, arg1) {
        if (isFn)
          handler.call(self, arg1);
        else {
          var len = handler.length;
          var listeners = arrayClone(handler, len);
          for (var i = 0; i < len; ++i)
            listeners[i].call(self, arg1);
        }
      }

      function emitTwo(handler, isFn, self, arg1, arg2) {
        if (isFn)
          handler.call(self, arg1, arg2);
        else {
          var len = handler.length;
          var listeners = arrayClone(handler, len);
          for (var i = 0; i < len; ++i)
            listeners[i].call(self, arg1, arg2);
        }
      }

      function emitThree(handler, isFn, self, arg1, arg2, arg3) {
        if (isFn)
          handler.call(self, arg1, arg2, arg3);
        else {
          var len = handler.length;
          var listeners = arrayClone(handler, len);
          for (var i = 0; i < len; ++i)
            listeners[i].call(self, arg1, arg2, arg3);
        }
      }

      function emitMany(handler, isFn, self, args) {
        if (isFn)
          handler.apply(self, args);
        else {
          var len = handler.length;
          var listeners = arrayClone(handler, len);
          for (var i = 0; i < len; ++i)
            listeners[i].apply(self, args);
        }
      }

      EventEmitter.prototype.emit = function emit(type) {
        var er, handler, len, args, i, events;
        var doError = (type === 'error');

        events = this._events;
        if (events)
          doError = (doError && events.error == null);
        else if (!doError)
          return false;

        // If there is no 'error' event listener then throw.
        if (doError) {
          if (arguments.length > 1)
            er = arguments[1];
          if (er instanceof Error) {
            throw er; // Unhandled 'error' event
          } else {
            // At least give some kind of context to the user
            var err = new Error('Unhandled "error" event. (' + er + ')');
            err.context = er;
            throw err;
          }
          return false;
        }

        handler = events[type];

        if (!handler)
          return false;

        var isFn = typeof handler === 'function';
        len = arguments.length;
        switch (len) {
          // fast cases
          case 1:
            emitNone(handler, isFn, this);
            break;
          case 2:
            emitOne(handler, isFn, this, arguments[1]);
            break;
          case 3:
            emitTwo(handler, isFn, this, arguments[1], arguments[2]);
            break;
          case 4:
            emitThree(handler, isFn, this, arguments[1], arguments[2], arguments[3]);
            break;
          // slower
          default:
            args = new Array(len - 1);
            for (i = 1; i < len; i++)
              args[i - 1] = arguments[i];
            emitMany(handler, isFn, this, args);
        }

        return true;
      };

      function _addListener(target, type, listener, prepend) {
        var m;
        var events;
        var existing;

        if (typeof listener !== 'function')
          throw new TypeError('"listener" argument must be a function');

        events = target._events;
        if (!events) {
          events = target._events = objectCreate(null);
          target._eventsCount = 0;
        } else {
          // To avoid recursion in the case that type === "newListener"! Before
          // adding it to the listeners, first emit "newListener".
          if (events.newListener) {
            target.emit('newListener', type,
              listener.listener ? listener.listener : listener);

            // Re-assign `events` because a newListener handler could have caused the
            // this._events to be assigned to a new object
            events = target._events;
          }
          existing = events[type];
        }

        if (!existing) {
          // Optimize the case of one listener. Don't need the extra array object.
          existing = events[type] = listener;
          ++target._eventsCount;
        } else {
          if (typeof existing === 'function') {
            // Adding the second element, need to change to array.
            existing = events[type] =
              prepend ? [listener, existing] : [existing, listener];
          } else {
            // If we've already got an array, just append.
            if (prepend) {
              existing.unshift(listener);
            } else {
              existing.push(listener);
            }
          }

          // Check for listener leak
          if (!existing.warned) {
            m = $getMaxListeners(target);
            if (m && m > 0 && existing.length > m) {
              existing.warned = true;
              var w = new Error('Possible EventEmitter memory leak detected. ' +
                existing.length + ' "' + String(type) + '" listeners ' +
                'added. Use emitter.setMaxListeners() to ' +
                'increase limit.');
              w.name = 'MaxListenersExceededWarning';
              w.emitter = target;
              w.type = type;
              w.count = existing.length;
              if (typeof console === 'object' && console.warn) {
                console.warn('%s: %s', w.name, w.message);
              }
            }
          }
        }

        return target;
      }

      EventEmitter.prototype.addListener = function addListener(type, listener) {
        return _addListener(this, type, listener, false);
      };

      EventEmitter.prototype.on = EventEmitter.prototype.addListener;

      EventEmitter.prototype.prependListener =
        function prependListener(type, listener) {
          return _addListener(this, type, listener, true);
        };

      function onceWrapper() {
        if (!this.fired) {
          this.target.removeListener(this.type, this.wrapFn);
          this.fired = true;
          switch (arguments.length) {
            case 0:
              return this.listener.call(this.target);
            case 1:
              return this.listener.call(this.target, arguments[0]);
            case 2:
              return this.listener.call(this.target, arguments[0], arguments[1]);
            case 3:
              return this.listener.call(this.target, arguments[0], arguments[1],
                arguments[2]);
            default:
              var args = new Array(arguments.length);
              for (var i = 0; i < args.length; ++i)
                args[i] = arguments[i];
              this.listener.apply(this.target, args);
          }
        }
      }

      function _onceWrap(target, type, listener) {
        var state = {fired: false, wrapFn: undefined, target: target, type: type, listener: listener};
        var wrapped = bind.call(onceWrapper, state);
        wrapped.listener = listener;
        state.wrapFn = wrapped;
        return wrapped;
      }

      EventEmitter.prototype.once = function once(type, listener) {
        if (typeof listener !== 'function')
          throw new TypeError('"listener" argument must be a function');
        this.on(type, _onceWrap(this, type, listener));
        return this;
      };

      EventEmitter.prototype.prependOnceListener =
        function prependOnceListener(type, listener) {
          if (typeof listener !== 'function')
            throw new TypeError('"listener" argument must be a function');
          this.prependListener(type, _onceWrap(this, type, listener));
          return this;
        };

// Emits a 'removeListener' event if and only if the listener was removed.
      EventEmitter.prototype.removeListener =
        function removeListener(type, listener) {
          var list, events, position, i, originalListener;

          if (typeof listener !== 'function')
            throw new TypeError('"listener" argument must be a function');

          events = this._events;
          if (!events)
            return this;

          list = events[type];
          if (!list)
            return this;

          if (list === listener || list.listener === listener) {
            if (--this._eventsCount === 0)
              this._events = objectCreate(null);
            else {
              delete events[type];
              if (events.removeListener)
                this.emit('removeListener', type, list.listener || listener);
            }
          } else if (typeof list !== 'function') {
            position = -1;

            for (i = list.length - 1; i >= 0; i--) {
              if (list[i] === listener || list[i].listener === listener) {
                originalListener = list[i].listener;
                position = i;
                break;
              }
            }

            if (position < 0)
              return this;

            if (position === 0)
              list.shift();
            else
              spliceOne(list, position);

            if (list.length === 1)
              events[type] = list[0];

            if (events.removeListener)
              this.emit('removeListener', type, originalListener || listener);
          }

          return this;
        };

      EventEmitter.prototype.removeAllListeners =
        function removeAllListeners(type) {
          var listeners, events, i;

          events = this._events;
          if (!events)
            return this;

          // not listening for removeListener, no need to emit
          if (!events.removeListener) {
            if (arguments.length === 0) {
              this._events = objectCreate(null);
              this._eventsCount = 0;
            } else if (events[type]) {
              if (--this._eventsCount === 0)
                this._events = objectCreate(null);
              else
                delete events[type];
            }
            return this;
          }

          // emit removeListener for all listeners on all events
          if (arguments.length === 0) {
            var keys = objectKeys(events);
            var key;
            for (i = 0; i < keys.length; ++i) {
              key = keys[i];
              if (key === 'removeListener') continue;
              this.removeAllListeners(key);
            }
            this.removeAllListeners('removeListener');
            this._events = objectCreate(null);
            this._eventsCount = 0;
            return this;
          }

          listeners = events[type];

          if (typeof listeners === 'function') {
            this.removeListener(type, listeners);
          } else if (listeners) {
            // LIFO order
            for (i = listeners.length - 1; i >= 0; i--) {
              this.removeListener(type, listeners[i]);
            }
          }

          return this;
        };

      EventEmitter.prototype.listeners = function listeners(type) {
        var evlistener;
        var ret;
        var events = this._events;

        if (!events)
          ret = [];
        else {
          evlistener = events[type];
          if (!evlistener)
            ret = [];
          else if (typeof evlistener === 'function')
            ret = [evlistener.listener || evlistener];
          else
            ret = unwrapListeners(evlistener);
        }

        return ret;
      };

      EventEmitter.listenerCount = function (emitter, type) {
        if (typeof emitter.listenerCount === 'function') {
          return emitter.listenerCount(type);
        } else {
          return listenerCount.call(emitter, type);
        }
      };

      EventEmitter.prototype.listenerCount = listenerCount;

      function listenerCount(type) {
        var events = this._events;

        if (events) {
          var evlistener = events[type];

          if (typeof evlistener === 'function') {
            return 1;
          } else if (evlistener) {
            return evlistener.length;
          }
        }

        return 0;
      }

      EventEmitter.prototype.eventNames = function eventNames() {
        return this._eventsCount > 0 ? Reflect.ownKeys(this._events) : [];
      };

// About 1.5x faster than the two-arg version of Array#splice().
      function spliceOne(list, index) {
        for (var i = index, k = i + 1, n = list.length; k < n; i += 1, k += 1)
          list[i] = list[k];
        list.pop();
      }

      function arrayClone(arr, n) {
        var copy = new Array(n);
        for (var i = 0; i < n; ++i)
          copy[i] = arr[i];
        return copy;
      }

      function unwrapListeners(arr) {
        var ret = new Array(arr.length);
        for (var i = 0; i < ret.length; ++i) {
          ret[i] = arr[i].listener || arr[i];
        }
        return ret;
      }

      function objectCreatePolyfill(proto) {
        var F = function () {
        };
        F.prototype = proto;
        return new F;
      }

      function objectKeysPolyfill(obj) {
        var keys = [];
        for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k)) {
          keys.push(k);
        }
        return k;
      }

      function functionBindPolyfill(context) {
        var fn = this;
        return function () {
          return fn.apply(context, arguments);
        };
      }

    }, {}],
    10: [function (require, module, exports) {
      var isarray = require('isarray');
      var hasf = Object.prototype.hasOwnProperty;

      function has(obj, key) {
        return hasf.call(obj, key)
      }

      var VERSION = '1.0.0';

      module.exports = RPC;

      function RPC(src, dst, origin, methods) {
        if (!(this instanceof RPC)) return new RPC(src, dst, origin, methods);
        var self = this;
        this.src = src;
        this.dst = dst;
        this._dstIsWorker = /Worker/.test(dst);

        if (origin === '*') {
          this.origin = '*';
        }
        else if (origin) {
          var uorigin = new URL(origin);
          this.origin = uorigin.protocol + '//' + uorigin.host;
        }

        this._sequence = 0;
        this._callbacks = {};

        this._onmessage = function (ev) {
          if (self._destroyed) return;
          if (self.origin !== '*' && ev.origin !== self.origin) return;
          if (!ev.data || typeof ev.data !== 'object') return;
          if (ev.data.protocol !== 'frame-rpc') return;
          if (!isarray(ev.data.arguments)) return;
          self._handle(ev.data);
        };
        this.src.addEventListener('message', this._onmessage);
        this._methods = (typeof methods === 'function'
            ? methods(this)
            : methods
        ) || {};
      }

      RPC.prototype.destroy = function () {
        this._destroyed = true;
        this.src.removeEventListener('message', this._onmessage);
      };

      RPC.prototype.call = function (method) {
        var args = [].slice.call(arguments, 1);
        return this.apply(method, args);
      };

      RPC.prototype.apply = function (method, args) {
        if (this._destroyed) return;
        var seq = this._sequence++;
        if (typeof args[args.length - 1] === 'function') {
          this._callbacks[seq] = args[args.length - 1];
          args = args.slice(0, -1);
        }
        this._dstPostMessage({
          protocol: 'frame-rpc',
          version: VERSION,
          sequence: seq,
          method: method,
          arguments: args
        });
      };

      RPC.prototype._dstPostMessage = function (msg) {
        if (this._dstIsWorker) {
          this.dst.postMessage(msg);
        }
        else {
          this.dst.postMessage(msg, this.origin);
        }
      };

      RPC.prototype._handle = function (msg) {
        var self = this;
        if (self._destroyed) return;
        if (has(msg, 'method')) {
          if (!has(this._methods, msg.method)) return;
          var args = msg.arguments.concat(function () {
            self._dstPostMessage({
              protocol: 'frame-rpc',
              version: VERSION,
              response: msg.sequence,
              arguments: [].slice.call(arguments)
            });
          });
          this._methods[msg.method].apply(this._methods, args);
        }
        else if (has(msg, 'response')) {
          var cb = this._callbacks[msg.response];
          delete this._callbacks[msg.response];
          if (cb) cb.apply(null, msg.arguments);
        }
      };

    }, {"isarray": 11}],
    11: [function (require, module, exports) {
      module.exports = Array.isArray || function (arr) {
        return Object.prototype.toString.call(arr) == '[object Array]';
      };

    }, {}],
    12: [function (require, module, exports) {
      exports.read = function (buffer, offset, isLE, mLen, nBytes) {
        var e, m
        var eLen = (nBytes * 8) - mLen - 1
        var eMax = (1 << eLen) - 1
        var eBias = eMax >> 1
        var nBits = -7
        var i = isLE ? (nBytes - 1) : 0
        var d = isLE ? -1 : 1
        var s = buffer[offset + i]

        i += d

        e = s & ((1 << (-nBits)) - 1)
        s >>= (-nBits)
        nBits += eLen
        for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {
        }

        m = e & ((1 << (-nBits)) - 1)
        e >>= (-nBits)
        nBits += mLen
        for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {
        }

        if (e === 0) {
          e = 1 - eBias
        } else if (e === eMax) {
          return m ? NaN : ((s ? -1 : 1) * Infinity)
        } else {
          m = m + Math.pow(2, mLen)
          e = e - eBias
        }
        return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
      }

      exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
        var e, m, c
        var eLen = (nBytes * 8) - mLen - 1
        var eMax = (1 << eLen) - 1
        var eBias = eMax >> 1
        var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
        var i = isLE ? 0 : (nBytes - 1)
        var d = isLE ? 1 : -1
        var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

        value = Math.abs(value)

        if (isNaN(value) || value === Infinity) {
          m = isNaN(value) ? 1 : 0
          e = eMax
        } else {
          e = Math.floor(Math.log(value) / Math.LN2)
          if (value * (c = Math.pow(2, -e)) < 1) {
            e--
            c *= 2
          }
          if (e + eBias >= 1) {
            value += rt / c
          } else {
            value += rt * Math.pow(2, 1 - eBias)
          }
          if (value * c >= 2) {
            e++
            c /= 2
          }

          if (e + eBias >= eMax) {
            m = 0
            e = eMax
          } else if (e + eBias >= 1) {
            m = ((value * c) - 1) * Math.pow(2, mLen)
            e = e + eBias
          } else {
            m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
            e = 0
          }
        }

        for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {
        }

        e = (e << mLen) | m
        eLen += mLen
        for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {
        }

        buffer[offset + i - d] |= s * 128
      }

    }, {}],
    13: [function (require, module, exports) {
      if (typeof Object.create === 'function') {
        // implementation from standard node.js 'util' module
        module.exports = function inherits(ctor, superCtor) {
          ctor.super_ = superCtor
          ctor.prototype = Object.create(superCtor.prototype, {
            constructor: {
              value: ctor,
              enumerable: false,
              writable: true,
              configurable: true
            }
          });
        };
      } else {
        // old school shim for old browsers
        module.exports = function inherits(ctor, superCtor) {
          ctor.super_ = superCtor
          var TempCtor = function () {
          }
          TempCtor.prototype = superCtor.prototype
          ctor.prototype = new TempCtor()
          ctor.prototype.constructor = ctor
        }
      }

    }, {}],
    14: [function (require, module, exports) {
      /*!
 * Determine if an object is a Buffer
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */

// The _isBuffer check is for Safari 5-7 support, because it's missing
// Object.prototype.constructor. Remove this eventually
      module.exports = function (obj) {
        return obj != null && (isBuffer(obj) || isSlowBuffer(obj) || !!obj._isBuffer)
      }

      function isBuffer(obj) {
        return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
      }

// For Node v0.10 support. Remove this eventually.
      function isSlowBuffer(obj) {
        return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isBuffer(obj.slice(0, 0))
      }

    }, {}],
    15: [function (require, module, exports) {
      (function (process) {
        'use strict';

        var callable, byObserver;

        callable = function (fn) {
          if (typeof fn !== 'function') throw new TypeError(fn + " is not a function");
          return fn;
        };

        byObserver = function (Observer) {
          var node = document.createTextNode(''), queue, currentQueue, i = 0;
          new Observer(function () {
            var callback;
            if (!queue) {
              if (!currentQueue) return;
              queue = currentQueue;
            } else if (currentQueue) {
              queue = currentQueue.concat(queue);
            }
            currentQueue = queue;
            queue = null;
            if (typeof currentQueue === 'function') {
              callback = currentQueue;
              currentQueue = null;
              callback();
              return;
            }
            node.data = (i = ++i % 2); // Invoke other batch, to handle leftover callbacks in case of crash
            while (currentQueue) {
              callback = currentQueue.shift();
              if (!currentQueue.length) currentQueue = null;
              callback();
            }
          }).observe(node, {characterData: true});
          return function (fn) {
            callable(fn);
            if (queue) {
              if (typeof queue === 'function') queue = [queue, fn];
              else queue.push(fn);
              return;
            }
            queue = fn;
            node.data = (i = ++i % 2);
          };
        };

        module.exports = (function () {
          // Node.js
          if ((typeof process === 'object') && process && (typeof process.nextTick === 'function')) {
            return process.nextTick;
          }

          // MutationObserver
          if ((typeof document === 'object') && document) {
            if (typeof MutationObserver === 'function') return byObserver(MutationObserver);
            if (typeof WebKitMutationObserver === 'function') return byObserver(WebKitMutationObserver);
          }

          // W3C Draft
          // http://dvcs.w3.org/hg/webperf/raw-file/tip/specs/setImmediate/Overview.html
          if (typeof setImmediate === 'function') {
            return function (cb) {
              setImmediate(callable(cb));
            };
          }

          // Wide available standard
          if ((typeof setTimeout === 'function') || (typeof setTimeout === 'object')) {
            return function (cb) {
              setTimeout(callable(cb), 0);
            };
          }

          return null;
        }());

      }).call(this, require('_process'))
    }, {"_process": 4}],
    16: [function (require, module, exports) {
      var wrappy = require('wrappy')
      module.exports = wrappy(once)
      module.exports.strict = wrappy(onceStrict)

      once.proto = once(function () {
        Object.defineProperty(Function.prototype, 'once', {
          value: function () {
            return once(this)
          },
          configurable: true
        })

        Object.defineProperty(Function.prototype, 'onceStrict', {
          value: function () {
            return onceStrict(this)
          },
          configurable: true
        })
      })

      function once(fn) {
        var f = function () {
          if (f.called) return f.value
          f.called = true
          return f.value = fn.apply(this, arguments)
        }
        f.called = false
        return f
      }

      function onceStrict(fn) {
        var f = function () {
          if (f.called)
            throw new Error(f.onceError)
          f.called = true
          return f.value = fn.apply(this, arguments)
        }
        var name = fn.name || 'Function wrapped with `once`'
        f.onceError = name + " shouldn't be called more than once"
        f.called = false
        return f
      }

    }, {"wrappy": 37}],
    17: [function (require, module, exports) {
      (function (Buffer) {
        var varint = require('varint')
        var svarint = require('signed-varint')

        exports.make = encoder

        exports.name = function (enc) {
          var keys = Object.keys(exports)
          for (var i = 0; i < keys.length; i++) {
            if (exports[keys[i]] === enc) return keys[i]
          }
          return null
        }

        exports.skip = function (type, buffer, offset) {
          switch (type) {
            case 0:
              varint.decode(buffer, offset)
              return offset + varint.decode.bytes

            case 1:
              return offset + 8

            case 2:
              var len = varint.decode(buffer, offset)
              return offset + varint.decode.bytes + len

            case 3:
            case 4:
              throw new Error('Groups are not supported')

            case 5:
              return offset + 4
          }

          throw new Error('Unknown wire type: ' + type)
        }

        exports.bytes = encoder(2,
          function encode(val, buffer, offset) {
            var oldOffset = offset
            var len = bufferLength(val)

            varint.encode(len, buffer, offset)
            offset += varint.encode.bytes

            if (Buffer.isBuffer(val)) val.copy(buffer, offset)
            else buffer.write(val, offset, len)
            offset += len

            encode.bytes = offset - oldOffset
            return buffer
          },
          function decode(buffer, offset) {
            var oldOffset = offset

            var len = varint.decode(buffer, offset)
            offset += varint.decode.bytes

            var val = buffer.slice(offset, offset + len)
            offset += val.length

            decode.bytes = offset - oldOffset
            return val
          },
          function encodingLength(val) {
            var len = bufferLength(val)
            return varint.encodingLength(len) + len
          }
        )

        exports.string = encoder(2,
          function encode(val, buffer, offset) {
            var oldOffset = offset
            var len = Buffer.byteLength(val)

            varint.encode(len, buffer, offset, 'utf-8')
            offset += varint.encode.bytes

            buffer.write(val, offset, len)
            offset += len

            encode.bytes = offset - oldOffset
            return buffer
          },
          function decode(buffer, offset) {
            var oldOffset = offset

            var len = varint.decode(buffer, offset)
            offset += varint.decode.bytes

            var val = buffer.toString('utf-8', offset, offset + len)
            offset += len

            decode.bytes = offset - oldOffset
            return val
          },
          function encodingLength(val) {
            var len = Buffer.byteLength(val)
            return varint.encodingLength(len) + len
          }
        )

        exports.bool = encoder(0,
          function encode(val, buffer, offset) {
            buffer[offset] = val ? 1 : 0
            encode.bytes = 1
            return buffer
          },
          function decode(buffer, offset) {
            var bool = buffer[offset] > 0
            decode.bytes = 1
            return bool
          },
          function encodingLength() {
            return 1
          }
        )

        exports.int32 = encoder(0,
          function encode(val, buffer, offset) {
            varint.encode(val < 0 ? val + 4294967296 : val, buffer, offset)
            encode.bytes = varint.encode.bytes
            return buffer
          },
          function decode(buffer, offset) {
            var val = varint.decode(buffer, offset)
            decode.bytes = varint.decode.bytes
            return val > 2147483647 ? val - 4294967296 : val
          },
          function encodingLength(val) {
            return varint.encodingLength(val < 0 ? val + 4294967296 : val)
          }
        )

        exports.int64 = encoder(0,
          function encode(val, buffer, offset) {
            if (val < 0) {
              var last = offset + 9
              varint.encode(val * -1, buffer, offset)
              offset += varint.encode.bytes - 1
              buffer[offset] = buffer[offset] | 0x80
              while (offset < last - 1) {
                offset++
                buffer[offset] = 0xff
              }
              buffer[last] = 0x01
              encode.bytes = 10
            } else {
              varint.encode(val, buffer, offset)
              encode.bytes = varint.encode.bytes
            }
            return buffer
          },
          function decode(buffer, offset) {
            var val = varint.decode(buffer, offset)
            if (val >= Math.pow(2, 63)) {
              var limit = 9
              while (buffer[offset + limit - 1] === 0xff) limit--
              limit = limit || 9
              var subset = Buffer.allocUnsafe(limit)
              buffer.copy(subset, 0, offset, offset + limit)
              subset[limit - 1] = subset[limit - 1] & 0x7f
              val = -1 * varint.decode(subset, 0)
              decode.bytes = 10
            } else {
              decode.bytes = varint.decode.bytes
            }
            return val
          },
          function encodingLength(val) {
            return val < 0 ? 10 : varint.encodingLength(val)
          }
        )

        exports.sint32 =
          exports.sint64 = encoder(0,
            svarint.encode,
            svarint.decode,
            svarint.encodingLength
          )

        exports.uint32 =
          exports.uint64 =
            exports.enum =
              exports.varint = encoder(0,
                varint.encode,
                varint.decode,
                varint.encodingLength
              )

// we cannot represent these in javascript so we just use buffers
        exports.fixed64 =
          exports.sfixed64 = encoder(1,
            function encode(val, buffer, offset) {
              val.copy(buffer, offset)
              encode.bytes = 8
              return buffer
            },
            function decode(buffer, offset) {
              var val = buffer.slice(offset, offset + 8)
              decode.bytes = 8
              return val
            },
            function encodingLength() {
              return 8
            }
          )

        exports.double = encoder(1,
          function encode(val, buffer, offset) {
            buffer.writeDoubleLE(val, offset)
            encode.bytes = 8
            return buffer
          },
          function decode(buffer, offset) {
            var val = buffer.readDoubleLE(offset)
            decode.bytes = 8
            return val
          },
          function encodingLength() {
            return 8
          }
        )

        exports.fixed32 = encoder(5,
          function encode(val, buffer, offset) {
            buffer.writeUInt32LE(val, offset)
            encode.bytes = 4
            return buffer
          },
          function decode(buffer, offset) {
            var val = buffer.readUInt32LE(offset)
            decode.bytes = 4
            return val
          },
          function encodingLength() {
            return 4
          }
        )

        exports.sfixed32 = encoder(5,
          function encode(val, buffer, offset) {
            buffer.writeInt32LE(val, offset)
            encode.bytes = 4
            return buffer
          },
          function decode(buffer, offset) {
            var val = buffer.readInt32LE(offset)
            decode.bytes = 4
            return val
          },
          function encodingLength() {
            return 4
          }
        )

        exports.float = encoder(5,
          function encode(val, buffer, offset) {
            buffer.writeFloatLE(val, offset)
            encode.bytes = 4
            return buffer
          },
          function decode(buffer, offset) {
            var val = buffer.readFloatLE(offset)
            decode.bytes = 4
            return val
          },
          function encodingLength() {
            return 4
          }
        )

        function encoder(type, encode, decode, encodingLength) {
          encode.bytes = decode.bytes = 0

          return {
            type: type,
            encode: encode,
            decode: decode,
            encodingLength: encodingLength
          }
        }

        function bufferLength(val) {
          return Buffer.isBuffer(val) ? val.length : Buffer.byteLength(val)
        }

      }).call(this, require("buffer").Buffer)
    }, {"buffer": 8, "signed-varint": 32, "varint": 20}],
    18: [function (require, module, exports) {
      module.exports = read

      var MSB = 0x80
        , REST = 0x7F

      function read(buf, offset) {
        var res = 0
          , offset = offset || 0
          , shift = 0
          , counter = offset
          , b
          , l = buf.length

        do {
          if (counter >= l) {
            read.bytes = 0
            throw new RangeError('Could not decode varint')
          }
          b = buf[counter++]
          res += shift < 28
            ? (b & REST) << shift
            : (b & REST) * Math.pow(2, shift)
          shift += 7
        } while (b >= MSB)

        read.bytes = counter - offset

        return res
      }

    }, {}],
    19: [function (require, module, exports) {
      module.exports = encode

      var MSB = 0x80
        , REST = 0x7F
        , MSBALL = ~REST
        , INT = Math.pow(2, 31)

      function encode(num, out, offset) {
        out = out || []
        offset = offset || 0
        var oldOffset = offset

        while (num >= INT) {
          out[offset++] = (num & 0xFF) | MSB
          num /= 128
        }
        while (num & MSBALL) {
          out[offset++] = (num & 0xFF) | MSB
          num >>>= 7
        }
        out[offset] = num | 0

        encode.bytes = offset - oldOffset + 1

        return out
      }

    }, {}],
    20: [function (require, module, exports) {
      module.exports = {
        encode: require('./encode.js')
        , decode: require('./decode.js')
        , encodingLength: require('./length.js')
      }

    }, {"./decode.js": 18, "./encode.js": 19, "./length.js": 21}],
    21: [function (require, module, exports) {

      var N1 = Math.pow(2, 7)
      var N2 = Math.pow(2, 14)
      var N3 = Math.pow(2, 21)
      var N4 = Math.pow(2, 28)
      var N5 = Math.pow(2, 35)
      var N6 = Math.pow(2, 42)
      var N7 = Math.pow(2, 49)
      var N8 = Math.pow(2, 56)
      var N9 = Math.pow(2, 63)

      module.exports = function (value) {
        return (
          value < N1 ? 1
            : value < N2 ? 2
            : value < N3 ? 3
              : value < N4 ? 4
                : value < N5 ? 5
                  : value < N6 ? 6
                    : value < N7 ? 7
                      : value < N8 ? 8
                        : value < N9 ? 9
                          : 10
        )
      }

    }, {}],
    22: [function (require, module, exports) {
      module.exports = function () {
        throw new Error('random-access-file is not supported in the browser')
      }

    }, {}],
    23: [function (require, module, exports) {
      (function (Buffer) {
        var Abstract = require('abstract-random-access')
        var inherits = require('inherits')
        var nextTick = require('next-tick')
        var once = require('once')
        var blocks = require('./lib/blocks.js')
        var bufferFrom = require('buffer-from')
        var bufferAlloc = require('buffer-alloc')

        var DELIM = '\0'

        module.exports = function (dbname, xopts) {
          if (!xopts) xopts = {}
          var idb = xopts.idb || (typeof window !== 'undefined'
            ? window.indexedDB || window.mozIndexedDB
            || window.webkitIndexedDB || window.msIndexedDB
            : null)
          if (!idb) throw new Error('indexedDB not present and not given')
          var db = null, dbqueue = []
          if (typeof idb.open === 'function') {
            var req = idb.open(dbname)
            req.addEventListener('upgradeneeded', function () {
              db = req.result
              db.createObjectStore('data')
            })
            req.addEventListener('success', function () {
              db = req.result
              dbqueue.forEach(function (cb) {
                cb(db)
              })
              dbqueue = null
            })
          } else {
            db = idb
          }
          return function (name, opts) {
            if (typeof name === 'object') {
              opts = name
              name = opts.name
            }

            if (!opts) opts = {}
            opts.name = name

            return new Store(Object.assign({db: getdb}, xopts, opts))
          }

          function getdb(cb) {
            if (db) nextTick(function () {
              cb(db)
            })
            else dbqueue.push(cb)
          }
        }

        function Store(opts) {
          if (!(this instanceof Store)) return new Store(opts)
          Abstract.call(this)
          if (!opts) opts = {}
          if (typeof opts === 'string') opts = {name: opts}
          this.size = opts.size || 4096
          this.name = opts.name
          this.length = opts.length || 0
          this._getdb = opts.db
        }

        inherits(Store, Abstract)

        Store.prototype._blocks = function (i, j) {
          return blocks(this.size, i, j)
        }

        Store.prototype._read = function (offset, length, cb) {
          var self = this
          cb = once(cb)
          var buffers = []
          self._store('readonly', function (err, store) {
            if ((self.length || 0) < offset + length) {
              return cb(new Error('Could not satisfy length'))
            }
            if (err) return cb(err)
            var offsets = self._blocks(offset, offset + length)
            var pending = offsets.length + 1
            var firstBlock = offsets.length > 0 ? offsets[0].block : 0
            var j = 0
            for (var i = 0; i < offsets.length; i++) (function (o) {
              var key = self.name + DELIM + o.block
              backify(store.get(key), function (err, ev) {
                if (err) return cb(err)
                buffers[o.block - firstBlock] = ev.target.result
                  ? bufferFrom(ev.target.result.subarray(o.start, o.end))
                  : bufferAlloc(o.end - o.start)
                if (--pending === 0) cb(null, Buffer.concat(buffers))
              })
            })(offsets[i])
            if (--pending === 0) cb(null, Buffer.concat(buffers))
          })
        }

        Store.prototype._write = function (offset, buf, cb) {
          var self = this
          cb = once(cb)
          self._store('readwrite', function (err, store) {
            if (err) return cb(err)
            var offsets = self._blocks(offset, offset + buf.length)
            var pending = 1
            var buffers = {}
            for (var i = 0; i < offsets.length; i++) (function (o, i) {
              if (o.end - o.start === self.size) return
              pending++
              var key = self.name + DELIM + o.block
              backify(store.get(key), function (err, ev) {
                if (err) return cb(err)
                buffers[i] = bufferFrom(ev.target.result || bufferAlloc(self.size))
                if (--pending === 0) write(store, offsets, buffers)
              })
            })(offsets[i], i)
            if (--pending === 0) write(store, offsets, buffers)
          })

          function write(store, offsets, buffers) {
            for (var i = 0, j = 0; i < offsets.length; i++) {
              var o = offsets[i]
              var len = o.end - o.start
              if (len === self.size) {
                block = buf.slice(j, j + len)
              } else {
                block = buffers[i]
                buf.copy(block, o.start, j, j + len)
              }
              store.put(block, self.name + DELIM + o.block)
              j += len
            }
            var length = Math.max(self.length || 0, offset + buf.length)
            store.put(length, self.name + DELIM + "length")
            store.transaction.addEventListener('complete', function () {
              self.length = length
              cb(null)
            })
            store.transaction.addEventListener('error', cb)
          }
        }

        Store.prototype._store = function (mode, cb) {
          cb = once(cb)
          var self = this
          self._getdb(function (db) {
            var tx = db.transaction(['data'], mode)
            var store = tx.objectStore('data')
            tx.addEventListener('error', cb)
            cb(null, store)
          })
        }

        Store.prototype._open = function (cb) {
          var self = this
          this._getdb(function (db) {
            self._store('readonly', function (err, store) {
              backify(store.get(self.name + DELIM + "length"), function (err, ev) {
                self.length = ev.target.result || 0
                cb(null)
              })
            })
          })
        }

        function backify(r, cb) {
          r.addEventListener('success', function (ev) {
            cb(null, ev)
          })
          r.addEventListener('error', cb)
        }

      }).call(this, require("buffer").Buffer)
    }, {
      "./lib/blocks.js": 24,
      "abstract-random-access": 2,
      "buffer": 8,
      "buffer-alloc": 5,
      "buffer-from": 25,
      "inherits": 13,
      "next-tick": 15,
      "once": 16
    }],
    24: [function (require, module, exports) {
      module.exports = function (size, start, end) {
        var result = []
        for (var n = Math.floor(start / size) * size; n < end; n += size) {
          result.push({
            block: Math.floor(n / size),
            start: Math.max(n, start) % size,
            end: Math.min(n + size, end) % size || size
          })
        }
        return result
      }

    }, {}],
    25: [function (require, module, exports) {
      (function (Buffer) {
        var toString = Object.prototype.toString

        var isModern = (
          typeof Buffer.alloc === 'function' &&
          typeof Buffer.allocUnsafe === 'function' &&
          typeof Buffer.from === 'function'
        )

        function isArrayBuffer(input) {
          return toString.call(input).slice(8, -1) === 'ArrayBuffer'
        }

        function fromArrayBuffer(obj, byteOffset, length) {
          byteOffset >>>= 0

          var maxLength = obj.byteLength - byteOffset

          if (maxLength < 0) {
            throw new RangeError("'offset' is out of bounds")
          }

          if (length === undefined) {
            length = maxLength
          } else {
            length >>>= 0

            if (length > maxLength) {
              throw new RangeError("'length' is out of bounds")
            }
          }

          return isModern
            ? Buffer.from(obj.slice(byteOffset, byteOffset + length))
            : new Buffer(new Uint8Array(obj.slice(byteOffset, byteOffset + length)))
        }

        function fromString(string, encoding) {
          if (typeof encoding !== 'string' || encoding === '') {
            encoding = 'utf8'
          }

          if (!Buffer.isEncoding(encoding)) {
            throw new TypeError('"encoding" must be a valid string encoding')
          }

          return isModern
            ? Buffer.from(string, encoding)
            : new Buffer(string, encoding)
        }

        function bufferFrom(value, encodingOrOffset, length) {
          if (typeof value === 'number') {
            throw new TypeError('"value" argument must not be a number')
          }

          if (isArrayBuffer(value)) {
            return fromArrayBuffer(value, encodingOrOffset, length)
          }

          if (typeof value === 'string') {
            return fromString(value, encodingOrOffset)
          }

          return isModern
            ? Buffer.from(value)
            : new Buffer(value)
        }

        module.exports = bufferFrom

      }).call(this, require("buffer").Buffer)
    }, {"buffer": 8}],
    26: [function (require, module, exports) {
      (function (Buffer) {
        const raf = require('random-access-file')
        const {Request, Callback, Action} = require('./proto')
        const rafMap = new Map()

        function RasBridge(getRas) {
          return function (data, cb) {
            data = Request.decode(data)

            if (!rafMap.has(data.name)) {
              rafMap.set(data.name, getRas(data.name))
            }

            const current = rafMap.get(data.name)

            data.callback = function (error, arg) {
              const response = {id: data.id, error: error, name: data.name, stat: null, data: null}

              if (arg !== undefined) {
                if (Buffer.isBuffer(arg)) response.data = arg
                else response.stat = arg
              }

              cb(Callback.encode(response))
            }

            propagate(data, current)
          }
        }

        function propagate(data, ras) {
          switch (data.action) {
            case Action.OPEN:
              ras._open(data)
              return
            case Action.OPENREADONLY:
              ras._openReadonly(data)
              return
            case Action.READ:
              ras._read(data)
              return
            case Action.WRITE:
              ras._write(data)
              return
            case Action.DEL:
              ras._del(data)
              return
            case Action.STAT:
              ras._stat(data)
              return
            case Action.CLOSE:
              ras._close(data)
              return
            case Action.DESTROY:
              ras._destroy(data)
              return
          }
        }

        module.exports = RasBridge
        module.exports.propagate = propagate

      }).call(this, {"isBuffer": require("../is-buffer/index.js")})
    }, {"../is-buffer/index.js": 14, "./proto": 28, "random-access-file": 22}],
    27: [function (require, module, exports) {
      (function (Buffer) {
        const ras = require('random-access-storage')
        const {Action} = require('./proto')
        const NoopTransport = require('./transport')
        const empty = Buffer.alloc(0)

        function RAN(name, transport) {
          transport = transport || new NoopTransport(name)

          function send(action, req) {
            const request = {
              action: action,
              size: req.size || 0,
              offset: req.offset || 0
            }

            if (action === Action.WRITE) {
              request.data = req.data || empty
            }

            transport._queue(request, req)
          }

          return ras({
            open: (req) => send(Action.OPEN, req),
            read: (req) => send(Action.READ, req),
            openReadonly: (req) => send(Action.OPENREADONLY, req),
            write: (req) => send(Action.WRITE, req),
            del: (req) => send(Action.DEL, req),
            stat: (req) => send(Action.STAT, req),
            close: (req) => send(Action.CLOSE, req),
            destroy: (req) => send(Action.DESTROY, req)
          })
        }

        module.exports = RAN
        module.exports.RAN = RAN
        module.exports.NoopTransport = NoopTransport
        module.exports.StreamTransport = require('./transports/stream')
        module.exports.RasBridge = require('./bridge')

      }).call(this, require("buffer").Buffer)
    }, {
      "./bridge": 26,
      "./proto": 28,
      "./transport": 29,
      "./transports/stream": 30,
      "buffer": 8,
      "random-access-storage": 31
    }],
    28: [function (require, module, exports) {
      (function (Buffer) {
// This file is auto generated by the protocol-buffers cli tool

        /* eslint-disable quotes */
        /* eslint-disable indent */
        /* eslint-disable no-redeclare */
        /* eslint-disable camelcase */

// Remember to `npm install --save protocol-buffers-encodings`
        var encodings = require('protocol-buffers-encodings')
        var varint = encodings.varint
        var skip = encodings.skip

        exports.Action = {
          "OPEN": 0,
          "OPENREADONLY": 1,
          "READ": 2,
          "WRITE": 3,
          "DEL": 4,
          "STAT": 5,
          "CLOSE": 6,
          "DESTROY": 7
        }

        var Request = exports.Request = {
          buffer: true,
          encodingLength: null,
          encode: null,
          decode: null
        }

        var Error = exports.Error = {
          buffer: true,
          encodingLength: null,
          encode: null,
          decode: null
        }

        var Stat = exports.Stat = {
          buffer: true,
          encodingLength: null,
          encode: null,
          decode: null
        }

        var Callback = exports.Callback = {
          buffer: true,
          encodingLength: null,
          encode: null,
          decode: null
        }

        defineRequest()
        defineError()
        defineStat()
        defineCallback()

        function defineRequest() {
          var enc = [
            encodings.enum,
            encodings.string,
            encodings.int32,
            encodings.bytes
          ]

          Request.encodingLength = encodingLength
          Request.encode = encode
          Request.decode = decode

          function encodingLength(obj) {
            var length = 0
            if (!defined(obj.action)) throw new Error("action is required")
            var len = enc[0].encodingLength(obj.action)
            length += 1 + len
            if (!defined(obj.name)) throw new Error("name is required")
            var len = enc[1].encodingLength(obj.name)
            length += 1 + len
            if (!defined(obj.id)) throw new Error("id is required")
            var len = enc[2].encodingLength(obj.id)
            length += 1 + len
            if (!defined(obj.size)) throw new Error("size is required")
            var len = enc[2].encodingLength(obj.size)
            length += 1 + len
            if (!defined(obj.offset)) throw new Error("offset is required")
            var len = enc[2].encodingLength(obj.offset)
            length += 1 + len
            if (defined(obj.data)) {
              var len = enc[3].encodingLength(obj.data)
              length += 1 + len
            }
            return length
          }

          function encode(obj, buf, offset) {
            if (!offset) offset = 0
            if (!buf) buf = Buffer.allocUnsafe(encodingLength(obj))
            var oldOffset = offset
            if (!defined(obj.action)) throw new Error("action is required")
            buf[offset++] = 8
            enc[0].encode(obj.action, buf, offset)
            offset += enc[0].encode.bytes
            if (!defined(obj.name)) throw new Error("name is required")
            buf[offset++] = 18
            enc[1].encode(obj.name, buf, offset)
            offset += enc[1].encode.bytes
            if (!defined(obj.id)) throw new Error("id is required")
            buf[offset++] = 24
            enc[2].encode(obj.id, buf, offset)
            offset += enc[2].encode.bytes
            if (!defined(obj.size)) throw new Error("size is required")
            buf[offset++] = 32
            enc[2].encode(obj.size, buf, offset)
            offset += enc[2].encode.bytes
            if (!defined(obj.offset)) throw new Error("offset is required")
            buf[offset++] = 40
            enc[2].encode(obj.offset, buf, offset)
            offset += enc[2].encode.bytes
            if (defined(obj.data)) {
              buf[offset++] = 50
              enc[3].encode(obj.data, buf, offset)
              offset += enc[3].encode.bytes
            }
            encode.bytes = offset - oldOffset
            return buf
          }

          function decode(buf, offset, end) {
            if (!offset) offset = 0
            if (!end) end = buf.length
            if (!(end <= buf.length && offset <= buf.length)) throw new Error("Decoded message is not valid")
            var oldOffset = offset
            var obj = {
              action: 0,
              name: "",
              id: 0,
              size: 0,
              offset: 0,
              data: null
            }
            var found0 = false
            var found1 = false
            var found2 = false
            var found3 = false
            var found4 = false
            while (true) {
              if (end <= offset) {
                if (!found0 || !found1 || !found2 || !found3 || !found4) throw new Error("Decoded message is not valid")
                decode.bytes = offset - oldOffset
                return obj
              }
              var prefix = varint.decode(buf, offset)
              offset += varint.decode.bytes
              var tag = prefix >> 3
              switch (tag) {
                case 1:
                  obj.action = enc[0].decode(buf, offset)
                  offset += enc[0].decode.bytes
                  found0 = true
                  break
                case 2:
                  obj.name = enc[1].decode(buf, offset)
                  offset += enc[1].decode.bytes
                  found1 = true
                  break
                case 3:
                  obj.id = enc[2].decode(buf, offset)
                  offset += enc[2].decode.bytes
                  found2 = true
                  break
                case 4:
                  obj.size = enc[2].decode(buf, offset)
                  offset += enc[2].decode.bytes
                  found3 = true
                  break
                case 5:
                  obj.offset = enc[2].decode(buf, offset)
                  offset += enc[2].decode.bytes
                  found4 = true
                  break
                case 6:
                  obj.data = enc[3].decode(buf, offset)
                  offset += enc[3].decode.bytes
                  break
                default:
                  offset = skip(prefix & 7, buf, offset)
              }
            }
          }
        }

        function defineError() {
          var enc = [
            encodings.string
          ]

          Error.encodingLength = encodingLength
          Error.encode = encode
          Error.decode = decode

          function encodingLength(obj) {
            var length = 0
            if (!defined(obj.message)) throw new Error("message is required")
            var len = enc[0].encodingLength(obj.message)
            length += 1 + len
            if (!defined(obj.stack)) throw new Error("stack is required")
            var len = enc[0].encodingLength(obj.stack)
            length += 1 + len
            return length
          }

          function encode(obj, buf, offset) {
            if (!offset) offset = 0
            if (!buf) buf = Buffer.allocUnsafe(encodingLength(obj))
            var oldOffset = offset
            if (!defined(obj.message)) throw new Error("message is required")
            buf[offset++] = 10
            enc[0].encode(obj.message, buf, offset)
            offset += enc[0].encode.bytes
            if (!defined(obj.stack)) throw new Error("stack is required")
            buf[offset++] = 18
            enc[0].encode(obj.stack, buf, offset)
            offset += enc[0].encode.bytes
            encode.bytes = offset - oldOffset
            return buf
          }

          function decode(buf, offset, end) {
            if (!offset) offset = 0
            if (!end) end = buf.length
            if (!(end <= buf.length && offset <= buf.length)) throw new Error("Decoded message is not valid")
            var oldOffset = offset
            var obj = {
              message: "",
              stack: ""
            }
            var found0 = false
            var found1 = false
            while (true) {
              if (end <= offset) {
                if (!found0 || !found1) throw new Error("Decoded message is not valid")
                decode.bytes = offset - oldOffset
                return obj
              }
              var prefix = varint.decode(buf, offset)
              offset += varint.decode.bytes
              var tag = prefix >> 3
              switch (tag) {
                case 1:
                  obj.message = enc[0].decode(buf, offset)
                  offset += enc[0].decode.bytes
                  found0 = true
                  break
                case 2:
                  obj.stack = enc[0].decode(buf, offset)
                  offset += enc[0].decode.bytes
                  found1 = true
                  break
                default:
                  offset = skip(prefix & 7, buf, offset)
              }
            }
          }
        }

        function defineStat() {
          var enc = [
            encodings.varint
          ]

          Stat.encodingLength = encodingLength
          Stat.encode = encode
          Stat.decode = decode

          function encodingLength(obj) {
            var length = 0
            if (!defined(obj.mode)) throw new Error("mode is required")
            var len = enc[0].encodingLength(obj.mode)
            length += 1 + len
            if (defined(obj.uid)) {
              var len = enc[0].encodingLength(obj.uid)
              length += 1 + len
            }
            if (defined(obj.gid)) {
              var len = enc[0].encodingLength(obj.gid)
              length += 1 + len
            }
            if (defined(obj.size)) {
              var len = enc[0].encodingLength(obj.size)
              length += 1 + len
            }
            if (defined(obj.blocks)) {
              var len = enc[0].encodingLength(obj.blocks)
              length += 1 + len
            }
            if (defined(obj.offset)) {
              var len = enc[0].encodingLength(obj.offset)
              length += 1 + len
            }
            if (defined(obj.byteOffset)) {
              var len = enc[0].encodingLength(obj.byteOffset)
              length += 1 + len
            }
            if (defined(obj.mtime)) {
              var len = enc[0].encodingLength(obj.mtime)
              length += 1 + len
            }
            if (defined(obj.ctime)) {
              var len = enc[0].encodingLength(obj.ctime)
              length += 1 + len
            }
            return length
          }

          function encode(obj, buf, offset) {
            if (!offset) offset = 0
            if (!buf) buf = Buffer.allocUnsafe(encodingLength(obj))
            var oldOffset = offset
            if (!defined(obj.mode)) throw new Error("mode is required")
            buf[offset++] = 8
            enc[0].encode(obj.mode, buf, offset)
            offset += enc[0].encode.bytes
            if (defined(obj.uid)) {
              buf[offset++] = 16
              enc[0].encode(obj.uid, buf, offset)
              offset += enc[0].encode.bytes
            }
            if (defined(obj.gid)) {
              buf[offset++] = 24
              enc[0].encode(obj.gid, buf, offset)
              offset += enc[0].encode.bytes
            }
            if (defined(obj.size)) {
              buf[offset++] = 32
              enc[0].encode(obj.size, buf, offset)
              offset += enc[0].encode.bytes
            }
            if (defined(obj.blocks)) {
              buf[offset++] = 40
              enc[0].encode(obj.blocks, buf, offset)
              offset += enc[0].encode.bytes
            }
            if (defined(obj.offset)) {
              buf[offset++] = 48
              enc[0].encode(obj.offset, buf, offset)
              offset += enc[0].encode.bytes
            }
            if (defined(obj.byteOffset)) {
              buf[offset++] = 56
              enc[0].encode(obj.byteOffset, buf, offset)
              offset += enc[0].encode.bytes
            }
            if (defined(obj.mtime)) {
              buf[offset++] = 64
              enc[0].encode(obj.mtime, buf, offset)
              offset += enc[0].encode.bytes
            }
            if (defined(obj.ctime)) {
              buf[offset++] = 72
              enc[0].encode(obj.ctime, buf, offset)
              offset += enc[0].encode.bytes
            }
            encode.bytes = offset - oldOffset
            return buf
          }

          function decode(buf, offset, end) {
            if (!offset) offset = 0
            if (!end) end = buf.length
            if (!(end <= buf.length && offset <= buf.length)) throw new Error("Decoded message is not valid")
            var oldOffset = offset
            var obj = {
              mode: 0,
              uid: 0,
              gid: 0,
              size: 0,
              blocks: 0,
              offset: 0,
              byteOffset: 0,
              mtime: 0,
              ctime: 0
            }
            var found0 = false
            while (true) {
              if (end <= offset) {
                if (!found0) throw new Error("Decoded message is not valid")
                decode.bytes = offset - oldOffset
                return obj
              }
              var prefix = varint.decode(buf, offset)
              offset += varint.decode.bytes
              var tag = prefix >> 3
              switch (tag) {
                case 1:
                  obj.mode = enc[0].decode(buf, offset)
                  offset += enc[0].decode.bytes
                  found0 = true
                  break
                case 2:
                  obj.uid = enc[0].decode(buf, offset)
                  offset += enc[0].decode.bytes
                  break
                case 3:
                  obj.gid = enc[0].decode(buf, offset)
                  offset += enc[0].decode.bytes
                  break
                case 4:
                  obj.size = enc[0].decode(buf, offset)
                  offset += enc[0].decode.bytes
                  break
                case 5:
                  obj.blocks = enc[0].decode(buf, offset)
                  offset += enc[0].decode.bytes
                  break
                case 6:
                  obj.offset = enc[0].decode(buf, offset)
                  offset += enc[0].decode.bytes
                  break
                case 7:
                  obj.byteOffset = enc[0].decode(buf, offset)
                  offset += enc[0].decode.bytes
                  break
                case 8:
                  obj.mtime = enc[0].decode(buf, offset)
                  offset += enc[0].decode.bytes
                  break
                case 9:
                  obj.ctime = enc[0].decode(buf, offset)
                  offset += enc[0].decode.bytes
                  break
                default:
                  offset = skip(prefix & 7, buf, offset)
              }
            }
          }
        }

        function defineCallback() {
          var enc = [
            encodings.int32,
            encodings.string,
            Error,
            Stat,
            encodings.bytes
          ]

          Callback.encodingLength = encodingLength
          Callback.encode = encode
          Callback.decode = decode

          function encodingLength(obj) {
            var length = 0
            if (!defined(obj.id)) throw new Error("id is required")
            var len = enc[0].encodingLength(obj.id)
            length += 1 + len
            if (!defined(obj.name)) throw new Error("name is required")
            var len = enc[1].encodingLength(obj.name)
            length += 1 + len
            if (defined(obj.error)) {
              var len = enc[2].encodingLength(obj.error)
              length += varint.encodingLength(len)
              length += 1 + len
            }
            if (defined(obj.stat)) {
              var len = enc[3].encodingLength(obj.stat)
              length += varint.encodingLength(len)
              length += 1 + len
            }
            if (defined(obj.data)) {
              var len = enc[4].encodingLength(obj.data)
              length += 1 + len
            }
            return length
          }

          function encode(obj, buf, offset) {
            if (!offset) offset = 0
            if (!buf) buf = Buffer.allocUnsafe(encodingLength(obj))
            var oldOffset = offset
            if (!defined(obj.id)) throw new Error("id is required")
            buf[offset++] = 8
            enc[0].encode(obj.id, buf, offset)
            offset += enc[0].encode.bytes
            if (!defined(obj.name)) throw new Error("name is required")
            buf[offset++] = 18
            enc[1].encode(obj.name, buf, offset)
            offset += enc[1].encode.bytes
            if (defined(obj.error)) {
              buf[offset++] = 26
              varint.encode(enc[2].encodingLength(obj.error), buf, offset)
              offset += varint.encode.bytes
              enc[2].encode(obj.error, buf, offset)
              offset += enc[2].encode.bytes
            }
            if (defined(obj.stat)) {
              buf[offset++] = 34
              varint.encode(enc[3].encodingLength(obj.stat), buf, offset)
              offset += varint.encode.bytes
              enc[3].encode(obj.stat, buf, offset)
              offset += enc[3].encode.bytes
            }
            if (defined(obj.data)) {
              buf[offset++] = 42
              enc[4].encode(obj.data, buf, offset)
              offset += enc[4].encode.bytes
            }
            encode.bytes = offset - oldOffset
            return buf
          }

          function decode(buf, offset, end) {
            if (!offset) offset = 0
            if (!end) end = buf.length
            if (!(end <= buf.length && offset <= buf.length)) throw new Error("Decoded message is not valid")
            var oldOffset = offset
            var obj = {
              id: 0,
              name: "",
              error: null,
              stat: null,
              data: null
            }
            var found0 = false
            var found1 = false
            while (true) {
              if (end <= offset) {
                if (!found0 || !found1) throw new Error("Decoded message is not valid")
                decode.bytes = offset - oldOffset
                return obj
              }
              var prefix = varint.decode(buf, offset)
              offset += varint.decode.bytes
              var tag = prefix >> 3
              switch (tag) {
                case 1:
                  obj.id = enc[0].decode(buf, offset)
                  offset += enc[0].decode.bytes
                  found0 = true
                  break
                case 2:
                  obj.name = enc[1].decode(buf, offset)
                  offset += enc[1].decode.bytes
                  found1 = true
                  break
                case 3:
                  var len = varint.decode(buf, offset)
                  offset += varint.decode.bytes
                  obj.error = enc[2].decode(buf, offset, offset + len)
                  offset += enc[2].decode.bytes
                  break
                case 4:
                  var len = varint.decode(buf, offset)
                  offset += varint.decode.bytes
                  obj.stat = enc[3].decode(buf, offset, offset + len)
                  offset += enc[3].decode.bytes
                  break
                case 5:
                  obj.data = enc[4].decode(buf, offset)
                  offset += enc[4].decode.bytes
                  break
                default:
                  offset = skip(prefix & 7, buf, offset)
              }
            }
          }
        }

        function defined(val) {
          return val !== null && val !== undefined && (typeof val !== 'number' || !isNaN(val))
        }

      }).call(this, require("buffer").Buffer)
    }, {"buffer": 8, "protocol-buffers-encodings": 17}],
    29: [function (require, module, exports) {
      const {Request, Callback} = require('./proto')

      function NoopTransport(name) {
        this._callbacks = new Map()
        this._id = 0
        this._name = name
      }

      /**
       * Called with data to be sent
       * @param {Buffer} data
       */
      NoopTransport.prototype.send = function (data) {
        this.onmessage(Callback.encode({id: this._id, error: null, name: this._name}))
      }

      /**
       * Called when a message is received
       * @param {any} data - you may need to transform it in a Buffer.
       *                     Once done, call `_next` with a Buffer
       *
       * Example:
       * this._next(Buffer.from(data.data))
       */
      NoopTransport.prototype.onmessage = function (data) {
        this._next(data)
      }

      /**
       * Closes the transport
       */
      NoopTransport.prototype.close = function () {
      }

      NoopTransport.prototype._next = function (data) {
        data = Callback.decode(data)
        if (data.name !== this._name) {
          return
        }

        const request = this._callbacks.get(data.id)
        request.callback(data.error, data.stat ? data.stat : data.data)
      }

      NoopTransport.prototype._queue = function (request, origin) {
        const next = ++this._id
        request.name = this._name
        request.id = next
        this._callbacks.set(next, origin)
        this.send(Request.encode(request))
      }

      module.exports = NoopTransport

    }, {"./proto": 28}],
    30: [function (require, module, exports) {
      const NoopTransport = require('../transport')

      function StreamTransport(name, stream) {
        NoopTransport.call(this, name)
        this._stream = stream
        this._stream.on('data', (data) => this._next(data))
      }

      StreamTransport.prototype = Object.create(NoopTransport.prototype)

      StreamTransport.prototype.send = function (data) {
        this._stream.write(data)
      }

      StreamTransport.prototype.close = function () {
        this._sock.close()
      }

      module.exports = StreamTransport

    }, {"../transport": 29}],
    31: [function (require, module, exports) {
      (function (process) {
        var events = require('events')
        var inherits = require('inherits')

        var NOT_READABLE = defaultImpl(new Error('Not readable'))
        var NOT_WRITABLE = defaultImpl(new Error('Not writable'))
        var NOT_DELETABLE = defaultImpl(new Error('Not deletable'))
        var NOT_STATABLE = defaultImpl(new Error('Not statable'))
        var NO_OPEN_READABLE = defaultImpl(new Error('No readonly open'))

        module.exports = RandomAccess

        function RandomAccess(opts) {
          if (!(this instanceof RandomAccess)) return new RandomAccess(opts)
          events.EventEmitter.call(this)

          this._queued = []
          this._pending = 0
          this._needsOpen = true

          this.opened = false
          this.closed = false
          this.destroyed = false

          if (opts) {
            if (opts.openReadonly) this._openReadonly = opts.openReadonly
            if (opts.open) this._open = opts.open
            if (opts.read) this._read = opts.read
            if (opts.write) this._write = opts.write
            if (opts.del) this._del = opts.del
            if (opts.stat) this._stat = opts.stat
            if (opts.close) this._close = opts.close
            if (opts.destroy) this._destroy = opts.destroy
          }

          this.preferReadonly = this._openReadonly !== NO_OPEN_READABLE
          this.readable = this._read !== NOT_READABLE
          this.writable = this._write !== NOT_WRITABLE
          this.deletable = this._del !== NOT_DELETABLE
          this.statable = this._stat !== NOT_STATABLE
        }

        inherits(RandomAccess, events.EventEmitter)

        RandomAccess.prototype.open = function (cb) {
          if (!cb) cb = noop
          if (this.opened && !this._needsOpen) return process.nextTick(cb, null)
          queueAndRun(this, new Request(this, 0, 0, 0, null, cb))
        }

        RandomAccess.prototype._open = defaultImpl(null)
        RandomAccess.prototype._openReadonly = NO_OPEN_READABLE

        RandomAccess.prototype.read = function (offset, size, cb) {
          this.run(new Request(this, 1, offset, size, null, cb))
        }

        RandomAccess.prototype._read = NOT_READABLE

        RandomAccess.prototype.write = function (offset, data, cb) {
          if (!cb) cb = noop
          openWritable(this)
          this.run(new Request(this, 2, offset, data.length, data, cb))
        }

        RandomAccess.prototype._write = NOT_WRITABLE

        RandomAccess.prototype.del = function (offset, size, cb) {
          if (!cb) cb = noop
          openWritable(this)
          this.run(new Request(this, 3, offset, size, null, cb))
        }

        RandomAccess.prototype._del = NOT_DELETABLE

        RandomAccess.prototype.stat = function (cb) {
          this.run(new Request(this, 4, 0, 0, null, cb))
        }

        RandomAccess.prototype._stat = NOT_STATABLE

        RandomAccess.prototype.close = function (cb) {
          if (!cb) cb = noop
          if (this.closed) return process.nextTick(cb, null)
          queueAndRun(this, new Request(this, 5, 0, 0, null, cb))
        }

        RandomAccess.prototype._close = defaultImpl(null)

        RandomAccess.prototype.destroy = function (cb) {
          if (!cb) cb = noop
          if (!this.closed) this.close(noop)
          queueAndRun(this, new Request(this, 6, 0, 0, null, cb))
        }

        RandomAccess.prototype._destroy = defaultImpl(null)

        RandomAccess.prototype.run = function (req) {
          if (this._needsOpen) this.open(noop)
          if (this._queued.length) this._queued.push(req)
          else req._run()
        }

        function noop() {
        }

        function Request(self, type, offset, size, data, cb) {
          this.type = type
          this.offset = offset
          this.data = data
          this.size = size
          this.storage = self

          this._sync = false
          this._callback = cb
        }

        Request.prototype._unqueue = function (err) {
          var ra = this.storage
          var queued = ra._queued

          if (!err) {
            switch (this.type) {
              case 0:
                if (!ra.opened) {
                  ra.opened = true
                  ra.emit('open')
                }
                break

              case 5:
                if (!ra.closed) {
                  ra.closed = true
                  ra.emit('close')
                }
                break

              case 6:
                if (!ra.destroyed) {
                  ra.destroyed = true
                  ra.emit('destroy')
                }
                break
            }
          }

          if (queued.length && queued[0] === this) queued.shift()
          if (!--ra._pending && queued.length) queued[0]._run()
        }

        Request.prototype.callback = function (err, val) {
          if (this._sync) return nextTick(this, err, val)
          this._unqueue(err)
          this._callback(err, val)
        }

        Request.prototype._openAndNotClosed = function () {
          var ra = this.storage
          if (ra.opened && !ra.closed) return true
          if (!ra.opened) nextTick(this, new Error('Not opened'))
          else if (ra.closed) nextTick(this, new Error('Closed'))
          return false
        }

        Request.prototype._open = function () {
          var ra = this.storage

          if (ra.opened && !ra._needsOpen) return nextTick(this, null)
          if (ra.closed) return nextTick(this, new Error('Closed'))

          ra._needsOpen = false
          if (ra.preferReadonly) ra._openReadonly(this)
          else ra._open(this)
        }

        Request.prototype._run = function () {
          var ra = this.storage
          ra._pending++

          this._sync = true

          switch (this.type) {
            case 0:
              this._open()
              break

            case 1:
              if (this._openAndNotClosed()) ra._read(this)
              break

            case 2:
              if (this._openAndNotClosed()) ra._write(this)
              break

            case 3:
              if (this._openAndNotClosed()) ra._del(this)
              break

            case 4:
              if (this._openAndNotClosed()) ra._stat(this)
              break

            case 5:
              if (ra.closed || !ra.opened) nextTick(this, null)
              else ra._close(this)
              break

            case 6:
              if (ra.destroyed) nextTick(this, null)
              else ra._destroy(this)
              break
          }

          this._sync = false
        }

        function queueAndRun(self, req) {
          self._queued.push(req)
          if (!self._pending) req._run()
        }

        function openWritable(self) {
          if (self.preferReadonly) {
            self._needsOpen = true
            self.preferReadonly = false
          }
        }

        function defaultImpl(err) {
          return overridable

          function overridable(req) {
            nextTick(req, err)
          }
        }

        function nextTick(req, err, val) {
          process.nextTick(nextTickCallback, req, err, val)
        }

        function nextTickCallback(req, err, val) {
          req.callback(err, val)
        }

      }).call(this, require('_process'))
    }, {"_process": 4, "events": 9, "inherits": 13}],
    32: [function (require, module, exports) {
      var varint = require('varint')
      exports.encode = function encode(v, b, o) {
        v = v >= 0 ? v * 2 : v * -2 - 1
        var r = varint.encode(v, b, o)
        encode.bytes = varint.encode.bytes
        return r
      }
      exports.decode = function decode(b, o) {
        var v = varint.decode(b, o)
        decode.bytes = varint.decode.bytes
        return v & 1 ? (v + 1) / -2 : v / 2
      }

      exports.encodingLength = function (v) {
        return varint.encodingLength(v >= 0 ? v * 2 : v * -2 - 1)
      }

    }, {"varint": 35}],
    33: [function (require, module, exports) {
      arguments[4][18][0].apply(exports, arguments)
    }, {"dup": 18}],
    34: [function (require, module, exports) {
      arguments[4][19][0].apply(exports, arguments)
    }, {"dup": 19}],
    35: [function (require, module, exports) {
      arguments[4][20][0].apply(exports, arguments)
    }, {"./decode.js": 33, "./encode.js": 34, "./length.js": 36, "dup": 20}],
    36: [function (require, module, exports) {
      arguments[4][21][0].apply(exports, arguments)
    }, {"dup": 21}],
    37: [function (require, module, exports) {
// Returns a wrapper function that returns a wrapped callback
// The wrapper function should do some stuff, and return a
// presumably different callback function.
// This makes sure that own properties are retained, so that
// decorations and such are not lost along the way.
      module.exports = wrappy

      function wrappy(fn, cb) {
        if (fn && cb) return wrappy(fn)(cb)

        if (typeof fn !== 'function')
          throw new TypeError('need wrapper function')

        Object.keys(fn).forEach(function (k) {
          wrapper[k] = fn[k]
        })

        return wrapper

        function wrapper() {
          var args = new Array(arguments.length)
          for (var i = 0; i < args.length; i++) {
            args[i] = arguments[i]
          }
          var ret = fn.apply(this, args)
          var cb = args[args.length - 1]
          if (typeof ret === 'function' && ret !== cb) {
            Object.keys(cb).forEach(function (k) {
              ret[k] = cb[k]
            })
          }
          return ret
        }
      }

    }, {}],
    38: [function (require, module, exports) {
      (function (Buffer) {
        const {RAN, NoopTransport, RasBridge} = require('random-access-network')
        var randomAccess = require('random-access-storage')
        const RPC = require('frame-rpc')

        const ANY_ORIGIN = '*'

        class Client {
          /**
           * Creates the client for frame-rpc for reading dat content
           * @param {Window} window The window the client is running in
           * @param {Window} server The window the parent of the service is running in
           */
          constructor(window, server) {
            this._rpc = RPC(window, server, ANY_ORIGIN, this._methods())
          }

          getStorage() {
            return (name) => {
              return RAN(name, new RPCTransport(name, this._rpc))
            }
          }

          selectArchive(options, callback) {
            this._rpc.call('selectArchive', options, callback)
          }

          addArchive(key, secretKey, options, callback) {
            this._rpc.call('addArchive', key, secretKey, options, callback)
          }

          _methods() {
            return {
              // Client doesn't provide any methods
            }
          }
        }

        class Server {
          /**
           * Creates the server for frame-rpc for serving dat content
           * @param {Window} window  The window serving the content
           * @param {Window} client  The child window using the service
           * @param {Object} options Should contain `storage`, `selectArchive`, and `addArchive` implementations
           */
          constructor(window, client, options) {
            Object.assign(this, options)
            this._wrapStorage()
            this._rpc = RPC(window, client, ANY_ORIGIN, this._methods())
            this._bridge = RasBridge((name) => this._getStorage(name))
          }

          _wrapStorage() {
            const rawStorage = this.storage

            this.storage = (name) => {
              const access = rawStorage(name)
              return randomAccess({
                open: (request) => {
                  access.open(request.callback.bind(request))
                },
                read: (request) => {
                  access.read(request.offset, request.size, request.callback.bind(request))
                },
                write: (request) => {
                  access.write(request.offset, request.data, request.callback.bind(request))
                },
                del: (request) => {
                  access.del(request.offset, request.size, request.callback.bind(request))
                },
                close: (request) => {
                  access.close(request.callback.bind(request))
                },
                destroy: (request) => {
                  access.destroy(request.callback.bind(request))
                }
              })
            }
          }

          _getStorage(name) {
            const storage = this.storage(name)
            return storage
          }

          _methods() {
            return {
              selectArchive: (options, callback) => {
                this.selectArchive(options, callback)
              },
              addArchive: (key, secretKey, options, callback) => {
                this.addArchive(key, secretKey, options, callback)
              },
              storage: (name, request, callback) => {
                this._bridge(Buffer.from(request), callback)
              }
            }
          }
        }

        class RPCTransport extends NoopTransport {
          constructor(name, rpc) {
            super(name)
            this._rpc = rpc
          }

          send(request) {
            this._rpc.call('storage', this._name, request, (response) => {
              this._next(Buffer.from(response))
            })
          }

          close() {
            // ¯\_(ツ)_/¯
          }
        }

        module.exports = {
          Client: Client,
          Server: Server
        }

      }).call(this, require("buffer").Buffer)
    }, {"buffer": 8, "frame-rpc": 10, "random-access-network": 27, "random-access-storage": 31}],
    "graceful-fs": [function (require, module, exports) {

    }, {}]
  }, {}, [1])("graceful-fs")
});
