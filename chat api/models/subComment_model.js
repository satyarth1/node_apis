var mongoose = require('../config/connection');
var mongoosePaginate = require('mongoose-paginate');
var mongooseAggregatePaginate = require('mongoose-aggregate-paginate');
var Schema = mongoose.Schema;

var subCommentSchema = new Schema({

    userId:{
        type:Schema.Types.ObjectId, ref:'user'
    },
    postId:{
        type:Schema.Types.ObjectId, ref:'post'
    },
    commentId:{
        type:Schema.Types.ObjectId, ref:'subComment'
    },
    comment:{ 
        type:String, default:""
    },
    timestamp:{ 
        type:Number, default:Date.now
    }
}, {
    timestamps:true
})

subCommentSchema.plugin(mongoosePaginate);
subCommentSchema.plugin(mongooseAggregatePaginate);

var commentModel = mongoose.model('subComment', subCommentSchema, 'subComment');
module.exports = commentModel;

