import _ from 'lodash';
import Router from '@koa/router';
import { v4 } from 'uuid';
import { getAppMaster } from '../core/modules/appMaster';
import { convertToResult } from '../core/utils'

const appMaster = getAppMaster();
const router = new Router();

router.prefix('/user');

/**
 * Get a text to sign.
 */
router.post('/getSignText', async (ctx) => {
	const { address } = ctx.request.body;
	const text = v4();
	appMaster.mongoHelper.addSignText({ address, text });
	ctx.body = convertToResult({ text });
});

/**
 * Login
 */
router.post('/login', async (ctx) => {
	const { address, signature } = ctx.request.body;
	const signText = await appMaster.mongoHelper.getSignText(address);
	const { text } = signText;
	if (appMaster.polkadotHelper.checkMessageSignature(text, signature, address)) {
		const user = await appMaster.mongoHelper.getUser(address);
		if (_.isEmpty(user)) {
			appMaster.mongoHelper.addUser({ address });
		}
	}
	appMaster.mongoHelper.upsertSession({ address, token: v4(), expiration: new Date() });
	ctx.body = { address, sessionToken: v4() };
});

export default router;
