// TODO Add pingpong

interface SVGPlayerTimeline {
    [key: number]: number | Function;
    [key: string]: number | Function;
}

interface FrameDataExport {
    frameTransforms: number[][][];
    frameAlphas: number[][];
    instanceNames: string[];
}

interface SVGPlayerOptions {
    frameRate: number;
    ns: string;
    svg: HTMLElement | string;
    timeline: SVGPlayerTimeline;
    loop: boolean;
}

const SVGPlayerDefaultOptions: SVGPlayerOptions = {
    frameRate: 25,
    ns: 'asvg',
    svg: 'asvg',
    timeline: {},
    loop: false
};

type EnterFrame = (timestamp: number) => void;
type Direction = 1 | -1;

class SVGPlayerMatrix {
    static isScrolling = false;
    // STATIC METHODS
    static enterFrames: any[] = [];

    static requestAnimationFrameID: number = -1;

    static requestAnimationFrame = SVGPlayerMatrix.requestAnimationFrameFn.bind(
        SVGPlayerMatrix
    );

    static requestAnimationFrameFn(timestamp: number) {
        this.dispatch(timestamp);
        this.requestAnimationFrameID = requestAnimationFrame(
            this.requestAnimationFrame
        );
    }

    static subscribe(onEnterFrame: EnterFrame) {
        this.enterFrames.push(onEnterFrame);
        if (this.requestAnimationFrameID === -1) {
            this.requestAnimationFrameID = requestAnimationFrame(
                this.requestAnimationFrame
            );
        }
    }

    static unsubscribe(onEnterFrame: EnterFrame) {
        for (let i = 0; i < this.enterFrames.length; i++) {
            if (this.enterFrames[i] === onEnterFrame) {
                this.enterFrames.splice(i, 1);
                break;
            }
        }
        if (this.enterFrames.length === 0) {
            cancelAnimationFrame(SVGPlayerMatrix.requestAnimationFrame);
        }
    }

    static dispatch(timestamp: number) {
        this.enterFrames.forEach(onEnterFrame => {
            onEnterFrame(timestamp);
        });
    }

    // CLASS METHODS

    public totalFrames = 0;
    public direction: Direction = 1;
    public isPlaying = false;
    public played = false;
    private delay = 0;
    private time = 0;
    private internalCurrentFrame = 0;
    private internalFrame = 0;
    // private frameGroups: HTMLElement[];
    private framesWithActions: string[];
    private options: SVGPlayerOptions;

    // private frameData:number[][][];
    private metadata: FrameDataExport;
    private svgTimelineUses;
    constructor({
        frameRate = 25,
        ns = 'asvg',
        svg = '',
        timeline = {},
        loop = false
    }: SVGPlayerOptions) {
        this.options = {
            frameRate,
            ns,
            svg,
            timeline,
            loop
        };
        // determine svg source origin
        if (typeof this.options.svg === 'string') {
            this.options.svg = <HTMLElement>document.querySelectorAll(this
                .options.svg as string)[0];
        }
        this.metadata = this.parseMetadata();

        console.log(this.metadata);
        // this.frameData = this.getMatrixData();

        this.totalFrames = this.metadata.frameTransforms.length;

        this.svgTimelineUses = Array.prototype.slice.call(
            (<HTMLElement>this.options.svg)
                .querySelectorAll('[asvg-frame="1"]')[0]
                .getElementsByTagName('use')
        );

        this.extractFrameActions();
        this.frameRate = this.options.frameRate;
        this.attach();
        this.gotoAndStop(0);
    }

    get currentFrame() {
        return this.internalCurrentFrame;
    }
    set currentFrame(frame: number) {
        this.internalCurrentFrame = Math.min(frame, this.totalFrames - 1);
    }
    set frameRate(fps: number) {
        this.delay = 1000 / fps;
    }

    public play() {
        this.isPlaying = true;
        return this;
    }

    public pause() {
        this.isPlaying = false;
        return this;
    }

    public stop() {
        this.currentFrame = 0;
        this.setMatrixForFrame(this.currentFrame);
        this.setAlphaForFrame(this.currentFrame);
        this.isPlaying = false;
        return this;
    }
    public gotoAndStop(frame: number) {
        this.currentFrame = frame;
        this.setMatrixForFrame(this.currentFrame);
        this.setAlphaForFrame(this.currentFrame);
        this.isPlaying = false;
        return this;
    }
    public gotoAndPlay(frame: number) {
        this.currentFrame = frame;
        this.setMatrixForFrame(this.currentFrame);
        this.setAlphaForFrame(this.currentFrame);
        this.play();
        return this;
    }

    public detach() {
        SVGPlayerMatrix.unsubscribe(this.requestAnimationFrame);
    }

    public attach() {
        SVGPlayerMatrix.subscribe(this.requestAnimationFrame);
    }

