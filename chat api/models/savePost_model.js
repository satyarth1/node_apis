var mongoose = require('../config/connection');
var mongoosePaginate = require('mongoose-paginate');
var mongooseAggregatePaginate = require('mongoose-aggregate-paginate');
var Schema = mongoose.Schema;

var saveSchema = new Schema({

    userId:{
        type:Schema.Types.ObjectId, ref:'user'
    },
    postId:{
        type:Schema.Types.ObjectId, ref:'post'
    },
    timestamp:{ 
        type:Number, default:Date.now
    }
}, {
    timestamps:true
})

saveSchema.plugin(mongoosePaginate);
saveSchema.plugin(mongooseAggregatePaginate);

var saveModel = mongoose.model('savePost', saveSchema, 'savePost');
module.exports = saveModel;

