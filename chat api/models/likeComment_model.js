var mongoose = require('../config/connection');
var mongoosePaginate = require('mongoose-paginate');
var mongooseAggregatePaginate = require('mongoose-aggregate-paginate');
var Schema = mongoose.Schema;

var likeSchema = new Schema({

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

likeSchema.plugin(mongoosePaginate);
likeSchema.plugin(mongooseAggregatePaginate);

var likeCommentModel = mongoose.model('likeComment', likeSchema, 'likeComment');
module.exports = likeCommentModel;

