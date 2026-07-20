const mongoose = require("mongoose");

async function connectDatabase(mongoUri) {
  await mongoose.connect(mongoUri);
}

module.exports = {
  connectDatabase,
};
