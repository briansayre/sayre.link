const path = require('path');
const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const yup = require('yup');
const admin = require('firebase-admin');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const cors = require('cors');
const alert = require('alert');
const { nanoid } = require('nanoid');

require('dotenv').config();

const app = express();
app.use(cors({ origin: true }));
app.enable('trust proxy');
app.use(helmet());
app.use(morgan('common'));
app.use(express.json());
app.use(express.static('./public'));

const notFoundPath = path.join(__dirname, 'public/404.html');

// Fetch the service account key JSON file contents
var serviceAccount = require("./serviceAccountKey");

// Initialize the app with a service account, granting admin privileges
admin.initializeApp({ 
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.DATABASE_URL
});

var db = admin.database();

app.get('/:id', async (req, res, next) => {
  const key = req.params.id;
  try {
    var clicks = -1;
    var ref = db.ref("main");
    const url = await ref.child(key).once('value').then(function(snapshot) {
      clicks = snapshot.val().clicks;
      return snapshot.val().url;
    });
    if (url) {
      clicks++;
      const newUrl = {
        url,
        clicks
      };
      ref = ref.child(key);
      ref.set(newUrl);
      return res.redirect(url);
    }
    return res.status(404).sendFile(notFoundPath);
  } catch (error) {
    return res.status(404).sendFile(notFoundPath);
  }
});

app.get('/clicks/:id', async (req, res, next) => {
  const key = req.params.id;
  try {
    var clicks = -1;
    var ref = db.ref("main");
    const url = await ref.child(key).once('value').then(function(snapshot) {
      clicks = snapshot.val().clicks;
      return snapshot.val().url;
    });
    alert("sayre.link/" + key + " has " + clicks + " clicks.");
    return res.redirect("/");
  } catch (error) {
    alert("could not find clicks for sayre.link/" + key );
    return res.redirect("/");
  }
});

const schema = yup.object().shape({
    key: yup.string().trim().matches(/^[\w\-]+$/i),
    url: yup.string().trim().url().required(),
 });

app.post('/url', slowDown({
  windowMs: 30 * 1000,
  delayAfter: 1,
  delayMs: 500,
}), rateLimit({
  windowMs: 30 * 1000,
  max: 10000,
}), async (req, res, next) => {
  let { key, url } = req.body;
  try {
    var ref = db.ref("main");
    if (key == "") {
      key = nanoid(5);
    }
    await schema.validate({
      key,
      url,
    });
    var existing = await ref.child(key).once('value').then(function(snapshot) {
      return snapshot.val();
    });
    if (existing) {
      throw new Error('key already in use.');
    }
    key = key.toLowerCase();
    clicks=0;
    const newUrl = {
      url,
      clicks
    };
    ref = ref.child(key);
    ref.set(newUrl);
    newUrl.key = key;
    res.json(newUrl);
  } catch (error) {
    next(error);
  }
});

app.use((req, res, next) => {
  res.status(404).sendFile(notFoundPath);
});

app.use((error, req, res, next) => {
  if (error.status) {
    res.status(error.status);
  } else {
    res.status(500);
  }
  res.json({
    message: error.message,
    stack: error.stack,
  });
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`);
});