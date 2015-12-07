var app = require('http').createServer(handler)
var io = require('socket.io')(app);
var fs = require('fs');

function handler (req, res) {
  fs.readFile(__dirname + '/index.html',
  function (err, data) {
    if (err) {
      res.writeHead(500);
      return res.end('Error loading index.html');
    }

    res.writeHead(200);
    res.end(data);
  });
}

app.listen(8181);

var slaves = {};
var masters = {};

io.on('connection', function (socket) {
  socket.emit('exec', { exec: 'socket.emit("identifier", {"identifier" : window.identifier, "connectionType" : window.connectionType})' });
  socket.on('identifier', function (data) {
    if(data.connectionType == 2) {
      masters[socket.id] = {"identifier" : data.identfier, "socket" : socket};
    } else {
      slaves[socket.id] = {"identifier" : data.identfier, "socket" : socket};
    }
    allClients();
  });

  socket.on('console', function(data) {
    broadCastToMasters(socket.id, data, 'console');
  });
  socket.on('sendCommand', function(data) {
    for(var i = 0; i < data.slaves.length; i++) {
      slaves[data.slaves[i]].socket.emit("execWithReturn", {"exec" : data.exec});
    }
  });
  socket.on('returnValue', function(data) {
    broadCastToMasters(socket.id, data, 'returnValue');
  });
  function allClients() {
    var clients = [];
    for(var k in slaves) clients.push(k);

    for(var k in masters) {
      masters[k].socket.emit("allClients", {"clients" : clients});
    }
  }
  function broadCastToMasters(id, data, name) {
    for(var k in masters) {
      masters[k].socket.emit("slaveMessage", {"slave" : id, "data" : data, "name" : name});
    }
  }
  socket.on('disconnect', function() {
    delete masters[socket.id];
    delete slaves[socket.id];
    allClients();
  });
});
