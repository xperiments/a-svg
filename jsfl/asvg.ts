/// <reference types="jsfl" />

// Tret de https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys
if (!Object.keys) {
    Object.keys = (function() {
        'use strict';
        var hasOwnProperty = Object.prototype.hasOwnProperty,
            hasDontEnumBug = !{ toString: null }.propertyIsEnumerable(
                'toString'
            ),
            dontEnums = [
                'toString',
                'toLocaleString',
                'valueOf',
                'hasOwnProperty',
                'isPrototypeOf',
                'propertyIsEnumerable',
                'constructor'
            ],
            dontEnumsLength = dontEnums.length;

        return function(obj: any) {
            if (
                typeof obj !== 'object' &&
                (typeof obj !== 'function' || obj === null)
            ) {
                throw new TypeError('Object.keys called on non-object');
            }

            var result = [],
                prop,
                i;

            for (prop in obj) {
                if (hasOwnProperty.call(obj, prop)) {
                    result.push(prop);
                }
            }

            if (hasDontEnumBug) {
                for (i = 0; i < dontEnumsLength; i++) {
                    if (hasOwnProperty.call(obj, dontEnums[i])) {
                        result.push(dontEnums[i]);
                    }
                }
            }
            return result;
        };
    })();
}

const as3ExportCode = `

import flash.display.MovieClip;
import flash.text.TextField;

    stop();
    MMExecute("fl.outputPanel.clear();");
    var curFrame = 1;
    var frames = [];
    var instanceNames = [];

    function OEF(event: Event) {
    	gotoAndStop(curFrame)


    	if (curFrame != 1) {
    		var childs = [];
    		for (var i: int = 0; i < numChildren; i++) {
    			childs.push(parseFloat(this.getChildAt(i).alpha.toFixed(3)));
    		}
    		frames.push(childs);
    		if (totalFrames == curFrame) {
    			removeEventListener(Event.ENTER_FRAME, OEF);
    			var metadata = {
    				instanceNames: instanceNames,
    				alphaTimeline: frames
    			}
    			saveMetadata(stage.loaderInfo.url, JSON.stringify(metadata));
    		}
    	} else {
    		for (var e: int = 0; e < numChildren; e++) {
    			var el = this.getChildAt(e);
    			if (el is MovieClip && el.name.indexOf('instance') == -1) {
    				instanceNames.push(el.name);
    			} else {
    				instanceNames.push(0);
    			}
    		}
    	}
    	curFrame++;
    }
    addEventListener(Event.ENTER_FRAME, OEF);
    function saveMetadata(file: String, metadata: String): void {
    	var url: String = "http://localhost:31454/swf-metadata";
    	var request: URLRequest = new URLRequest(url);
    	var requestVars: URLVariables = new URLVariables();
    	requestVars.swfFile = unescape(file.replace('file:///', ''));
    	requestVars.metadata = metadata;
    	request.data = requestVars;
    	request.method = URLRequestMethod.POST;

    	var urlLoader: URLLoader = new URLLoader();
    	urlLoader = new URLLoader();
    	urlLoader.dataFormat = URLLoaderDataFormat.TEXT;
    	urlLoader.addEventListener(Event.COMPLETE, loaderCompleteHandler, false, 0, true);
    	//urlLoader.addEventListener(HTTPStatusEvent.HTTP_STATUS, httpStatusHandler, false, 0, true);
    	urlLoader.addEventListener(SecurityErrorEvent.SECURITY_ERROR, securityErrorHandler, false, 0, true);
    	urlLoader.addEventListener(IOErrorEvent.IO_ERROR, ioErrorHandler, false, 0, true);

    	try {
    		urlLoader.load(request);
    	} catch (e: Error) {

    	}
    }
    function loaderCompleteHandler(e: Event): void {
    	var responseVars = JSON.parse(e.target.data);
    	trace("a-svg alpha export: " + ( responseVars.done ? 'DONE':'FAILED') );
    }
    function httpStatusHandler(e: HTTPStatusEvent): void {
    	trace("httpStatusHandler:" + e);
    }
    function securityErrorHandler(e: SecurityErrorEvent): void {
    	trace("securityErrorHandler:" + e);
    }
    function ioErrorHandler(e: IOErrorEvent): void {
    	trace("ORNLoader:ioErrorHandler: " + e);
    	e.preventDefault()

		var format:TextFormat = new TextFormat();
        format.color = 0xFFFFFF;
		format.font ="Arial";
        format.size = 16;

		var tf = new TextField();
		tf.height = 200;
		tf.width = stage.stageWidth;
		tf.defaultTextFormat = format;
		tf.text = "\\n\\n   [a-svg] Server is not running.\\n\\n   $> a-svg --serve";

        var shape:MovieClip = new MovieClip();
		shape.graphics.beginFill(0x000000);
		shape.graphics.drawRect(0,0,stage.stageWidth,stage.stageHeight);
		shape.graphics.endFill();
		shape.addChild(tf);

		this.addChild(shape);
    }
`;

