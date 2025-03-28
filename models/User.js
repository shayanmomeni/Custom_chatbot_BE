const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  fullName: {
    type: String,
    required: true,
  },
  assessmentAnswers: {
    type: [String],
    default: [],
  },
  selectedAspects: {
    type: [String],
    default: [],
  },
  imagesUploaded: {
    type: Boolean,
    default: false,
  },
  assessment_aspect_completed: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('User', UserSchema);