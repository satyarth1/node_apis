const salsaltRounds = 10;

function generateOTP(){
//    return Math.floor(1000 + Math.random() * 9000);
    let num = 1234;
    return num;
}

module.exports = {
    saltRounds:10,
    generateOTP
}