var logger = {
    log: function(...args: any[]) {
        fl.trace(args.join(', '));
    }
};

type LayerElementsTuple = [FlashElement, number];

let timeline: FlashTimeline;
let layers: FlashLayer[];
let totalFrames: number;
let layerElements: LayerElementsTuple[];

function main() {
    if (!runningFromConfigFolder()) {
        alert(
            'a-svg Command Tool Installed. You will find it in the Commands menu'
        );
    } else {
        try {
            timeline = fl.getDocumentDOM().getTimeline();
            const layerNames = timeline.layers.map(layer => layer.name);
            if (layerNames.indexOf('[a-svg]') !== -1) {
                alert('a-svg Error. File already processed !!!');
                return;
            }

            timeline = fl.getDocumentDOM().getTimeline();
            timeline.layers.forEach((layer: FlashLayer) => {
                layer.locked = false;
            });
            layers = getFirstFrameLayers();
            totalFrames = getMaxLayerFrameLength(layers);
            layerElements = getLayerElements(layers);
            alignEndFrames(layers, totalFrames);
            createLibraryFrame(layerElements);
            fillEmptyKeyframes(layers, layerElements);
            addAs3Code();
        } catch (e) {
            alert('a-svg Error. No Active Document');
        }
    }
}

function getFirstFrameLayers() {
    return fl.getDocumentDOM().getTimeline().layers;
}

function addAs3Code() {
    timeline.setSelectedLayers(0, true);
    timeline.addNewLayer('[a-svg]', 'normal', true);
    timeline.layers[
        timeline.currentLayer
    ].frames[0].actionScript = as3ExportCode;
}

function getMaxLayerFrameLength(layers: FlashLayer[]): number {
    return layers.reduce((a, b) => {
        return b.frameCount > a ? b.frameCount : a;
    }, 0);
}

function alignEndFrames(layers: FlashLayer[], totalFrames: number) {
    layers.forEach((layer: FlashLayer, layerIndex: number) => {
        layerFillUntilFrame(layer, layerIndex, totalFrames);
    });
}

function layerFillUntilFrame(
    layer: FlashLayer,
    layerIndex: number,
    maxFrames: number
) {
    const frameCount = layer.frameCount;
    const diff = maxFrames - frameCount;
    if (diff) {
        timeline.setSelectedLayers(layerIndex, true);
        for (let i = 0; i < diff; i++) {
            timeline.setSelectedFrames(frameCount + i, frameCount + i);
            timeline.insertBlankKeyframe(frameCount + i);
        }
        if (diff === 1 && isEmptyFrame(layer.frames[frameCount])) {
            timeline.setSelectedFrames(frameCount, frameCount);
            timeline.clearKeyframes();
        } else {
            for (let i = 1; i < diff; i++) {
                timeline.setSelectedFrames(frameCount + i, frameCount + i);
                timeline.clearKeyframes();
            }
        }
    }
}

function getLayerElements(layers: FlashLayer[]): LayerElementsTuple[] {
    return layers.reduce(
        (result, layer) => {
            let frameIndex = 0;
            for (let i = 0; i < layer.frames.length; i++) {
                if (layer.frames[i].elements.length > 0) {
                    frameIndex = i;
                    break;
                }
            }
            result.data.push([
                layer.frames[frameIndex].elements[0],
                frameIndex
            ]);
            return result;
        },
        { data: [] as LayerElementsTuple[] }
    ).data;
}

