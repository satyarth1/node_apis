var common = require('../common/common');
var code = require('../common/responseCode');
var message = require('../common/responseMessage');
var fields = require('../common/required');
var chatMaterial = require('../models/chatMaterial_model');

let uploadMaterial = async (req, res)=>{

    console.log('====================================');
    console.log("files======>>>>",req.files);
    console.log('====================================');
    let userId = req.userId;
    let createMaterial = { image:[], userId };
    if(req.files['chatVideo'] && req.files.chatVideo.length){
        createMaterial['thumbnail'] = await common.createThumbnail('chatVideo', req.files.chatVideo[0].filename);
        createMaterial['video'] = req.files.chatVideo[0].filename
        createMaterial['type'] = "video";
    }
    if(req.files['chatImage'] && req.files.chatImage.length){
        req.files.chatImage.map((x)=> {
            createMaterial['image'].push(x.filename)
        });
        createMaterial['type'] = "image";
    }
    if(req.files['chatFile'] && req.files.chatFile.length){
        createMaterial['file'] = req.files.chatFile[0].filename
        createMaterial['type'] = "file";
    }
    if(req.files['groupIcon'] && req.files.groupIcon.length){
        createMaterial['groupIcon'] = req.files.groupIcon[0].filename
        createMaterial['type'] = "image";
    }
    chatMaterial.create(createMaterial)
    .then(material=>{
        console.log('====================================');
        console.log("createMaterial======>>>>",createMaterial);
        console.log('====================================');                  
        return common.response(res, code.EVERYTHING_IS_OK, message.SUCCESS, material);
    }, err=>{
        return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR)                
    })

}

module.exports = {

    uploadMaterial
}