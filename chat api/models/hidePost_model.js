var mongoose = require('../config/connection');
var mongoosePaginate = require('mongoose-paginate');
var mongooseAggregatePaginate = require('mongoose-aggregate-paginate');
var Schema = mongoose.Schema;

var hideSchema = new Schema({

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

hideSchema.plugin(mongoosePaginate);
hideSchema.plugin(mongooseAggregatePaginate);

var hideModel = mongoose.model('hidePost', hideSchema, 'hidePost');
module.exports = hideModel;

