// Connect to the database
var mongoose = require('mongoose');
var auth = require("./hidden/auth"); // get credentials

/** Connect to Mongo */
var mongo_opts = { keepalive: 1 };
var db = mongoose.createConnection(auth.mongo.uri, mongo_opts);

/** Configure Schemas */
var Schema = mongoose.Schema;
var ObjectId = Schema.Types.ObjectId;

var messageSchema = new Schema({
  _id: { type: ObjectId, auto: true },
  name: String,
  message: String,

  date: { type: Date, default: Date.now }
});

/** Create Models from Schemas */
var models = {
  Message: db.model('Message', messageSchema)
}

var wsPattern = /^\s*$/;

var port = 40223;
var io = require('socket.io').listen(port).sockets;;

/** Users Store */
var users = [];
var topics = {Default: [], Football: [], Basketball: []};

function Room(cat) {
  this.limit = 3;
  this.cat = cat;
  this.users = [];
  this.mem = [];
  this.memLimit = 5;
}

function User(socket) {
  this.socket = socket;
  this.room = null;
}

db.on('error', console.log.bind(console, 'db connection error:'));

db.once('open', function () {
  console.log("Connected to DataBase");

  io.on('connection', function(socket) {
    var user = new User(socket);
    users.push(user);
    console.log('User Connected. ['+users.length+']');

    io.emit('status', {
      status: 'New User! Users online: ' + users.length
    });

    socket.on('join', function(data) {
      console.log('join: ' + data.topic);

      var t = data.topic;
      var rooms = topics[t];
      if (!rooms) {
        socket.emit('status', {
          status: "No valid topic selected."
        });
      } else {
        // remove user from current room
        if (user.room) {
          var i = user.room.users.indexOf(user);
          user.room.users.splice(i, 1);
        }

        var found = false;
        for (var i = 0; i < rooms.length; i++) {
          var room = rooms[i];
          if (room.users.length < room.limit) {
            room.users.push(user);
            user.room = room;
            found = true;
            break;
          }
        }
        if (!found) {
          // rooms were full or didn't exist
          // -> create a new empty room
          var room = new Room(t);
          rooms.push(room);
          room.users.push(user);
          user.room = room;
        }

        // send status info message
        for (var i = 0; i < user.room.users.length; i++) {
          var u = user.room.users[i];
          u.socket.emit('status', {
            status: 'A User joined the room. ' +
                    'Users in this room [' + user.room.users.length +
                    ']. User limit [' + user.room.limit + ']'
          });
        }

        // send recent history to joining user
        for (var i = 0; i < user.room.mem.length; i++) {
          var data = user.room.mem[i];
          user.socket.emit('message', {
            from: data.name,
            message: data.message
          });
        }
      }
    });

    socket.on('message', function(data) {
      if (wsPattern.test(data.message) || wsPattern.test(data.name)) {
        // invalid message
        console.log('Invalid Message');
        socket.emit('status', {
          status: "Name and Message required."
        });
      } else {
        console.log('Message Received. ('+socket.room+')');
        // accept the message
        var msg = new models.Message(data);
        msg.save(function(err, doc) {
          if (err) {
            console.log("Error couldn't save message.");
            return socket.emit('status', {
              status: "Error saving message to the database."
            });
          }

          // broadcast to everyone in the same room
          var room = user.room;
          if (!room) {
            return user.socket.emit('status', {
              status: 'You must join a room before sending a message.'
            });
          }

          room.mem.push(data);
          if (room.mem.length > room.memLimit) {
            room.mem.splice(0, 1);
          }

          for (var i = 0; i < room.users.length; i++) {
            var u = room.users[i];
            u.socket.emit('message', {
              from: data.name,
              message: data.message,
              id: doc._id
            });
          }

          console.log('Message saved into database.');
        });
      }
    });

    socket.on('disconnect', function () {
      if (user.room) {
        var i = user.room.users.indexOf(user);
        user.room.users.splice(i, 1);
        for (var i = 0; i < user.room.users.length; i++) {
          var u = user.room.users[i];
          u.socket.emit('status', {
            status: 'A User has left the room. ' +
                    'Users in this room [' + user.room.users.length +
                    ']. User limit [' + user.room.limit + ']'
          });
        }
      }

      var i = users.indexOf(user);
      users.splice(i, 1);

      console.log('User disconnected. ['+users.length+']');

      io.emit('status', {
        status: 'User disconnected. Users online: ' + users.length
      });
    });

  }); // on connection

});

