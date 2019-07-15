var common = require('../common/common');
var code = require('../common/responseCode');
var message = require('../common/responseMessage');
var fields = require('../common/required');
var User = require('../models/user_model');
var constant = require('../common/constant');
var Post = require('../models/post_model');
var mongoose = require('mongoose');
var FriendRequest = require('../models/friendRequest_model');
var sharePostModel = require('../models/share_model');
var likePostModel = require('../models/likePost_model')
var blockModel = require('../models/block_model');
var followModel = require('../models/follow_model');
var shareModel = require('../models/share_model');
var postTagModel = require('../models/postTag_model');
var savePostModel = require('../models/savePost_model');
var hidePostModel = require('../models/hidePost_model');
var notificationController = require('./notificationController');
const async = require('async');

let createPost =  (req, res)=>{

    let fullName = req.fullName;

    let { postStory, postAddress, lat, long, postTag, postShowType } = req.body;
    let userId = mongoose.Types.ObjectId(req.userId);
    // let userId = mongoose.Types.ObjectId("5c0f5cd4ba9ecc18f4d13b27");
    let reqFields;
    let createPost = {
        userId,
        postImage:[]
    }
    if((req.files['postImage'] && req.files.postImage.length) || req.files['postVideo'] && req.files.postVideo.length){
        given = { userId };
        reqFields = fields.createPostWithFile;
    }
    else{
        given = { userId, postStory };
        reqFields = fields.createPostWithOutFile
    }
    if(postStory)
        createPost['postStory'] = postStory;
    if(postAddress)
        createPost['postAddress'] = postAddress;
    if(postShowType)
        createPost['postShowType'] = postShowType;
    if(lat || long)
        createPost['location.coordinates'] = [long, lat];
    common.checkKeyExist(given, reqFields)
    .then(async result=>{
        if(result.length)
            return common.response(res, code.KEY_MISSING, result[0]);
        else{
            if(req.files['postImage'] && req.files.postImage.length){
                    req.files.postImage.map((x)=> {
                        createPost['postImage'].push(x.filename)
                    });
            }
            if(req.files['postVideo'] && req.files.postVideo.length){
                createPost['thumbnail'] = await common.createThumbnail('postVideo', req.files.postVideo[0].filename);
                createPost['postVideo'] = req.files.postVideo[0].filename
            }

            Post.create(createPost)
            .then(post=>{
                let { _id } = post;
                common.response(res, code.EVERYTHING_IS_OK, message.POST_UPLOAD_SUCCESSFULLY);
                if(JSON.parse(postTag).length){
                    async.forEachOf(JSON.parse(postTag), function (value, index, callback) {
                        let newTag = { userId:value, postId:_id }
                        postTagModel.create(newTag)
                        .then(tag=>{
                            callback();  
                        }, err=>{
                            console.log("Error occour while create tag documents.");     
                        });
                    },(err)=>{
                        if (err)
                            console.log("async loop not working.");
                        else{
                            let text = "Post Created";
                            let msg = `${ fullName } created a post.`;
                            console.log("Tag friend successfully");
                            notificationController.sendAllNotification(userId, _id, text, msg);
                        }
                    });
                }
            }, err=>{
                return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR, err)     
            });
        }
    })
    .catch(err=> { return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR)})

}

