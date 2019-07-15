var mongoose = require('../config/connection');
var mongoosePaginate = require('mongoose-paginate');
var mongooseAggregatePaginate = require('mongoose-aggregate-paginate');
var Schema = mongoose.Schema;

var followSchema = new Schema({

    followedUser:{
        type:Schema.Types.ObjectId, ref:'user'
    },
    followedBy:{
        type:Schema.Types.ObjectId, ref:'post'
    },
    timestamp:{ 
        type:Number, default:Date.now
    }
}, {
    timestamps:true
})

followSchema.plugin(mongoosePaginate);
followSchema.plugin(mongooseAggregatePaginate);

var followModel = mongoose.model('followUser', followSchema, 'followUser');
module.exports = followModel;

