const { MysqlModel, registerModel } = require("./mysqlModel");
class AuditLog extends MysqlModel { static log(data){return this.create(data);} }
registerModel("audit_logs",AuditLog);module.exports=AuditLog;
