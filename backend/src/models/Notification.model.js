const { MysqlModel, registerModel } = require("./mysqlModel");
class Notification extends MysqlModel { constructor(data={}){super(data);this.channels ||= {email:false,push:true};} get isRead(){return Boolean(this.readAt);} }
registerModel("notifications",Notification);module.exports=Notification;