let getAllUserPost =  (req, res)=>{
    
    let { page, limit, isHide, isSaved } = req.body;
    let userId = mongoose.Types.ObjectId(req.userId);
    // let userId = mongoose.Types.ObjectId("5c0f5cd4ba9ecc18f4d13b27");
    // let userId = mongoose.Types.ObjectId("5c0f5ce7ba9ecc18f4d13b28");
    let query;
    if(isHide == 'true'){
        query = { 'hidePost.userId':{ $eq:userId } }
    }
    else if(isSaved == 'true'){
        query = { 'savePost.userId':{ $eq:userId } }
    }
    else{
        query = { 'hidePost.userId':{ $ne:userId } }
    }
    let given = { userId }
    let n = page || 1;
    let m = limit || 10;
    common.checkKeyExist(given, fields.getAllUserPost)
    .then(async result=>{
        if(result.length)
            return common.response(res, code.KEY_MISSING, result[0]);
        else{
            let friendList = []
            let blockedUser = [];
            let options = {
                page:n,
                limit:m,
                sortBy:{ createdAt:-1 }
            }

            // get Friend List
            
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
                friend[0].items.push(userId)
                friendList = friend[0].items
            }
            else{
                friendList = [userId]
            }

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

            // get Follow User List

            let followedUser = await followModel.find({ followedBy:userId }).distinct('followedUser');
            
            let masterQuery = [
                {
                    $match:{ userId:{ $in:followedUser.concat(friendList) }, postShowType:{ $ne:"Only me" } }
                },
                {
                    $match:{ userId:{ $nin:blockedUser } }
                },
                {
                    $lookup:{
                        from:'hidePost',
                        localField:'_id',
                        foreignField:'postId',
                        as:'hidePost'
                    }
                },
                {
                    $lookup:{
                        from:'savePost',
                        localField:'_id',
                        foreignField:'postId',
                        as:'savePost'
                    }
                },
                {
                    $match:query
                },
                {
                    $lookup:{
                        from:'tagPost',
                        localField:'_id',
                        foreignField:'postId',
                        as:'postTag'
                    }
                },
                {
                    $lookup:{
                        from:'user',
                        localField:'postTag.userId',
                        foreignField:'_id',
                        as:'postTag'
                    }
                },
                { 
                    $lookup:{
                        from:'user',
                        localField:'userId',
                        foreignField:'_id',
                        as:'userDetail'
                    }
                },
                {
                    $lookup:{
                        from:'user',
                        localField:'postShareId',
                        foreignField:'_id',
                        as:'postShareDetail'
                    }
                },
                {
                    $lookup:{
                        from:'likePost',
                        localField:'_id',
                        foreignField:'postId',
                        as:'postLike'
                    }
                },
                {
                    $lookup:{
                        from:'comment',
                        localField:'_id',
                        foreignField:'postId',
                        as:'postComment'
                    }
                },
                {
                    $lookup:{
                        from:'sharePost',
                        localField:'_id',
                        foreignField:'postId',
                        as:'postShare'
                    }
                },
                { 
                    $project : {

                        'postImage':1,
                        'postVideo':1,
                        'thumbnail':1,
                        'postShowType':1,
                        'postAddress':1,
                        'postStory':1,
                        'LikeArray':{ userId:1, postId:1 },
                        'userDetail':{ _id:1, fullName:1, profilePic:1 },
                        'postTag._id':1,
                        'postTag.fullName':1,
                        'postTag.profilePic':1,
                        'totalComment': { $cond: { if: { $isArray: "$postComment" }, then: { $size: "$postComment" }, else: "NA" } },
                        'totalShare': { $cond: { if: { $isArray: "$postShare" }, then: { $size: "$postShare" }, else: "NA" } },
                        'totalLike': { $cond: { if: { $isArray: "$postLike" }, then: { $size: "$postLike" }, else: "NA" } },
                        "isLike" : {
                            '$in': [ true, { $map:
                                    {
                                        input: "$postLike",
                                        as: "post",
                                        in: { $eq: [ "$$post.userId", userId ] }
                                    }
                                } 
                            ]
                        },
                        "postShareDetail":{  
                            $cond: { 
                                if: { 
                                    $size: "$postShareDetail" 
                                }, 
                                then:{ 
                                    _id:{ $arrayElemAt: [ "$postShareDetail._id", 0 ] },
                                    fullName:{ $arrayElemAt: [ "$postShareDetail.fullName", 0 ] },
                                    profilePic:{ $arrayElemAt: [ "$postShareDetail.profilePic", 0 ] } 
                                }, 
                                else: { } 
                            } 
                        },
                        'postLike':1,
                        "emoji":{  
                            $cond: { 
                                if: { 
                                    $size: "$postLike" 
                                }, 
                                then:{ 
                                    $arrayElemAt: [ "$postLike.emoji", 0 ] 
                                }, 
                                else: "" 
                            } 
                        },
                        'isShare':1,
                        'shareText':1,
                        'postCreatedAt':1,
                        'postUpdatedAt':1,
                        'postTimeStamp':1,
                        'timestamp':1,
                        'createdAt':1,
                        'updatedAt':1
                    } 
                
                },
                {
                    $unwind:'$userDetail'
                }
                
            ]
            var aggregate = Post.aggregate(masterQuery);
            Post.aggregatePaginate(aggregate, options)
            .then(value=>{
                let finalResult = {
                    docs:value.data,
                    page:n,
                    limit:m,
                    pages:value.pageCount,
                    total:value.totalCount
                }
                return common.response(res, code.EVERYTHING_IS_OK, message.SUCCESS, finalResult);  
            }, err=>{  
                return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR, err)     
            });
            
        }
    })
    .catch(err=> { return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR)})
}



