var common = require('../common/common');
var code = require('../common/responseCode');
var message = require('../common/responseMessage');
var fields = require('../common/required');
var User = require('../models/user_model');
var blockModel = require('../models/block_model');
var constant = require('../common/constant');
var fireBaseFunction = require('../firebase/helper');

let verifyToken = (req, res, next)=>{

    let { accesstoken } = req.headers;
    console.log('====================================');
    console.log("accessToken======>>>>",accesstoken);
    console.log('====================================');
    common.decodeToken(accesstoken)
    .then(decode=>{
        let { _id } = decode;
        User.findById(_id)
        .then(user=>{
            if(user){
                let { status, accessToken, fullName, profilePic, deviceToken, deviceType } = user;
                if(accessToken != accesstoken){
                    return common.response(res, code.UNAUTHORIZED, message.INVAID_TOKEN)
                }
                if(status == 'BLOCKED'){
                    return common.response(res, code.UNAUTHORIZED, message.USER_BLOCKED)
                }
                else if(status == 'DELETED'){
                    return common.response(res, code.UNAUTHORIZED, message.USER_DELETED)
                }
                else{
                    req.body.userId = _id;
                    req.userId = _id;
                    req.fullName = fullName;
                    req.profilePic = profilePic;
                    req.deviceToken = deviceToken;
                    req.deviceType = deviceType;
                    next();
                }
            }
            else
                return common.response(res, code.KEY_MISSING, message.USER_NOT_EXISTS)
            
        }, err=>{
            return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR) 
        })
    }, err=>{
        return common.response(res, code.UNAUTHORIZED, message.INVAID_TOKEN)
    })

}


let signup = (req, res)=>{

    let { fullName, phone, email, password, deviceType, deviceToken } = req.body;
    let given = { fullName, phone, email, deviceType, password };
    email = email.toLowerCase();
    common.checkKeyExist(given, fields.signup)
    .then(result=>{
        if(result.length)
            return common.response(res, code.KEY_MISSING, result[0]);
        else{
            
            let loginType = 'MANNUAL';
            let query = { $or:[ { email }, { phone } ], loginType };
            User.findOne(query)
            .then(user=>{
                if(user){
                    if(user.email == email)
                        return common.response(res, code.KEY_MISSING, message.EMAIL_ALREADY_EXISTS);
                    else
                        return common.response(res, code.KEY_MISSING, message.PHONE_ALREADY_EXISTS);
                }
                else{
                    let otp = constant.generateOTP();
                    common.sendOTP(otp, phone)
                    common.createHash(password, (err, hash)=>{
                        if(hash != undefined)
                            req.body.password = hash;
                        req.body.otp = otp;
                        User.create(req.body, (err, success)=>{
                            if(err)
                                return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR);
                            else{
                                let { _id, email, fullName, phone, is_phone_verified, is_social_login, is_profile_created, loginType } = success;
                                let data = { _id };
                                common.createToken(data)
                                .then(accessToken=>{
                                    User.findByIdAndUpdate(_id, { accessToken }, { new:true }).then();
                                    let finalData = {
                                        _id,
                                        email,
                                        phone,
                                        is_phone_verified,
                                        is_social_login,
                                        is_profile_created,
                                        loginType,
                                        fullName,
                                        accessToken
                                    }
                                    let fireBaseObj = {
                                        _id,
                                        fullName,
                                        profilePic:"",
                                        blockedUser:[],
                                        blockedBy:[]
                                    }
                                    fireBaseFunction.createFireBaseNode(fireBaseObj);
                                    return common.response(res, code.EVERYTHING_IS_OK, message.SUCCESSFULLY_SIGNUP, finalData);
                                }, err=>{
                                    return common.response(res, code.KEY_MISSING, message.INVAID_TOKEN)
                                })
                            }   
                        })  
                    })
                }  
            }, err=>{
                return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR)     
            });
        }
    })
    .catch(err=> { return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR)})
}



