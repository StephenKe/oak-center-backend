import _ from 'lodash';
import { decodeAddress, signatureVerify, cryptoWaitReady } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';

class PolkadotHelper {
  initialize = async () => {
    await cryptoWaitReady();
  }

	checkMessageSignature = async (message, signature, walletAddress) => signatureVerify(message, signature, u8aToHex(decodeAddress(walletAddress))).isValid;

  /**
   * Process extrinsic
   * @param {*} api 
   * @param {*} result 
   * @param {*} onSuccess 
   * @param {*} onError 
   * @returns 
   */
  processExtrinsic(api, result, onSuccess, onError) {
    const finalizedWithError = (errMessage) => {
      console.log(`Transaction finalized with error by blockchain ${errMessage}`);
      onError(errMessage);
    }

    const { status, dispatchError } = result;
    if (status.isFinalized) {
      if (!_.isNil(dispatchError)) {
        if (dispatchError.isModule) {
          const metaError = api.registry.findMetaError(dispatchError.asModule);
          const { docs, name, section } = metaError;
          const dispatchErrorMessage = JSON.stringify({ docs, name, section });
          finalizedWithError(dispatchErrorMessage);
        } else {
          console.log(`Transaction finalized with error by blockchain ${dispatchError.toString()}`);
          finalizedWithError(dispatchError.toString());
        }
        return;
      }
      onSuccess();
    }
  }
}

export default PolkadotHelper;
