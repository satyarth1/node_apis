var mongoose = require('../config/connection');
var mongoosePaginate = require('mongoose-paginate');
var mongooseAggregatePaginate = require('mongoose-aggregate-paginate');
var Schema = mongoose.Schema;

var postSchema = new Schema({

    userId:{
        type:Schema.Types.ObjectId, ref:'user'
    },
    postStory:{
        type:String, default:""
    },
    postImage:{
        type:Array
    },
    postVideo:{
        type:String, default:""
    },
    postAddress:{
        type:String
    },
    thumbnail:{
        type:String, default:""
    },
    postShowType:{
        type:String, enum:['Public', 'Friends', 'Only me'], default:'Public'
    },

    postShareId:{ type: Schema.Types.ObjectId, ref: 'user' },

    shareText:{
        type:String, default:""
    },

    timestamp:{ 
        type:Number, default:Date.now
    },

    postTimeStamp:{
        type:Number
    },
    postCreatedAt:{
        type:Date
    },
    postUpdatedAt:{
        type:Date
    },
    isShare:{
        type:Boolean, default:false
    },

    // postTag:[{ type: Schema.Types.ObjectId, ref: 'user' }],
    
    // postComment:[{ type: Schema.Types.ObjectId, ref: 'user' } ],

    // postLikedBy:[{ userId:{type: Schema.Types.ObjectId, ref: 'user' }, emoji:{  type:String, default:"" } } ],
    
    // postShare:[{ userId:{type: Schema.Types.ObjectId, ref: 'user' }, comment:{  type:String, default:"" } } ],
    
    // shareTimeStamp:{ 
    //     type:Number
    // },
    
    // isHide:[{ type: Schema.Types.ObjectId, ref: 'user' } ],

    // isSaved:[{ type: Schema.Types.ObjectId, ref: 'user' } ]
    
    // location: {
    //     type: {
    //         type: String,
    //         default: 'Point'
    //     },
    //     coordinates: { type: [Number], default: [0, 0] }
    // }
    

}, {
    timestamps:true
})

postSchema.plugin(mongoosePaginate);
postSchema.plugin(mongooseAggregatePaginate);

var postModel = mongoose.model('post', postSchema, 'post');
module.exports = postModel;

