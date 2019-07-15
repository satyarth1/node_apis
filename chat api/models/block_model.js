var mongoose = require('../config/connection');
var mongoosePaginate = require('mongoose-paginate');
var mongooseAggregatePaginate = require('mongoose-aggregate-paginate');
var Schema = mongoose.Schema;

var blockSchema = new Schema({

    blockedUser:{
        type:Schema.Types.ObjectId, ref:'user'
    },
    blockedBy:{
        type:Schema.Types.ObjectId, ref:'post'
    },
    timestamp:{ 
        type:Number, default:Date.now
    }
}, {
    timestamps:true
})

blockSchema.plugin(mongoosePaginate);
blockSchema.plugin(mongooseAggregatePaginate);

var blockModel = mongoose.model('blockUser', blockSchema, 'blockUser');
module.exports = blockModel;

