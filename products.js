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
    ddbTable = "Product";}
else{
    ddbTable = process.env.PRODUCTS_TABLE; 
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
    res.render('products', {
        static_path: 'static',
        theme: process.env.THEME || 'flatly',
        productsData: allData.Items
    });
});

//route for delete data
router.post('/delete',(req, res) => {
    const product = req.body.productToDelete;

    var params = {
        TableName:ddbTable,
        Key:{
            "Product":{'S': product}
        }
    };
    console.log(params);
    ddb.deleteItem(params, function(err, data) {
        if (err) {
            console.error("Unable to delete item. Error JSON:", JSON.stringify(err, null, 2));
        } else {
            console.log("Delete Item succeeded:", JSON.stringify(data, null, 2));
        }
    });
    res.redirect('/products');
  });

  router.post('/update',(req, res) => {
   const product = req.body.productToEdit;
   const price = req.body.priceToUpdate;

    var params = {
        TableName:ddbTable,
        Key:{
            "Product":{'S': product}
        },
        UpdateExpression: "set #price = :price",
        ExpressionAttributeValues:{
            ":price": {"S": price}
        }, 
        ExpressionAttributeNames:{
            "#price": "price"
        },
        ReturnValues:"UPDATED_NEW"
    };
    ddb.updateItem(params, function(err, data) {
        if (err) {
            console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
        } else {
            console.log("updated succeeded:", JSON.stringify(data, null, 2));
        }
    });
    res.redirect('/products');
  });

  router.post('/addProduct', function(req, res) {
    var item = {
        'Product': {'S': req.body.product},
        'price': {'S': req.body.price}
    };
    ddb.putItem({
        'TableName': ddbTable,
        'Item': item,
        'Expected': { Product : { Exists: false } }        
    }, function(err, data) {
        if (err) {
            var returnStatus = 500;

            if (err.code === 'ConditionalCheckFailedException') {
                returnStatus = 409;
            }

            res.status(returnStatus).end();
            console.log('DDB Error: ' + err);
        } else {
            res.status(201).end();  
        }
    });
});

//export this router to use in our index.js
module.exports = router;