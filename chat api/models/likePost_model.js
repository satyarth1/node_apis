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
    emoji:{ 
        type:String, default:""
    },
    timestamp:{ 
        type:Number, default:Date.now
    }
}, {
    timestamps:true
})

likeSchema.plugin(mongoosePaginate);
likeSchema.plugin(mongooseAggregatePaginate);

var likeModel = mongoose.model('likePost', likeSchema, 'likePost');
module.exports = likeModel;

