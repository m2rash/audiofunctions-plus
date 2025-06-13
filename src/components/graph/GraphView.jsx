import React, { useEffect, useRef } from "react";
import JXG from "jsxgraph";
import { useGraphContext } from "../../context/GraphContext";
import { create, all } from 'mathjs'
import {checkMathSpell,transformAssingnments, transformMathConstants} from "../../utils/parse";
const config = { }
const math = create(all, config)

// txtraw is a string of the form [[expr_1,ineq_1],[expr_2,ineq_2],..,[expr_n,ineq_n]]
// where expr_i is an expression in the variable x that defines a function in the interval defined by ineq_i
// for instance [[x+5,x < -4],[x^2,-4<=x < 1],[x-2,1<=x < 3],[5,x==3],[x-2,3 < x < 5],[3,5<= x]]
// it should be previusly checked that it is a valid piecewise function or a math expression
function createEndPoints(txtraw,board){
    // we are allowing the use of the power operator **, so we replace it by ^ to be able to parse it
    // we are also transforming the math constants to be able to parse them
    // WARNING nthroot is not implemented in mathjs, we need nthRoot, so when using mathjs, we need to change nthroot to nthRoot
    const parsed = transformMathConstants(math.parse(txtraw.replace("**","^").replace("nthroot","nthRoot"))); 
    if (!("items" in parsed)){ // not a piecewise function
        return [[],[]];
    }
    const l = parsed.items; //list of items, each item is a pair [expr,ineq]
    let ineq,v,a,b,p,i;
    const endpoints = []; // the endpoints of the intervals
    const xisolated = []; // the x coordinates of points associated to equalities (avoidable discontinuities)
    for (i=0;i< l.length;i++){
        let currentFn = board.jc.snippet(checkMathSpell(l[i].items[0].toString()), true, "x", true); // the definition of the function of the ith item
        ineq = transformAssingnments(l[i].items[1]); // the inequality or equality of ith item, we change assignments to equalities
        if ("op" in ineq){ //that is a single inequality or an equality
            if (ineq.op == "<=" || ineq.op ==">=" || ineq.op =="=="){ //one of the arguments is the variable "x" 
                if ("name" in ineq.args[1]){ // we have a op x, with op in {<=, >=, ==}
                    v=ineq.args[0].evaluate(); // v is the value of a in a op x
                    p=board.create("point", [v,currentFn(v)], {cssClass: 'endpoint-closed', fixed:true, highlight:false, withLabel:false, size: 4});
                    endpoints.push(p);
                    if (ineq.op == "=="){ // if we have an equality, we add the x coordinate to the list of x-coordinates of isolated points
                        xisolated.push(p.X());
                    }
                }else{ // we have x op a, with op in {<=, >=, ==}
                    v=ineq.args[1].evaluate(); // v is the value of a in x op a
                    p=board.create("point", [v,currentFn(v)], {cssClass: 'isolated-point', fixed:true, highlight:false, withLabel:false, size: 4});   
                    endpoints.push(p);
                    if (ineq.op == "=="){ // if we have an equality, we add the x coordinate to the list of x-coordinates of isolated points
                        xisolated.push(p.X());
                    }
                }
            }
            if (ineq.op == "<" || ineq.op ==">" || ineq.op=="!="){ // this we fill in white, since it is an strict inequality
                if ("name" in ineq.args[1]){ // we have a op x, with op in {<,>}
                    v=ineq.args[0].evaluate(); // v is the value of a in a op x
                    p=board.create("point", [v,currentFn(v)], {cssClass: 'endpoint-open', fixed:true, highlight:false, withLabel:false, size: 4});   
                    endpoints.push(p);
                }else{ // we have x op a, with op in {<, >}
                    v=ineq.args[1].evaluate(); // v is the value of a in x op a
                    p=board.create("point", [v,currentFn(v)], {cssClass: 'endpoint-open', fixed:true, highlight:false, withLabel:false, size: 4});   
                    endpoints.push(p);
                }
            }
        }else{ // now we have a an inequality of the form a<=x<=b, a<x<=b, a<=x<b or a<x<b
            // the values a and b are the first and last arguments of the inequality
            a=ineq.params[0].evaluate(); // the value of a in a op x op b
            b=ineq.params[2].evaluate(); // the value of b in a op x op b
            // we should check here that conditionals are in the form smaller, smallerEq 
            if (ineq.conditionals[0]=="smaller"){ // this is a smaller so we fill in white, since it is an strict inequality
                p=board.create("point", [a,currentFn(a)], {cssClass: 'endpoint-open', fixed:true, highlight:false, withLabel:false, size: 4});   
                endpoints.push(p);
            }else{  // this is a smallerEq so we fill in blue
                p=board.create("point", [a,currentFn(a)], {cssClass: 'endpoint-closed', fixed:true, highlight:false, withLabel:false, size: 4});   
                endpoints.push(p);
            }
            if (ineq.conditionals[1]=="smaller"){ // this is a smaller so we fill in white, since it is an strict inequality
                p=board.create("point", [b,currentFn(b)], {cssClass: 'endpoint-open', fixed:true, highlight:false, withLabel:false, size: 4});   
                endpoints.push(p);
            }else{ // this is a smallerEq so we fill in blue
                p=board.create("point", [b,currentFn(b)], {cssClass: 'endpoint-closed', fixed:true, highlight:false, withLabel:false, size: 4});   
                endpoints.push(p);
            }
        }
    }
    return [endpoints,xisolated];
}


