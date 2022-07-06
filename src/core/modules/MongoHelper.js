import mongoose from 'mongoose';

const SignText = mongoose.model('SignText', { address: String, text: String });
const User = mongoose.model('User', { address: String });
const Session = mongoose.model('Session', { address: String, token: String, expiration: Date });

const NotifyTask = mongoose.model('NotifyTask', {
  providedId: String, taskId: String, message: String, executionTimes: [Date], status: String, error: String,
  extrinsicHex: String, extrinsicHash: String, address: String,
});

const TransferTask = mongoose.model('TransferTask', {
  providedId: String, taskId: String, memo: String, recipientId: String, amount: Number, executionTimes: [Date], status: String, error: String,
  extrinsicHex: String, extrinsicHash: String, address: String,
});

class MongoHelper {
  constructor (config) {
    this.config = config;
  }

  initialize = async () => {
    const { url } = this.config;
    await mongoose.connect(url);
  }

  addSignText = async (signVo) => {
    const signText = new SignText(signVo);
    await signText.save();
  }

  getSignText = async (address) => {
    const signText = await SignText.find({ address }).exec();
    console.log(signText);
    return signText;
  }

  addUser = async (userVo) => {
    const user = new User(userVo);
    user.save().then(() => console.log('Add user success!'));
  }

  getUser = async (address) => {
    const user = await User.find({ address }).exec();
    console.log(user);
    return user;
  }

  upsertSession = async (sessionVo) => {
    const { address } = sessionVo;
    await Session.updateOne({ address }, sessionVo, { upsert: true }).exec();
  }

  getSession = async (sessionVo) => await Session.findOne(sessionVo).exec()

  addNotifyTask = async (taskVo) => {
    const notifyTask = new NotifyTask(taskVo);
    notifyTask.save().then(() => console.log('Add notifyTask success!'));
  }

  getNotifyTask = async (providedId) => {
    const result = await NotifyTask.findOne({ providedId }).exec();
    return result;
  }

  listNotifyTasks = async ({ address }) => {
    const result = await NotifyTask.find({ address }).exec();
    return result;
  }

  updateNotifyTask = async ({ providedId }, taskVo) => {
    await NotifyTask.updateOne({ providedId }, taskVo).exec();
  }

  addTransferTask = async (taskVo) => {
    const transferTask = new TransferTask(taskVo);
    transferTask.save().then(() => console.log('Add transferTask success!'));
  }

  updateTransferTask = async ({ providedId }, taskVo) => {
    await TransferTask.updateOne({ providedId }, taskVo).exec();
  }

  geTransferTask = async (providedId) => {
    const result = await TransferTask.findOne({ providedId }).exec();
    return result;
  }

  listTransferTasks = async ({ address }) => {
    const result = await TransferTask.find({ address }).exec();
    return result;
  }
}

export default MongoHelper;
