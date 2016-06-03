var net = require('net');
var socket = net.connect(9000);
var stream = require('stream');
var debug = require('debug')('app:client');
var fs = require('fs');
var path = require('path');
var _ = require('lodash');

socket.on('connect', function() {
  console.log('connected');
  socket.write('file HELLO.txt');
});

socket.on('data', function(chunk) {

  // debug
  if(!this.IS_RECEIVING_FILE){
    if(chunk.length < 10){
      debug('on data, chunk len = %s, chunk = %s', chunk.length, _.trim(chunk.toString()));
    } else {
      debug('on data, chunk len = %s', chunk.length);
    }
  }
    

  if (!socket.IS_RECEIVING_FILE) {
    var start;
    if (start = chunk.indexOf('---file') > -1) {
      var end = chunk.indexOf('file---\n', start + 6); // 到第一个换行
      if (end === -1) return;

      var meta = chunk.slice(start + 6, end).toString('utf8');
      meta = JSON.parse(meta);
      debug('receive: %j', meta);

      // receive
      var content = chunk.slice(end + 8);
      socket.IS_RECEIVING_FILE = true;
      receiveFile(socket, meta, chunk, content, function(){
        socket.resume();
        socket.write('file HELLO2.txt');
      });
    }
  }
});

function receiveFile(socket, meta, chunk, content, callback){

  // create file
  var fileStream = fs.createWriteStream(__dirname + '/public/receive/' + meta.filename);

  var len = (content && content.length) || 0;
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
          socket.IS_RECEIVING_FILE = false;
          this.push(null);
          debug('finish writing file');
          callback && process.nextTick(callback);

          cb();
        }
      }
    });

    socket.pipe(transform);
    transform.pipe(fileStream);
  }
}