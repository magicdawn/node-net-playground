var net = require('net');
var socket = net.connect(9000);
var stream = require('stream');
var debug = require('debug')('app:client');
var fs = require('fs');
var path = require('path');

socket.on('connect', function() {
  console.log('connected');
  socket.write('file');
});

socket.on('data', function(chunk) {

  // debug('on data, chunk len = %s', chunk.length);

  if (!socket.receivingFile) {
    var start;
    if (start = chunk.indexOf('---file') > -1) {
      var end = chunk.indexOf('file---\n', start + 6); // 到第一个换行
      if (end === -1) return;

      var meta = chunk.slice(start + 6, end).toString('utf8');
      meta = JSON.parse(meta);
      debug('receive: %j', meta);

      socket.receivingFile = true;
      var fileStream = fs.createWriteStream(__dirname + '/ignore/receive/' + meta.filename);

      // now
      var content = chunk.slice(end + 8);
      var len = content.length;
      if(len > 0){
        debug('writing first %s bytes, first chunk len = %s', len, chunk.length);
        fileStream.write(content);
      }

      // left
      if (len < meta.size) {
        var transform = stream.Transform({
          transform: function(chunk, enc, cb) {
            if (len + chunk.length < meta.size) {
              len += chunk.length;
              this.push(chunk);
              cb();
            } else {
              this.push(chunk.slice(0, meta.size - len));
              
              socket.unpipe(transform);
              this.push(null);
              socket.receivingFile = false;

              cb();
            }
          }
        });

        socket.pipe(transform);
        transform.pipe(fileStream);
      }
    }
  }
});