    private parseMetadata(): FrameDataExport {
        const svg = <HTMLElement>this.options.svg;
        let data = '';
        if ('innerHTML' in SVGElement.prototype) {
            data = svg.getElementsByTagName('script')[0].innerHTML;
        } else {
            data = new XMLSerializer()
                .serializeToString(svg.getElementsByTagName('script')[0])
                .replace(/<script.*?>(.*)<\/script>/gi, '$1');
        }
        let parsedData = JSON.parse(data);
        parsedData.frameTransforms = this.decompressMatrixData(
            parsedData.frameTransforms
        );
        return parsedData;
    }
    private getMatrixData(): number[][][] {
        const data = this.metadata.frameTransforms;
        return this.decompressMatrixData(<any>data);
    }

    private decompressMatrixData(matrixData: number[][]): number[][][] {
        let lastFrameData: number | number[] = [];
        return matrixData.map((frame: number | number[], index: number) => {
            if (index === 0) {
                lastFrameData = frame;
            }
            return (<number[]>frame).map(
                (useTranform: number | number[], idx: number) => {
                    if (useTranform === 0) {
                        return lastFrameData[idx];
                    } else {
                        lastFrameData[idx] = useTranform;
                        return useTranform;
                    }
                }
            );
        });
    }
    private requestAnimationFrameFn(timestamp: number): void {
        if (this.time === 0) {
            this.time = timestamp;
        }
        if (this.isPlaying && !SVGPlayerMatrix.isScrolling) {
            const estimatedFrame = Math.floor(
                (timestamp - this.time) / this.delay
            );
            if (this.internalFrame < estimatedFrame) {
                this.internalFrame = estimatedFrame;
                this.onEnterFrame();
            }
        }
    }

    private requestAnimationFrame = this.requestAnimationFrameFn.bind(this);

    private isLeftBorder() {
        return this.currentFrame + this.direction == -1;
    }
    private isRightBorder() {
        return this.currentFrame + this.direction == this.totalFrames;
    }
    private onEnterFrame() {
        if (
            (this.direction === 1 && this.isRightBorder()) ||
            (this.direction === -1 && this.isLeftBorder())
        ) {
            this.played = true;
            if (this.options.loop) {
                this.gotoAndPlay(this.isRightBorder() ? 0 : this.totalFrames);
            } else {
                this.pause();
            }
        } else {
            this.currentFrame += this.direction;
        }

        if (this.hasFrameAction(this.internalCurrentFrame)) {
            const actionValue = this.options.timeline[
                this.internalCurrentFrame
            ];
            switch (true) {
                case actionValue instanceof Function:
                    (<Function>actionValue)();
                    break;
                case actionValue === Math.PI:
                    this.play();
                    break;
                case isNaN(<number>actionValue):
                    this.stop();
                    break;
                case actionValue === Infinity:
                    this.pause();
                    break;
                case actionValue < 0:
                    this.gotoAndStop(Math.abs(<number>actionValue));
                    break;
                case actionValue >= 0:
                    this.gotoAndPlay(<number>actionValue);
                    break;
            }
        }
        if (this.currentFrame >= 0) {
            this.setMatrixForFrame(this.currentFrame);
            this.setAlphaForFrame(this.currentFrame);
        }
    }

    public hasFrameAction(frame: number): boolean {
        return this.framesWithActions.indexOf(frame.toString()) !== -1;
    }

    private setAlphaForFrame(frame: number): void {
        this.svgTimelineUses.forEach((use, index) => {
            const newVal: number = this.metadata.frameAlphas[this.currentFrame][
                index
            ];
            use.style.opacity = newVal;
        });
    }

    private setMatrixForFrame(frame: number): void {
        // this.svgTimelineUses.forEach((use,index)=>{
        //     const newVal = `matrix(${this.frameData[this.currentFrame][index]})`;
        //     if( newVal!=use.getAttribute('transform')) {
        //         use.setAttribute('transform',`matrix(${this.frameData[this.currentFrame][index]})`);
        //     }
        // })
        this.svgTimelineUses.forEach((use, index) => {
            const newVal: number[] = this.metadata.frameTransforms[
                this.currentFrame
            ][index];

            if (newVal != use.transform.baseVal.getItem(0).matrix) {
                const matrix = (<any>this.options.svg).createSVGMatrix();
                matrix.a = newVal[0];
                matrix.b = newVal[1];
                matrix.c = newVal[2];
                matrix.d = newVal[3];
                matrix.e = newVal[4];
                matrix.f = newVal[5];

                use.transform.baseVal.getItem(0).setMatrix(matrix);
            }
        });
    }

    private extractFrameActions(): void {
        this.framesWithActions = Object.keys(this.options.timeline);
        this.framesWithActions.forEach((frame: any) => {
            const el = this.options.timeline[frame];
            if (typeof el === 'function') {
                this.options.timeline[frame] = (<Function>this.options.timeline[
                    frame
                ]).bind(this);
            }
        });
        if (
            'initialize' in this.options.timeline &&
            typeof this.options.timeline.initialize === 'function'
        ) {
            (<Function>this.options.timeline.initialize)();
        }
    }
}

// function stop() { return NaN }
// function play() { return Math.PI }
// function pause() { return Infinity }
// function gotoAndPlay(frame: number) { return frame }
// function gotoAndStop(frame: number) { return -frame }
// stop();
// play();
// pause();
// gotoAndPlay(SVGPlayerDefaultOptions.frameRate);
// gotoAndStop(0);
