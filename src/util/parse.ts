import * as fs from 'fs';
import * as path from 'path';
import { ASVGConfig } from '../index';
import { DOMParser } from 'xmldom';
import { walkSync } from './utils';
import { XMLSerializer } from 'xmldom';
import { logger } from './logger';
export type ASVGInfo = { width: string; height: string };
export interface ASVGData {
    width: string;
    height: string;
    transform: string;
    xlink: string;
}
export interface ASVGFrameData {
    defs: string;
    frameData: string[];
    ns: string;
    svgInfo: ASVGInfo;
    outputBaseName: string;
}

const DOMSerializer = new XMLSerializer();
const domParser = new DOMParser();

export function compressTransformsArray(frameTransforms: any[]): any[] {
    const result: any[] = [];
    const lastFrameData: any[] = [];
    for (
        let frameIndex = 0;
        frameIndex < frameTransforms.length;
        frameIndex++
    ) {
        const uses = frameTransforms[frameIndex];
        result[frameIndex] = [];
        for (let use = 0; use < uses.length; use++) {
            const currentUse = uses[use];
            const transform = frameTransforms[frameIndex][use];
            if (frameIndex == 0) {
                lastFrameData[use] = transform;
                result[frameIndex].push(transform);
            } else {
                if (lastFrameData[use].toString() !== transform.toString()) {
                    result[frameIndex].push(transform);
                    lastFrameData[use] = transform;
                } else {
                    result[frameIndex].push(0);
                }
            }
        }
    }
    return result;
}

export function decompressTransformsArray(transforms: any[]): any[] {
    let lastFrameData: number[] = [];
    return transforms.map((frame, index) => {
        if (index === 0) {
            lastFrameData = frame;
        }
        return frame.map((useTranform: any, idx: number) => {
            if (useTranform === 0) {
                return lastFrameData[idx];
            } else {
                lastFrameData[idx] = useTranform;
                return useTranform;
            }
        });
    });
}

