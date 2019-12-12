if (process.env.NODE_ENV === 'development') require('dotenv').config()
const express = require('express')
const app = express()
const cors = require('cors')
const Card = require('./models/Card')

// const upload = require('gcs-upload')({
//   gcsConfig: {
//     keyFilename: process.env.GOOGLE_KEYFILE_PATH || './keyfile.json',
//     bucketName: 'aliftaufik-hacktiv8-buckets'
//   }
// })

app.use(cors())
// app.use(express.urlencoded({ extended: false }))
// app.use(express.json({ limit: '10mb' }))
// app.post('/fetchimages', upload.single(''))
// app.post('/fetchdata', (req, res, next) => {
//   const rawCards = req.body
//   Card.create(
//     ...rawCards.map(card => {
//       const { name, atk, def } = card
//       return {
//         name,
//         atk,
//         def,
//         image: card.card_images[0].image_url,
//         imageSmall: card.card_images[0].image_url_small
//       }
//     })
//   )
//     .then(cards => {
//       res.status(201).json(cards.length)
//     })
//     .catch(err => console.log(err))
// })

const server = require('http').createServer(app)
const io = require('socket.io')(server)
const PORT = process.env.PORT || 3000

// io.use(cors())

require('./config/mongoose')

server.listen(PORT, () => console.log('app listening to port', PORT))

const rooms = {
  dummy: {
    player1: {
      username: 'x',
      health: 4000
    },
    player2: {
      username: 'y',
      health: 4000
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
      socket.emit('SET_ROOM_NAME', roomName)
    } else if (!rooms[roomName].player2) {
      rooms[roomName].player2 = { username, healt: 4000 }
      socket.join(roomName)
      socket.emit('SET_ROOM_NAME', roomName)
    } else if (rooms[roomName].player2.username == username) {
      socket.join(roomName)
      socket.emit('SET_ROOM_NAME', roomName)
    } else
      socket.emit('ERROR', { name: 'RoomFull', message: 'Room already full!' })
  }

  function setRoom(roomName, username) {
    const room = rooms[roomName]
    io.to(roomName).emit('SET_ROOM', {
      player1: room.player1,
      player2: room.player2
    })
    if (rooms[roomName].player1.username == username)
      socket.emit('SET_CARDS', room.player1Cards)
    else if (rooms[roomName].player2.username == username)
      socket.emit('SET_CARDS', room.player2Cards)
  }

  socket.on('register-user', username => {
    if (users[username] !== undefined)
      socket.emit('ERROR', {
        name: 'DuplicateUser',
        message: 'Username already taken!'
      })
    else {
      users[username] = ''
      socket.emit('SET_USER', username)
      console.log('New User registered:', username)
    }
  })

  socket.on('reconnect-user', username => {
    if (users[username] !== undefined) {
      console.log('User', username, 'reconnecting')
      if (users[username] == '') socket.emit('SET_USER', username)
      else {
        joinRoom(users[username], username)
      }
    } else
      socket.emit('ERROR', { name: 'UsernameNoexist', message: 'No Username!' })
  })

  socket.on('fetch-rooms', () => {
    socket.emit('SET_ROOM_LIST', Object.keys(rooms))
  })

  socket.on('create-room', (roomName, username) => {
    if (rooms[roomName])
      socket.emit('ERROR', {
        name: 'DuplicateRoom',
        message: `Room with name "${roomName}" already created!`
      })
    else {
      rooms[roomName] = {
        player1: {
          username,
          health: 4000
        },
        player1Cards: [],
        player2Cards: []
      }
      console.log('New room created:', roomName)
      io.emit('SET_ROOM_LIST', Object.keys(rooms))
      joinRoom(roomName, username)
    }
  })

  socket.on('join-room', joinRoom)

  socket.on('get-room-data', setRoom)

  socket.on('get-cards', (roomName, cardSetOf, currentCards) => {
    Card.find()
      .then(cards => {
        rooms[roomName][cardSetOf] = [...currentCards]
        for (let i = 0; i < 5 - currentCards.length; i++) {
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
