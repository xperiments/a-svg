#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { DOMParser } from 'xmldom';
import { exec } from 'child_process';
import { logger } from './util/logger';

import { startServer } from './util/swf-metadata-server';
import {
    getTranforms,
    getDefinitions,
    getFrameFiles,
    getHtmlTemplate,
    getOuterHTML,
    getFFdecFrames,
    getSvgXML,
    getSvgUseData,
    readFrameFile
} from './util/parse';
import { CommandLineTools } from './util/cmd';

type Dictionary = { [key: string]: string };

const packageJson = require('../package.json');

export interface ASVGConfig {
    input: string;
    resolvedInput: string;
    tmpDir: string;
    output: string;
    outputBaseName: string;
    outputSVG: string;
    metadata: ASVGMetadata;
    viewer: boolean;
}
export interface ASVGMetadata {
    alphaTimeline?: number[][];
    instanceNames?: string | number[];
}
export interface ASVGCmd {
    meta: string;
    namespace: string;
    output: string;
    input: string;
    serve: string | number;
    metadata: string;
    viewer: boolean;
}
const domParser = new DOMParser();

function exitError() {
    logger.warn('Usage input.swf output.svg --ns asvg');
    process.exit();
}

function main() {
    const args = process.argv.slice(2);

    const commandLineToolsOptions = {
        aliases: {
            meta: 'm',
            namespace: 'n',
            output: 'o',
            input: 'i',
            serve: 's',
            viewer: 'v'
        },
        help: {
            meta: 'Animate CC exported metadata|meta.json',
            namespace: 'Sets custom namespace|custom-namespace',
            output: 'Output SVG file|output.asvg',
            input: 'Input SWF file|input.swf',
            serve: 'Start Background Server|31454',
            viewer: 'Generate a demo html file of the asset|false'
        },
        // prettier-ignore
        banner: [
            '\x1b[35m',
            '  __ _       _____   ____ _ ',
            ' / _` |_____/ __\\ \\ / / _` |',
            '| (_| |_____\\__ \\\\ V / (_| |',
            ' \\__,_|     |___/ \\_/ \\__, |',
            '                      |___/ ',
            '\x1b[0m'
        ],
        version: packageJson.version
    };
    const cmd = new CommandLineTools<ASVGCmd>(
        'a-svg',
        args,
        commandLineToolsOptions
    );
    if (cmd.args.serve) {
        if (cmd.args.serve === 'true') {
            startServer();
        } else {
            startServer(parseInt(cmd.args.serve as string, 10));
        }
        return;
    }

    if (!cmd.args.input) {
        return cmd.help();
    }
    if (!cmd.args.output) {
        cmd.args.output = cmd.args.input.replace('.swf', '.svg');
    }
    if (!fs.existsSync(cmd.args.input)) {
        return logger.error(`Input File Not Found at '${cmd.args.input}'`);
    }
    logger.log('Processing Parameters');

    let metadata: ASVGMetadata = Object.create(null);
    if (cmd.args.metadata && fs.existsSync(cmd.args.metadata)) {
        metadata = JSON.parse(fs.readFileSync(cmd.args.metadata).toString());
    }
    const config: ASVGConfig = {
        input: cmd.args.input,
        resolvedInput: path.resolve(cmd.args.input),
        tmpDir: '',
        output: cmd.args.output,
        outputBaseName: path
            .basename(cmd.args.output)
            .replace(path.extname(cmd.args.output), ''),
        outputSVG: cmd.args.output.replace('.svg', '.anim.svg'),
        metadata: metadata,
        viewer: cmd.args.viewer || false
    };
    parseSWF(config);
}

function parseSWF(config: ASVGConfig) {
    logger.log('Converting SWF to SVG frames');
    const time = +new Date();
    config.tmpDir = `./tmp/output${time}`;
    const command = `./ffdec/ffdec.sh  -format shape:svg,morphshape:svg,frame:svg,sprite:svg,button:svg,image:png_gif_jpeg,text:svg -export frame ${
        config.tmpDir
    } ${config.resolvedInput}`;
    exec(command, (error: any, stdout: any, stderr: any) => {
        processFFDecOutput(config);
        exec(`rm -rf ${config.tmpDir}`, () => {
            logger.log('Cleaning temp files');
            logger.log('\x1b[32mDone');
        });
    });
}

function processFFDecOutput(config: ASVGConfig) {
    const processedFrames = getFFdecFrames(config);
    const svgResult = getSvgXML(processedFrames);
    const svgWithTransformData = getTranforms(svgResult, config);
    fs.writeFileSync(config.outputSVG, svgWithTransformData, 'utf8');

    if (config.viewer) {
        fs.writeFileSync(
            config.outputSVG + '.html',
            getHtmlTemplate(config, svgWithTransformData),
            'utf8'
        );
    }
}

main();
