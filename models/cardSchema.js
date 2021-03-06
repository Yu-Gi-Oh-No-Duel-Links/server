const { Schema } = require('mongoose')

const cardSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  image: {
    type: String,
    required: true
  },
  imageSmall: {
    type: String,
    required: true
  },
  atk: {
    type: Number,
    required: true,
    default: 0
  },
  def: {
    type: Number,
    required: true,
    default: 0
  }
})

module.exports = cardSchema
