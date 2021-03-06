var express = require('express'),
    multer = require('multer'),
    cloudinary = require('cloudinary'),
    router = express.Router(),
    Campgound = require('../models/campground'),
    middlewareObj = require('../middleware'),
    NodeGeocoder = require('node-geocoder');
 
var options = {
      provider: 'google',
      httpAdapter: 'https',
      apiKey: process.env.GEOCODER_API_KEY,
      formatter: null
    };

var geocoder = NodeGeocoder(options);

var storage = multer.diskStorage({
    filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});
var imageFilter = function (req, file, cb) {
  // accept image files only
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
      return cb(new Error('Only image files are allowed!'), false);
  }
  cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter});

cloudinary.config({ 
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});
// =====================================
// Campground routes
// =====================================

// index page
router.get('/', function(req, res) {
  // get all campgrounds from DB
  Campgound.find({}, function(err, camp) {
    if(err) {
      console.log(err)
    } else {
      res.render('index', {campground:camp});
    }
  })
})

// create new post
router.post('/', middlewareObj.isLoggedIn, upload.single('image'), function(req, res) {
  var name = req.body.name,
      price = req.body.price,
      desc = req.body.desc,
      author = {
        id: req.user._id,
        username: req.user.username
      },
      created = Date.now();
  geocoder.geocode(req.body.location, function(err, data) {
    if (err || !data.length) {
      req.flash('red', 'Invalid Address. Please input correct location.');
      res.redirect('back');
    } else {
      var location = data[0].formattedAddress,
          lat = data[0].latitude,
          lng = data[0].longitude;
      var newCamp = {
        name: name,
        price: price,
        location: location,
        lat: lat,
        lng: lng,
        description: desc,
        author: author,
        created: created
      };
      cloudinary.v2.uploader.upload(req.file.path, function(err, result) {
        if (err) {
          req.flash('red', err.message);
          res.redirect('back');
        }
        newCamp.image = result.secure_url;
        newCamp.imageId = result.public_id;
         // create new campground and save to database
        Campgound.create(newCamp, function(err) {
          if (err) {
            console.log(err);
            res.render('error', {error: err});
          } else {
            req.flash('green', 'Campground added successfully!');
            res.redirect('/campground');
          }
        });
      })
    }
  })
})

// new post page
router.get('/new', middlewareObj.isLoggedIn, function(req, res) {
  res.render('newcamp');
})

router.get('/:id', function(req, res) {
  // find the campground with provided id
  Campgound.findById(req.params.id).populate('comments').exec( function(err, foundCamp) {
    if (err) {
      console.log(err);
    } else {
      // render show template with that specific campground
      res.render('show', {campground: foundCamp});
    }
  })
})

// edit page
router.get('/:id/edit', middlewareObj.canEditCamp, function(req, res) {
  Campgound.findById(req.params.id, function(err, foundCamp) {
    if (err) {
      res.redirect('/campground');
    } else {
      res.render('edit', {campground: foundCamp});
    }
  })
})

// put route
router.put('/:id', middlewareObj.canEditCamp, upload.single('image'), function(req, res) {
  geocoder.geocode(req.body.location, function(err, data) {
    if (err || !data.length) {
      req.flash('red', 'Invalid Address. Please input correct location.');
      res.redirect('back');
    } else {
      var location = data[0].formattedAddress,
      lat = data[0].latitude,
      lng = data[0].longitude;
      Campgound.findById(req.params.id, async function(err, foundCamp) {
        if (err) {
          console.log(err);
          res.render('error', {error: err});
        } else {
          if (req.file) {
            try {
              if (foundCamp.imageId) {
               await cloudinary.v2.uploader.destroy(foundCamp.imageId);
              }
              var result = await cloudinary.v2.uploader.upload(req.file.path);
              foundCamp.image = result.secure_url;
              foundCamp.imageId = result.public_id;
            } catch(err) {
              req.flash("error", err.message);
              return res.redirect("back");
            }
          }
          foundCamp.name = req.body.name;
          foundCamp.price = req.body.price;
          foundCamp.description = req.body.desc;
          foundCamp.location = location;
          foundCamp.lat = lat;
          foundCamp.lng = lng;
          foundCamp.updated = Date.now();
          foundCamp.save();
          req.flash('green', 'Campground updated successfully!');
          res.redirect('/campground/' + foundCamp._id);
        }
      })
    }
  })
})

// delete post
router.delete('/:id', middlewareObj.canEditCamp, function(req, res) {
  Campgound.findByIdAndRemove(req.params.id, function(err) {
    if (err) {
      console.log(err);
      res.render('error', {error: err});
    } else {
      req.flash('green', 'Campground deleted successfully!');
      res.redirect('/campground');
    }
  })
})

module.exports = router;