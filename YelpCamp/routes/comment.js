var express = require('express'),
    router = express.Router(),
    Campgound = require('../models/campground'),
    Comment = require('../models/comment');

// =====================================
// Comment routes
// =====================================

// add new comment
router.post('/campground/:id', isLoggedIn, function(req, res) {
  // look up campground using id
  Campgound.findById(req.params.id, function(err, campground) {
    if (err) {
      console.log(err);
      res.render('error', {error: err});
    } else {
      // create new comment in DB
      let newcomment = req.body.comment;
      let author = {
        id: req.user._id,
        username: req.user.username
      };
      newcomment.author = author;
      newcomment.created = Date.now();
      Comment.create(newcomment, function(err, newcomment) {
        if (err) {
          console.log(err);
          res.redirect('/campground');
        } else {
          // connect comment to campground
          campground.comments.push(newcomment);
          campground.save();
          // redirect to show page
          res.redirect(302, '/campground/' + campground._id);
        }
      });
    }
  })
})

// update single comment
router.put('/campground/:id/comments/:comment_id', isEditAllowed, function(req, res) {
  let newcomment = req.body.comment;
  newcomment.updated = Date.now();
  Comment.findByIdAndUpdate(req.params.comment_id, newcomment, function(err, newComment) {
    if (err) {
      console.log(err);
      res.render('error', {error: err});
    } else {
      res.redirect('/campground/' + req.params.id);
    }
  })
})

// delete single comment
router.delete('/campground/:id/comments/:comment_id', isEditAllowed, function(req, res) {
  Comment.findByIdAndRemove(req.params.comment_id, function(err) {
    if (err) {
      console.log(err);
      res.render('error', {error: err});
    } else {
      res.redirect('/campground/' + req.params.id);
    }
  })
})


// middleware to check if user is logged in
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  } else {
    res.redirect('/login');
  }
}

// middleware to check if user has authorization to edit/delete
function isEditAllowed(req, res, next) {
  if (req.isAuthenticated()) {
    Comment.findById(req.params.comment_id, function(err, foundComment) {
      if (err) {
        res.render('error', {error: err});
      } else {
        if (foundComment.author.id.equals(req.user._id)) {
          return next()
        } else {
          res.send('Permission Denied. Please contact admin.');
        }
      }
    })
  } else{
    res.redirect('/login');
  }
}

module.exports = router;