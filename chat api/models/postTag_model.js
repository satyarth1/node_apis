var mongoose = require('../config/connection');
var mongoosePaginate = require('mongoose-paginate');
var mongooseAggregatePaginate = require('mongoose-aggregate-paginate');
var Schema = mongoose.Schema;

var tagSchema = new Schema({

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

tagSchema.plugin(mongoosePaginate);
tagSchema.plugin(mongooseAggregatePaginate);

var tagModel = mongoose.model('tagPost', tagSchema, 'tagPost');
module.exports = tagModel;

