# BfastDatabase Engine

Database as a service application to work with mongoDb as a primary and with any other database engine in future

## 1.0 Introduction

Backend application written to act upon a database to respond to user actions on the client side. Those services written exposed to RESTful API mostly and sometimes to remember all the endpoints of a service become a challenge.

Also we write an application on top of a database inorder to sanitize or validate data. We try to save and apply some validation to data to check if they pass some certain criteria and if a user is authorized to perform that activity.

This tool account for those issues with improvements:

1. Single point to access data and if possible a single endpoint
2. Permissions and Authorization issues to check if agent permitted to perform that action
3. Power to embedded multiple CRUD operation in single request
4. Performing transactions
5. Work with unstructured data like files(e.g images)

Since it uses a single point for entry point we need an expressive rule to explain CRUD operation. Expressive rule will be transferred as JSON from client to server and server will respond with the respective JSON

##


## 1.1 Configurations

**BfastDatabase** must be initialized with some configuration to make it flexible to change it according to environment or requirements. The **BfastDatabase** Adapter must look like this.

```typescript

import {BFastDatabaseConfig} from "./src/bfastDatabaseConfig"; import {DatabaseAdapter} from "./DatabaseAdapter"; import {AuthAdapter} from "./AuthAdapter"; import {BfastDatabase} from "bfastnode/dist/bfast.database";

export interface BFastDatabaseAdapter {
    
    start(config: BFastDatabaseConfig): Promise<boolean>;
    
    stop(): Promise<boolean>;

}

export interface DaaSConfig {
    port: number;
    masterKey: string;
    applicationId: string;
    mountPath: string;
    adapters: {
        database: (config: DaaSConfig)=>DatabaseAdapter,
        auth: (config: DaaSConfig)=>AuthAdapter,
    }
}

// And to Start it should be like this.

new BFastDatabase().start({
    port:3000
}).then(_=>console.log("server started at port 3000"));
```

## 1.2 HTTP Endpoint