const GraphView = () => {
  const boardRef = useRef(null);
  const { functionInput, setCursorCoords, setInputErrorMes, graphBounds, PlayFunction } = useGraphContext();
  let endpoints;
  let xisolated;
  let snapaccuracy;

  useEffect(() => {
    const board = JXG.JSXGraph.initBoard("jxgbox", {
      boundingbox: [graphBounds.xMin, graphBounds.yMax, graphBounds.xMax, graphBounds.yMin],
      grid: {
        cssClass: "grid",
      },      
      axis: {
        cssClass: "axis", 
        needsRegularUpdate: true,
        highlight: false,
        ticks: {
          insertTicks: true,
          majorHeight: 5,
          minorHeight: 3,
        },
      },
      // axis: true,
      zoom: { enabled: true, needShift: false },
      pan: { enabled: true, needShift: false, needTwoFingers: true},
      showCopyright: false,
    });

    boardRef.current = board;
    snapaccuracy = 3/board.unitX;

    let graphFormula;
    let expr = checkMathSpell(functionInput);
    console.log("Parsed expression: ", expr);

    try {
      graphFormula = board.jc.snippet(expr, true, "x", true);
      setInputErrorMes(null);
    } catch (err) {
      console.error("Error parsing expression (jc): ", err);
      setInputErrorMes("Invalid function. Please check your input.");
      expr = "0";
      graphFormula = 0;
    }

    console.log("Graph formula: ", graphFormula);

    const graphObject = board.create("functiongraph", [graphFormula],{
      cssClass: "curve",
      fixed:true,
      highlight:false,
    });

    if (expr != "0"){ //expr == 0 means the the function is cero or it was not well defined (an error was thrown)
      [endpoints,xisolated] = createEndPoints(functionInput, board);
    }else{
      endpoints = [];
      xisolated = [];
    }
    const cursor = board.create("point", [0, 0], {
      cssClass: "functionCursor",
      name: "",
      size: 5,
      fixed: true,
      highlight: false
    });

    // const updateCursor = (event) => {
      // const coords = board.getUsrCoordsOfMouse(event);
      // var x = coords[0];
      const updateCursor = (x) => {
      const l=xisolated.filter(function(e){return Math.abs(e-x)<snapaccuracy}); // x coordinates of the isolated points close to x
      if (l.length>0){ // if there are isolated points whose first coordinate is close to x, we redefine x to be the first one
        x=l[0];
      }
      const y = graphFormula(x);
      cursor.setPositionDirectly(JXG.COORDS_BY_USER, [x, y]);
      setCursorCoords({ x: x.toFixed(2), y: y.toFixed(2) });
      board.update();
    };


    if (PlayFunction.active) {                       //Start play function
      console.log("Play mode activated!");
      if (PlayFunction.speed > 0) PlayFunction.x = graphBounds.xMin; else PlayFunction.x = graphBounds.xMax;     //set start position
      PlayFunction.timer = setInterval(() => {       //Play function loop
        PlayFunction.x += ((graphBounds.xMax - graphBounds.xMin) / (1000 / PlayFunction.interval)) * (PlayFunction.speed / 100);     //speed means percent of view played per one second
        updateCursor(PlayFunction.x);
        if ((PlayFunction.x > graphBounds.xMax) || (PlayFunction.x < graphBounds.xMin )) {      //if we got out from board, stop moving
          PlayFunction.active = false;
        }
      }, PlayFunction.interval);
    } else {                                         //Stop play function
      if (PlayFunction.timer !== null) {             //clear timer if exists
        clearInterval(PlayFunction.timer);
        PlayFunction.timer = null;
      }
    }

    const moveHandler = (event) => {
      if (!PlayFunction.active) {
        const coords = board.getUsrCoordsOfMouse(event);
        const x = coords[0];
        updateCursor(x);
      }
      //if (x < graphBounds.xMin || x > graphBounds.xMax) return;
    };

    board.on("move", moveHandler, { passive: true });

    // board.on("move", updateCursor, { passive: true });

    return () => {
      board.off("move", updateCursor);
      JXG.JSXGraph.freeBoard(board);
    };
  }, [functionInput, PlayFunction.active]);



  useEffect(() => {
    if (boardRef.current) {
      boardRef.current.setBoundingBox([
        graphBounds.xMin,
        graphBounds.yMax,
        graphBounds.xMax,
        graphBounds.yMin,
      ]);
      boardRef.current.update();
    }
  }, [graphBounds]);

  return <div id="jxgbox" style={{ flex: 1, width: "100%", height: "100%" }}></div>;
};

export default GraphView;