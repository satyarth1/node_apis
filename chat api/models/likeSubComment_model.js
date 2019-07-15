var mongoose = require('../config/connection');
var mongoosePaginate = require('mongoose-paginate');
var mongooseAggregatePaginate = require('mongoose-aggregate-paginate');
var Schema = mongoose.Schema;

var likeSubSchema = new Schema({

    userId:{
        type:Schema.Types.ObjectId, ref:'user'
    },
    postId:{
        type:Schema.Types.ObjectId, ref:'post'
    },
    commentId:{
        type:Schema.Types.ObjectId, ref:'comment'
    },
    subCommentId:{
        type:Schema.Types.ObjectId, ref:'subComment'
    },
    timestamp:{ 
        type:Number, default:Date.now
    }
}, {
    timestamps:true
})

likeSubSchema.plugin(mongoosePaginate);
likeSubSchema.plugin(mongooseAggregatePaginate);

var likeCommentModel = mongoose.model('likeSubComment', likeSubSchema, 'likeSubComment');
module.exports = likeCommentModel;

