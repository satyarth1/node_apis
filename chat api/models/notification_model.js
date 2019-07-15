var mongoose = require('../config/connection');
var mongoosePaginate = require('mongoose-paginate');
var mongooseAggregatePaginate = require('mongoose-aggregate-paginate');
var Schema = mongoose.Schema;

var notificationSchema = new Schema({

    title:{
        type:String, default:""
    },
    message:{
        type:String, default:""
    },
    userId:{
        type:Schema.Types.ObjectId, ref:'user'
    },
    notificationType:{
        type:String
    },
    timestamp:{ 
        type:Number, default:Date.now
    }
}, {
    timestamps:true
})

notificationSchema.plugin(mongoosePaginate);
notificationSchema.plugin(mongooseAggregatePaginate);

var notificationModel = mongoose.model('notification', notificationSchema, 'notification');
module.exports = notificationModel;

