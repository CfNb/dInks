const mongoose = require('mongoose');

const scrapeSchema = new mongoose.Schema({
  date: {
    type: Date,
    "default": Date.now
  },
  c_name: String,
  c_cmyk: [Number],
  c_rgb: [Number],
  c_hex_html: String,
  xgc_name: String,
  xgc_cmykogv: [Number],
  xgc_rgb: [Number],
  xgc_hex_html: String
})

const colorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  kind: {
    type: String,
    required: true,
    trim: true
  },
  recommendOrange: {
    type: Boolean,
    'default': false
  },
  recommendGreen: {
    type: Boolean,
    'default': false
  },
  recommendViolet: {
    type: Boolean,
    'default': false
  },
  scrapeData: scrapeSchema
});

mongoose.model('Color', colorSchema);