const express = require('express');
const socketio = require('socket.io');
const http = require('http');
const cors = require('cors');

const { addUser, removeUser, getUser, getUserInRoom } = require('./users');

const PORT = process.env.PORT || 5000;

const router = require('./router');

const app = express();
const server = http.createServer(app);
const io = socketio(server, { cors: true });

app.use(cors());
app.use(router);

io.on('connection', socket => {
	socket.on('join', ({ name, room }, callback) => {
		const { error, user } = addUser({ id: socket.id, name, room });

		if (error) return callback(error);

		socket.emit('message', {
			user: '管理员',
			text: `${user.name},欢迎来到 ${user.room} 聊天室`,
		});

		socket.broadcast
			.to(user.room)
			.emit('message', { user: '管理员', text: `${user.name} 加入聊天` });

		socket.join(user.room);

		io
			.to(user.room)
			.emit('roomData', { room: user.room, user: getUserInRoom(user.room) });

		callback();
	});

	socket.on('sendMessage', (message, callback) => {
		const user = getUser(socket.id);

		io.to(user.room).emit('message', { user: user.name, text: message });
		io
			.to(user.room)
			.emit('roomData', { room: user.room, user: getUserInRoom(user.room) });

		callback();
	});

	socket.on('disconnect', () => {
		const user = removeUser(socket.id);

		if (user) {
			io
				.to(user.room)
				.emit('message', { user: '管理员', text: `${user.name} 已经离开聊天室` });
		}
	});
});

server.listen(PORT, () => console.log(`Server has started on port ${PORT}`));
