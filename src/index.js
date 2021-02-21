const koa = require('koa');
const app = new koa();
const server = require('http').createServer(app.callback());
const Router = require('koa-router');
const cors = require('koa-cors');
const bodyParser = require('koa-bodyparser');
const convert = require('koa-convert');

app.use(bodyParser());
app.use(convert(cors()));
app.use(async (ctx, next) => {
    const start = new Date();
    await next();
    const ms = new Date() - start;
    console.log(`${ctx.method} ${ctx.url} ${ctx.response.status} - ${ms}ms`);
});

const router = new Router();

function getPredictionValue(cmd) {

    const {exec} = require('child_process');

    return new Promise((resolve, reject) => {

        exec(cmd, (err, stdout, stderr) => {
            if (err) {
                reject(stderr);
            } else {
                resolve(stdout);
            }
        });
    })
}

function constructParameters(requestBody) {
    const hours = requestBody.hours;
    const sunrise = requestBody.sunrise;
    const sunset = requestBody.sunset;
    const activityType = requestBody.activityType;
    let eyeDiseases;

    if (requestBody.eyeDiseases === true) {
        eyeDiseases = 1
    }
    if (requestBody.eyeDiseases === false) {
        eyeDiseases = 0
    }

    return {
        hours: hours,
        sunset: sunset,
        sunrise: sunrise,
        eyeDiseases: eyeDiseases,
        activityType: activityType
    }
}

router.post('/predict-light-temp', async (ctx) => {
    const requestBody = ctx.request.body;
    const entryObject = constructParameters(requestBody);
    const email = requestBody.email;
    const {hours, sunset, sunrise, eyeDiseases, activityType} = entryObject;

    const commandToExec = "python3 /Users/dianabob/Documents/LICENTA/Aplicatie/ANNSmartLighting/StartAppPrediction.py" +
        " " + email + " " + hours + " " + sunset + " " + sunrise + " " + eyeDiseases + " \"" + activityType + "\"";

    ctx.response.body = {
        temperature: await getPredictionValue(commandToExec),
        entry: entryObject
    };

});

router.post('/retrain', async(ctx) => {
    const requestBody = ctx.request.body;
    const temperature = requestBody.temperature;
    const entry = requestBody.entry;
    const email = requestBody.email;
    const {hours, sunset, sunrise, activityType, eyeDiseases} = entry;


    const cmd = "python3 /Users/dianabob/Documents/LICENTA/Aplicatie/ANNSmartLighting/AppStartRetrainWrapper.py" +
        " " + email + " " + hours + " " + sunset + " " + sunrise + " " + eyeDiseases + " " + activityType + " " + temperature;

    const {exec} = require('child_process');

    exec(cmd, (err, stdout, stderr) => {
        if (err) {
            ctx.response.body = {error: stderr};
        } else {
            ctx.response.body = {message: stdout};
        }
    });
});

app.use(router.routes());
app.use(router.allowedMethods());

server.listen(2020);