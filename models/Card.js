const { model } = require('mongoose')
const cardSchema = require('./cardSchema')

const Card = model('Card', cardSchema)

module.exports = Card