let getAllSearchUserPost = (req, res)=>{

    let { searchUserId, page, limit } = req.body;
    let userId = mongoose.Types.ObjectId(req.userId);
    // let userId = mongoose.Types.ObjectId("5c0f5cd4ba9ecc18f4d13b27");
    // let userId = mongoose.Types.ObjectId("5c0f5ce7ba9ecc18f4d13b28");
    let given = { userId, searchUserId };
    let n = page || 1, m = limit || 10;
    common.checkKeyExist(given, fields.getAllSearchUserPost)
    .then(result=>{
        if(result.length)
            return common.response(res, code.KEY_MISSING, result[0]);
        else{
            let query  = { $or:[
                { sendTo:userId, sendBy:mongoose.Types.ObjectId(searchUserId) },
                { sendTo:mongoose.Types.ObjectId(searchUserId), sendBy:userId }
            ]}
            let masterQuery = { userId:mongoose.Types.ObjectId(searchUserId) }
            FriendRequest.findOne(query)
            .then(friend=>{
                masterQuery.postShowType = { $in:["Public"] }
                if(friend && friend.status == 'ACCEPT'){
                    masterQuery.postShowType.$in.push("Friends")
                }
                let options = {
                    page:n,
                    limit:m,
                    sortBy:{ createdAt:-1 }
                }
                let masterQuery1 = [
                    {
                        $match:masterQuery
                    },
                    {
                        $lookup:{
                            from:'hidePost',
                            localField:'_id',
                            foreignField:'postId',
                            as:'hidePost'
                        }
                    },
                    {
                        $match:{ 'hidePost.userId':{ $ne:mongoose.Types.ObjectId(searchUserId) } }
                    },
                    {
                        $lookup:{
                            from:'tagPost',
                            localField:'_id',
                            foreignField:'postId',
                            as:'postTag'
                        }
                    },
                    {
                        $lookup:{
                            from:'user',
                            localField:'postTag.userId',
                            foreignField:'_id',
                            as:'postTag'
                        }
                    },
                    { 
                        $lookup:{
                            from:'user',
                            localField:'userId',
                            foreignField:'_id',
                            as:'userDetail'
                        }
                    },
                    {
                        $lookup:{
                            from:'user',
                            localField:'postShareId',
                            foreignField:'_id',
                            as:'postShareDetail'
                        }
                    },
                    {
                        $lookup:{
                            from:'likePost',
                            localField:'_id',
                            foreignField:'postId',
                            as:'postLike'
                        }
                    },
                    {
                        $lookup:{
                            from:'comment',
                            localField:'_id',
                            foreignField:'postId',
                            as:'postComment'
                        }
                    },
                    {
                        $lookup:{
                            from:'sharePost',
                            localField:'_id',
                            foreignField:'postId',
                            as:'postShare'
                        }
                    },
                    { 
                        $project : {

                            'postImage':1,
                            'postVideo':1,
                            'thumbnail':1,
                            'postShowType':1,
                            'postAddress':1,
                            'postStory':1,
                            'LikeArray':{ userId:1, postId:1 },
                            'userDetail':{ _id:1, fullName:1, profilePic:1 },
                            'postTag._id':1,
                            'postTag.fullName':1,
                            'postTag.profilePic':1,
                            'totalComment': { $cond: { if: { $isArray: "$postComment" }, then: { $size: "$postComment" }, else: "NA" } },
                            'totalShare': { $cond: { if: { $isArray: "$postShare" }, then: { $size: "$postShare" }, else: "NA" } },
                            'totalLike': { $cond: { if: { $isArray: "$postLike" }, then: { $size: "$postLike" }, else: "NA" } },
                            "isLike" : {
                                '$in': [ true, { $map:
                                        {
                                            input: "$postLike",
                                            as: "post",
                                            in: { $eq: [ "$$post.userId", userId ] }
                                        }
                                    } 
                                ]
                            },
                            "postShareDetail":{  
                                $cond: { 
                                    if: { 
                                        $size: "$postShareDetail" 
                                    }, 
                                    then:{ 
                                        _id:{ $arrayElemAt: [ "$postShareDetail._id", 0 ] },
                                        fullName:{ $arrayElemAt: [ "$postShareDetail.fullName", 0 ] },
                                        profilePic:{ $arrayElemAt: [ "$postShareDetail.profilePic", 0 ] } 
                                    }, 
                                    else: { } 
                                } 
                            },
                            'postLike':1,
                            "emoji":{  
                                $cond: { 
                                    if: { 
                                        $size: "$postLike" 
                                    }, 
                                    then:{ 
                                        $arrayElemAt: [ "$postLike.emoji", 0 ] 
                                    }, 
                                    else: "" 
                                } 
                            },
                            'isShare':1,
                            'shareText':1,
                            'postCreatedAt':1,
                            'postUpdatedAt':1,
                            'postTimeStamp':1,
                            'timestamp':1,
                            'createdAt':1,
                            'updatedAt':1
                        } 
                    
                    },
                    {
                        $unwind:'$userDetail'
                    }
                ]
                var aggregate = Post.aggregate(masterQuery1);
                Post.aggregatePaginate(aggregate, options)
                .then(value=>{
                    let finalResult = {
                        docs:value.data,
                        page:n,
                        limit:m,
                        pages:value.pageCount,
                        total:value.totalCount
                    }
                    return common.response(res, code.EVERYTHING_IS_OK, message.SUCCESS, finalResult);  
                }, err=>{  
                    return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR, err)     
                });

            }, err=>{
                return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR)     
            })
        }
    })
    .catch(err=> { return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR)})

}



