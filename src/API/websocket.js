const {createServer} = require('http');
const {Server} = require('socket.io');
const StripeHelper = require("../STRIPE/helper");
const bots = require("../CONFIGS/bots.json");
const auth = require("../CONFIGS/auth.json");

const httpServer = createServer();

const io = global.ws = new Server(httpServer, {});

module.exports = () => {
    io.use((req, next) => {
        const token = req.handshake.query.token;
        if (!token) return next(new Error('You need to pass a token!'));

        if (auth.wsToken !== token) return next(new Error('Invalid token!'));

        req.token = token;

        next();
    });

    io.on('connection', client => {
        client.on('disconnect', () => {
            console.log('[Websocket] => User disconnected.');
        });

        client.on('ping', () => {
            client.emit('pong');
        });

        client.on('request-subscriptions', (data) => {
            const {
                bot
            } = data;

            if (!bot) return;

            if (!bots.allowed.includes(bot)) {
                return;
            }

            const subscriptions = StripeHelper.fetchSubscriptions(bot);

            client.emit('subscriptions-list', {
                bot,
                subscriptions,
            });
        });

        client.on('create-checkout', async (data) => {
            const {
                userId,
                serverId,
                bot,
            } = data;

            if (!userId || !serverId || !bot) return;

            if (!bots.allowed.includes(bot)) {
                return;
            }

            const link = await StripeHelper.createCheckout(userId, serverId, bot);

            if (!link) return;

            client.emit('checkout-link', {
                bot,
                userId,
                serverId,
                link,
            });
        })
    });

    httpServer.listen(4855);
}