let socialSignup = (req, res)=>{

    let { social_id, loginType, deviceToken, deviceType } = req.body;
    let given = { social_id, loginType };
    let query = { social_id, loginType };
    common.checkKeyExist(given, fields.socialSignup)
    .then(result=>{
        if(result.length)
            return common.response(res, code.KEY_MISSING, result[0]);
        else{
            User.findOne(query)
            .lean().then(user=>{
                if(user){
                    let { status } = user;
                    if(status == 'BLOCKED'){
                        return common.response(res, code.KEY_MISSING, message.USER_BLOCKED)
                    }
                    else if(status == 'DELETED'){
                        return common.response(res, code.KEY_MISSING, message.USER_DELETED)
                    }
                    else{
                        let { _id } = user;
                        let data = { _id };
                        common.createToken(data)
                        .then(accessToken=>{
                            User.findByIdAndUpdate(_id, { accessToken, deviceToken, deviceType }, { new:true }).then();
                            user.accessToken = accessToken;
                            return common.response(res, code.EVERYTHING_IS_OK, message.SUCCESSFULLY_LOGIN, user);
                        }, err=>{
                            return common.response(res, code.KEY_MISSING, message.INVAID_TOKEN)
                        })
                    }
                }
                else{
                    req.body.loginType = loginType;
                    req.body.is_social_login = "0"; 
                    User.create(req.body, (err, success)=>{
                        if(err)
                            return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR);
                        else{
                            let { _id, fullName } = success;
                            let data = { _id };
                            common.createToken(data)
                            .then(accessToken=>{
                                success.findByIdAndUpdate(_id, { accessToken, deviceToken, deviceType }, { new:true }).then();
                                success.accessToken = accessToken;
                                let fireBaseObj = {
                                    _id,
                                    fullName,
                                    profilePic:"",
                                    blockedUser:[],
                                    blockedBy:[]
                                }
                                fireBaseFunction.createFireBaseNode(fireBaseObj);
                                return common.response(res, code.EVERYTHING_IS_OK, message.SUCCESSFULLY_SIGNUP, success);
                            }, err=>{
                                return common.response(res, code.KEY_MISSING, message.INVAID_TOKEN)
                            })
                        }
                    })
                }  
            }, err=>{
                return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR)     
            });
        }
    })
    .catch(err=> { return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR)})
}



let login = (req, res)=>{

    let { loginId, password, deviceToken, deviceType } = req.body;
    let given = { loginId, password };
    common.checkKeyExist(given, fields.login)
    .then(result=>{
        if(result.length)
            return common.response(res, code.KEY_MISSING, result[0]);
        else{
            let loginType =  'MANNUAL';
            let query = { $or:[ { email:loginId }, { phone:loginId } ], loginType }
            User.findOne(query)
            .lean().then(user=>{
                if(!user)
                    return common.response(res, code.KEY_MISSING, message.PHONE_NOT_EXISTS)
                else{
                    let { status } = user;
                    if(status == 'BLOCKED'){
                        return common.response(res, code.KEY_MISSING, message.USER_BLOCKED)
                    }
                    else if(status == 'DELETED'){
                        return common.response(res, code.KEY_MISSING, message.USER_DELETED)
                    }
                    else{
                        common.compareHash(password, user.password, (err, match)=>{
                            if(!match)
                                return common.response(res, code.KEY_MISSING, message.PASSWORD_NOT_MATCH);
                            else{
                                delete user['password']; delete user['otp'];
                                let { _id } = user;
                                let data = { _id };
                                common.createToken(data)
                                .then(accessToken=>{
                                    User.findByIdAndUpdate(_id, { accessToken, deviceToken, deviceType }, { new:true }).then();
                                    user.accessToken = accessToken;
                                    return common.response(res, code.EVERYTHING_IS_OK, message.SUCCESSFULLY_LOGIN, user);
                                }, err=>{
                                    return common.response(res, code.KEY_MISSING, message.INVAID_TOKEN)
                                })        
                            }
                        })
                    }
                }
            }, err=>{
                return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR,err)     
            })
        }
    })
    .catch(err=> { return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR)})
}