let hideUnhidePost = (req, res)=>{

    let { postId } = req.body;
    let userId = mongoose.Types.ObjectId(req.userId);
    // let userId = mongoose.Types.ObjectId("5c0f5cd4ba9ecc18f4d13b27");
    // let userId = mongoose.Types.ObjectId("5c0f5ce7ba9ecc18f4d13b28");
    let given = { userId, postId };
        common.checkKeyExist(given, fields.hideUnhidePost)
    .then(result=>{
        if(result.length)
            return common.response(res, code.KEY_MISSING, result[0]);
        else{
            let data = { };
            let createNewObj = { postId, userId };
            let query = { postId, userId };
            hidePostModel.findOne(query).then(hide=>{
                if(hide){
                    hidePostModel.remove(query).then(success=>{
                        data.isHide = false;
                        return common.response(res, code.EVERYTHING_IS_OK, message.POST_UNHIDE_SUCCESSFULLY, data);
                    } ,err=>{
                        return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR) 
                    })
                }
                else{

                    hidePostModel.create(createNewObj).then(hide=>{
                        data.isHide = true;
                        return common.response(res, code.EVERYTHING_IS_OK, message.POST_HIDE_SUCCESSFULLY, data);
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


let saveUnsavePost = (req, res)=>{

    let { postId, requestType } = req.body;
    let userId = mongoose.Types.ObjectId(req.userId);
    // let userId = mongoose.Types.ObjectId("5c0f5cd4ba9ecc18f4d13b27");
    // let userId = mongoose.Types.ObjectId("5c0f5ce7ba9ecc18f4d13b28");
    let given = { userId, postId, requestType };
    common.checkKeyExist(given, fields.saveUnsavePost)
    .then(result=>{
        if(result.length)
            return common.response(res, code.KEY_MISSING, result[0]);
        else{
            let data = { };
            let createNewObj = { postId, userId };
            let query = { postId, userId };
            savePostModel.findOne(query).then(hide=>{
                if(hide){
                    if(requestType == "true"){
                        data.isSave = true;
                        return common.response(res, code.EVERYTHING_IS_OK, message.POST_ALREADY_SAVED, data);
                    }
                    else if(requestType == "false"){

                        savePostModel.remove(query).then(success=>{
                            data.isSave = false;
                            return common.response(res, code.EVERYTHING_IS_OK, message.POST_UNSAVED_SUCCESSFULLY, data);
                        } ,err=>{
                            return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR) 
                        })
                    }
                    else
                        return common.response(res, code.KEY_MISSING, message.INVALID_REQUEST_TYPE);
                }
                else{

                    savePostModel.create(createNewObj)
                    .then(hide=>{
                        data.isSave = true;
                        return common.response(res, code.EVERYTHING_IS_OK, message.POST_SAVED_SUCCESSFULLY, data);
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


// let hideUnhidePost = (req, res)=>{

//     let { postId } = req.body;
//     let userId = req.userId;
//     let given = { userId, postId };
//     let data =  {}
//     common.checkKeyExist(given, fields.hideUnhidePost)
//     .then(result=>{
//         if(result.length)
//             return common.response(res, code.KEY_MISSING, result[0]);
//         else{
//             let updateObject = {  }
//             let msg;
//             Post.findOne({ _id:postId, isHide:userId })
//             .then(firstResult=>{
//                 if(firstResult){
//                     data.isHide = false;
//                     msg = message.POST_UNHIDE_SUCCESSFULLY;
//                     updateObject.$pull = { isHide:userId }
//                 }
//                 else{
//                     data.isHide = true;
//                     msg = message.POST_HIDE_SUCCESSFULLY;
//                     updateObject.$addToSet = { isHide:{ $each:[userId] } };
//                 }
//                 Post.findByIdAndUpdate(postId, updateObject, { new:true })
//                 .then(post=>{
//                     if(post)
//                         return common.response(res, code.EVERYTHING_IS_OK, msg, data);
//                     else
//                         return common.response(res, code.KEY_MISSING, message.POST_NOT_EXISTS);
//                 }, err=>{
//                     return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR) 
//                 })
//             }, err=>{
//                 return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR) 
//             })
//         }
//     })
//     .catch(err=> { return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR)})
// }

// let saveUnsavePost = (req, res)=>{

//     let { postId } = req.body;
//     let userId = req.userId;
//     let given = { userId, postId };
//     let data =  {}
//     common.checkKeyExist(given, fields.saveUnsavePost)
//     .then(result=>{
//         if(result.length)
//             return common.response(res, code.KEY_MISSING, result[0]);
//         else{
//             let updateObject = {  }
//             let msg;
//             Post.findOne({ _id:postId, isSaved:userId })
//             .then(firstResult=>{
//                 if(firstResult){
//                     data.isSaved = false;
//                     msg = message.POST_UNSAVED_SUCCESSFULLY;
//                     updateObject.$pull = { isSaved:userId }
//                 }
//                 else{
//                     data.isSaved = true;
//                     msg = message.POST_SAVED_SUCCESSFULLY;
//                     updateObject.$addToSet = { isSaved:{ $each:[userId] } };
//                 }
//                 Post.findByIdAndUpdate(postId, updateObject, { new:true })
//                 .then(post=>{
//                     if(post)
//                         return common.response(res, code.EVERYTHING_IS_OK, msg, data);
//                     else
//                         return common.response(res, code.KEY_MISSING, message.POST_NOT_EXISTS);
//                 }, err=>{
//                     return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR) 
//                 })
//             }, err=>{
//                 return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR) 
//             })
//         }
//     })
//     .catch(err=> { return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR)})
// }

let getPostDetail = (req, res)=>{

    let { postId } = req.query;
    let userId = mongoose.Types.ObjectId(req.userId);
    // let userId = mongoose.Types.ObjectId("5c0f5cd4ba9ecc18f4d13b27");
    let given = { userId, postId }
    common.checkKeyExist(given, fields.getPostDetail)
    .then( async result=>{
        if(result.length)
            return common.response(res, code.KEY_MISSING, result[0]);
        else{
           
            Post.findById(postId)
            .then( async post=>{
                if(post){

                let friendList = []
                let blockedUser = [];

                // get Friend List
                
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
                    friend[0].items.push(userId)
                    friendList = friend[0].items
                }
                else{
                    friendList = [userId]
                }

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

                // get Follow User List

                let followedUser = await followModel.find({ followedBy:userId }).distinct('followedUser');
                        
                        let masterQuery = [
                            {
                                $match:{ 
                                    userId:{ $in:followedUser.concat(friendList) }, 
                                    postShowType:{ $ne:"Only me" } }
                            },
                            {
                                $match:{ userId:{ $nin:blockedUser } }
                            },
                            {
                                $lookup:{
                                    from:'tagPost',
                                    localField:'_id',
                                    foreignField:'postId',
                                    as:'postTag'
                                }
                            },
                            {
                                $lookup:{
                                    from:'user',
                                    localField:'postTag.userId',
                                    foreignField:'_id',
                                    as:'postTag'
                                }
                            },
                            { 
                                $lookup:{
                                    from:'user',
                                    localField:'userId',
                                    foreignField:'_id',
                                    as:'userDetail'
                                }
                            },
                            {
                                $lookup:{
                                    from:'user',
                                    localField:'postShareId',
                                    foreignField:'_id',
                                    as:'postShareDetail'
                                }
                            },
                            {
                                $lookup:{
                                    from:'likePost',
                                    localField:'_id',
                                    foreignField:'postId',
                                    as:'postLike'
                                }
                            },
                            {
                                $lookup:{
                                    from:'comment',
                                    localField:'_id',
                                    foreignField:'postId',
                                    as:'postComment'
                                }
                            },
                            {
                                $lookup:{
                                    from:'sharePost',
                                    localField:'_id',
                                    foreignField:'postId',
                                    as:'postShare'
                                }
                            },
                            { 
                                $project : {

                                    'postImage':1,
                                    'postVideo':1,
                                    'thumbnail':1,
                                    'postShowType':1,
                                    'postAddress':1,
                                    'postStory':1,
                                    'LikeArray':{ userId:1, postId:1 },
                                    'userDetail':{ _id:1, fullName:1, profilePic:1 },
                                    'postTag._id':1,
                                    'postTag.fullName':1,
                                    'postTag.profilePic':1,
                                    'totalComment': { $cond: { if: { $isArray: "$postComment" }, then: { $size: "$postComment" }, else: "NA" } },
                                    'totalShare': { $cond: { if: { $isArray: "$postShare" }, then: { $size: "$postShare" }, else: "NA" } },
                                    'totalLike': { $cond: { if: { $isArray: "$postLike" }, then: { $size: "$postLike" }, else: "NA" } },
                                    "isLike" : {
                                        '$in': [ true, { $map:
                                                {
                                                    input: "$postLike",
                                                    as: "post",
                                                    in: { $eq: [ "$$post.userId", userId ] }
                                                }
                                            } 
                                        ]
                                    },
                                    "postShareDetail":{  
                                        $cond: { 
                                            if: { 
                                                $size: "$postShareDetail" 
                                            }, 
                                            then:{ 
                                                _id:{ $arrayElemAt: [ "$postShareDetail._id", 0 ] },
                                                fullName:{ $arrayElemAt: [ "$postShareDetail.fullName", 0 ] },
                                                profilePic:{ $arrayElemAt: [ "$postShareDetail.profilePic", 0 ] } 
                                            }, 
                                            else: { } 
                                        } 
                                    },
                                    'postLike':1,
                                    "emoji":{  
                                        $cond: { 
                                            if: { 
                                                $size: "$postLike" 
                                            }, 
                                            then:{ 
                                                $arrayElemAt: [ "$postLike.emoji", 0 ] 
                                            }, 
                                            else: "" 
                                        } 
                                    },
                                    'isShare':1,
                                    'shareText':1,
                                    'postCreatedAt':1,
                                    'postUpdatedAt':1,
                                    'postTimeStamp':1,
                                    'timestamp':1,
                                    'createdAt':1,
                                    'updatedAt':1
                                } 
                            
                            },
                            {
                                $unwind:'$userDetail'
                            }
                        
                        ]
                        Post.aggregate(masterQuery)
                        .then(value=>{
                            if(value.length)
                                return common.response(res, code.EVERYTHING_IS_OK, message.SUCCESS, value[0]);
                            else
                                return common.response(res, code.KEY_MISSING, message.POST_NOT_EXISTS);
                        }, err=>{  
                            return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR, err)     
                        });
                }
                else
                    return common.response(res, code.KEY_MISSING, message.POST_NOT_EXISTS);
            })
            
        }
    })
    .catch(err=> { return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR)})

}

let sharePost = (req, res)=>{

    let { postId, shareText } = req.body;
    let userId = req.userId;
    // let userId = "5c0f5ce7ba9ecc18f4d13b28"
    // let userId =  "5c0f5cd4ba9ecc18f4d13b27";
    let given = { userId, postId };
    common.checkKeyExist(given, fields.sharePost)
    .then(result=>{
        if(result.length)
            return common.response(res, code.KEY_MISSING, result[0]);
        else{
            shareModel.findOne({userId, postId})
            .then(share=>{
                if(share){
                    return common.response(res, code.KEY_MISSING, message.POST_ALREADY_SHARED);
                }
                else{
                    let createNewObj = { userId, postId, shareText };
                    sharePostModel.create(createNewObj).then(post=>{
                        Post.findById(postId).lean().then(oldPost=>{
                            delete oldPost['_id'];
                            oldPost.postTimeStamp = Date.now(oldPost['timestamp']);
                            oldPost.postCreatedAt = new Date(oldPost.createdAt);
                            oldPost.postUpdatedAt = new Date(oldPost.updatedAt);
                            oldPost.shareText = shareText;
                            oldPost.isShare = true;
                            oldPost.postShareId = oldPost.userId;
                            oldPost.userId = userId
                            delete oldPost['createdAt'];
                            delete oldPost['updatedAt'];
                            delete oldPost['timestamp'];
                            Post.create(oldPost)
                            .then(post=>{
                                return common.response(res, code.EVERYTHING_IS_OK, message.POST_SHARED_SUCCESSFULLY);
                            }, err=>{
                                return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR, err)     
                            });
                        },err=>{
        
                        return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR) 
                    })
                    },err=>{
                        return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR) 
                    })
                }
            },err=>{
                return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR) 
            }) 
        }
    })
    .catch(err=> { return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR)})
}

let likeUnlikePost = (req, res)=>{

    let { postId, emoji, requestType } = req.body;
    let userId = req.userId;
    // let userId = "5c0f5cd4ba9ecc18f4d13b27";
    let given = { userId, postId, requestType };
    common.checkKeyExist(given, fields.likeUnlikePost)
    .then(result=>{
        if(result.length)
            return common.response(res, code.KEY_MISSING, result[0]);
        else{

            let createNewObj = { userId, postId, emoji };
            let query = { postId, userId };
            likePostModel.findOne(query).then(post=>{
                if(post){
                    if(requestType == 'like'){
                        likePostModel.findOneAndUpdate(query,  { emoji }).then(post=>{
                            let data = { isLike:true, emoji };
                            return common.response(res, code.EVERYTHING_IS_OK, message.POST_LIKED_SUCCESSFULLY, data);
                        },err=>{
                            return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR) 
                        })
                    }
                    else if(requestType == 'unlike'){

                        likePostModel.remove(query).then(success=>{
                            let data = { isLike:false, emoji:'' }
                            return common.response(res, code.EVERYTHING_IS_OK, message.POST_UNLIKED_SUCCESSFULLY, data);
                        } ,err=>{
                            return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR) 
                        })
                    }
                    else{
                        return common.response(res, code.KEY_MISSING, message.INVALID_REQUEST_TYPE);
                    }
                    
                }
                else{
                    if(requestType == 'like'){
                        likePostModel.create(createNewObj).then(post=>{
                            let data = { isLike:true, emoji };
                            return common.response(res, code.EVERYTHING_IS_OK, message.POST_LIKED_SUCCESSFULLY, data);
                        },err=>{
                            return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR) 
                        })
                    }
                    else{
                        let data = { isLike:false, emoji:'' }
                        return common.response(res, code.EVERYTHING_IS_OK, message.POST_ALREADY_UNLIKED_SUCCESSFULLY, data);
                    }
                }
            }, err=>{
                return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR) 
            })  
        }
    })
    .catch(err=> { return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR)})
}


module.exports = {

    createPost,
    getAllUserPost,
    likeUnlikePost,
    getAllSearchUserPost,
    hideUnhidePost,
    saveUnsavePost,
    getPostDetail,
    sharePost
}


