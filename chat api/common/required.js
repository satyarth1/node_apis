module.exports = {

    // admin Validation
    adminLogin:['email', 'password'],
    adminForgotPassword:['email', 'link'],
    verifySecureKey:['secureKey', 'adminId'],
    adminResetPassword:['password', 'adminId'],
    adminChangePassword:['oldPassword', 'newPassword', 'adminId'],
    getAdminDetail:['adminId'],
    editAdminProfile:['adminId'],
    actionOnUser:['userId', 'requestType'],
    deleteUser:['userId', 'requestType'],

    //user validation
    verifyToken:['accesstoken'],
    signup:['fullName', 'phone', 'email', 'password' ,'deviceType'],
    socialSignup:['social_id', 'loginType'],
    login:['loginId', 'password'],
    verifyOTP:['otp', 'userId'],
    createProfile:['userId', 'email', 'fullName', 'phone', 'profilePic', 'gender', 'address', 'professionalStream', 'interest', 'dateOfBirth', 'bio', 'loginType'],
    forgotPassword:['phone'],
    resetPassword:['password', 'userId'],
    changePassword:['oldPassword', 'newPassword', 'userId'],
    searchUserName:['userId'],
    getSearchUserDetail:['userId', 'searchUserId'],
    addFriend:['userId', 'sendTo'],
    acceptReject:['requestType', 'userId', 'sendBy'],
    unFriend:['connectionId'],
    getAllFriends:['userId'],
    getAllFriendRequest:['userId'],
    blockUnblockUser:['userId', 'friendId'],
    followUnfollowUser:['userId', 'followId'],
    likeUnlikePost:['userId', 'postId', 'requestType'],
    getAllSearchUserPost:['userId', 'searchUserId'],
    
    resendOTP:['userId'],
    getUserDetail:['userId'],
    editUserProfile:['userId'],

    //Post validation
    createPostWithOutFile:['userId', 'postStory'],
    createPostWithFile:['userId'],
    getAllUserPost:['userId'],
    hideUnhidePost:['postId', 'userId'],
    getAllHidePost:['userId'],
    saveUnsavePost:['postId', 'userId', 'requestType'],
    getAllSavePost:['userId'],
    getPostDetail:['postId', 'userId'],
    sharePost:['postId', 'userId'],

    // comment validation
    commentOnPost:['userId', 'postId', 'comment'],
    subCommentOnPost:['userId', 'postId', 'comment', 'commentId'],
    likeUnlikeComment:['userId', 'postId', 'commentId'],
    likeUnlikeSubComment:['userId', 'postId', 'commentId', 'subCommentId'],
    getAllComment:['userId', 'postId'],
    getAllSubComment:['commentId', 'userId'],

    //static validation
    updateStaticContent:['staticType', 'data'],
    getStaticContent:['staticType'],
    deleteStaticContent:['staticType'],

    //tank validation
    addTank:['tankName', 'image', 'description'],
    getTankDetail:['tankId'],
    deleteTank:['tankId'],
    editTankDetail:['tankId'],

    //video validation
    addVideo:['title', 'link', 'description'],
    getVideoDetail:['videoId'],
    deleteVideo:['videoId'],
    editVideoDetail:['videoId'],

    //garage validation
    getGarage:['garageType'],
    updateGarage:['garageType', 'data'],
    deleteGarage:['garageType'],

    //notification validation
    sendNotification:['sendTo'],
    notificationKey:['userId', 'deviceToken']
}