const mongoose = require('mongoose');

/**
 * Validates if a given string is a valid MongoDB ObjectId
 * @param {string} id - The ID to validate
 * @returns {boolean} - Returns true if the ID is valid, false otherwise
 */
const isValidMongoId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

module.exports = isValidMongoId; 