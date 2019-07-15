const config = require('./config');
const mongoose = require('mongoose');
let options = {
  useCreateIndex: true,
  useNewUrlParser: true
};

mongoose.connect(config.URI, options, ()=>{
  console.log('====================================');
  console.log("mongoDb connected!")
  console.log('====================================');
});

module.exports = mongoose;
