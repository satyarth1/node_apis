var StaticContent = require('../models/static_model');
var common = require('../common/common');
var code = require('../common/responseCode');
var message = require('../common/responseMessage');
var fields = require('../common/required');


let getAllStaticContent = (req, res)=>{

    StaticContent.findOne({})
    .then((result) => {
        return common.response(res, code.EVERYTHING_IS_OK, message.SUCCESS, result);
    }, err=>{
        return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR)
    });
}

let getStaticContent = (req, res)=>{

    let { staticType } = req.body;
    let given = { staticType };
    let options = { createdAt:-1, updatedAt:-1 };
    options[staticType] = 1;
    common.checkKeyExist(given, fields.getStaticContent)
    .then(result=>{
        if(result.length)
            return common.response(res, code.KEY_MISSING, result[0]);
        else{
            StaticContent.findOne({}, options)
            .then((result) => {
                return common.response(res, code.EVERYTHING_IS_OK, message.SUCCESS, result);
            }, err=>{
                return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR)
            });
        }
    })
    .catch((err) => {
        return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR);
    })
}

let updateStaticContent = (req, res)=>{

    let { staticType, data } = req.body;
    let given = { staticType, data };
    let options = {  };
    options[staticType] = data;
    common.checkKeyExist(given, fields.updateStaticContent)
    .then(result=>{
        if(result.length)
            return common.response(res, code.KEY_MISSING, result[0]);
        else{
            StaticContent.update({}, options)
            .then(static=>{
                if(static)
                    return common.response(res, code.EVERYTHING_IS_OK, message.CONTENT_SUCCESSFULLY_UPDATED)
                else
                    return common.response(res, code.KEY_MISSING, message.CONTENT_KEY_MISSING);
            }, err=>{
                return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR)
            })
        }
    })
    .catch((err)=>{ return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR)})


}

let deleteStaticContent = (req, res)=>{

    let { staticType } = req.body;
    let given = { staticType };
    let options = {  };
    options[staticType] = "";
    common.checkKeyExist(given, fields.deleteStaticContent)
    .then(result=>{
        if(result.length)
            return common.response(res, code.KEY_MISSING, result[0]);
        else{
            StaticContent.update({}, options)
            .then(static=>{
                if(static)
                    return common.response(res, code.NEW_RESOURCE_CREATED, message.CONTENT_SUUCCESSFULLY_DELETED)
                else
                    return common.response(res, code.KEY_MISSING, message.CONTENT_KEY_MISSING);
            }, err=>{
                return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR)
            })
        }
    })
    .catch((err)=>{ return common.response(res, code.INTERNAL_SERVER_ERROR, message.INTERNAL_SERVER_ERROR)})


}

module.exports = {

    getStaticContent,
    updateStaticContent,
    deleteStaticContent,
    getAllStaticContent

}