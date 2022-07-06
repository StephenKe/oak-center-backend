import _ from 'lodash';
import Router from '@koa/router';
import { Scheduler, oakConstants } from 'oak-js-library'
import { WsProvider, ApiPromise } from '@polkadot/api';

import { convertToResult, errorToResult } from '../core/utils'
import { getAppMaster } from '../core/modules/appMaster';

const MILLISECONDS = 1000;

const router = new Router();
const appMaster = getAppMaster();

router.prefix('/transfer-task');

/**
 * List transfer task
 */
router.post('/list', async (ctx) => {
  const { address } = ctx.request.body;

  const tasks = await appMaster.mongoHelper.listTransferTasks({ address });
  ctx.body = convertToResult(tasks);
});

/**
 * Create transfer task
 */
router.post('/create', async (ctx) => {
  const { extrinsicHex, memo } = ctx.request.body;

  const wsProvider = new WsProvider(oakConstants.OakChainWebsockets[oakConstants.OakChains.STUR]);
  const api = await ApiPromise.create({ provider: wsProvider });

  const extrinsic = api.tx(extrinsicHex);

  // Record task
  const [providedId, executionTimes, recipientId, amount] = extrinsic.args;
  const times = _.map(executionTimes, (executionTime) => new Date(executionTime.toNumber() * MILLISECONDS));
  const taskVo = { providedId, memo, recipientId: recipientId.toHuman(), amount: amount.toNumber(), executionTimes: times, status: 'CREATING', extrinsicHex, extrinsicHash: extrinsic.hash, address: extrinsic.signer.toString() };
  appMaster.mongoHelper.addTransferTask(taskVo);
  
  const scheduler = new Scheduler(oakConstants.OakChains.STUR);
  try {
    await scheduler.sendExtrinsic(extrinsicHex, async (result) => {
      const onError = (errMessage) => appMaster.mongoHelper.updateTransferTask({ providedId }, { ...taskVo, status: 'ERROR', error: errMessage });
      const onSuccess = () => appMaster.mongoHelper.updateTransferTask({ providedId }, { ...taskVo, status: 'EXECUTING' });
      appMaster.polkadotHelper.processExtrinsic(scheduler.api, result, onSuccess, onError);
    });
    ctx.body = convertToResult({});
  } catch (error) {
    appMaster.mongoHelper.updateTransferTask({ providedId }, { ...taskVo, status: 'ERROR', error: error.message });
    ctx.body = errorToResult(error);
  }
});

/**
 * Cancel transfer task
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

  const taskVo = appMaster.mongoHelper.geTransferTask(providedId);
  appMaster.mongoHelper.updateTransferTask({ ...taskVo, status: 'CANCELING' });
  
  try {
    await scheduler.sendExtrinsic(extrinsicHex, async (result) => {
      const onError = (errMessage) => appMaster.mongoHelper.updateTransferTask({ providedId }, { ...taskVo, status: 'EXECUTING', error: errMessage });
      const onSuccess = () => appMaster.mongoHelper.updateTransferTask({ providedId }, { ...taskVo, status: 'CANCELED' });
      appMaster.polkadotHelper.processExtrinsic(scheduler.api, result, onSuccess, onError);
    });
    ctx.body = convertToResult({});
  } catch (error) {
    ctx.body = errorToResult(error);
  }
});

export default router;