let createProfile = (req, res)=>{

    let profilePic = req.file.filename;
    let { fullName, email, phone, gender, address, lat, long, loginType, professionalStream, interest, dateOfBirth, bio } = req.body;
    let userId = req.userId;
    // let userId = "5c0f5cd4ba9ecc18f4d13b27";
    let given = { userId, email, fullName, phone, address, profilePic, loginType, gender, professionalStream, interest, dateOfBirth, bio };
    email = email.toLowerCase();
    common.checkKeyExist(given, fields.createProfile)
    .then(result=>{
        if(result.length)
            return common.response(res, code.KEY_MISSING, result[0]);
        else{
            let query = { $and:[ { $or:[ { email }, { phone }] }, { _id:{ $ne:userId } }, { loginType } ] };
            User.findOne(query)
            .then( async user=>{
                let blockedBy = await blockModel.find({ blockedUser:userId }).distinct('blockedBy');
                let blockedUser = await blockModel.find({ blockedBy:userId }).distinct('blockedUser');
                if(user){
                    if(user.email == email)
                        return common.response(res, code.KEY_MISSING, message.EMAIL_ALREADY_EXISTS);
                    else
                        return common.response(res, code.KEY_MISSING, message.PHONE_ALREADY_EXISTS);
                }
                else{
                        let updateObj = { email, phone, fullName, gender, address, professionalStream, interest, dateOfBirth, bio }
                        if(loginType == 'FACEBOOK' || loginType == 'GOOGLE'){
                            updateObj.is_social_login = "1";
                        }
                        if(lat || long){
                            updateObj['location.coordinates'] = [long, lat];
                        }
                        updateObj.profilePic = profilePic;
                        updateObj.is_profile_created = "1";
                        let query = { _id:userId }
                        
                        User.findOneAndUpdate(query, updateObj, { new:true, select:{password:0, otp:0} })
                        .then(user=>{
                            if(user){
                                let fireBaseObj = {
                                    _id:userId, fullName, profilePic, blockedUser, blockedBy
                                }
                                fireBaseFunction.updateFirebaseNode(fireBaseObj);
                                common.response(res, code.EVERYTHING_IS_OK, message.PROFILE_SUCCESSFULLY_UPDATE, user);
                            }
                            else
                                return common.response(res, code.KEY_MISSING, message.USER_NOT_EXISTS);
                        }, err=>{
                            return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR, err)     
                        })
                }  
            }, err=>{
                return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR, err)     
            });         
        }
    })
    .catch(err=> { return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR)})
}


let verifyOTP = (req, res)=>{
    let { otp, deviceToken, deviceType } = req.body;
    let userId = req.userId;
    let given  = { otp, userId };
    common.checkKeyExist(given, fields.verifyOTP)
    .then(result=>{
        if(result.length)
            return common.response(res, code.KEY_MISSING, result[0]);
        else{
            User.findById(userId)
            .lean().then(user=>{
                if(!user)
                    return common.response(res, code.KEY_MISSING, message.USER_NOT_EXISTS);
                else{
                    if(user.otp == otp){
                        let options = { status:"ACTIVE", is_phone_verified:"1", otp:constant.generateOTP(), deviceToken, deviceType }
                        User.findByIdAndUpdate(userId, options, { new:true, select:{ password:0, otp:0 } })
                        .lean().then(user=>{
                            delete user['password']
                            return common.response(res, code.EVERYTHING_IS_OK, message.OTP_SUCCESSFULLY_MATCH, user);  
                        }, err=>{
                            return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR)     
                        })
                    }
                    else
                        return common.response(res, code.KEY_MISSING, message.OTP_NOT_MATCH);
                }
            }, err=>{
                return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR)     
            })
        }
    })
    .catch(err=> { return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR)})
}


let resendOTP = (req, res)=>{

    let userId = req.userId;
    User.findByIdAndUpdate(userId, { otp })
    .then(user=>{
        if(user){
            let { phone } = user;
            common.sendOTP(otp, phone)
            return common.response(res, code.EVERYTHING_IS_OK, message.OTP_RESEND);
        }
        else
            return common.response(res, code.KEY_MISSING, message.USER_NOT_EXISTS);
    }, err=>{
        return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR)     
    })

}

// forgot password API or Resend API

let forgotPassword = (req, res)=>{

    let { phone } = req.body;
    let given = { phone }
    common.checkKeyExist(given, fields.forgotPassword)
    .then(result=>{
        if(result.length)
            return common.response(res, code.KEY_MISSING, result[0]);
        else{
            let query = { phone, loginType:'MANNUAL'  }
            User.findOne(query)
            .then(user=>{
                if(!user){
                    return common.response(res, code.KEY_MISSING, message.PHONE_NOT_REGISTERED);      
                }
                else{

                    let { status, _id } = user;
                    if(status == 'BLOCKED'){
                        return common.response(res, code.KEY_MISSING, message.USER_BLOCKED)
                    }
                    else if(status == 'DELETED'){
                        return common.response(res, code.KEY_MISSING, message.USER_DELETED)
                    }
                    else{
                        let otp = constant.generateOTP();
                        let data = { _id };
                        common.createToken(data)
                        .then(accessToken=>{
                            let options = { otp:otp, accessToken }
                            User.findOneAndUpdate(query, options, { new:true, select:{ password:0 } })
                            .then(user=>{
                                if(user){
                                    common.sendOTP(otp, phone)
                                    return common.response(res, code.EVERYTHING_IS_OK, message.OTP_SEND, user);
                                }
                                else
                                    return common.response(res, code.KEY_MISSING, message.PHONE_NOT_REGISTERED);
                            }, err=>{
                                return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR)     
                            })
                        }, err=>{
                            return common.response(res, code.KEY_MISSING, message.INVAID_TOKEN)
                        })
                    }
                }  
            }, err=>{
                return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR, err)     
            });        
        }
    })
    .catch(err=> { return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR)})
}


