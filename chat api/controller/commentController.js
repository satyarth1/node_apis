var common = require('../common/common');
var code = require('../common/responseCode');
var message = require('../common/responseMessage');
var fields = require('../common/required');
var constant = require('../common/constant');
var Post = require('../models/post_model');
var mongoose = require('mongoose');
var commentModel = require('../models/comment_model');
var subCommentModel = require('../models/subComment_model');
var likeCommentModel = require('../models/likeComment_model');
var likeSubCommentModel = require('../models/likeSubComment_model');

let commentOnPost = (req, res)=>{

    let userId = req.userId;
    // let userId = "5c0f5cd4ba9ecc18f4d13b27"
    let { postId, comment } = req.body;
    let given = { postId, userId, comment };
    common.checkKeyExist(given, fields.commentOnPost)
    .then(result=>{
        if(result.length)
            return common.response(res, code.KEY_MISSING, result[0]);
        else{
            let createComment = { postId, userId, comment };
            commentModel.create(createComment)
            .then(success=>{
                return common.response(res, code.EVERYTHING_IS_OK, message.SUCCESS);
            }, err=>{
                return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR)     
            })
        }
    })
    .catch((err)=>{ return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR)})
}


let subCommentOnPost = (req, res)=>{
    
    let userId = req.userId;
    // let userId = "5c0f5cd4ba9ecc18f4d13b27"
    let { postId, comment, commentId } = req.body;
    let given = { postId, userId, comment, commentId };
    common.checkKeyExist(given, fields.subCommentOnPost)
    .then(result=>{
        if(result.length)
            return common.response(res, code.KEY_MISSING, result[0]);
        else{
            let createSubComment = { postId, userId, comment, commentId };
            subCommentModel.create(createSubComment)
            .then(success=>{
                return common.response(res, code.EVERYTHING_IS_OK, message.SUCCESS);
            }, err=>{
                return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR)     
            })
        }
    })
    .catch((err)=>{ return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR)})
}