Server must listen to one endpoint by default is **/** , All Requests will be handled by **POST**
http method. Each request must contain the following header. JSON is used for send and receive messages.

```json
{
  "content-type": "application/json"
}
```

## 1.3 Errors

During checking and establishing a connection to start executing rules errors will return as normal
HTTP response bodies. When any of the rules result in error that rule value will be null and 
its error as object will be included in the **errors** block of the returned data. For example when 
we create **User** and **Post** on the same request and **Post** fails this is the error.

```json

{
    "createUser": {
        "id":"89695uiu8",
        "createdAt": "2020-02-01 67:89:12 GMT3+"
    },
    "errors": {
        "create.Post":{
             "message":"Post not created because of duplication"
         }
    }
}
```

##


## 2.0 CRUD Rules

Crud operation must be mapped to specific rules for the endpoint to understand and react to specific actions based on a rule.

## 2.1 Common rules

  - Each table/domain/collection must have common attributes which are
    - **\_id: string** -> This must be mapped to **id.**
    - **\_created\_by: string** -> this mapped to **createdBy.** Which is the id of the user who created that entry to a Domain/Table/Collection.
    - **\_created\_at: Date** -> this must be mapped to **createdAt.**
    - **\_updated\_at: Date** -> this must be mapped to **updatedAt.**

  - JSON sent to the server from the client its root must be **{ }** and on top level fields can include the following.
    - **Token: string** -> which will be used for authorization operation to determine user permission if resource is protected

  ```json
    {
        
        "token": "6547fjhfiyr8r"
    
    }
```

    - **applicationId: string** -> this is a mandatory field for every request

{

..."applicationId":<your-application-id-used-to-start-a-server>

...

}

    - **masterKey: string** -> this is optional field

You can use this to override any rule and perform admin level activities

{

...

"masterKey": "654778757bjbo987t876fjhfiyr8r"

...

}

**NOTE:** By default a server will not return all attributes when create, update or query but you can override that behavior by set **return: []** as its uses will be described in this document. **return** is a reserved keyword must not be used in as a field or a column in a data you want to save.

When a server successfully serves your request you specify in a rule the response will be available in nameSpace of your rule. Example **createUser** shall return **createUser** with your created User.

## 2.2 Create Domain/Table/Collection

To specify a create/save operation a JSON field must start with a word **create** then followed by a Domain/Table/Collection name to write data to e.g **createUser** means add new entry to domain/table/collection called **User** in database and data to save must be the value of **create${domain}** field. The word after **create** must be of any length and cases ideally but following CamelCase will be good for readable code. Examples of create operation will be as follows.

{

"token": "6547fjhfiyr8r",

"createUser": {

"name": "John",

"age": 30

}

}

**token** is optional. That rule means adding a new entry to the domain/table called **User** put **name=John** and **age=30**. Return **id** of created data.

{

"createUser":{

"id": "6657jg878",

}

}

To add many products we just send arrays

{

"token": "6547fjhfiyr8r",

"createUser": [

{

"name": "John",

"age": 30

},

{

"name": "Doe",

"age": 12,

"h": 100

}

]

}

Response should be like.

{

"createUser":[

{

"id": "6657jg878",

},

{

"id": "op65AWjg8",

}

]

}

In the **create** rule it returns **id** if you want more than one field to return you must specify those fields with the field **return** which is an array of extra fields you want to return. For example,

{

"token": "6547fjhfiyr8r",

"createUser": {

"name": "John",

"age": 30,

"return": ["age","name"]

}

}

Now the server will respond with the extra field you specify.

{

"createUser":{

"id": "6657jg878",

"name": "John",

"age": 30,

}

}

If return is empty array like **return: []** server will return all data of that document

## 2.3 Read/Query Domain/Table/Collection

To get or query domain/table/collection a JSON field for that must start with a word **query** then followed by a Domain/Table/Collection name to query to e.g **queryUser** means find user(s) to domain/table/collection called **User** in database and format is **query${domain}**. The word after **query** must be of any length and cases ideally but following CamelCase will be good for readable code.

**query${domain}** rule block has a default field which you can use to shape your query. Those fields are as follows.

- **skip: number** -> specify data to skip, default is **0.**
- **size: number** -> specify number of data to return, default is **20.** If value is negative means you need all the documents to be returned
- **count: boolean** -> you can count the results of a query to return a number of documents if set to true default value is false.
- **orderBy: Array<{[field]:orderNumber}>** -> specify array of fields to order by. orderNumber can be 1 for ascending or -1 for descending. Field is the column we orderBy.
- **last: number** -> this will return the number of data you specify from last of results.
- **first: number** -> this will return the number of data you specify from the beginning of results.
- **filter: FilterModel** -> this is your query filter you send to server default is **{}** if not specified
- **return: Array<string>** -> if not specified default is **[]** and will return only **id.** Either you specify or not **id** return id data match your query found.
- **id: string** -> if this field present will ignore all other values except **return** and will return that specific data or **null** if not found

**\*NOTE\*** -> **FilterModel** needs more discussion to find a format of a query to be sent to the server.

Examples of query operation will be as follows.

### 2.3.1 Basic Query

Following example will return all users if exist or **[]** if no data exist, default return field is **id.** Since we do not specify any return fields

{

"token": "6547fjhfiyr8r",

"queryUser": {}

}

Response from server will be like this:

{

"queryUser": [

{

"id":"op65AWjg8"

},

{

"id":"12sdAWj"

}

]

}

### 2.3.2 Query By Id

{

"token": "6547fjhfiyr8r",

"queryUser": {

"id":"op65AWjg8",

"return":["name","age"]

}

}

Response from the server will be as follows.

{

"queryUser": {

"id":"op65AWjg8",

"name": "John",

"age": 30

}

}

### 2.3.3 Query By Filter

{

"queryUser": {

"filter":{

"name":"John"

},

"return":["age"]

}

}

Response from the server will be as follows.

{

"queryUser": [

{

"id":"op65AWjg8",

"age":30

}

]

}

### 2.3.4 Count

You can count the result of a query filter and return the total number of matched objects.

{

"queryUser": {

"filter":{

"name":"John"

},

"count": true

}

}

Response from server will be like the following

{

"queryUser": 1

}

###


### 2.3.4 OrderBy

You can order your query result by using the **orderBy** field inside the queryrule which is an array of maps containing your fields you want to orderBy. The sort map looks like this **{ <field> : number },** number can be 1 for ascending and -1 for descending. See example below.

{

"applicationId": "daas",

"queryProduct": {

"filter": {},

"orderBy": [{"name": 1}],

"return": ["name"]

}

}

Response will be an array of the product array by names in ascending order.

{

"queryProduct": [

{"name": "apple", "id": "y756yh-iuisyu-er56fg"}

]

}

## 2.4 Update Domain/Table/Collection

To specify a update/patch operation a JSON field must start with a word **update** then followed by a Domain/Table/Collection name to write data to e.g **updateUser** means update entry to domain/table/collection called **User** in database and data to update must be the value of **create${domain}** field in JSON you specify. The word after **update** must be of any length and cases ideally but following CamelCase will be good for readable code.

**update${domain}** rule block has a default field which you can use to shape your update. Those fields are as follows.

- **filter: FilterModel** -> update data that match the specified filter object
- **size: number** -> limit of number of data to search
- **skip: number** -> number of data to skip when search the match using filter
- **id: string** -> specify id of the data you want to update if this present **filter** field will be ignored
- **upsert: boolean** -> specify if data should be created if not present as a result of a filter, default is **false**
- **update: UpdateModel** -> add data you want to update, if not specified default is **{ }.** UpdateModel can contain operator to modify data like insert into a list of array or update a relation
- **return: Array<string>** -> specify additional fields to return default is **[]**. The operation will return **id** and **updatedAt** and with or without those fields you specify in the **return** field.

###


### 2.4.1 Update Many Documents Match Filter Query

This operation will update all the documents that match the given filter and will return all the update documents in array.

{

"updateUser": {

"filter":{

"name":"John"

},

"update": {

$set: {"name": "Josh"}

},

"return":["name"]

}

}

Response from the server will be like the following.

{

"updateUser":[

{

"id": "98675tgu",

"updatedAt": "2020-01-97 12:78:00 MT3+",

"name": "Josh"

}

]

}

###


### 2.4.2 Update Single Document By Using Its Id

If you use **id** to update a document **filter** and **upsert** field if present will be ignored and if data with that **id** is not present will return not found error 404. Examples of update requests will be as follows.

{

"updateUser": {

"id":"98675tgu",

"update": {

$set: {"name": "Dzeko"}

},

"return":[]

}

}

Response from server will be as follows

{

"ResultOfUpdateUser":{

"id": "98675tgu",

"updatedAt": "2020-01-97 12:78:00 MT3+",

"name": "Dzeko",

"age": 30

}

}

##


## 2.5Delete Domain/Table/Collection

To specify a delete operation a JSON field must start with a word **delete** then followed by a Domain/Table/Collection name to delete data to e.g **deleteUser** means delete entry to domain/table/collection called **User** in database and information of entry to delete must be the value of **delete${domain}** field in JSON you specify. The word after **delete** must be of any length and cases ideally but following CamelCase will be good for readable code.

**delete${domain}** rule block has a default field which you can use to shape your delete operation. Those fields are as follows.

- **filter: FilterModel** -> delete data that match the specified filter object.
- **id: string** -> specify **id** of the data you want to delete, if this present **filter** field will be ignored.

Delete operation will return only the id of the deleted item ( s ). If delete operation fails will return with error code and message if you delete multiple documents and if a document is not deleted its id field will return null. Example of delete operation is as follows.

### 2.5.1 Delete Single Document By Id

{

"deleteUser":{

"id": "98675tgu"

}

}

When user is deleted the results will be the id of the delete user

{

"deleteUser":{

"id": "98675tgu"

}

}

### 2.5.2 Delete MultipleDocument

You can delete multiple data as follows.

{

"applicationId":"6878567gjh",

"deleteUser":{

filter: {

"age": 20

},

}

}

The response will be the array of ids of deleted documents or null if the document is not deleted.

{

"deleteUser":[

{

"id": "98675tgu"

}

]

}

## 3.0 Transactions

Database operations sometimes need to be transactional across multiple Domain/Table/Collection so an easy way to perform transactions is needed. Transaction can be performed by issuing the Transaction Block rule.

You specify the transaction block by **transaction** keyword and the body can contain many CRUD rule blocks as explained in section 2.

Transaction block has the following field which you put all operation you want to perform

- **commit** -> This contains all the operations needed for that transaction.

The result of the transaction will be a combination of individual CRUD operations.

Example of transaction operation is as follows.

{

"applicationId":"6878567gjh",

"transaction":{

"commit":{

"createUser":{

"name": "Jody"

},

"createPayment":{

"txid": 232353535

}

}

}

}

## 4.0 Authentication &amp; Permission Policy

Tool must provide a general authentication mechanism for grant access to users and authorization mechanism for resource consumption. Authentication use special domain name to store data which is **\_User** and Authorization it use **\_Policy**

## 4.1 Authentication

You use the **auth** rule block to add new users or get access to the system. **auth** rule block fields are as follows.

- **signUp: SignUpModel** -> use this field to register new users to the system.
- **signIn: SignInModel** -> use this field for already registered users to get a temporary token to access subsequences requests.
- **reset: string** -> use this to reset a user password using a user email.

### 4.1.1 Create New User

To create a new user to auth records records you must send the following JSON to server

{

"applicationId":"6878567gjh",

"auth":{

"signUp":{

"email":"eitah12@email.co",

"username":"eith12",

"password":"8697tgygyt78tuy",

"fullName":"8an 9o0"

}

}

}

Response from the server will be as follows.

{

"auth":{

"signUp":{

"email":"eitah12@email.co",

"id":"eitah12968u",

"username":"eith12",

"token":"8697tgygyt78tuy.y78967ugkgiyu.099oyu",

"createdAt":"2020-20-20 &amp;8:09:89 GMT3+",

"fullName":"8an 9o0"

}

}

}

###


### 4.1.2 SignIn User

After you get registered next time you need to authenticate yourself, you will send the following request to the server to perform such action.

{

"auth":{

"signIn":{

"username":"eith12",

"password":"8697tgygyt78tuy"

}

}

}

If user successful signIn will return the following response.

{

"auth":{

"signIn":{

"email":"eitah12@email.co",

"Username":"eith12",

"id":"78967gkugt",

"token":"8697tgygyt78tuy.y78967ugkgiyu.099oyu",

"createdAt":"2020-20-20 &amp;8:09:89 GMT3+",

"fullName":"8an 9o0"

}

}

}

If It fails to login, the **signIn** field shall be null and error to be found in the errors block.

### 4.1.3 Reset Password

You can reset a password of an already registered user by sending the following request to the server.

{

"auth":{

"reset":{

"email":"eitah12@email.co"

}

}

}

Password reset instructions will be sent to the email if it exists in database records. Server response will be as follows.

{

"auth":{

"reset": "Password recovery process sent to your email."

}

}

## 4.2 Authorization

Data access policy controlled by rules. You use the **policy** JSON rule block to add new rules for database access. You need **masterKey** in the top level block **{ }** to perform this action.

### 4.2.1 Rule format

The **policy** block has the following fields, **add, remove** &amp; **list .** Rules field is an object which has the following format.

"add": {

"<resource-operation>": "<condition>"

},

"list": {},

"remove": {

"ruleId": "<rule-id>"

}

**<resource-operation>** is the operation to act upon a resource, the common operation is

- **update.${Domain/Table/Collection}**
- **create.${Domain/Table/Collection}**
- **delete.${Domain/Table/Collection}**
- **query.${Domain/Table/Collection}**
- **files.save**
- **files.delete**
- **files.list**
- **files.read**

**<condition>** is the expression which evaluates to boolean either **true** or **false**. In your expression **context** is an object which will be injected, some of its properties are.

{

"auth": boolean,

"uid": string,

"domain": string

}

- **auth** -> this field will be true if the user is authenticated otherwise is false.
- **uid** -> the user id execute the request or undefined.
- **domain** -> the resource current accessed.

### 4.2.2 Define Rules

When rules saved will replace any existing rules that match the new rule update. Example of adding rules.

{

"masterKey":"687tgjhgi78978567gjh",

"applicationId":"6878567gjh",

"policy":{

"add": {

"query.\*": "return true",

"create.Product": "return false"

}

}

}

This symbol **\*** means any Domain/Table/Collection.

Example of defining a javascript function is as follows.

{

"masterKey":"687tgjhgi78978567gjh",

"applicationId":"6878567gjh",

"policy":{

"add": {

"query.\*": `

constauth===context.auth;

returnauth===true;

`

}

}

}

The last statement of the condition must **return boolean.** When return is **true** means request has access to that resource and if **false** means request does not have access to that resource.

### 4.2.3 List Rules

You can list all available rules in your project as follows.

{

"masterKey":"687tgjhgi78978567gjh",

"applicationId":"6878567gjh",

"policy":{

"list": {}

}

}

The response from server will be as follows;

{

"policy":{

"list": {

"ruleId": "read.\*"

}

}

}

### 4.2.3 Remove Rules

You can remove saved policy by using **remove** rule block inside policy you will be required to supply the ruleId of the policy you remove. ruleId is equivalent to action you specify when you add a policy rule

{

"masterKey":"687tgjhgi78978567gjh",

"applicationId":"6878567gjh",

"policy":{

"remove": {"ruleId":"query.\*"}

}

}

## 5.0 Aggregation

At some moment we want to perform aggregation of the data instead of just querying with a normal filter. The tool must provide ability to perform aggregation. You use **aggregate${Domain/Table/Collection}** to perform aggregation to a specified collection. This rule requires a **masterKey** since aggregation can alter data structure.

{

"applicationId":"7867tgyujk",

"masterKey": "785ghjgjfh",

"aggregateTest": [

{

"$match": {

"name": "qwerty"

}

}

]

}

If no error the result of aggregation will be found at **aggregateTest** from the JSON which returned by a server.

##


##


## 6.0 Storage

Server must be able to save a simple file around **5~10 MB** and large files with **Gb** of data and retrieve those files. It has to use amazon **s3** compatible storage or **GridFS** mongoDb storage driver or a custom one as it seems fits.

## 6.1 Base64 encode files

For simple files we use rule blocks with base64 encoded. To control files you use **files** rule block, the structure of the rule is as follows.

- **save.filename ->** this field is any string may contain a file extension for auto content type detect, server will generate a random prefix id and append to the filename you provide so you can use the same file name multiple times and server will return a unique file name for each.
- **save.base64 ->** the content of file to save base64 encoded or plain text
- **save.type ->** the content-type mime of the file you save if not supplied mime will be determined from filename extension.
- **delete.filename ->** filename returned by server not the one you supplied.

{

"applicationId": string,

"files": {

"save": {

"filename": string,

"base64": string,

"type": string

},

"delete": {

"filename": string

}

}

}

##


### 6.1.1 Save File

To save you send the following JSON to the server.

{

"applicationId": "d75ujgdkj",

"files": {

"save": {

"filename": "hello.txt",

"base64": "Helo, world!"

}

}

}

If successfully saved, the server will return the path of the file location.

{

"files":{

"save": "/storage/778guyg/file/d75ujgdkj/9f8875fb-4064-4d71-584a733-hello.txt"

}

}

Then you can append the path returned with your server host address to view the file. Or if you know the **filename** to view the file its path is **${hostname}:${port}/storage/${applicationId}/file/${filename}** e.g http://localhost:6000/storage/8767tuy/file/jgyrutiyhjfd-hello.txt

##


### 6.1.2 Delete File

To delete a file you send the following JSON to the server.

{

"applicationId": "d75ujgdkj",

"files": {

"delete": {

"filename": "oioyui-hjgiuguy-jkfjyfh-785ygjkh-hello.txt"

}

}

}

If the file is successfully deleted, the server will return the filename which is just deleted.

{

"files": {

"delete" : "oioyui-hjgiuguy-jkfjyfh-785ygjkh-hello.txt"

}

}

### 6.1.3 List Files

To list your files you send the following JSON to the server.

{

"applicationId": "d75ujgdkj",

"files": {

"list": {

"prefix": ""

}

}

}

Server will return array of file objects

{

"files": {

"list" : [{filename: "oioyui-hjgiuguy-jkfjyfh-785ygjkh-hello.txt"}]

}

}

### 6.1.4 Retrieve a file

When you know the filename you can get file content by using the following format **${hostname}:${port}/${your-server-endpoint}/storage/${your-application-id}/file/${filename}**. For example **https://bfast-daas.com/storage/788h/file/76tyuuu-78uui-87ui.mp4**

## 6.2 Upload large files

You can upload large files with efficiency and progress tracking, this will use a direct and dedicated rest api endpoint **/storage/${applicationId}** with **POST** http method. This endpoint handle a multipart form data, form your client side you will send your formdata with files you want to save and will respond with the urls of the files saved;

