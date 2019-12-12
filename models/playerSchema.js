const { Schema } = require('mongoose')
const cardSchema = require('./cardSchema')

const playerSchema = new Schema(
  {
    username: {
      type: String,
      required: true
    },
    cards: [cardSchema]
  },
  { id: false, versionKey: false }
)

module.exports = playerSchema
