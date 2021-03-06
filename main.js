paper.install(window);
window.onload = function() {
    //set the width which will be used for the maximum display of shapes
    var w = 1320;

    /**
     * this is where the code starts for the process of the "main" style method
     */
    // Setup directly from canvas id:
    paper.setup('myCanvas');

    //Move the center to the center so the translations work simply due to
    //(0, 0) being the top left
    //this moves (0, 0) to the middle of the CSS values of a canvas
    view.translate(view.center);

    var canvas = seedCanvas();
    var shapes = seedShapes(canvas);

    drawShapes(shapes, canvas);
    adaptiveScaling(canvas);

    //start the genetic process to occur on each frame
    view.onFrame = function(event) {
        geneticProcess(canvas);
    };

    /**
     *
     * the basic shape object, convenient light weight storage
     */
    function shape(r, theta) {
        this.r = r;
        this.theta = theta;
    }

    /**
     *
     * simple conversion, useful to abstract
     *
     */
    function toRadians(angle) {
        return angle * (Math.PI / 180);
    }

    /**
     *
     * this produced some issues so i had to create the canvas object inside the method
     * and return it, rather than having a predefined object type
     *
     */
    function seedCanvas () {
        var symmetry = Math.round(Math.random() * 6) + 6;
        var symmetryAngle = 360 / symmetry;
        var thetaMax = toRadians(symmetryAngle);
        var rMax = w / 2;
        var seedMax = Math.round(1 / symmetry * 300);

        return canvas = {
            symmetry: symmetry,
            symmetryAngle: symmetryAngle,
            thetaMax: thetaMax,
            rMax: rMax,
            seedMax: seedMax
        };
    }

    /**
     *
     * takes the maximum magnitude and creates a spread of shapes over the arctan
     * spread, mainly because of the weighted curve it exhibits
     *
     * then normalises and returns the value multiplied by the magnitude maximum
     *
     */
    function generateMagnitude(maximumMagnitude) {
        //using arctan to create a heavily weighted spread out of the length
        var upperLimit = 3;
        var val = (Math.atan(Math.random() * upperLimit)) / (Math.atan(upperLimit));
        return val * maximumMagnitude;
    }


    /**
     *
     * method which seeds the original wedge of shapes
     * using confined maximum values
     *
     */
    function seedShapes (canvas) {
        //random number of segments to start with
        console.log("polar coordinate (" + canvas.rMax + ", " + canvas.thetaMax + ") is the sym value of: " + canvas.symmetry);

        //create and array of random x and y values and splice them into coordinate values
        //for random creation
        var shapeset = [];

        for (var i = 0; i < canvas.seedMax; i++) {
            var r = generateMagnitude(canvas.rMax);
            var theta = Math.random() * canvas.thetaMax;
            shapeset.push(new shape(r, theta));
        }

        for (var i = 0; i < shapeset.length; i++) {
            if (shapeset[i].r < 100) {
                shapeset[i].sides = 1;
            }
            else if (shapeset[i].r >= 100 && shapeset[i].r < 200) {
                shapeset[i].sides = 3;
            }
            else if (shapeset[i].r >= 200 && shapeset[i].r < 300) {
                shapeset[i].sides = 5;
            }
            else {
                shapeset[i].sides = 7;
            }
        }
        return shapeset;
    }
    /**
     * this takes a shape object and turns the (r, theta) values
     * into x and y coordinates and adds them to the object
     */
    function generateCoordinates(shape) {
        //(Math.round(x / 25) * 25), (Math.round(y / 25) * 25)
        var x = Math.floor(shape.r * Math.cos(shape.theta));
        var y = Math.floor(shape.r * Math.sin(shape.theta));

        shape.x = Math.round(x / 25) * 25;
        shape.y = Math.round(y / 25) * 25;
    }

    /**
     * method which takes the main set clones it about the centre and throws away
     * the original set so theres no clone
     *
     * it also turns the values of the array into actual shape values
     */
    function drawShapes (shapes, canvas) {

        for (var i = 0; i < shapes.length; i++) {
            generateCoordinates(shapes[i]);
            if (shapes[i].sides === 1) {
                //this can be changed into a vectorised point
                var path = new Path.Star(new Point(shapes[i].x, shapes[i].y), 5, 20, 40);
                shapes[i].path = path;
            } else if (shapes[i].sides === 7){
                var shapeFlip = Math.round(Math.random());

                if (shapeFlip) {
                    var path = new Path.Star(new Point(shapes[i].x, shapes[i].y), 4, 25, 55);
                    shapes[i].path = path.smooth();
                } else {
                    var path = new Path.Star(new Point(shapes[i].x, shapes[i].y), 6, 53, 55);
                    shapes[i].path = path.smooth();
                }
            } else {
                var path = new Path.RegularPolygon(new Point(shapes[i].x, shapes[i].y), shapes[i].sides, 50);
                shapes[i].path = path;
            }

            path.style = {
                strokeColor: 'black'
            };
        }


        for (var j = 1; j < canvas.symmetry; j++) {
            //clone the base layer and rotate
            var clonedLayer = project.layers[0].clone();
            clonedLayer.rotate(canvas.symmetryAngle * j, view.center);

            project.addLayer(clonedLayer);
        }
    }

    /**
     * method to create the points of conversion for the shapes
     */
    function generateGoalSites (canvas) {
        var numberOfCircles = Math.round((Math.random() * 6) + 6);
        var concentricValues = [];
        for (var c = 0; c < numberOfCircles; c++) {
            concentricValues.push(Math.round((Math.random() * canvas.rMax)));
        }
        canvas.conformityValues = concentricValues.sort();
    }

    /**
     *  going to have to make it a comparison to the x and y instead of the r
     *  more convoluted but its aight
     */
    function isCloseEnough (position, comparisonArray) {
        var bool = false;
        var distance = Math.round(Math.abs(position.length - view.center.length));

        for (var p = 0; p < comparisonArray.length; p++) {
            if (Math.abs(distance - comparisonArray[p]) < 1) {
                bool = true;
            }
        }
        return bool;
    }

    /**
     *
     * scales the shapes from the centre so they all fall between 90-120% of their orig
     * size
     */
    function adaptiveScaling (canvas) {
        for (var value = 0; value < project.layers.length; value++) {
            for (var children = 0; children < project.layers[value].children.length; children++) {
                var scalingShape = project.layers[value].children[children];
                //normalise then multiply by 30 then plus 90
                var scale = ((scalingShape.length/canvas.rMax * 30) + 90)/100;
                scalingShape.scale(scale);
            }
        }
    }

    /**
     * gonna add some code here and some functions for the genetic algorithm
     * part of the whole shebang
     *
     * FIRSTLY conform the shapes to concentric circles around the centre
     *
     * remove the shape from the array of layers and put into final layers
     */
    function geneticProcess(canvas) {
        generateGoalSites(canvas);

        var finalLayer = new Layer();

        for (var i = 0; i < project.layers[0].children.length; i++) {
            var current = project.layers[0].children;

            current[i].finished = isCloseEnough(current[i].position, canvas.conformityValues);

            //code was buggy for finished state unless i removed it from the layer
            if (current[i].finished) {
                for (var sym  = 0; sym < canvas.symmetry; sym++) {
                    finalLayer.addChild(project.layers[sym].children[i]);
                    project.layers[sym].removeChildren(i, i);
                }
            }

            else {
                for (var shapeCompare = 0; shapeCompare < current.length; shapeCompare++) {

                    // this will break if it tries to compare itself
                    if (i >= current.length) {
                        break;
                    } else if(current[i].id !== current[shapeCompare].id) {
                        var intersections = current[i].getIntersections(current[shapeCompare]);
                    } else {
                        var intersections = [];
                    }

                    var shapeDist = Math.round(Math.abs(current[i].position.length - current[shapeCompare].position.length));
                    //effectively the fittest

                    var chance = Math.round(Math.random() * 100);

                    //the genetic process of crossovers based on distance
                    if (intersections.length > 1 && shapeDist < 35 && current[i] != 'undefined'){
                        if (chance <= 8) {
                            for (var sym  = 0; sym < canvas.symmetry; sym++) {
                                var layer = project.layers[sym].children;
                                layer[i].scale(1.3);
                                layer[i].position.length -=1;
                                layer[shapeCompare].position.length -=1;

                                var shape = layer[i].unite(layer[shapeCompare]);
                                layer[i].remove();
                                layer[shapeCompare].remove();
                                project.layers[sym].addChild(shape);
                            }
                        } else if (chance <= 16) {
                            for (var sym  = 0; sym < canvas.symmetry; sym++) {
                                var layer = project.layers[sym].children;
                                layer[i].scale(1.3);
                                layer[i].position.length -=1;
                                layer[shapeCompare].position.length -=1;

                                var shape = layer[i].subtract(layer[shapeCompare]);
                                layer[i].remove();
                                layer[shapeCompare].remove();
                                project.layers[sym].addChild(shape);
                            }
                        } else if (chance <= 20) {
                            for (var sym  = 0; sym < canvas.symmetry; sym++) {
                                var layer = project.layers[sym].children;
                                layer[i].scale(1.3);
                                layer[i].position.length -=1;
                                layer[shapeCompare].position.length -=1;

                                var shape = layer[i].intersect(layer[shapeCompare]);
                                layer[i].remove();
                                layer[shapeCompare].remove();
                                project.layers[sym].addChild(shape);
                            }
                        }
                        //shapes that are close and overlap but not super close
                    } else if (intersections.length > 1 && shapeDist >= 35 && current[i] !== 'undefined') {
                        if (chance <= 25) {
                            for (var sym  = 0; sym < canvas.symmetry; sym++) {
                                var layer = project.layers[sym].children;
                                layer[i].scale(1.3);
                                layer[i].position.length -=1;
                                layer[shapeCompare].position.length -=1;

                                var shape = layer[i].unite(layer[shapeCompare]);
                                layer[i].remove();
                                layer[shapeCompare].remove();
                                project.layers[sym].addChild(shape);
                            }
                        } else if (chance <= 50) {
                            for (var sym  = 0; sym < canvas.symmetry; sym++) {
                                var layer = project.layers[sym].children;
                                layer[i].scale(1.3);
                                layer[i].position.length -=1;
                                layer[shapeCompare].position.length -=1;

                                var shape = layer[i].subtract(layer[shapeCompare]);
                                layer[i].remove();
                                layer[shapeCompare].remove();
                                project.layers[sym].addChild(shape);
                            }
                        } else if (chance <= 60) {
                            for (var sym  = 0; sym < canvas.symmetry; sym++) {
                                var layer = project.layers[sym].children;
                                layer[i].scale(1.3);
                                layer[i].position.length -=1;
                                layer[shapeCompare].position.length -=1;

                                var shape = layer[i].intersect(layer[shapeCompare]);
                                layer[i].remove();
                                layer[shapeCompare].remove();
                                project.layers[sym].addChild(shape);
                            }
                        } else {
                            for (var sym  = 0; sym < canvas.symmetry; sym++) {
                                var layer = project.layers[sym].children;
                                layer[i].position.length -=1;
                            }
                        }
                        //every shape just moves a little bit
                    } else if (current[i] !== 'undefined') {
                        for (var sym  = 0; sym < canvas.symmetry; sym++) {
                            var layer = project.layers[sym].children;
                            //layer[i].scale(0.99);
                            layer[i].position.length -= 1;
                        }
                        break;
                    }
                }
                //if youre in the centre you get moved to the outside
                if (current[i] && Math.round(Math.abs(current[i].position.length)) < 25) {
                    for (var sym  = 0; sym < canvas.symmetry; sym++) {
                        var layer = project.layers[sym].children;
                        layer[i].position.length = canvas.rMax;
                    }
                }
            }
        }
    }
}
