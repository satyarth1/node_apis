var mongoose = require('../config/connection');
var mongoosePaginate = require('mongoose-paginate');

var Schema = mongoose.Schema;

var UserSchema = new Schema({
    
    fullName:{ type:String, trim:true, default:"" },
    phone:{ type:String },
    email:{ type:String },
    // 0 for ANDROID and 1 is for IOS
    deviceType:{ type:String, enum:['0', '1'], default:'0' },
    profilePic:{ type:String, default:"" },
    gender:{ type:String, enum:['Male', 'Female' ] },
    professionalStream:{ type:String, default:"" },
    interest:{ type:String, default:"" },
    dateOfBirth:{ type:String, default:"" },
    bio:{ type:String, default:"" },
    location: {
        type: {
            type: String,
            default: 'Point'
        },
        coordinates: { type: [Number], default: [0, 0] }
    },
    address:{ type:String },
    deviceToken:{ type:String },
    password:{ type:String },
    status:{ type:String, enum:['ACTIVE', 'INACTIVE', 'BLOCKED', 'DELETED'], default:"INACTIVE" },
    social_id:{ type:String },
    is_phone_verified:{ type:String, enum:['0', '1'], default:'0' },
    is_social_login:{ type:String, enum:['', '0', '1'], default:"" },
    is_profile_created:{ type:String, enum:['0', '1'], default:'0' },
    loginType:{ type:String, enum:['MANNUAL', 'FACEBOOK', 'GOOGLE'], default:'MANNUAL' },
    
    // blockedUser:[ { type:Schema.Types.ObjectId, ref:'user'} ],
    // blockedBy:[ { type:Schema.Types.ObjectId, ref:'user'} ],
    // followedUser:[{ type:Schema.Types.ObjectId, ref:'user' } ],
    // followedBy:[{ type:Schema.Types.ObjectId, ref:'user' } ],
    // friendList:[{ type:Schema.Types.ObjectId, ref:'user' } ],
    
    otp:{ type:Number },
    accessToken:{ type:String },
    secureKey:{ type:String },
    timestamp:{ 
        type:Number, default:Date.now
    },

}, {
    timestamps:true
});

UserSchema.index({ location: '2dsphere' });

UserSchema.plugin(mongoosePaginate);

var User = mongoose.model('user', UserSchema, 'user');

module.exports = User;
