const mongoose = require('mongoose');
var request = require('request');
var cheerio = require('cheerio'); // used in scraping recieved html

const col = mongoose.model('Color');

// GET request, returns all colors
const colorReadAll = function (req, res) {
  col
    .find({})
    .exec((err, colors) => {
      if (err) {
        res.status(404).json(err);
        return;
      }
      res.status(200).json(colors);
    })
};

// GET request, returns specified color data
const colorReadList = function (req, res){
  let queries = [];
  if (!req.query.c) {
    res.status(400).json({"message": "no colors requested"});
    return
  } else if (!Array.isArray(req.query.c)) {
    queries.push(req.query.c)
  } else {
    queries = req.query.c;
  }

  console.log(queries);
  
  // generate regex queries, for case insensitive search
  for (let i = 0; i < queries.length; i++) {
    queries[i] = new RegExp('^' + queries[i] + '$', "i");
  }
  
  col
    .find({ name: {$in: queries} })
    .exec((err, colors) => {
      if (err) {
        
        console.log(":(");
        res.status(404).json(err);
        return;
      }
      res.status(200).json(colors);
  })
};

// POST request, adds new color, returns created color
const colorCreate = function (req, res) {
  
  //console.log(req);
  
  col
    .create({
      name: req.body.name,
      kind: req.body.kind,
      recommendOrange: req.body.recommendOrange,
      recommendGreen: req.body.recommendGreen,
      recommendViolet: req.body.recommendViolet
    }, (err, color) => {
      if (err) {
        res.status(400).json(err);
      } else {
        res.status(201).json(color);
      }
    });
};

// POST request, adds given range of pantones, scraping web, returns created colors
const colorAddPantoneRange = function (req, res) {
  let o = {
    json: {},
    jsonArr: [],
    begin: req.body.begin,
    end: req.body.end,
    numArr: []
  };

  for (let i = o.begin; i <= o.end; i++) {
    o.numArr.push(i);
  }
  
  scrapeCMYK(o, function (jsonArr) {
    if (!jsonArr.error) {
      let newColors = [];
      for (let i = 0; i < jsonArr.length; i++) {
        const scraped = jsonArr[i];
        newColors[i] = {
          name: scraped.c_name.slice(0, -2),
          kind: "PANTONE",
          scrapeData: scraped
        }
      }
      col
        .create(newColors,
          (err, colors) => {
            if (err) {
              res.status(400).json(err);
            } else {
              res.status(201).json(colors);
            }
          });
    } else {
      res.status(404).json({
        message: jsonArr.message
      });
    }
  });
};

// POST request, adds given pantones, scraping web, returns created colors
// NOTE THAT THERE IS NO CHECK IN API FOR EXISTING COLORS, DUPLICATES WILL BE CREATED...
const colorAddPantones = function (req, res) {
  let o = {
    json: {},
    jsonArr: [],
    numArr: req.body.number
  };
  // make sure numArr is array:
  if (!Array.isArray(o.numArr)) {o.numArr = [o.numArr]}
  // format text names with "-" instead of spaces for correct urls:
  o.numArr = o.numArr.map(x => x.replace(/ /g, '-'));
  scrapeCMYK(o, function (jsonArr) {
    if (!(jsonArr.length === 0)) {
      let newColors = [];
      for (let i = 0; i < jsonArr.length; i++) {
        const scraped = jsonArr[i];
        newColors[i] = {
          name: scraped.c_name.slice(0, -2),
          kind: "PANTONE",
          scrapeData: scraped
        }
      }
      col
        .create(newColors,
          (err, colors) => {
            if (err) {
              res.status(400).json(err);
            } else {
              res.status(201).json(colors);
            }
          });
    } else {
      res.status(404).json({
        message: 'no pantones added'
      });
    }
  });
};

const scrapeCMYK = function(o, callback) {
  o.pantone = o.numArr[0];
  const url = 'http://www.pantone.com/color-finder/' + o.pantone + '-C';
  o.numArr.shift(); // remove 1st # from numArr
  o.json = {};
  request(url, function (error, response, body) {
    scrapReq(error, response, body, false, o, callback)
  })
};

const scrapeOGV = function(o, callback) {
  const url = 'http://www.pantone.com/color-finder/' + o.pantone + '-XGC';
  request(url, function (error, response, body) {
    scrapReq(error, response, body, true, o, callback)
  });
}