export function getDefinitions(dom: any, ns: string): string {
    const defs = DOMSerializer.serializeToString(
        dom.getElementsByTagName('defs')[0]
    )
        // remove namespace
        .replace(' xmlns="http://www.w3.org/2000/svg"', '')
        // namespace id's
        .replace(/\s+id=['"](.*?)['"]\s+/gi, ` id="${ns}-$1" `)
        // put back namespace hrefs
        .replace(/xlink-href/gi, 'xlink:href')
        // namespace xlinks
        .replace(
            /(\s+)xlink:href=['"]#(.*?)['"](\s+)?/gi,
            ` xlink:href="#${ns}-$2" `
        )
        // namespace fill url references
        .replace(/\s+fill=['"]url\(#(.*?)\)['"]+/gi, ` fill="url(#${ns}-$1)" `);
    return defs;
}

export function getFrameFiles(dir: string): string[] {
    return walkSync(dir)
        .filter(file => {
            return file.indexOf('.svg') !== -1;
        })
        .sort((a, b) => {
            const aNum = parseInt(path.basename(a).replace('.svg', ''));
            const bNum = parseInt(path.basename(b).replace('.svg', ''));
            if (aNum < bNum) return -1;
            return 1;
        });
}

export function getHtmlTemplate(config: ASVGConfig, svgFile: string): string {
    const playerSource = fs.readFileSync(
        `${__dirname}/../player/svg-player-matrix.min.js`,
        'utf8'
    );
    return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title></title>
      </head>
      <body>
      ${svgFile}
      <script>${playerSource}</script>
      <script>
          var player = new SVGPlayerMatrix({
            svg: 'svg[asvg-movie="${config.outputBaseName}"]',
            frameRate: 24,
            timeline: {},
            loop: true
          });
          player.play();
      </script>
      </body>
    </html>
    `;
}

export function getOuterHTML(node: any): string {
    return DOMSerializer.serializeToString(node);
}

export function getFFdecFrames(config: ASVGConfig): ASVGFrameData {
    const frameFiles = getFrameFiles(config.tmpDir);
    logger.log(
        'Generating Animated SVG file with ',
        `\x1b[33m${frameFiles.length - 1}\x1b[0m`,
        ' frames'
    );
    let defs = '';
    const svgInfo: ASVGInfo = { width: '', height: '' };
    const frameAnim: any = {};
    const frameData: string[] = frameFiles.map(
        (frameFile: string, index: number) => {
            let contents = '';
            const svgFrame = domParser.parseFromString(
                readFrameFile(frameFile, config.outputBaseName),
                'text/html'
            );
            if (index === 0) {
                defs = getDefinitions(svgFrame, config.outputBaseName);
                svgInfo.width = <string>svgFrame.documentElement.getAttribute(
                    'width'
                );
                svgInfo.height = <string>svgFrame.documentElement.getAttribute(
                    'height'
                );
                contents = '';
            } else {
                const uses = svgFrame
                    .getElementsByTagNameNS(
                        'http://www.w3.org/2000/svg',
                        'g'
                    )[0]
                    .getElementsByTagNameNS(
                        'http://www.w3.org/2000/svg',
                        'use'
                    );
                const data = getSvgUseData(domParser, uses[0]);

                for (let i = 0; i < uses.length; i++) {
                    const useData = getSvgUseData(domParser, uses[i]);
                    frameAnim[useData.xlink] =
                        frameAnim[useData.xlink] ||
                        (frameAnim[useData.xlink] = {});
                    frameAnim[useData.xlink].xlink = useData.xlink;
                    frameAnim[useData.xlink].width = useData.width;
                    frameAnim[useData.xlink].height = useData.height;
                    frameAnim[useData.xlink].frames =
                        frameAnim[useData.xlink].frames ||
                        (frameAnim[useData.xlink].frames = []);
                    frameAnim[useData.xlink].frames.push(useData.transform);
                }
                contents = getOuterHTML(
                    svgFrame.getElementsByTagName('g')[0]
                ).replace('<g ', `<g asvg-frame="${index}" `);
            }
            return (
                contents
                    // put back namespaced xlinks
                    .replace(/xlink-href/gi, 'xlink:href')
                    // namespace xlinks
                    .replace(
                        /(\s+)xlink:href=['"]#(.*?)['"](\s+)?/gi,
                        ` xlink:href="#${config.outputBaseName}-$2" `
                    )
                    // remove id's
                    .replace(/((\s+)id=['"](.*?)['"](\s+)?)/gi, ' ')
            );
        }
    );

    return {
        defs,
        frameData,
        ns: config.outputBaseName,
        svgInfo,
        outputBaseName: config.outputBaseName
    };
}

export function getSvgUseData(parser: any, use: any): ASVGData {
    const dom = parser.parseFromString(
        DOMSerializer.serializeToString(use)
            .replace(' xmlns="http://www.w3.org/2000/svg"', '')
            .replace(/xlink:href/gi, 'xlink-href')
    );
    const domUse = dom.getElementsByTagName('use')[0];
    const width = domUse.getAttribute('width');
    const height = domUse.getAttribute('height');
    const transform = domUse
        .getAttribute('transform')
        .replace('matrix(', '')
        .replace(')', '');
    const xlink = domUse.getAttribute('xlink-href').replace('#', '');
    return { width, height, transform, xlink };
}

export function getSvgXML(context: ASVGFrameData): string {
    return `
<svg asvg-movie="${
        context.outputBaseName
    }" xmlns:xlink="http://www.w3.org/1999/xlink" width="${
        context.svgInfo.width
    }" height="${context.svgInfo.height}" xmlns="http://www.w3.org/2000/svg">
${context.defs}
<g asvg-timeline="${context.ns}">
${context.frameData.join('\n')}
</g>
</svg>`;
}

export function getTranforms(svg: string, config: ASVGConfig): string {
    const domSVG = domParser.parseFromString(svg, 'text/html');

    // clear defs transforms
    const defs = domSVG.getElementsByTagName('defs')[0];
    const defMatrixCleaned = DOMSerializer.serializeToString(defs)
        // remove svg xlink namespace
        .replace(/ xmlns:xlink="http:\/\/www.w3.org\/1999\/xlink"/gi, '')
        // remove svg xmlns attribute
        .replace(/ xmlns="http:\/\/www.w3.org\/2000\/svg"/gi, '')
        // remove identity matrix
        .replace(/ transform="matrix\(1.0, 0.0, 0.0, 1.0, 0.0, 0.0\)"/gi, '');

    const defsOptimized = domParser.parseFromString(
        '<root>' + defMatrixCleaned + '</root>',
        'text/html'
    );
    domSVG.replaceChild(defsOptimized.getElementsByTagName('defs')[0], defs);

    const metadata = config.metadata;

    // clear frame matrix
    const framesContainer = domSVG.getElementsByTagNameNS(
        'http://www.w3.org/2000/svg',
        'g'
    )[0];
    const frames: any[] = Array.prototype.slice
        .call(framesContainer.getElementsByTagName('g'))
        .filter((e: any) => {
            return e.parentNode === framesContainer;
        });
    const frameTransforms: any[] = [];

    const frameData = [];
    for (let frameIndex = 0; frameIndex < frames.length; frameIndex++) {
        frames[frameIndex].removeAttribute('transform');
        const uses = frames[frameIndex].getElementsByTagName('use');
        frameTransforms[frameIndex] = [];
        for (let use = 0; use < uses.length; use++) {
            const currentUse = uses[use];
            frameTransforms[frameIndex].push(getUseTransform(currentUse));
            currentUse.removeAttribute('width');
            currentUse.removeAttribute('height');
            if (
                metadata &&
                metadata.instanceNames &&
                metadata.instanceNames[use] !== 0
            ) {
                currentUse.setAttribute('asvg-id', metadata.instanceNames[use]);
            }
        }
    }

    const frameDataExport = {
        frameTransforms: compressTransformsArray(frameTransforms),
        frameAlphas: config.metadata.alphaTimeline || null,
        instanceNames: config.metadata.instanceNames || null
    };
    const textDataNode = domSVG.createElement('script');
    textDataNode.setAttribute('type', `text/asvg`);
    textDataNode.setAttribute('id', `${config.outputBaseName}-animation-data`);
    textDataNode.appendChild(
        domSVG.createTextNode(JSON.stringify(frameDataExport))
    );
    domSVG.getElementsByTagName('defs')[0].appendChild(textDataNode);

    // remove all frames except first
    frames.forEach((frame: any, index: number) => {
        if (index != 0) {
            domSVG.removeChild(frame);
        }
    });

    return (
        DOMSerializer.serializeToString(domSVG)
            // remove empty xlinks
            .replace(/ xmlns:xlink=""/gi, '')
            // remove svg xmlns namespace
            .replace(/ xmlns="http:\/\/www.w3.org\/1999\/xhtml"/gi, '')
            .replace(/ xmlns:xlink="http:\/\/www.w3.org\/1999\/xlink"/gi, '')
            .replace(/ xmlns="http:\/\/www.w3.org\/2000\/svg"/gi, '')
            // add namespace to svg
            .replace(
                '<svg ',
                '<svg xmlns:xlink="http://www.w3.org/1999/xlink" xmlns="http://www.w3.org/2000/svg" '
            )
            // compact code
            .replace(/>\s+</g, '><')
            // compact matrix transformations
            .replace(/matrix\((.*?)\)/gi, function(
                match: string,
                p1: string,
                offset: number,
                str: string
            ) {
                return (
                    'matrix(' +
                    JSON.stringify(
                        p1
                            .replace(/ /gi, '')
                            .split(',')
                            .map(value => {
                                return parseFloat(value);
                            })
                    )
                        .replace('[', '')
                        .replace(']', '') +
                    ')'
                );
            })
    );
}

export function getUseTransform(use: any): number[] {
    return use
        .getAttribute('transform')
        .replace(/matrix\((.*)\)/gi, '$1')
        .replace(/ /gi, '')
        .split(',')
        .map((value: string) => {
            return parseFloat(value);
        });
}

export function readFrameFile(frameFile: string, ns: string): string {
    let svg = fs.readFileSync(frameFile, 'utf8');
    svg = svg
        .replace(/xlink:href/gi, 'xlink-href')
        .replace(
            /\s+clip-path=['"]url\(#(.*?)\)['"]+/gi,
            ` clip-path="url(#${ns}-$1)" `
        );
    const domSVG = domParser.parseFromString(svg, 'text/html');
    const frameRoot = domSVG.getElementsByTagName('g')[0];
    const defs = domSVG.getElementsByTagName('defs')[0];
    const declarations = defs.getElementsByTagName('g');

    // move clipPaths to defs
    const rootClipPaths = frameRoot.getElementsByTagName('clipPath');
    for (let f = 0; f < rootClipPaths.length; f++) {
        defs.appendChild(rootClipPaths[f].cloneNode(true));
        frameRoot.removeChild(rootClipPaths[f]);
    }

    const clipPaths = defs.getElementsByTagName('clipPath');
    for (let e = 0; e < clipPaths.length; e++) {
        let targetDefId = clipPaths[e]
            .getElementsByTagName('use')[0]
            .getAttribute('xlink-href') as string;
        targetDefId = targetDefId.replace('#', '');

        const domTargetSpriteDef = domSVG.getElementById(targetDefId);
        let domTargetShapeDef = domTargetSpriteDef
            .getElementsByTagName('use')[0]
            .getAttribute('xlink-href') as string;
        domTargetShapeDef = domTargetShapeDef.replace('#', '');

        const domTargetShape = domSVG
            .getElementById(domTargetShapeDef)
            .getElementsByTagName('path')[0]
            .cloneNode(true);
        domTargetShape.setAttribute('id', `${ns}-${targetDefId}`);

        domSVG.getElementById(domTargetShapeDef) &&
            domSVG.removeChild(domSVG.getElementById(domTargetShapeDef));
        domSVG.getElementById(targetDefId) &&
            domSVG.removeChild(domSVG.getElementById(targetDefId));
        defs.appendChild(domTargetShape);
    }
    return DOMSerializer.serializeToString(domSVG);
}