let likeUnlikeComment = (req, res)=>{

    let { commentId, postId } = req.body;
    let userId = req.userId;
    // let userId = "5c0f5cd4ba9ecc18f4d13b27"
    let given = { userId, postId, commentId };
    common.checkKeyExist(given, fields.likeUnlikeComment)
    .then(result=>{
        if(result.length)
            return common.response(res, code.KEY_MISSING, result[0]);
        else{

            let createNewObj = { userId, postId, commentId };
            let query = { commentId };
            likeCommentModel.findOne(query).then(comment=>{
                if(comment){
                    likeCommentModel.remove(query).then(success=>{
                        let data = { isLike:false }
                        return common.response(res, code.EVERYTHING_IS_OK, message.COMMENT_UNLIKED_SUCCESSFULLY, data);
                    } ,err=>{
                        return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR) 
                    })
                }
                else{
                    likeCommentModel.create(createNewObj).then(comment=>{
                        let data = { isLike:true };
                        return common.response(res, code.EVERYTHING_IS_OK, message.COMMENT_LIKED_SUCCESSFULLY, data);
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

let likeUnlikeSubComment = (req, res)=>{

    let { postId, commentId, subCommentId } = req.body;
    let userId = req.userId;
    // let userId = "5c0f5cd4ba9ecc18f4d13b27"
    let given = { userId, postId, commentId, subCommentId };
    common.checkKeyExist(given, fields.likeUnlikeSubComment)
    .then(result=>{
        if(result.length)
            return common.response(res, code.KEY_MISSING, result[0]);
        else{

            let createNewObj = { userId, postId, commentId, subCommentId };
            let query = { subCommentId };
            likeSubCommentModel.findOne(query).then(comment=>{
                if(comment){
                    likeSubCommentModel.remove(query).then(success=>{
                        let data = { isLike:false }
                        return common.response(res, code.EVERYTHING_IS_OK, message.COMMENT_UNLIKED_SUCCESSFULLY, data);
                    } ,err=>{
                        return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR) 
                    })
                }
                else{
                    likeSubCommentModel.create(createNewObj).then(comment=>{
                        let data = { isLike:true };
                        return common.response(res, code.EVERYTHING_IS_OK, message.COMMENT_LIKED_SUCCESSFULLY, data);
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

let getAllComment = (req, res)=>{

    let { page, limit, postId } = req.body;
    let n = page || 1;
    let m = limit || 10;
    let options = {
        page:n,
        limit:m,
        lean:true,
        sortBy:{ createdAt:1 }
    }
    let userId = mongoose.Types.ObjectId(req.userId);
    // let userId = mongoose.Types.ObjectId("5c0f5cd4ba9ecc18f4d13b27");
    let given = { userId, postId };
    common.checkKeyExist(given, fields.getAllComment)
    .then(result=>{
        if(result.length)
            return common.response(res, code.KEY_MISSING, result[0]);
        else{

            let masterQuery = [
                {
                    $match:{ postId:mongoose.Types.ObjectId(postId) }
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
                        from:'subComment',
                        localField:'_id',
                        foreignField:'commentId',
                        as:'subComment'
                    }
                },
                {
                    $lookup:{
                        from:'likeComment',
                        localField:'_id',
                        foreignField:'commentId',
                        as:'likeComment'
                    }
                },
                {
                    $unwind:{
                        path: "$subComment",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup:{
                        from:'user',
                        localField:'subComment.userId',
                        foreignField:'_id',
                        as:'subComment.userDetail'
                    }
                },
                {
                    $lookup:{
                        from:'likeSubComment',
                        localField:'subComment._id',
                        foreignField:'subCommentId',
                        as:'subComment.likeSubComment'
                    }
                },
                {
                    $project:{
                        totalLike: { $cond: { if: { $isArray: "$likeComment" }, then: { $size: "$likeComment" }, else: "NA" } },
                        isLike : {
                            '$in': [ true, { $map:
                                    {
                                        input: "$likeComment",
                                        as: "comment",
                                        in: { $eq: [ "$$comment.userId", userId ] }
                                    }
                                } 
                            ]
                        },
                        userDetail:{ _id:1, fullName:1, profilePic:1 },
                        subComment:{ 
                            _id:1, 
                            comment:1, 
                            createdAt:1, 
                            updatedAt:1, 
                            timestamp:1,
                            totalLike: { $cond: { if: { $isArray: "$subComment.likeSubComment" }, then: { $size: "$subComment.likeSubComment" }, else: "NA" } },
                            isLike : {
                                '$in': [ true, { $map:
                                        {
                                            input: "$subComment.likeSubComment",
                                            as: "subcomment",
                                            in: { $eq: [ "$$subcomment.userId", userId ] }
                                        }
                                    } 
                                ]
                            },  
                            userDetail:{ _id:1, fullName:1, profilePic:1 } 
                        },
                        postId:1,
                        comment:1,
                        timestamp:1,
                        createdAt:1,
                        updatedAt:1
                    }
                },
                {
                    $unwind:{
                        path:'$subComment.userDetail',
                        preserveNullAndEmptyArrays:true
                    }
                },
                {
                    $group:{
                        _id:'$_id',
                        comment: { "$first": "$comment" },
                        postId: { "$first": "$postId" },
                        isLike: { "$first": "$isLike" },
                        totalLike: { "$first": "$totalLike" },
                        createdAt: { "$first": "$createdAt" },
                        updatedAt: { "$first": "$updatedAt" },
                        timestamp: { "$first": "$timestamp" },
                        userDetail: { "$first": "$userDetail" },
                        subComment: {
                            "$push": "$subComment"
                        },
                        
                    }
                },
                {
                    $project:{
                        totalLike:1,
                        isLike:1,
                        userDetail:1,
                        subComment:{ 
                            $cond: { 
                                if: {
                                    $and:[
                                        { $eq:[ { $size:"$subComment"}, 1 ] },
                                        { $not:[ { $arrayElemAt:['subComment', 0] }['_id'] ] },
                                    ],  
                                }, 
                                then:[], 
                                else:'$subComment' 
                            } 
                        },
                        postId:1,
                        comment:1,
                        timestamp:1,
                        createdAt:1,
                        updatedAt:1
                    }
                },
                {
                    $unwind:'$userDetail'
                }

            ]
            var aggregate = commentModel.aggregate(masterQuery);
            commentModel.aggregatePaginate(aggregate, options)
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

let getAllSubComment = (req, res)=>{
    let { commentId } = req.body;
    // let userId = mongoose.Types.ObjectId("5c0f5cd4ba9ecc18f4d13b27");
    let userId = mongoose.Types.ObjectId(req.userId);
    let given = { commentId, userId }
    common.checkKeyExist(given, fields.getAllSubComment)
    .then(result=>{
        if(result.length)
            return common.response(res, code.KEY_MISSING, result[0]);
        else{
           
            let masterQuery = [
                {
                    $match:{ commentId:{$eq:mongoose.Types.ObjectId(commentId)} }
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
                        from:'likeSubComment',
                        localField:'_id',
                        foreignField:'subCommentId',
                        as:'likeSubComment'
                    }
                },
                {
                    $project:{
                        "_id":1,
                        "comment":1,       
                        "postId":1,
                        "userId":1,
                        "commentId":1,
                        "timestamp":1,            
                        "createdAt":1,      
                        "updatedAt":1,
                        'userDetail':{ _id:1, fullName:1, profilePic:1 },
                        'totalLike': { $cond: { if: { $isArray: "$likeSubComment" }, then: { $size: "$likeSubComment" }, else: "NA" } },
                        "isLike" : {
                            '$in': [ true, { $map:
                                    {
                                        input: "$likeSubComment",
                                        as: "post",
                                        in: { $eq: [ "$$post.userId", userId ] }
                                    }
                                } 
                            ]
                        },
                    }
                },
                {
                    $unwind:{
                        path:'$userDetail',
                        preserveNullAndEmptyArrays:true
                    }
                }
            ]
            subCommentModel.aggregate(masterQuery).then(comment=>{
                return common.response(res, code.EVERYTHING_IS_OK, message.SUCCESS, comment);  
            }, err=>{  
                return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR, err)     
            })
        }
    })
    .catch((err)=>{ return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR)})

}

module.exports = {

    commentOnPost,
    subCommentOnPost,
    likeUnlikeComment,
    likeUnlikeSubComment,
    getAllComment,
    getAllSubComment
}