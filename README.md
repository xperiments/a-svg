# a-svg

Flash Animate CC extension that converts swf animation to svg.

This tool aims to provide a simple & quick way to convert flash animations into a self contained svg witdh a small footprint Javascript Player.

## Requeriments

* Adobe Animate CC
* Node 8.5.0
* Java JRE
* wget running

## Features

### Export
Don't expect to make all the Animate features work, this is the list of what currently works:

* Main timeline animation ( Not nested timelines )
* Mask(s) ( One at the moment due to a ffdec bug )
* Multiple Layers
* All kind of transforms
* Gradients
* Bones
* Alpha
* Guides
* Instance Names
* Frame Labels
* Small Javascript Player

## Installation

Install it globally

	npm install a-svg -g

On completion it will automatically open Animate.
Choose "Run as command" when prompted.

Installation is **complete**.

## Conversion Server

To be able to convert animations, you need to start the conversion server in the command line:

	a-svg --serve

This will start the server that is charged of conversion, and listen for incoming conversion tasks.


## Animate CC workflow

Work as normally respecting this norms:

* Convert all assets to Graphics/Movieclips in the library.
* Put 1 asset per layer
* 1 only mask

When your production is ready:

* Make a clone of the .fla file
* Open the cloned file
* Go to Commands [ a-svg ] Convert to a-svg Document

This will process the current fla file and make the needed changes before it can be published.

Now we ar ready to finally convert the file to svg / html, to do it:

* Test your movie, it will go through all the movie frames.
* At the end will call the Conversion Server with the needed metadata.
* Your browser will be opened with a demo preview of the animation.
* You will get the resulting files aside the cloned .fla file.


## JavaScript Player
**( will move to his own repository )**

#### Minimal Code
```javascript
	var player = new SVGPlayerMatrix({
    	svg: 'svg[asvg-movie="walk"]',
        frameRate: 24,
        timeline: {},
        loop: true
        });
    player.play();
```
#### Methods
* play()
* pause()
* stop()
* gotoAndPlay(frame)
* gotoAndStop(frame)
* attach() => Attaches the instance to the frame loop
* detach() => Detaches the instance to the frame loop

#### Properties
* totalFrames => Total number of animation frames
* direction => Playing direction 1 | -1
* isPlaying => Indicates is player is currently playing
* played => Indicates that movie has been played at least one time
* currentFrame => indicates the frame number the player is rendering
* frameRate => sets the movie frame rate

#### Timeline

Full timeline control with per frame actions

```javascript
    	const timeline = {
        	initialize: function() {
            	// custom var
            	this.loopedTimes = 0;
            },
    		70: function() {
            	this.loopedTimes++;
                if( this.loopedTimes > 3) {
                	this.detach();
                } else {
                	this.gotoAndPlay(15)
                }
            }
    	}
```