let resetPassword = (req, res)=>{

    let { password } = req.body;
    let userId = req.userId;
    let given = { password, userId };
    common.checkKeyExist(given, fields.resetPassword)
    .then(result=>{
        if(result.length)
            return common.response(res, code.KEY_MISSING, result[0]);
        else{
            common.createHash(password, (err, hash)=>{
                if(hash){
                    User.findById(userId)
                    .then(user=>{
                        if(!user)
                            return common.response(res, code.KEY_MISSING, message.USER_NOT_EXISTS);
                        else{
                            let options = { password:hash, otp:constant.generateOTP() }
                            User.findByIdAndUpdate(userId, options)
                            .then(user=>{
                            if(user)
                                return common.response(res, code.EVERYTHING_IS_OK, message.PASSWORD_SUCCESSFULLY_CHANGE);
                            else
                                return common.response(res, code.KEY_MISSING, message.USER_NOT_EXISTS);
                            }, err=>{
                                return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR)     
                            })   
                        }

                    })
                }

            })
        }
    })
    .catch(err=> { return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR)})
}




let getUserDetail = (req, res)=>{

    let userId = req.userId;
    let given = { userId };
    common.checkKeyExist(given, fields.getUserDetail)
    .then(result=>{
        if(result.length)
            return common.response(res, code.KEY_MISSING, result[0]);
        else{
            User.findById(userId, { password:0, otp:0 })
            .then(user=>{
                if(user)
                    return common.response(res, code.EVERYTHING_IS_OK, message.SUCCESS, user);
                else
                    return common.response(res, code.KEY_MISSING, message.USER_NOT_EXISTS);
            }, err=>{
                return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR)     
            })
        }
    })
    .catch(err=> { return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR)})
}


let changePassword = (req, res)=>{

    let { oldPassword, newPassword } = req.body;
    let userId = req.userId;
    let given = { oldPassword, newPassword, userId };
    common.checkKeyExist(given, fields.changePassword)
    .then(result=>{
        if(result.length)
            return common.response(res, code.KEY_MISSING, result[0]);
        else{
            User.findById(userId)
            .then(user=>{
                if(!user)
                    return common.response(res, code.KEY_MISSING, message.USER_NOT_EXISTS);
                else{
                    let { password } = user;
                    common.compareHash(oldPassword, password, (err, match)=>{
                        if(match){
                            let options = { password:newPassword }
                            User.findByIdAndUpdate(userId, options)
                            .then(user=>{
                            if(user)
                                return common.response(res, code.EVERYTHING_IS_OK, message.PASSWORD_SUCCESSFULLY_CHANGE);
                            else
                                return common.response(res, code.KEY_MISSING, message.USER_NOT_EXISTS);
                            }, err=>{
                                return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR)     
                            })
                        }
                        else{
                            return common.response(res, code.KEY_MISSING, message.OLD_PASSWORD_NOT_MATCH);
                        }
        
                    })
                }

            })
            
        }
    })
    .catch(err=> { return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR)})
}


let editUserProfile = (req, res)=>{
    let { image, fullName } = req.body;
    let userId = req.userId;
    let given = { userId };
    common.checkKeyExist(given, fields.editUserProfile)
    .then(result=>{
        if(result.length)
            return common.response(res, code.KEY_MISSING, result[0]);
        else{
            common.imageUploadToCoudinary(image, (err, url)=>{
                if(err)
                    return common.response(res, code.INTERNAL_SERVER_ERROR, message.IMAGE_UPLOAD_ERROR,err);
                else{
                    if(url)
                        req.body.image = url;
                    else
                        delete req.body['image'];
                    User.findByIdAndUpdate(userId, req.body)
                    .then(user=>{
                        if(user)
                            return common.response(res, code.EVERYTHING_IS_OK, message.PROFILE_SUCCESSFULLY_UPDATE);
                        else
                            return common.response(res, code.KEY_MISSING, message.USER_NOT_EXISTS);
                    }, err=>{
                        return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR,err)     
                    })      
                }
            })
        }
    })
    .catch(err=> { return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR, err)})
}


