const net = require('net');
const debug = require('debug')('app:server');
const fs = require('fs');
const path = require('path');

const server = net.createServer(function(socket){

	socket.on('data', function(data){

		var cmd = data.toString().replace(/(\r?\n)+$/, '');
		debug('receive command: %s', cmd);

		if(cmd === 'file') {
			return sendFile(socket, '/Users/magicdawn/Downloads/soft/sourcetree.dmg');
		}

	});
});

function sendFile(socket, file){
	file = path.resolve(file);
	var basename = path.basename(file);
	debug('sending: %s', basename);

	var header = JSON.stringify({
		size: fs.statSync(file).size,
		filename: basename
	});
	socket.write(`---file${ header }file---\n`);

	// file
	var f = fs.createReadStream(file);
	f.pipe(socket, { end: false });
	f.on('end', function(){
		f.unpipe(socket);
		socket.write('\n\n');
	});
}


server.listen(9000);