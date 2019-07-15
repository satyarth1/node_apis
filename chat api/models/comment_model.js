var mongoose = require('../config/connection');
var mongoosePaginate = require('mongoose-paginate');
var mongooseAggregatePaginate = require('mongoose-aggregate-paginate');
var Schema = mongoose.Schema;

var commentSchema = new Schema({

    userId:{
        type:Schema.Types.ObjectId, ref:'user'
    },
    postId:{
        type:Schema.Types.ObjectId, ref:'post'
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

commentSchema.plugin(mongoosePaginate);
commentSchema.plugin(mongooseAggregatePaginate);

var commentModel = mongoose.model('comment', commentSchema, 'comment');
module.exports = commentModel;

