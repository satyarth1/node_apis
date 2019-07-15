var common = require('../common/common');
var code = require('../common/responseCode');
var msg = require('../common/responseMessage');
var fields = require('../common/required');
var User = require('../models/user_model');
var Notification = require('../models/notification_model');
var FriendRequest = require('../models/friendRequest_model');
var blockModel = require('../models/block_model');
var followModel = require('../models/follow_model');
const fireBase = require('../firebase/helper')
var mongoose = require('mongoose')
var apn = require("apn");
var async = require("async");
var connection; 
var notification;



let sendNotification = async (req, res) => {
    console.log('====================================');
    console.log("req.body=====>>>>",req.body);
    console.log('====================================');
    let { sendTo, title, message, notificationType, channelName } = req.body;
    let call_status = "0"; // for incoming call status
    let fullName = req.fullName;
    let profilePic = req.profilePic;
    let userDetail = { fullName, profilePic, sendTo, sendBy:req.userId, title, message, notificationType, channelName, call_status }
    let given = { sendTo };
    common.checkKeyExist(given, fields.sendNotification)
    .then(result=>{
        if(result.length)
            return common.response(res, code.KEY_MISSING, result[0]);
        else{
            User.findById(sendTo, { deviceToken:1, deviceType:1 })
            .then(user=>{
                if(!user)
                    return common.response(res, code.KEY_MISSING, msg.USER_NOT_EXISTS);
                else{
                        let { deviceToken, deviceType } = user;
                        common.notification(deviceToken, deviceType, userDetail, title, message)
                        .then(noti=>{
                            noti = JSON.parse(noti);
                            userDetail['multicast_id'] = noti['multicast_id'];
                            userDetail['message_id'] = noti['results'][0]['message_id'];
                            return common.response(res, code.EVERYTHING_IS_OK, msg.SUCCESS, userDetail);
                        }, err=>{
                            return common.response(res, code.INTERNAL_SERVER_ERROR, msg.INTERNAL_SERVER_ERROR, err)     
                        })
                }

            }, err=>{
                return common.response(res, code.INTERNAL_SERVER_ERROR, msg.INTERNAL_SERVER_ERROR, err)     
            })
        }
    })
    .catch((err)=>{ return common.response(res, code.INTERNAL_SERVER_ERROR, msg.INTERNAL_SERVER_ERROR)})

}


let sendAllNotification = async (userId, postId, title, msg)=>{
    
    let friendList = []
    let blockedUser = [];

    // friend list
    let friendMasterQuery = [
        {
            $match:{
                $or:[{ sendTo:userId }, { sendBy:userId }], status:"ACCEPT"
            }
        },
        {
            $group:{
                _id:null,
                sendTo:{ $addToSet:'$sendTo' },
                sendBy:{ $addToSet:'$sendBy' },
                
            }
        },
        {
            $project : {
                items : { $filter : { input :{ $concatArrays: [ "$sendTo", "$sendBy" ] }, as : "item", cond : { $ne : ["$$item" , userId] } } },
            }
        }

    ]

    let friend = await FriendRequest.aggregate(friendMasterQuery);
    if(friend.length){
        friendList = friend[0].items
    }


        // get Follow User List

    // let followedUser = await followModel.find({ followedBy:userId }).distinct('followedUser');
    let followedBy = await followModel.find({ followedUser:userId }).distinct('followedBy');

    // get Block User List
    let blockMasterQuery = [
        {
            $match:{
                $or:[{ blockedUser:userId }, { blockedBy:userId }]
            }
        },
        {
            $group:{
                _id:null,
                blockedUser:{ $addToSet:'$blockedUser' },
                blockedBy:{ $addToSet:'$blockedBy' },
            }
        },
        {
            $project : {
                items : { $filter : { input :{ $concatArrays: [ "$blockedUser", "$blockedBy" ] }, as : "item", cond : { $ne : ["$$item" , userId] } } },
            }
        }
    ]

    let block = await blockModel.aggregate(blockMasterQuery);

    if(block.length){
        blockedUser = block[0].items;
    }


    let query = { $and:[ { _id:{ $in:friendList.concat(followedBy) } }, { _id:{ $nin:blockedUser } }] }
    User.find(query, { deviceToken:1, deviceType:1 })
    .then(users=>{
        console.log('====================================');
        console.log("users=====>>>>>",users);
        console.log('====================================');
        async.forEachOf(users, (item, index, callback)=>{
            let { deviceToken, deviceType } = item;
            console.log('====================================');
            console.log("deviceToken=====>>>>>",deviceToken);
            console.log("deviceType=====>>>>>",deviceType);
            console.log('====================================');
            common.notification(deviceToken, deviceType, postId , title, msg); 
            callback();   
        }, (err)=>{                 
            if(err){
                console.log('====================================');
                console.log("err occour====>>>>>");
                console.log('====================================');
            }
            console.log('====================================');
            console.log("notification successfully sent to All Users.");
            console.log('====================================');
        })
    }, err=>{
        console.log('====================================');
        console.log("err=====>>>>>",err);
        console.log('====================================');
    })


}


let getGroupData = (req, res)=>{
    fireBase.getGroupData(req, res)
    .then(result=>{
        return common.response(res, code.EVERYTHING_IS_OK, message.SUCCESS, result);
    }, err=>{
        return common.response(res, code.INTERNAL_SERVER_ERROR, msg.INTERNAL_SERVER_ERROR)
    })
}

module.exports = {

    sendNotification,
    sendAllNotification,
    getGroupData
}
  
