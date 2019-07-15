const bcrypt = require('bcrypt-nodejs');
var constant = require('./constant');
var config = require('../config/config');
var NodeGeocoder = require('node-geocoder');
const nodemailer = require('nodemailer');
let transporter;
const client = require('twilio')(config.twilio.sid, config.twilio.auth_token);
const _ = require('lodash');
var path = require('path');
var jwt = require('jsonwebtoken');
var ThumbnailGenerator = require('video-thumbnail-generator').default;

var multer = require('multer');
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log('====================================');
    console.log("common function file======>>>>",file);
    console.log('====================================');
    if (file.fieldname == 'postVideo') {
      cb(null, path.join(__dirname, '..', 'uploads', 'videos'))
    }
    else if(file.fieldname == 'chatVideo'){
      cb(null, path.join(__dirname, '..', 'uploads', 'chatMaterial', 'videos'))
    }
    else if(file.fieldname == 'chatImage'){
      cb(null, path.join(__dirname, '..', 'uploads', 'chatMaterial', 'image'))
    }
    else if(file.fieldname == 'groupIcon'){
      cb(null, path.join(__dirname, '..', 'uploads', 'chatMaterial', 'groupIcon'))
    }
    else if(file.fieldname == 'chatFile'){
      cb(null, path.join(__dirname, '..', 'uploads', 'chatMaterial', 'file'))
    }  
    else
      cb(null, path.join(__dirname, '..', 'uploads', 'images'))
  },
  filename: function (req, file, cb) {
    let fileOriginalName = file.originalname.replace(/\s/g, "");
    cb(null, file.fieldname + '-' + Date.now() + '_' + fileOriginalName)
  }
})

var upload = multer({
  storage: storage,
  fileFilter: (req, file, callback) => {
    if (file.fieldname == 'image') {
      req.imageFormat = true;
      var ext = path.extname(file.originalname);
      if (ext !== '.png' && ext !== '.jpg' && ext !== '.gif' && ext !== '.jpeg') {
        req.imageFormat = false
        return callback(null, req)
      }
      else{
        callback(null, req)
      }
    }
    callback(null, req)
  },
})



// fcm  for send notification through device token
var FCM = require('fcm-node');
var serverKey = 'AIzaSyCGCuEFh2qSKa2KKQMwMpiBA-vx7HEyYhs'; // Legacy server key
var fcm = new FCM(serverKey);


var apns = require("apns"); 
var options = {
  "cert": "config.socialMedia.pem",
  "key": "config.socialMedia.pem",
  "passphrase": "", //Acropole
  // "gateway": "gateway.push.apple.com",//for staging time
  "gateway": "gateway.sandbox.push.apple.com",//for testing time
  "port": 2195,
  "enhanced": true,
  "cacheLength": 5
};
var apnConnection = new apns.Connection(options);

let iosPush = (token, userDetail)=>{
        
        var myDevice = new apns.Device(token);
        var note = new apns.Notification();
        note.expiry = Math.floor(Date.now() / 1000) + (3600*24); // Expires 1 day from now.
        note.badge = 1;
        note.sound = "ping.aiff";
        note.alert = userDetail.title;
        note.notificationType = userDetail.notificationType
        note.payload = userDetail
        return new Promise((resolve, reject)=>{
          try {
            apnConnection.pushNotification(note, myDevice); //devicIos
            apnConnection.on('transmitted', function (notification, deviceToken) {
                console.log("=========+++>alert", note.alert)
                console.log('APNS: Successfully transmitted message' + JSON.stringify(notification));
                resolve(JSON.stringify(notification))
            });

          } catch (ex) {
            console.log("in Error", ex);
            reject(ex);
          }
        })
}

let response = (res, code, msg, result) => {

  return res.status(code).json({
    responseCode: code,
    responseMessage: msg,
    result:result
  });
}

let checkKeyExist = (req, arr) => {

  return new Promise((resolve, reject) => {
    var array = [];
    _.map(arr, (item) => {
      if (req.hasOwnProperty(item)) {
        var value = req[item];
        if (value == '' || value == undefined) {
          array.push(item + " can not be empty");
        }
        resolve(array);
      } else {
        array.push(item + " key is missing");
        resolve(array);
      }
    });
  })
}

let createToken = (data) => {

  return new Promise((resolve, reject) => {
    jwt.sign(data, 'secret', (err, token) => {
      if (err)
        reject(err)
      else
        resolve(token)
    });
  })
}

