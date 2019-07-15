var mongoose = require('../config/connection');
var mongoosePaginate = require('mongoose-paginate');
var mongooseAggregatePaginate = require('mongoose-aggregate-paginate');
var Schema = mongoose.Schema;

var friendSchema = new Schema({

    sendBy:{
        type:Schema.Types.ObjectId, ref:'user'
    },
    sendTo:{
        type:Schema.Types.ObjectId, ref:'user'
    },
    status:{
        type:String,
        enum:['PENDING', 'ACCEPT'],
        default:"PENDING" // not accept
    }
}, {
    timestamps:true
})

friendSchema.plugin(mongoosePaginate);
friendSchema.plugin(mongooseAggregatePaginate);

var friendModel = mongoose.model('friend', friendSchema, 'friend');
module.exports = friendModel;

