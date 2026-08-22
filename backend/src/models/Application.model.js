const { MysqlModel, registerModel } = require("./mysqlModel");
class Application extends MysqlModel {
  constructor(data={}){super(data);this.status ||= "draft";this.priority ||= "medium";this.adminNotes ||= [];this.adminQuestions ||= [];this.timeline ||= [];this.metadata ||= {source:"web"};this.kyc ||= {};this.certificate ||= {};}
  get isExpired(){return Boolean(this.certificate?.expiryDate&&new Date(this.certificate.expiryDate)<new Date());}
  get daysPending(){if(!["pending","reviewing","needs_info"].includes(this.status))return 0;return Math.floor((Date.now()-new Date(this.submittedAt||this.createdAt).getTime())/86400000);}
}
registerModel("applications",Application);module.exports=Application;
