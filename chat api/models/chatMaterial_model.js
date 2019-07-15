var mongoose = require('../config/connection');
var mongoosePaginate = require('mongoose-paginate');
var mongooseAggregatePaginate = require('mongoose-aggregate-paginate');
var Schema = mongoose.Schema;

var chatMaterialSchema = new Schema({

    userId:{
        type:Schema.Types.ObjectId, ref:'user'
    },
    image:{
        type:Array
    },
    video:{
        type:String, default:""
    },
    file:{
        type:String, default:""
    },
    type:{
        type:String, enum:['video', 'image', 'file']
    },  
    thumbnail:{
        type:String, default:""
    },
    groupIcon:{
        type:String, default:""
    },
    timestamp:{ 
        type:Number, default:Date.now
    }
}, {
    timestamps:true
})

chatMaterialSchema.plugin(mongoosePaginate);
chatMaterialSchema.plugin(mongooseAggregatePaginate);

var blockModel = mongoose.model('chatMaterial',chatMaterialSchema, 'chatMaterial');
module.exports = blockModel;

