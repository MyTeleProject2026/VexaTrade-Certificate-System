const { MysqlModel, registerModel } = require("./mysqlModel");
class Certificate extends MysqlModel {
  constructor(data={}){super(data);this.status ||= "active";this.version ||= "3.0";this.templateId ||= "default";this.verifications ||= [];this.verificationCount ??= 0;this.blockchain ||= {};this.files ||= {};this.content ||= {};}
  get isExpired(){return Boolean(this.content?.expiresOn&&new Date(this.content.expiresOn)<new Date());}
  get isValid(){return this.status==="active"&&!this.isExpired;}
  async recordVerification(ip,userAgent){this.verifications.push({ip,userAgent,timestamp:new Date()});this.verificationCount=Number(this.verificationCount||0)+1;return this.save();}
  async revoke(reason,revokedBy){this.status="revoked";this.revokedReason=reason;this.revokedBy=revokedBy;this.revokedAt=new Date();return this.save();}
}
registerModel("certificates",Certificate);module.exports=Certificate;
