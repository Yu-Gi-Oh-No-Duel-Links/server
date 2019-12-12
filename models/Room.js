const { Schema, model } = require('mongoose')
const playerSchema = require('./playerSchema')

const roomSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  player1: { playerSchema },
  player2: { playerSchema }
})

const Room = model('Room', roomSchema)

module.exports = Room
