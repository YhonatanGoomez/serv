
const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  id: Number,
  user: String,
  name: String,
  address: String,
  status: String,
  material: String,
  quantity: Number,
  completedQuantity: Number
});

const Offer = mongoose.model("Offer", offerSchema);

module.exports = Offer;