import MongoHelper from './MongoHelper';
import PolkadotHelper from './PolkadotHelper';

class AppMaster {
  initialize = async (config) => {
    this.mongoHelper = new MongoHelper(config.mongo);
    await this.mongoHelper.initialize();

    this.polkadotHelper = new PolkadotHelper();
    await this.polkadotHelper.initialize();
  }
}

const appMaster = new AppMaster();

export const getAppMaster = () => appMaster;
