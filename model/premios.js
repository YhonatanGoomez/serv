
const mongoose = require('mongoose');

const premioSchema = new mongoose.Schema({
  nombre: String,
  puntaje: Number
});

const Premio = mongoose.model("Premio", premioSchema);

module.exports = Premio;