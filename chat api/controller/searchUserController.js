var common = require('../common/common');
var code = require('../common/responseCode');
var message = require('../common/responseMessage');
var fields = require('../common/required');
var User = require('../models/user_model');
var FriendRequest = require('../models/friendRequest_model');
var followModel = require('../models/follow_model');
var blockModel = require('../models/block_model');
var constant = require('../common/constant');
var mongoose = require('mongoose');


let searchUserName = (req, res)=>{

    let { search } = req.body;
    let userId = mongoose.Types.ObjectId(req.userId);
    // let userId = mongoose.Types.ObjectId("5c0f5cd4ba9ecc18f4d13b27");
    // let userId = mongoose.Types.ObjectId("5c0f5ce7ba9ecc18f4d13b28");
    let given = { userId }
    if(!search){
        return common.response(res, code.EVERYTHING_IS_OK, message.SUCCESS, []);
    }
    common.checkKeyExist(given, fields.searchUserName)
    .then(async result=>{
        if(result.length)
            return common.response(res, code.KEY_MISSING, result[0]);
        else{
            
            let blockedBy = await blockModel.find({ blockedUser:userId }).distinct('blockedBy');
            blockedBy.push(mongoose.Types.ObjectId(userId))
            let re = { $regex:search, $options:'i' }
            let query = { status:'ACTIVE', _id:{ $nin:blockedBy }, fullName:re };
            User.find(query, { fullName:1, profilePic:1 })
            .then((result) => {
                return common.response(res, code.EVERYTHING_IS_OK, message.SUCCESS, result);
            }, err=>{
                return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR)     
            });     
        }
    })
    .catch(err=> { return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR, err)})
}


let getSearchUserDetail = (req, res)=>{
    
    let { searchUserId } = req.body;
    let userId = req.userId;
    // let userId = "5c0f5cd4ba9ecc18f4d13b27";
    // let userId = "5c0f5ce7ba9ecc18f4d13b28";
    let given =  { userId, searchUserId }
    common.checkKeyExist(given, fields.getSearchUserDetail)
    .then( async result=>{
        if(result.length)
            return common.response(res, code.KEY_MISSING, result[0]);
        else{
            let followedUser = await followModel.find({ followedBy:userId }).distinct('followedUser');
            let options = { 
                fullName:1,
                profilePic:1,
                email:1,
                phone:1,
                dateOfBirth:1,
                professionalStream:1,
                interest:1,
                bio:1,
                gender:1,
                address:1
            }
            User.findById(searchUserId, options)
            .lean().then(searchUser=>{
                if(!searchUser)
                    return common.response(res, code.KEY_MISSING, message.USER_NOT_EXISTS);
                else{
                    let index = followedUser.findIndex((y)=> y.toString() == searchUserId)
                        if(index != -1)
                            searchUser.isFollow = true;
                        else
                            searchUser.isFollow = false;
                    let query  = { $or:[
                        { sendTo:userId, sendBy:searchUserId },
                        { sendTo:searchUserId, sendBy:userId }
                    ]}
                    FriendRequest.findOne(query)
                    .then(friend=>{
                        if(friend){
                            if(friend.status == 'ACCEPT'){
                                searchUser.isFriend = true;
                                searchUser.friendRequest = "";    
                            }
                            else{
                                searchUser.isFriend = false;
                                if(friend.sendBy.toString() == userId) // means sender hi login user hai
                                    searchUser.friendRequest = "SENDER";
                                else
                                    searchUser.friendRequest = "RECEIVER";
                            }    
                        }
                        else{
                            searchUser.isFriend = false;
                            searchUser.friendRequest = "";
                        }
                        return common.response(res, code.EVERYTHING_IS_OK, message.SUCCESS, searchUser);
                    }, err=>{
                        return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR)     
                    })    
                }
            }, err=>{
                return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR)     
            })
              
        }
    })
    .catch(err=> { return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR)})
}

module.exports = {

    searchUserName,
    getSearchUserDetail
}