function selectLayerFrame(layerIndex: number, frameIndex: number) {
    timeline.setSelectedLayers(layerIndex, true);
    timeline.setSelectedFrames(frameIndex, frameIndex, true);
}

function getLayerElement(layer: FlashLayer): (FlashElement | null)[] {
    return layer.frames.map(function(frame) {
        if (
            frame.elements.length > 1 &&
            layer.name.toLowerCase().indexOf('armature') === -1
        ) {
            logger.log('ERROR in ' + layer.name, frame.elements[0].elementType);
            return null;
        } else {
            return frame.elements[0] || 0;
        }
    });
}

function createLibraryFrame(layerElements: LayerElementsTuple[]) {
    timeline.copyFrames(0);

    layers.forEach((layer: FlashLayer, idx: number) => {
        const frameCount = layer.frameCount;
        timeline.setSelectedLayers(idx, true);
        timeline.copyFrames(0, frameCount);
        timeline.removeFrames(0, frameCount);
        timeline.insertBlankKeyframe(0);
        timeline.setSelectedFrames(1, 1);
        timeline.pasteFrames();
    });

    layerElements.forEach((tuple: LayerElementsTuple, idx: number) => {
        const [el, elFrame] = tuple;
        timeline.setSelectedLayers(idx, true);
        if (!isArmatureLayer(layers[idx])) {
            timeline.convertToBlankKeyframes(0, 0);
            timeline.setSelectedFrames(0, 0, true);
            fl
                .getDocumentDOM()
                .addItem({ x: 0, y: 0 }, el.libraryItem as FlashItem);
        } else {
            timeline.copyFrames(elFrame + 1, elFrame + 1);
            timeline.pasteFrames(0);
        }
    });
}

function isArmatureLayer(layer: FlashLayer) {
    return layer.name.toLowerCase().indexOf('armature') !== -1;
}

function fillEmptyKeyframes(
    layers: FlashLayer[],
    layerElements: LayerElementsTuple[]
) {
    layers.forEach((layer, layerIndex) => {
        let lastLayerFrame = 0;
        layer.frames.forEach((frame, frameIndex) => {
            if (frameIndex === 0) return;
            if (isEmptyFrame(frame)) {
                if (!isArmatureLayer(layers[layerIndex])) {
                    fillEmptyFrameWithElement(
                        layerElements[layerIndex][0],
                        layerIndex,
                        frameIndex
                    );
                } else {
                    timeline.setSelectedFrames(frameIndex, frameIndex, true);
                    timeline.setSelectedLayers(layerIndex, true);
                    timeline.copyFrames(
                        layerElements[layerIndex][1] + 1,
                        layerElements[layerIndex][1] + 1
                    );
                    timeline.pasteFrames(frameIndex);
                    timeline.layers[layerIndex].frames[
                        frameIndex
                    ].elements.forEach((el: FlashElement) => {
                        setElementAlpha(el, 0);
                    });
                }
            }
        });
    });
}

function fillEmptyFrameWithElement(
    el: FlashElement,
    layer: number,
    frame: number
) {
    timeline.setSelectedFrames(frame, frame, true);
    timeline.setSelectedLayers(layer, true);
    fl.getDocumentDOM().addItem({ x: 0, y: 0 }, el.libraryItem as FlashItem);
    const insertedElement = fl.getDocumentDOM().getTimeline().layers[layer]
        .frames[frame].elements[0];
    setElementAlpha(insertedElement, 0);
}

function isEmptyFrame(frame: FlashFrame): boolean {
    return frame.elements.length === 0;
}

function setElementAlpha(el: FlashElement, alpha: number = 1) {
    el.colorMode = 'alpha';
    el.colorAlphaPercent = alpha;
}

function runningFromConfigFolder() {
    const src = fl.scriptURI;
    const dst =
        fl.configURI + 'Commands/[ a-svg ] Convert To a-svg Document.jsfl';
    const exist = FLfile.exists(dst);
    if (!exist) {
        FLfile.copy(src, dst);
    }
    return exist;
}

main();
