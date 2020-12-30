const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const formidable = require('formidable');
const fs = require('fs');
const app = express();
const tmi = require('tmi.js');
const ApiClient = require('twitch');
const StaticAuthProvider = require('twitch-auth');

require('dotenv').config();

const username = process.env.TWITCH_USERNAME;
const pass = process.env.TWITCH_PASSWORD;
const secret = process.env.TWITCH_SECRET;
const clientID = process.env.TWITCH_CLIENTID;
const refreshToken = process.env.TWITCH_REFRESHTOKEN;
const accessToken = process.env.TWITCH_ACCESSTOKEN;

const authProvider = new StaticAuthProvider.StaticAuthProvider(clientID, accessToken);
const apiClient = new ApiClient({ authProvider });

let currentEntries = [];
let summary = {};
let ticketSum = 0;

app.listen(8080,() => {
  console.log('server running on port 80');
})

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/',(req, res) => {
  res.send('');
})

app.get('/raffle',(req, res) => {
  if(currentEntries.length > 0) {
    res.render('index', {title: 'MeowSquad Raffle', hidden: false, vanny:"/images/vanny.png", entries:summary, namecount:Object.keys(summary).length, ticketcount:ticketSum});
  } else {
    res.render('index', {title: 'MeowSquad Raffle', hidden: true, vanny:"/images/vanny.png", entries:summary, namecount:Object.keys(summary).length, ticketcount:ticketSum});
  }
})

app.get('/raffle/roll',async (req, res) => {
  let resultIndex = Math.floor(Math.random() * currentEntries.length);
  let winner = currentEntries[resultIndex];

  delete summary[winner];

  let newEntries = []
  for(let i = 0;i < currentEntries.length; i++){
    if(currentEntries[i].localeCompare(winner) !== 0){
      newEntries.push(currentEntries[i])
    }
  }

  currentEntries = newEntries;
  ticketSum = currentEntries.length;

  for(let key in summary) {
    let value = summary[key];
    value[1] = parseInt((parseInt(value[0]) / ticketSum) * 1000)/10;
  }


  let img;
  try {
    let user = await apiClient.helix.users.getUserByName(winner);
    img = user.profilePictureUrl;
  } catch (e) {
    let user = await apiClient.helix.users.getUserByName('twitch');
    img = user.profilePictureUrl;
  }

  if(currentEntries.length > 0){
    res.render('roll',{title:'MeowSquad Raffle', winner:winner, img:img, vanny:"/images/vanny.png", entries:summary, namecount:Object.keys(summary).length, ticketcount:ticketSum});
  } else {
    res.redirect('/raffle/');
  }
})

app.post('/raffle/submit',(req, res) => {
  let form = new formidable.IncomingForm();
  form.parse(req, function (err, fields, files) {
    const path = files.csv.path;
    const data = fs.readFileSync(path)
        .toString()
        .split('\n')
        .map(e => e.trim())
        .map(e => e.split(',').map(e => e.trim()));

    currentEntries = [];

    data.forEach(function (user){
      if(user.length > 1) {
        summary[user[0]] = [user[1],0];
        for (let i = 0; i < parseInt(user[1]); i++) {
          currentEntries.push(user[0]);
        }
      }
    });

    ticketSum = currentEntries.length;

    for(let key in summary) {
      let value = summary[key];
      value[1] = parseInt((parseInt(value[0]) / ticketSum) * 1000)/10;
    }

    res.redirect('/raffle/');
  });
})

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});


module.exports = app;
