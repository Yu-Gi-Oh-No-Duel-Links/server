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
// app.post('/fetchimages', upload.single(''))
// app.use(express.json({ limit: '10mb' }))
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
      health: 4000,
      image: ''
    },
    player1Cards: [],
    player2Cards: []
  }
}

const users = {
  x: 'dummy'
}

const usersImage = {
  x: 'url'
}

const turnData = {
  dummy: {}
}

io.on('connection', socket => {
  function joinRoom(roomName, username) {
    if (
      rooms[roomName].player1 &&
      rooms[roomName].player1.username == username
    ) {
      users[username] = roomName
      socket.join(roomName)
      console.log(`User ${username} join room ${roomName}`)
      socket.emit('SET_ROOM_NAME', roomName)
    } else if (
      rooms[roomName].player2 &&
      rooms[roomName].player2.username == username
    ) {
      users[username] = roomName
      socket.join(roomName)
      console.log(`User ${username} join room ${roomName}`)
      socket.emit('SET_ROOM_NAME', roomName)
    } else if (!rooms[roomName].player1) {
      users[username] = roomName
      rooms[roomName].player1 = {
        username,
        health: 4000,
        image: usersImage[username]
      }
      socket.join(roomName)
      console.log(`User ${username} join room ${roomName}`)
      socket.emit('SET_ROOM_NAME', roomName)
    } else if (!rooms[roomName].player2) {
      users[username] = roomName
      rooms[roomName].player2 = {
        username,
        health: 4000,
        image: usersImage[username]
      }
      socket.join(roomName)
      console.log(`User ${username} join room ${roomName}`)
      socket.emit('SET_ROOM_NAME', roomName)
    } else
      socket.emit('ERROR', {
        name: 'RoomFull',
        message: 'Room already full!'
      })
  }

  function setRoom(roomName, username) {
    const room = rooms[roomName]
    io.to(roomName).emit('SET_ROOM', {
      player1: room.player1,
      player2: room.player2
    })
    if (room.player1 && room.player1.username == username)
      socket.emit('SET_CARDS', room.player1Cards)
    else if (room.player2 && room.player2.username == username)
      socket.emit('SET_CARDS', room.player2Cards)
  }

  socket.on('register-user', (username, image) => {
    if (users[username] !== undefined)
      socket.emit('ERROR', {
        name: 'DuplicateUser',
        message: 'Username already taken!'
      })
    else {
      users[username] = ''
      usersImage[username] = image
      socket.emit('SET_USER', username)
      console.log('New User registered:', username)
    }
  })

  socket.on('reconnect-user', username => {
    if (users[username] !== undefined) {
      console.log('User', username, 'reconnecting')
      socket.emit('SET_USER', username)
      if (users[username] != '') joinRoom(users[username], username)
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
          health: 4000,
          image: usersImage[username]
        },
        player1Cards: [],
        player2Cards: []
      }
      turnData[roomName] = {}
      console.log('New room created:', roomName)
      io.emit('SET_ROOM_LIST', Object.keys(rooms))
      joinRoom(roomName, username)
    }
  })

  socket.on('join-room', joinRoom)

  socket.on('get-room-data', setRoom)

  socket.on('get-cards', (roomName, as, currentCards) => {
    if (rooms[roomName])
      Card.find()
        .then(cards => {
          rooms[roomName][as + 'Cards'] = [...currentCards]
          for (let i = 0; i < 5 - currentCards.length; i++) {
            rooms[roomName][as + 'Cards'].push(
              cards[Math.floor(Math.random() * cards.length)]
            )
          }
          socket.emit('SET_CARDS', rooms[roomName][as + 'Cards'])
        })
        .catch(err => console.log(err))
  })

  socket.on('leave-room', (roomName, username) => {
    if (rooms[roomName]) {
      if (
        rooms[roomName].player1 &&
        rooms[roomName].player1.username == username
      ) {
        socket.leaveAll()
        rooms[roomName].player1 = undefined
        rooms[roomName].player1Cards = []
        users[username] = ''
        console.log('User', username, 'leave room', roomName)
      } else if (
        rooms[roomName].player2 &&
        rooms[roomName].player2.username == username
      ) {
        socket.leaveAll()
        rooms[roomName].player2 = undefined
        rooms[roomName].player2Cards = []
        users[username] = ''
        console.log('User', username, 'leave room', roomName)
      } else
        socket.emit('ERROR', {
          name: 'Error',
          message: 'User not in the room!'
        })

      if (!rooms[roomName].player1 && !rooms[roomName].player2) {
        delete rooms[roomName]
        console.log('All players have left. Room', roomName, 'destroyed')
        io.emit('SET_ROOM_LIST', Object.keys(rooms))
      } else setRoom(roomName, username)
    }

    socket.emit('CLEAR_ROOM_DATA')
  })

  socket.on('on-turn', (roomName, as, cardSelected) => {
    if (Object.keys(turnData[roomName]).length > 0) {
      console.log(`Room: ${roomName}. Waiting player exist. Start battle!`)
      turnData[roomName][as] = cardSelected
      const player1 = turnData[roomName].player1
      const player2 = turnData[roomName].player2

      const result = player1.atk - player2.atk
      if (result > 0) rooms[roomName].player2.health -= Math.abs(result)
      else if (result < 0) rooms[roomName].player1.health -= Math.abs(result)
      rooms[roomName].player1Cards = rooms[roomName].player1Cards.filter(
        card => card.name != turnData[roomName].player1.name
      )
      rooms[roomName].player2Cards = rooms[roomName].player2Cards.filter(
        card => card.name != turnData[roomName].player2.name
      )

      turnData[roomName] = {}
      io.to(roomName).emit('TURN_DONE')
    } else {
      console.log(`Room: ${roomName}. Waiting for other player...`)
      turnData[roomName][as] = cardSelected
      socket.emit('WAIT_OTHER_PLAYER')
    }
  })

  socket.on('game-end', (roomName, username) => {
    delete rooms[roomName]
    delete turnData[roomName]
    users[username] = ''
    console.log('Game on room', roomName, 'ends')
    io.to(roomName).emit('CLEAR_ROOM_DATA')
    socket.leaveAll()
  })
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
