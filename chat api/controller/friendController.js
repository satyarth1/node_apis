var common = require('../common/common');
var code = require('../common/responseCode');
var message = require('../common/responseMessage');
var fields = require('../common/required');
var User = require('../models/user_model');
var FriendRequest = require('../models/friendRequest_model');
var blockModel = require('../models/block_model');
var followModel = require('../models/follow_model');
var fireBaseFunction = require('../firebase/helper');
var constant = require('../common/constant');
var mongoose = require('mongoose')


let addOrCancelFriend = (req, res)=>{
    
    let { sendTo } = req.body;
    let userId = mongoose.Types.ObjectId(req.userId);
    // let userId = mongoose.Types.ObjectId("5c0f5cd4ba9ecc18f4d13b27");
    let given = { userId, sendTo }
    common.checkKeyExist(given, fields.addFriend)
    .then( result=>{
        if(result.length)
            return common.response(res, code.KEY_MISSING, result[0]);
        else{
            let query  = { $or:[
                { sendTo:userId, sendBy:sendTo },
                { sendTo:sendTo, sendBy:userId }
            ]}
            FriendRequest.findOne(query)
            .then(friend=>{
                if(friend){
                    let { _id } = friend;
                    FriendRequest.remove({_id})
                    .then(friend=>{
                        return common.response(res, code.EVERYTHING_IS_OK, message.FRIEND_REQUEST_CANCEL);
                    }, err=>{
                        return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR)     
                    })
                }
                else{
                    let createNewObj = { followedUser:sendTo, followedBy:userId };
                    followModel.create(createNewObj).then()
                    let newRecorde = { sendBy:userId, sendTo }
                    FriendRequest.create(newRecorde)
                    .then(friend=>{
                        return common.response(res, code.EVERYTHING_IS_OK, message.FRIEND_REQUEST_SEND);
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


let acceptOrReject = async (req, res)=>{

    let { requestType, sendBy } = req.body;
    let userId = mongoose.Types.ObjectId(req.userId);
    // let userId = mongoose.Types.ObjectId("5c0f5ce7ba9ecc18f4d13b28");
    let given = { userId, sendBy, requestType }
    common.checkKeyExist(given, fields.acceptReject)
    .then(result=>{
        if(result.length)
            return common.response(res, code.KEY_MISSING, result[0]);
        else{
            
            let query = { $or:[
                { sendBy, sendTo:userId }, 
                { sendBy:userId, sendTo:sendBy }
            ]}

            if(requestType == 'accept'){
                let update = { status:"ACCEPT" }
                
                FriendRequest.findOneAndUpdate(query, update)
                .then(user=>{
                    if(user){
                       return common.response(res, code.EVERYTHING_IS_OK, message.FRIEND_REQUEST_ACCEPTED);
                    }
                    else
                        return common.response(res, code.KEY_MISSING, message.USER_NOT_EXISTS);
                }, err=>{
                    return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR) 
                })
            }
            else if(requestType == 'reject' || requestType == 'cancel' || requestType == 'unfriend'){
                
                FriendRequest.remove(query)
                .then(user=>{
                    if(!user)
                        return common.response(res, code.KEY_MISSING, message.USER_NOT_EXISTS);
                    else{

                        let msg;
                        if(requestType == 'reject')
                            msg = message.FRIEND_REQUEST_REJECTED;
                        if(requestType == 'cancel')
                            msg = message.FRIEND_REQUEST_CANCEL;
                        if(requestType == 'unfriend')
                            msg = message.FRIEND_REQUEST_UNFRIEND;
                        common.response(res, code.EVERYTHING_IS_OK, msg);
                    }
                }, err=>{
                    return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR) 
                })
            }
            else
                return common.response(res, code.KEY_MISSING, message.INVALID_REQUEST_TYPE);

        }   
    })
    .catch(err=> { return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR)})
}


let getAllFriends = (req, res)=>{

    let { page, limit } = req.body;
    let userId = mongoose.Types.ObjectId(req.userId);
    // let userId = mongoose.Types.ObjectId("5c0f5cd4ba9ecc18f4d13b27");
    // let userId = mongoose.Types.ObjectId("5c0f5ce7ba9ecc18f4d13b28");
    let given = { userId };
    let n = page || 1, m = limit || 10;
    common.checkKeyExist(given, fields.getAllFriends)
    .then( async result=>{
        if(result.length)
            return common.response(res, code.KEY_MISSING, result[0]);
        else{
            let blockedUser = await blockModel.find({ blockedBy:userId }).distinct('blockedUser');
            let blockedBy = await blockModel.find({ blockedUser:userId }).distinct('blockedBy');

            let query  = { $or:[
                { sendBy:userId }, 
                { sendTo:userId }
            ],
                // sendBy:userId, 
                status:"ACCEPT" }
            let options = {
                page:n,
                limit:m
            }
            let masterQuery = [
                { 
                    $match:query 
                },
                {
                    $lookup:{
                        from:'user',
                        localField:'sendTo',
                        foreignField:'_id',
                        as:"sendTo"
                    }
                },
                {
                    $lookup:{
                        from:'user',
                        localField:'sendBy',
                        foreignField:'_id',
                        as:"sendBy"
                    }
                },
                {
                    $project : {
                        _id:1, status:1,
                        sendTo : { $filter : { input : "$sendTo", as : "sendToFr", cond : { $ne : ["$$sendToFr._id" , userId] } } },
                        sendBy : { $filter : { input : "$sendBy", as : "sendByFr", cond : { $ne : ["$$sendByFr._id" , userId] } } }
                    }
                },
                {
                    $project:{ status:1, sendTo:{ _id:1, profilePic:1, fullName:1 },  sendBy:{ _id:1, profilePic:1, fullName:1 },}
                },
                { 
                    $project: { 
                        status:1, 
                        friendDetail: { $concatArrays: [ "$sendTo", "$sendBy" ] }
                    } 
                },
                {
                    $unwind:"$friendDetail"
                },
                {
                    $addFields: {
                        isTagFriend:false
                    }
                },
                {
                    $project:{
                        status:1,
                        friendDetail:1,
                        isBlock: {
                            '$in': [ true, { $map:
                                    {
                                        input: blockedUser,
                                        as: "block",
                                        in: { $eq: [ "$$block", '$friendDetail._id' ] }
                                    }
                                } 
                            ]
                        },
                        isTagFriend:1
                    }
                    
                },
                { 
                    $match: {'friendDetail._id': { $nin:blockedBy } }
                }
            ]
            var aggregate = FriendRequest.aggregate(masterQuery);
            FriendRequest.aggregatePaginate(aggregate, options)
            .then(friend=>{
                let finalResult = {
                    docs:friend.data,
                    page:n,
                    limit:m,
                    pages:friend.pageCount,
                    total:friend.totalCount
                }
                return common.response(res, code.EVERYTHING_IS_OK, message.SUCCESS, finalResult);
            }, err=>{
                return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR)     
            })
        }
    })
    .catch(err=> { return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR)})
}

let getAllFriendRequest = (req, res)=>{

    let { page, limit } = req.body;
    let userId = mongoose.Types.ObjectId(req.userId);
    // let userId = mongoose.Types.ObjectId("5c0f5cd4ba9ecc18f4d13b27");
    // let userId = mongoose.Types.ObjectId("5c0f5ce7ba9ecc18f4d13b28");
    let given = { userId };
    let n = page || 1, m = limit || 10;
    common.checkKeyExist(given, fields.getAllFriendRequest)
    .then( async result=>{
        if(result.length)
            return common.response(res, code.KEY_MISSING, result[0]);
        else{
            let blockedUser = await blockModel.find({ blockedBy:userId }).distinct('blockedUser');

            let query  = { sendTo:mongoose.Types.ObjectId(userId), status:"PENDING" }
            let options = {
                page:n,
                limit:m
            }

            let masterQuery = [
                { 
                    $match:query 
                },
                {
                    $lookup:{
                        from:'user',
                        localField:'sendBy',
                        foreignField:'_id',
                        as:"sendBy"
                    }
                },
                {
                    $unwind:"$sendBy"
                },
                { 
                    $match: {'sendBy._id': { $nin:blockedUser } }
                },
                {
                    $project:{ _id:1, status:1, friendDetail:{ _id:'$sendBy._id', profilePic:'$sendBy.profilePic', fullName:'$sendBy.fullName' } }
                }
            ]
            var aggregate = FriendRequest.aggregate(masterQuery);
            FriendRequest.aggregatePaginate(aggregate, options)
            .then(friend=>{
                let finalResult = {
                    docs:friend.data,
                    page:n,
                    limit:m,
                    pages:friend.pageCount,
                    total:friend.totalCount
                }
                return common.response(res, code.EVERYTHING_IS_OK, message.SUCCESS, finalResult);
            }, err=>{
                return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR)     
            })
        }
    })
    .catch(err=> { return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR)})

}

// followModel

let followUnfollowUser = (req, res)=>{

    let { followId } = req.body;
    let userId = req.userId;
    // let userId = "5c0f5ce7ba9ecc18f4d13b28";
    // let userId = "5c0f5cd4ba9ecc18f4d13b27";
    let given = { userId, followId };
    common.checkKeyExist(given, fields.followUnfollowUser)
    .then(result=>{
        if(result.length)
            return common.response(res, code.KEY_MISSING, result[0]);
        else{
            let data = { };
            let createNewObj = { followedUser:followId, followedBy:userId };
            let query = { followedUser:followId, followedBy:userId };
            followModel.findOne(query).then(follow=>{
                if(follow){
                    followModel.remove(query).then(success=>{
                        data.isFollow = false;
                        return common.response(res, code.EVERYTHING_IS_OK, message.USER_UNFOLLOW_BY_USER, data);
                    } ,err=>{
                        return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR) 
                    })
                }
                else{
                    followModel.create(createNewObj).then(follow=>{
                        data.isFollow = true;
                        return common.response(res, code.EVERYTHING_IS_OK, message.USER_FOLLOW_BY_USER, data);
                    },err=>{
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


// blockModel

let blockUnblockUser = (req, res)=>{

    let { friendId } = req.body;
    let userId = req.userId;
    // let userId = "5c0f5ce7ba9ecc18f4d13b28";
    // let userId = "5c3c8fe6dedb817947a02fe5";
    let given = { userId, friendId };
    common.checkKeyExist(given, fields.blockUnblockUser)
    .then(result=>{
        if(result.length)
            return common.response(res, code.KEY_MISSING, result[0]);
        else{
            let data = { };
            let createNewObj = { blockedUser:friendId, blockedBy:userId };
            let query = { blockedUser:friendId, blockedBy:userId };
            blockModel.findOne(query).then(block=>{
                if(block){
                    blockModel.remove(query).then(async success=>{
                        data.isBlock = false;
                        let blockedBy = await blockModel.find({ blockedUser:userId }).distinct('blockedBy')
                        let blockedUser = await blockModel.find({ blockedBy:userId }).distinct('blockedUser')
                        let userObj = { _id:userId, fullName, profilePic, blockedUser, blockedBy };
                        fireBaseFunction.updateFirebaseNode(userObj)
                        return common.response(res, code.EVERYTHING_IS_OK, message.USER_UNBLOCKED_BY_USER, data);
                    },err=>{
                        return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR) 
                    })
                }
                else{
                    blockModel.create(createNewObj).then(async block=>{
                        data.isBlock = true;
                        let blockedBy = await blockModel.find({ blockedUser:userId }).distinct('blockedBy')
                        let blockedUser = await blockModel.find({ blockedBy:userId }).distinct('blockedUser')
                        let userObj = { _id:userId, fullName, profilePic, blockedUser, blockedBy };
                        fireBaseFunction.updateFirebaseNode(userObj)
                        return common.response(res, code.EVERYTHING_IS_OK, message.USER_BLOCKED_BY_USER, data);
                    },err=>{
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

    addOrCancelFriend,
    acceptOrReject,
    getAllFriends,
    getAllFriendRequest,
    blockUnblockUser,
    followUnfollowUser

}