The response will be a json of the following format;

{

"urls": ["/storage/889/file/077-hello.txt"]

}

The result will always be an array even if you only upload one file.

##


## 7.0 Database Indexes

You can modify the indexes of your database domain/collection/table for performance improvement and other factors as it seems fits. Format of the rule is **index${Domain/Collection/Table}** e.g **indexProduct.** This rule requires a **masterKey** field in your root rule block. Its format is as follows

## 7.1 Format

The **index${domain}** block has the following fields, **add, remove** &amp; **list .** index field is an object which has the following format.

"add": [{"field": "name"}],

"list": { },

"remove": { }

## 7.2 Add Indexes

To add a new index to a domain/table/collection use **add** which accepts an array of the indexes you want to add, if the index exists will be updated.

{

"applicationId": "daas",

"masterKey": "daas-master",

"indexProduct": {

"add": [

{"field": "name"}

]

}

}

The response from the server will be as follows

{

"indexProduct": { "add": "Indexes added" }

}

## 7.3 List Indexes

To list all available indexes for a domain use **list** sub command for **index${domain}** rule as follows;

{

"applicationId": "daas",

"masterKey": "daas-master",

"indexProduct": {

"list": {}

}

}

The response will be the list of the indexes available both user defined and default ( primary key index ).

{

"indexProduct": {

"list": [

{

"v": 2,

"key": {"name": 1},

"name": "name\_1",

"ns": "051475c8-60f6-4809-a33a-db9db0d4416a.Product"

}

]

}

}

## 7.4 Remove Indexes

You can delete/remove a user defined index only by using the **remove** rule in **index${domain}** rule block.

{

"applicationId": "daas",

"masterKey": "daas-master",

"indexProduct": {

"remove": {}

}

}

The response from the server will be as follows.

{

"indexProduct": {

"remove": true

}

}

## 8.0 PlayGround

This is an interface for you to play with your rules when developing your application. You open the UI by running the following command.

~$ bfast database playground

You must install " **bfast-tools**" a cli tool from npm like this **"~$ npm install -g bfast-tools"**
