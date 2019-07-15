var mongoose = require('../config/connection');
var mongoosePaginate = require('mongoose-paginate');
var mongooseAggregatePaginate = require('mongoose-aggregate-paginate');
var Schema = mongoose.Schema;

var shareSchema = new Schema({

    userId:{
        type:Schema.Types.ObjectId, ref:'user'
    },
    postId:{
        type:Schema.Types.ObjectId, ref:'post'
    },
    shareText:{ 
        type:String, default:""
    },
    timestamp:{ 
        type:Number, default:Date.now
    }
}, {
    timestamps:true
})

shareSchema.plugin(mongoosePaginate);
shareSchema.plugin(mongooseAggregatePaginate);

var shareModel = mongoose.model('sharePost', shareSchema, 'sharePost');
module.exports = shareModel;

