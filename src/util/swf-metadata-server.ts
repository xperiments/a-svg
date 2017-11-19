// grab the packages we need
import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';
import { logger } from './logger';
const exec = child_process.exec;
const app = express();
const port = process.env.PORT || 31454;

app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

app.post('/swf-metadata', function(req, res) {
    const swfFile = req.body.swfFile;
    const fileWithoutExtension = swfFile.replace('.swf', '');
    const metadata = req.body.metadata;
    if (!swfFile || swfFile === '' || !metadata || metadata === '') {
        res.send({ done: false });
    } else {
        if (fs.existsSync(swfFile)) {
            const metadataFile = swfFile.replace('.swf', '') + '.anim.json';
            const execRoute = `a-svg --viewer --input ${
                fileWithoutExtension
            }.swf --output ${fileWithoutExtension}.svg --metadata ${
                metadataFile
            }`;
            fs.writeFileSync(metadataFile, metadata);
            exec(execRoute, (error: any, stdout: any, stderr: any) => {
                if (error) {
                    logger.log(error);
                }
                res.send({ done: true });
                logger.log('\x1b[32mProcessed => ', fileWithoutExtension);
                logger.log(
                    '\x1b[32mVieweer => ',
                    `${fileWithoutExtension}.anim.svg.html`
                );
                require('opn')(`${fileWithoutExtension}.anim.svg.html`, {
                    wait: false
                });
            });
        } else {
            res.send({ done: false });
            logger.error(`Error while converting ${fileWithoutExtension}.swf`);
        }
    }
});

export function startServer(customPort?: number) {
    const connectPort = customPort ? customPort : port;
    app.listen(connectPort);
    logger.log('Server started! At http://localhost:' + connectPort);
}