let decodeToken = (token) => {

  return new Promise((resolve, reject) => {
    jwt.verify(token, 'secret', (err, decode) => {
      if (err)
        reject(err)
      else
        resolve(decode)
    });
  })
}


let createHash = (password, cb) => {
  if (password) {
    bcrypt.hash(password, null, null, (err, hash) => {
      if (err)
        cb(err)
      else
        cb(null, hash)
    });
  } else {
    cb(null, '');
  }
}

let compareHash = (password, hash, cb) => {

  bcrypt.compare(password, hash, (err, res) => {
    if (res)
      cb(null, res)
    else
      cb(err)
  });
}

let createThumbnail = (type, videoFile) => {

  let videoPath = {};
  if(type == 'postVideo'){
    videoPath['sourcePath'] = path.join(__dirname, '..','uploads', 'videos', videoFile);
    videoPath['thumbnailPath'] = path.join(__dirname, '..','uploads','thumbnail');
  }
  if(type == 'chatVideo'){
    videoPath['sourcePath'] = path.join(__dirname, '..','uploads', 'chatMaterial', 'videos', videoFile);
    videoPath['thumbnailPath'] = path.join(__dirname, '..','uploads', 'chatMaterial', 'thumbnail');
  }
  return new Promise((resolve, reject) => {
    const tg = new ThumbnailGenerator(videoPath);
    tg.generateOneByPercentCb(90, (err, result) => {
      resolve(result)
      // 'test-thumbnail-320x240-0001.png'
    });
  })
  
}

let sendOTP = (verification_code, sendTo) => {

  client.messages.create({
      to: '+91' + sendTo,
      from: config.twilio.number,
      body: 'Your one-time password is ' + verification_code,
    })
    .then((message) => {
      console.log("message sent successfully. ", message.sid)
    }, (err) => {
      console.log(err);
    });
}

let sendEmail = (email, subject, message, link, cc, bcc, cb) => {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: config.nodemailer
  });
  let messageObj = {
    from: 'Noreply<' + config.nodemailer.user + '>',
    to: email,
    subject: subject,
    text: message, //"A sentence just to check the nodemailer",
    html: "Click on this link to <a href=" + link + ">Click Here</a>",
    cc: cc,
    bcc: bcc
  }
  transporter.sendMail(messageObj, (err, info) => {
    if (err) {
      cb(err)
      console.log("Error occured", err)
    } else {
      cb(null, "success");
      console.log("Mail sent")
    }
  })
}

let uploadImage = (req, res, next) => {

  upload.single('profilePic')(req, res, next);
}

let uploadAdminImage = (req, res, next) => {

  upload.single('image')(req, res, next);
}

let uploadPost = (req, res, next) => {
  var cpUpload = upload.fields([{
    name: 'postImage',
    maxCount: 5
  }, {
    name: 'postVideo',
    maxCount: 1
  }]);
  cpUpload(req, res, next);
}

let uploadMaterial = (req, res, next)=>{

  var cpUpload = upload.fields([{
    name: 'chatVideo',
    maxCount: 1
  },{
    name: 'chatImage',
    maxCount: 5
  }, {
    name: 'chatFile',
    maxCount: 1
  }, {
    name: 'groupIcon',
    maxCount: 1
  }]);
  cpUpload(req, res, next);
  
}



let notification = (deviceToken, deviceType, userDetail , title, msg) => {

  var message = {
    to: deviceToken,
    collapse_key: 'YOUR_COLLAPSE_KEY',
    data:userDetail
};

  if(deviceType == "1"){
    message['notification'] = {
      title:title,
      body:msg,
      click_action: "FCM_PLUGIN_ACTIVITY",
    };
  }
  console.log('====================================');
  console.log("message======>>>",message);
  console.log('====================================');

  return new Promise((resolve, reject)=>{
      fcm.send(message, (err, response) => {
        if (err) {
          console.log("Something has gone wrong!", err);
          reject(err)
        } else {
          console.log("Successfully sent with response: ", response);
          resolve(response)
        }
    });
  })

}

module.exports = {

  checkKeyExist,
  response,
  createToken,
  decodeToken,
  createHash,
  compareHash,
  sendOTP,
  sendEmail,
  notification,
  uploadImage,
  uploadAdminImage,
  uploadPost,
  uploadMaterial,
  createThumbnail,
  iosPush

}


