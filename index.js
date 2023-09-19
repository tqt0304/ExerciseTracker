const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser')
let mongoose = require('mongoose');
const moment = require('moment');
require('dotenv').config()

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

app.use(cors())
app.use(bodyParser.urlencoded({extended: false}))
app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

let userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  }
}, {versionKey: false})

let User = mongoose.model('User', userSchema)

let today = new Date()

let exerciseSchema = new mongoose.Schema({
  exerciseID: {
    type: String,
    required: true,
    unique: false
  },
  description: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  date: {
    type: String,
    default: today.toDateString()
  },
  realdate: {
    type: Date,
    default: today
  }
})

let Exercise = mongoose.model('Exercise', exerciseSchema)


app.route('/api/users') //Create user feature
  .post((req, res) => {
    var user = new User({username: req.body.username})
    user
      .save()
      .then((doc) => {
        res.json(doc)
      })
      .catch((err) => {
        console.error(err);
      })
  })
  .get((req, res) => {
    User.find()
      .then((doc) => {
        res.json(doc);
      })
      .catch((err) => {
        console.error(err);
      })
  })

function dateIsValid(date) {
  return !Number.isNaN(new Date(date).getTime());
}

app.post('/api/users/:_id/exercises', (req, res) => {
  var exercise = new Exercise({exerciseID: req.params._id, description: req.body.description, duration: req.body.duration})
  if (req.body.date != '' &&  dateIsValid(req.body.date)) {
    exercise.date = new Date(req.body.date).toDateString();
    exercise.realdate = new Date(req.body.date);
  } 

  exercise
    .save()
    .then((doc) => {
      // if (dateIsValid(req.body.date)) {
      //   console.log('OK')
      //   // Exercise.findByIdAndUpdate(req.params._id, {realdate: new Date(req.body.date).toISOString()})
      //   // .exec()
      //   // .catch((err) => {
      //   //   console.error(err);
      //   // })
      //   exercise.realdate = new Date(req.body.date);
      // }

      User.findById(req.params._id)
        .then((sth) => {
          res.json({_id: req.params._id, username: sth.username, date: doc.date, duration: doc.duration, description: doc.description})
        })
        .catch((err1) => {
          console.error(err1);
        })
    })
    .catch((err) => {
      console.error(err)
    })
})

const FindUsername = (id, done) => {
  User.findById(id)
  .then((userdata) => {
    done(null, userdata)
  })
  .catch((err) => {
    console.error(err);
  })
}

const CountExercises = (id, done) => {
  Exercise.countDocuments({exerciseID: id})
    .then((ans) => {
      done(null, ans)
    })
    .catch((err) => {
      console.error(err)
    })
}

app.get('/api/users/:_id/logs', (req, res) => {
  let username;
  let count;
  const promise = new Promise((resolve, reject) => {
    CountExercises(req.params._id, (err, data) => {
      if (err) reject()
      else {
      resolve(data)
    }
    })
  })
  promise
    .then((result) => {
      count = result
      return new Promise((resolve, reject) => {
        FindUsername(req.params._id, (err, data) => {
          if (err) reject();
          username = data.username;
          resolve(data);
        })
      })
    })
    .then(() => {
      return new Promise((resolve, reject) => {
        let t = Exercise.find({
          exerciseID: req.params._id, 
        })
        if (typeof req.query.from !== "undefined") {
          t.find({
            realdate: {
              $gte: new Date(req.query.from)
            }
          })
        }
        if (typeof req.query.to !== "undefined") {
          t.find({
            realdate: {
              $lte: new Date(req.query.to)
            }
          })
        }
        t
        .limit(req.query.limit)
        .select({description: true, duration: true, date: true, _id: false})
        .exec()
        .then((docs) => {
          resolve(docs);
        })
        .catch((err) => {
          reject();
        })
      })
    })
    .then((log) => {
      res.json({username: username, count: count, _id: req.params._id, log})
    })
    .catch((err) => {
      console.error(err)
    })

})


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