let actionOnUser = (req, res)=>{
    let { requestType, userId } = req.body;
    let given  = { userId, requestType };
    common.checkKeyExist(given, fields.actionOnUser)
    .then(result=>{
        if(result.length)
            return common.response(res, code.KEY_MISSING, result[0]);
        else{
            if(requestType == 'block' || requestType == 'unblock' || requestType == 'delete'){
                let options = { status:(requestType == 'block') ? 'BLOCKED':(requestType == 'delete') ? 'DELETED' : 'ACTIVE' };
                User.findByIdAndUpdate(userId, options, { new:true })
                .then(success => {
                    if(success){
                        var msg = ""
                        if(requestType == 'block')
                            msg = message.USER_SUCCESSFULLY_BLOCK;
                        else if(requestType == 'unblock')
                            msg = message.USER_SUCCESSFULLY_UNBLOCK;
                        else
                            msg = message.USER_SUCCESSFULLY_DELETE;
                        return common.response(res, code.EVERYTHING_IS_OK, msg);
                    }
                    else
                        return common.response(res, code.KEY_MISSING, message.USER_NOT_EXISTS);
                }, err=>{
                    return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR)     
                })
            }
            else
                return common.response(res, code.KEY_MISSING, message.INVALID_REQUEST_TYPE);
        }
    })
    .catch(err=> { return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR)})
}


let logout = (req, res)=>{
    let userId = req.userId;
    let update = { accessToken:'', deviceToken:'' }
    User.findByIdAndUpdate(userId, update)
    .then(user => {
            return common.response(res, code.EVERYTHING_IS_OK, message.USER_SUCCESSFULLY_LOGOUT);
        }, err=>{
            return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR, err)     
    })
}


let totalCount = (req, res)=>{
    let query = { status:{ $in:[ 'ACTIVE', 'BLOCKED'] } }
    User.find(query)
    .then((user) => {
        var d = new Date().toJSON().substr(0, 10); // today date with starting night 12:00am
        var dd = new Date(d).getTime()+86400000-1; // todat date with end 11:59pm
        var min = new Date(d); 
        var max = new Date(dd);
        let query = { $and:[ { createdAt:{ $gte:min } }, { createdAt:{ $lte:max }}], status:{ $in:[ 'ACTIVE', 'BLOCKED'] } }
        User.find(query)
        .then((one) => { 
            let data = { totalUser:user.length, today:one.length }
            return common.response(res, code.EVERYTHING_IS_OK, message.SUCCESS, data);
        }, err=>{
            return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR, err)     
        })
    }, err=>{
        return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR)     
    })
}


module.exports = {

    verifyToken,
    signup,
    socialSignup,
    createProfile,
    login,
    verifyOTP,
    forgotPassword,
    resetPassword,
    getUserDetail,
    changePassword,
    editUserProfile,
    actionOnUser,
    totalCount,
    logout,
    resendOTP
}



// {
//     "_id" : ObjectId("5c3d864424c5122127974aa9"),
//     "location" : {
//         "type" : "Point",
//         "coordinates" : [ 
//             77.7759, 
//             28.7306
//         ]
//     },
//     "fullName" : "Saifi Saifi",
//     "deviceType" : "0",
//     "profilePic" : "profilePic-1547536599074_light.jpg",
//     "professionalStream" : "Hello",
//     "interest" : "mast",
//     "dateOfBirth" : "1995/02/16",
//     "bio" : "Yello",
//     "status" : "ACTIVE",
//     "is_phone_verified" : "1",
//     "is_social_login" : "",
//     "is_profile_created" : "1",
//     "loginType" : "MANNUAL",
//     "phone" : "7017025846",
//     "email" : "shadab@fluper.in",
//     "deviceToken" : "fMqK6HZCi5E:APA91bHCLmmYwyp92CqqGCXov2VwPkWUg3GZg5u3bkZJ8rP8qw78zQhbHWs7TibgCM05XRqfLAEaIqBLFtMjk6t8i9d1Md5Koy5667iqyhC6IvxhFcpuckI6E0rSwaAqAneHD_od9iHP",
//     "password" : "$2a$10$UdecLeYjVjVB6ItCujbzgug7sOVzYIyTPKWda9urcecxq7IwnEpHe",
//     "otp" : 1234,
//     "timestamp" : 1547535940966.0,
//     "createdAt" : ISODate("2019-01-15T07:05:40.967Z"),
//     "updatedAt" : ISODate("2019-01-30T07:13:20.663Z"),
//     "__v" : 0,
//     "accessToken" : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI1YzNkODY0NDI0YzUxMjIxMjc5NzRhYTkiLCJpYXQiOjE1NDg2NTc0NTl9.jMQa4BG050MsWgl3q8riTCnrouogmXyrz46qI_i3BzI",
//     "address" : "Hapur",
//     "gender" : "MALE"
// }