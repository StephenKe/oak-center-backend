import Router from '@koa/router';
import { WsProvider, ApiPromise } from '@polkadot/api'
import _ from 'lodash';
import { Scheduler, oakConstants } from 'oak-js-library';
import { getAppMaster } from '../core/modules/appMaster';
import { convertToResult, errorToResult } from '../core/utils'

const router = new Router();
const appMaster = getAppMaster();

const MILLISECONDS = 1000;

router.prefix('/notify-task');

/**
 * List notify task
 */
router.post('/list', async (ctx) => {
  const { address } = ctx.request.body;

  const notifyTasks = await appMaster.mongoHelper.listNotifyTasks({ address });
  ctx.body = convertToResult(notifyTasks);
});

/**
 * Create notify task
 */
router.post('/create', async (ctx) => {
  const { extrinsicHex } = ctx.request.body;

  const wsProvider = new WsProvider(oakConstants.OakChainWebsockets[oakConstants.OakChains.STUR]);
  const api = await ApiPromise.create({ provider: wsProvider });

  const extrinsic = api.tx(extrinsicHex);
  const [providedId, executionTimes, message] = extrinsic.args;
  const times = _.map(executionTimes, (executionTime) => new Date(executionTime.toNumber() * MILLISECONDS));
  const taskVo = { providedId, message: message.toHuman(), executionTimes: times, status: 'CREATING', extrinsicHex, extrinsicHash: extrinsic.hash, address: extrinsic.signer.toString() };

  appMaster.mongoHelper.addNotifyTask(taskVo);
  const scheduler = new Scheduler(oakConstants.OakChains.STUR);
  try {
    await scheduler.sendExtrinsic(extrinsicHex, async (result) => {
      const onError = (errMessage) => appMaster.mongoHelper.updateNotifyTask({ providedId }, { ...taskVo, status: 'ERROR', error: errMessage });
      const onSuccess = () => appMaster.mongoHelper.updateNotifyTask({ providedId }, { ...taskVo, status: 'EXECUTING' });
      appMaster.polkadotHelper.processExtrinsic(scheduler.api, result, onSuccess, onError);
    });
    ctx.body = convertToResult({});
  } catch (error) {
    appMaster.mongoHelper.updateNotifyTask({ providedId }, { ...taskVo, status: 'ERROR', error: error.message });
    ctx.body = errorToResult(error);
  }
});

/**
 * Cancel notify task
 */
router.post('/cancel', async (ctx) => {
  const { providedId, extrinsicHex } = ctx.request.body;
  const wsProvider = new WsProvider(oakConstants.OakChainWebsockets[oakConstants.OakChains.STUR]);
  const api = await ApiPromise.create({ provider: wsProvider });
  const extrinsic = api.tx(extrinsicHex);
  const scheduler = new Scheduler(oakConstants.OakChains.STUR);
  
  // Validate taskId
  const taskId = await scheduler.getTaskID(extrinsic.signer.toString(), providedId);
  const [extrinsicTaskId] = extrinsic.args;
  if (extrinsicTaskId.toString() !== taskId) {
    const error = new Error('TaskId is invalid.');
    error.code = 1999;
    ctx.body = errorToResult(error);
    return;
  }

  const taskVo = appMaster.mongoHelper.getNotifyTask(providedId);
  appMaster.mongoHelper.updateNotifyTask({ ...taskVo, status: 'CANCELING' });
  
  try {
    await scheduler.sendExtrinsic(extrinsicHex, async (result) => {
      const onError = (errMessage) => appMaster.mongoHelper.updateNotifyTask({ providedId }, { ...taskVo, status: 'EXECUTING', error: errMessage });
      const onSuccess = () => appMaster.mongoHelper.updateNotifyTask({ providedId }, { ...taskVo, status: 'CANCELED' });
      appMaster.polkadotHelper.processExtrinsic(scheduler.api, result, onSuccess, onError);
    });
    ctx.body = convertToResult({});
  } catch (error) {
    ctx.body = errorToResult(error);
  }
});

export default router;
