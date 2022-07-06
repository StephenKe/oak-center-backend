import Koa from 'koa';

import config from './config';
import passport from 'koa-passport';
import koaBody from 'koa-body';
import cors from '@koa/cors';
import { getAppMaster } from './core/modules/appMaster';
import { userRouter, homeRouter, notifyTaskRouter, transferTaskRouter } from './routers';

const main = async () => {
  const koa = new Koa();
  koa.use(koaBody());
  koa.use(cors());

  const appMaster = getAppMaster();
  await appMaster.initialize(config);

  // Auth strategy
  const naiveStrategy = {
    name: 'naive',
    authenticate: function (req) {
      const { sessionToken, address } = req.query;
      const session = appMaster.mongoHelper.getSession({ address, token: sessionToken });
      if (session) {
        this.success({ address, sessionToken });
      } else {
        this.fail(401)
      }
    }
  };

  passport.use(naiveStrategy);

  // router.get('/', passport.authenticate('naive', { session: false }), async (ctx) => {
  //   console.log('ctx: ', ctx);
  //   if (ctx.isAuthenticated()) {
  //     ctx.body = JSON.stringify(ctx.state.user)
  //   } else {
  //     ctx.throw(401)
  //   }
  // });
  
  koa.use(passport.initialize());
  // koa.use(passport.authenticate('naive', {session: false}));

  // Add routers
  koa.use(userRouter.routes(), userRouter.allowedMethods());
  koa.use(homeRouter.routes(), homeRouter.allowedMethods());
  koa.use(notifyTaskRouter.routes(), notifyTaskRouter.allowedMethods());
  koa.use(transferTaskRouter.routes(), transferTaskRouter.allowedMethods());
  
  // Listen port
  const port = process.env.PORT || 7713;
  koa.listen(port, () => {
    console.log(`Listening on port ${port}. Web url: http://localhost:${port}`);
  });
}

main();
