import Router from '@koa/router';
const router = new Router();

router.post('/', async (ctx) => {
	ctx.body = 'Verson: 0.1';
});

export default router;
