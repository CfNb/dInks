const express = require('express');
const router = express.Router();
const ctrlColors = require('../controllers/api_c_colors');


router.route('/color/addpantones')
  .post(ctrlColors.colorAddPantones); // adds pantones, scraping info

router.route('/color/addpantonerange')
  .post(ctrlColors.colorAddPantoneRange); // adds pantone range, scraping info

router.route('/color')
  .get(ctrlColors.colorReadAll) // get list of all colors
  .post(ctrlColors.colorCreate); // create a new color

router.route('/color/:colorID')
  .put(ctrlColors.colorUpdate) // update an existing color
  .delete(ctrlColors.colorDelete); // delete a color

router.get('/color/list', ctrlColors.colorReadList);

module.exports = router;