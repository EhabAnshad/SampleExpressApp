var express = require('express');
var router = express.Router();
var AWS = require('aws-sdk');

const local = false;
if (local){
    AWS.config.update({region: "eu-west-2",endpoint: "http://localhost:8010"})
}
else{
    AWS.config.region = process.env.REGION
};

var ddb = new AWS.DynamoDB();

var ddbTable;

if (local){
    ddbTable = "StartupSignupsTable";}
else{
    ddbTable = process.env.STARTUP_SIGNUP_TABLE; 
}
AWS.config.setPromisesDependency(require('bluebird'));



async function getData(){
    try {
        const params = {TableName: ddbTable};
        return await ddb.scan(params).promise();
    } catch (error) {
        console.error(error);
    }
}

router.get('/', async (req, res) => {
    allData = await getData();
    res.render('users', {
        static_path: 'static',
        theme: process.env.THEME || 'flatly',
        usersData: allData.Items
    });
});

//route for delete data
router.post('/delete',(req, res) => {
    const email = req.body.emailToDelete;

    var params = {
        TableName:ddbTable,
        Key:{
            "email":{'S': email}
        }
    };

    ddb.deleteItem(params, function(err, data) {
        if (err) {
            console.error("Unable to delete item. Error JSON:", JSON.stringify(err, null, 2));
        } else {
            console.log("DeleteItem succeeded:", JSON.stringify(data, null, 2));
        }
    });
    res.redirect('/users');
  });

  router.post('/update',(req, res) => {
   const email = req.body.emailToEdit;
   const name = req.body.user_name;
    var params = {
        TableName:ddbTable,
        Key:{
            "email":{'S': email}
        },
        UpdateExpression: "set #theName = :fullname",
        ExpressionAttributeValues:{
            ":fullname": {"S": name}
        }, 
        ExpressionAttributeNames:{
            "#theName": "name"
        },
        ReturnValues:"UPDATED_NEW"
    };
    console.log(params);
    ddb.updateItem(params, function(err, data) {
        if (err) {
            console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
        } else {
            console.log("updated succeeded:", JSON.stringify(data, null, 2));
        }
    });
    res.redirect(req.get('referer'));
  });

//export this router to use in our index.js
module.exports = router;