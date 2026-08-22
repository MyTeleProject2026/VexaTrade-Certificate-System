const bcrypt = require("bcryptjs");
const { MysqlModel, registerModel } = require("./mysqlModel");

class User extends MysqlModel {
  constructor(data={}) {
    super(data);
    this.role ||= "user"; this.isVerified ??= false; this.isActive ??= true;
    this.verificationLevel ||= "none"; this.loginAttempts ??= 0;
    this.preferences ||= { notifications:{email:true,push:true,sms:false}, language:"en", timezone:"UTC", theme:"dark" };
  }
  get isLocked(){return Boolean(this.lockUntil && new Date(this.lockUntil)>new Date());}
  async setPassword(password){this.passwordHash=await bcrypt.hash(password,Number(process.env.BCRYPT_ROUNDS||12));}
  async verifyPassword(password){return this.passwordHash?bcrypt.compare(password,this.passwordHash):false;}
  async incrementLoginAttempts(){this.loginAttempts=Number(this.loginAttempts||0)+1;if(this.loginAttempts>=5)this.lockUntil=new Date(Date.now()+15*60*1000);return this.save();}
  async resetLoginAttempts(){this.loginAttempts=0;this.lockUntil=null;return this.save();}
  static findByEmailOrVexaId(email,vexaAccountId){return this.findOne({$or:[{email},{vexaAccountId}]});}
}
registerModel("users",User);
module.exports=User;