const scrapReq = function (error, response, body, ogvBool, o, callback) {
  // First we'll check to make sure no errors occurred when making the request
  if (!error && response.statusCode === 200) {
    // Next, we'll utilize the cheerio library on the returned html which will essentially give us jQuery functionality
    const $ = cheerio.load(body);
    
    if (!ogvBool) {
      o.json.c_name = $("article header h1").text();
      
      let cmyk = [];
      $("#ctl00_cphContent_ctl00_divCMYKRow span").each(function (i) {
        cmyk[i] = $(this).text().replace(/\s/g, '');
      });
      o.json.c_cmyk = cmyk.map(x => parseInt(x));
      
      let rgb = [];
      $("#ctl00_cphContent_ctl00_divRGBValues span").each(function () {
        rgb = rgb.concat($(this).text().replace(/\s/g, '').split('/'));
      });
      o.json.c_rgb = rgb.map(x => parseInt(x));
      
      o.json.c_hex_html = $("#ctl00_cphContent_ctl00_divHEXValues span").text().replace(/\s/g, '');
      
      scrapeOGV(o, callback); // now get ogv info
    } else {
      o.json.xgc_name = $("article header h1").text();
      
      let cmykogv = [];
      $("#ctl00_cphContent_ctl00_divOGV_CMYKValues span").each(function () {
        cmykogv = cmykogv.concat($(this).text().replace(/\s/g, '').split('/'));
      });
      o.json.xgc_cmykogv = cmykogv.map(x => parseInt(x));
      
      let rgb = [];
      $("#ctl00_cphContent_ctl00_divRGBValues span").each(function () {
        rgb = rgb.concat($(this).text().replace(/\s/g, '').split('/'));
      });
      o.json.xgc_rgb = rgb.map(x => parseInt(x));
      
      o.json.xgc_hex_html = $("#ctl00_cphContent_ctl00_divHEXValues span").text().replace(/\s/g, '');
      
      o.jsonArr.push(o.json); // add scraped json to array
      
      if (o.numArr.length > 0) {
        scrapeCMYK(o, callback); // more numbers to scrape
      } else {
        callback(o.jsonArr); // no more to scrape, return that precious data!
      }
    }
  } else {
    if (o.numArr.length > 0) {
      scrapeCMYK(o, callback); // more numbers to scrape
    } else {
      callback(o.jsonArr); // no more to scrape, return that precious data!
    }
  }
}

// PUT request, returns updated color
const colorUpdate = function (req, res) {
  // console.log(req);
  
  if (!req.body.name || !req.body.kind) {
    res.status(404).json({
      "message": "not found: name, and color type are required"
    });
    return;
  } else if (!(typeof(req.body.recommendOrange) === typeof(true))  || !(typeof(req.body.recommendGreen) === typeof(true)) || !(typeof(req.body.recommendViolet) === typeof(true))) {
    res.status(404).json({
      "message": "not found: type of recommend value is not boolean"
    });
    return;
  }
  
  // TO DO: test that name is unique?
  
  col
    .findOne({'_id':req.params.colorID})
    .exec((err, color) => {
      if (!color) {
        res.status(404).json({
            "message": "color not found"
          });
        return;
      } else if (err) {
        res.status(404).json(err);
        return;
      }
      color.name = req.body.name;
      color.kind = req.body.kind;
      color.recommendOrange = req.body.recommendOrange;
      color.recommendGreen = req.body.recommendGreen;
      color.recommendViolet = req.body.recommendViolet;
      color.save((err, color) => {
        if (err) {
          res.status(404).json(err);
        } else {
          res.status(200).json(color);  
        }
      })
    })
};

// DELETE request, returns nothing on sucess
const colorDelete = function (req, res) {
  if (req.params.colorID) {
    col
      .findByIdAndRemove(req.params.colorID)
      .exec((err) => {
        if (err) {
          res.status(404).json(err);
          return;
        }
        res.status(204).json(null);
      });
  } else {
    res.status(404).json({
      "message": "no color id"
    });
  }
};


module.exports = {
  colorReadAll,
  colorReadList,
  colorCreate,
  colorAddPantones,
  colorAddPantoneRange,
  colorUpdate,
  colorDelete,
};