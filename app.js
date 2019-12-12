if (process.env.NODE_ENV === 'development') require('dotenv').config()
const app = require('express')()
const server = require('http').createServer(app)
const io = require('socket.io')(server)
const PORT = process.env.PORT || 3000
const Card = require('./models/Card')

require('./config/mongoose')

server.listen(PORT, () => console.log('app listening to port', PORT))

const rooms = {
  dummy: {
    player1: {
      username: 'x',
      health: 8000
    },
    player2: {
      username: 'y',
      health: 8000
    },
    player1Cards: [],
    player2Cards: []
  }
}

const users = {
  x: 'dummy'
}

io.on('connection', socket => {
  function joinRoom(roomName, username) {
    if (rooms[roomName].player1.username == username) {
      socket.join(roomName)
      setRoom(roomName, username)
      // socket.emit('SET_CARDS', rooms[roomName].player1.cards)
    } else if (!rooms[roomName].player2) {
      rooms[roomName].player2 = { username, healt: 8000 }
      socket.join(roomName)
      setRoom(roomName, username)
      // socket.emit('SET_CARDS', rooms[roomName].player1Cards)
    } else if (rooms[roomName].player2.username == username) {
      socket.join(roomName)
      setRoom(roomName, username)
      // socket.emit('SET_CARDS', rooms[roomName].player2Cards)
    } else socket.emit('error', 'Room already full!')
  }

  function setRoom(roomName, username) {
    if (rooms[roomName].player1.username == username)
      socket.emit('SET_ROOM', { ...rooms[roomName], player2Cards: undefined })
    else if (rooms[roomName].player2.username == username)
      socket.emit('SET_ROOM', { ...rooms[roomName], player1Cards: undefined })
  }

  socket.on('register-user', username => {
    if (users[username]) socket.emit('error', 'Username already taken!')
    else {
      users[username] = ''
      socket.emit('SET_USER', username)
    }
  })

  socket.on('reconnect', username => {
    if (users[username]) {
      if (users[username] == '') socket.emit('SET_USER', username)
      else {
        joinRoom(users[username], username)
      }
    } else socket.emit('error', 'No Username!')
  })

  socket.on('fetch-rooms', () => {
    socket.emit('SET_ROOM_LIST', Object.keys(rooms))
  })

  socket.on('create-room', (roomName, username) => {
    if (rooms[roomName])
      socket.emit('error', `Room with name ${roomName} already created!`)
    else {
      rooms[roomName] = {
        player1: {
          username,
          health: 8000
        },
        player1Cards: [],
        player2Cards: []
      }
      socket.broadcast.emit('SET_ROOM_LIST', rooms)
      joinRoom(roomName, username)
    }
  })

  socket.on('join-room', joinRoom)

  socket.on('get-cards', (roomName, cardSetOf, currentCards) => {
    Card.find()
      .then(cards => {
        rooms[roomName][cardSetOf] = currentCards
        for (let i = 0; i < 5 - currentCards; i++) {
          rooms[roomName][cardSetOf].push(
            cards[Math.floor(Math.random() * cards.length)]
          )
        }
        socket.emit('SET_CARDS', rooms[roomName][cardSetOf])
      })
      .catch(err => console.log(err))
  })

  // socket.on('on-turn', (roomName, roomData))
})

// const room = {
//   players: [
//     {
//       username,
//       cards: [
//         {
//           name,
//           img,
//           dmg
//         }
//       ],
//       health
//     }
//   ]
// }
