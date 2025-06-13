import { create, all, re } from 'mathjs'

const config = { }
const math = create(all, config)

// function to check if 'expr' is a constant, for instance, -1 or 10+2
function isMathConstant(expr){
    try{
        math.compile(expr).evaluate() // when trying to evaluate without scope, if not a constant, throws error
        return true;
    }
    catch(ex){
        return false;
    }
}

// detects if expr is an expression of a function in one variable or a constant, for instance, "sin(x)+x^2" or "2"
function isOneVariableFunction(expr){
    const allowed_fn = ["sin", "ceil", "floor", "cos", "tan", "exp", "log", "sqrt", "abs", "exp", "ln", "log10", "log2", "asin", "acos", "atan", "sinh", "cosh", "tanh","cot","acot","nthroot"];
    const fn_with_more_args = ["log", "nthroot"]; // functions that can have one or two arguments 
    // WARNING nthroot is not implemented in mathjs, we need nthRoot, so when using mathjs, we need to change nthroot to nthRoot
    const allowed_constants = ["PI","pi","e","E"];
    const allowed_op = ["+", "-", "*", "/", "^"];  
    function removeItemAll(arr, value) {
        var i = 0;
        while (i < arr.length) {
            if (arr[i] === value) {
            arr.splice(i, 1);
            } else {
            ++i;
            }
        }
        return arr;
    }
    try{
        const parsed = math.parse(expr); // we parse the input string 
        if ("items" in parsed){ // an array
            return false;
        } 
        let snodes = [... new Set(parsed.filter((n) => n.isSymbolNode))]; // symbol nodes this includes functions and variables
        const fnNodes = [... new Set(parsed.filter((n) => n.isFunctionNode))]; // function nodes
        const opNodes = [... new Set(parsed.filter((n) => n.isOperatorNode))]; // operator nodes
        console.log(snodes.map((n) => n.name));
        console.log("fn ",fnNodes.map((n) => n.name));
        console.log("op ",opNodes.map((n) => n.op));
        // if (!(fnNodes.every((n) => n.args.length==1 && allowed_fn.includes(n.name)))){
        //     console.log("Invalid function or wrong number of arguments");
        //     return false;
        // }
        for (let i=0;i<fnNodes.length;i++){
            if (!(allowed_fn.includes(fnNodes[i].name))){
                console.log("Invalid function name: ", fnNodes[i].name);
                return false;
            }
            if (fnNodes[i].args.length!=1 && !(fn_with_more_args.includes(fnNodes[i].name))){
                console.log("Invalid function, wrong number of arguments: ", fnNodes[i].name);
                return false;
            }
            if (fnNodes[i].name=="log" && fnNodes[i].args.length>2){
                console.log("This function should have at most two arguments: ", fnNodes[i].name);
                return false;
            }               
            if (fnNodes[i].name=="nthroot" && fnNodes[i].args.length!=2){
                console.log("This function should have two arguments: ", fnNodes[i].name);
                return false;
            }               
        }    
        if (!(opNodes.every((n) => allowed_op.includes(n.op)))){
            console.log("Invalid operator");
            return false;
        }
        parsed.traverse(function (node, path, parent) { // we have checked all functions, we remove them from the list of symbol nodes
            if (node.isSymbolNode && parent?.name == node.name && allowed_fn.includes(node.name)){ 
                removeItemAll(snodes,node);
                console.log(node.name);
            }
        });
        console.log(snodes.map((n) => n.name));
        // the remaining should be a single variable "x" or a constant
        return snodes.every((n) => allowed_constants.includes(n.name) || n.name=="x"); 
    }
    catch(ex){
        return false;
    }
}

// function to check if 'expr' is a valid math expression
// that is, passes the math parser
function isValidMathParse(expr){
    try{
        //math.parse(expr); this is not enough, since several variables can be involved
        const parsed = math.parse(expr); // we parse the string txt
        // if (!("items" in parsed)){ // not a piecewise function
        //     // if(typeof math.compile(expr).evaluate({x:0})=='number'){ // this parses and checks the expression at 0, if more variables are involved, an error is thrown
        //     // return true;
        //     // }else{
        //     //     return false;
        //     // }
        //     return isOneVariableFunction(expr); // we check if the expression is a function of one variable
        // } 
        return true;
    }
    catch(ex){
        return false;
    }

}


// we are allowing conditions of the form x=a; we translate them into x==a
export function transformAssingnments(node) {
  return node.transform(function (node, path, parent) {
    if (node.type=='AssignmentNode') {
      return new math.OperatorNode('==','equal',[node.object, node.value]);
    }
    else {
      return node
    }
  })
}


// pi -> math.pi, math.e, E -> math.e; jessicode does not understand these constants
export function transformMathConstants(node) {
  return node.transform(function (node, path, parent) {
    if (node.type=='SymbolNode') {
        switch (node.name) {
            case 'pi':
                return new math.ConstantNode(math.pi);
            case 'PI':
                return new math.ConstantNode(math.pi);
            case 'e':
                return new math.ConstantNode(math.e);
            case 'E':
                return new math.ConstantNode(math.e);
            default:
                return node;
        }
    }
    else {
      return node
    }
  })
}


// checks if txt is a string of the form [[expr_1,ineq_1],[expr_2,ineq_2],..,[expr_n,ineq_n]]
// where expr_i is an expression in the variable x that defines a function in the interval defined by ineq_i
// for instance [[x+5,x < -4],[x^2,-4<=x < 1],[x-2,1<=x < 3],[5,x==3],[x-2,3 < x < 5],[3,5<= x]]
// the only double (chains) inequalities allowed are of the form a<=x<=b, a<x<=b, a<=x<b or a<x<b
function isPiecewise(txt){
    // we first check that the input is a valid math expression
    if (!(isValidMathParse(txt))){
        console.log("Invalid input: could not parse");
        return false;
    }
    const parsed = math.parse(txt); // we parse the string txt
    if (!("items" in parsed)){ // not a piecewise function
      return false;
    }
    const its = parsed.items; //list of items, each item should be a pair [expr,ineq]
    if (!its.every((e)=> "items" in e)){
        console.log("Invalid input, not an array of arrays");
        return false;
    }
    // so we check that all items are pairs 
    if (!its.every((e)=> e.items.length==2)){
        console.log("Invalid input, not a list of pairs");
        return false;
    }
    // now we check that the first item is a function and the second is an inequality
    let it; //single item
    for (let i=0;i<its.length;i++){
        it=its[i]; // the ith item
        // we check if the first item is a function in x
        if (!(isOneVariableFunction(it.items[0].toString()))){
            console.log("Invalid input, not a valid function", it.items[0].toString());
            return false;
        }
        // now we check that the second item is an inequality
        const ineq=transformAssingnments(it.items[1]); // we change the assignments into equalities
        if ("op" in ineq){ //that is a single inequality or an equality
            // we check if op is ==, <, >, <=, >=
            if (ineq.op != "<" && ineq.op != ">" && 
                ineq.op != "<=" && ineq.op != ">=" && 
                ineq.op != "==" && ineq.op != "!="){
                console.log("Invalid input, not a valid inequality (wrong relations)", ineq.toString());
                return false;
            }
            // we check that the number of arguments of the inequality are valid 
            // this is probably not necessary, since the parser should check this
            if (ineq.args.length!=2){
                console.log("Invalid input, not a valid inequality", ineq.toString());
                return false;
            }    
            // we check that the arguments of the inequality are valid
            // one must be constant and the other a variable
            const typeArgs = new Set(ineq.args.map((e)=> e.type));
            if (!typeArgs.has("SymbolNode")){ // at least one must be variable
                console.log("Invalid input, not a valid inequality (variable needed))", ineq.toString());
                return false;
            }
            if (ineq.args[0].type=="SymbolNode"){//equation of the form x op a
                //console.log("Variable first");
                if (!isMathConstant(ineq.args[1].toString())){
                    console.log("Invalid input, not a valid inequality (constant needed))", ineq.toString());
                    return false;
                }
            }else{//equation of the form a op x
                //console.log("variable second")
                if (!isMathConstant(ineq.args[0].toString())){
                    console.log("Invalid input, not a valid inequality (constant needed))", ineq.toString());
                    return false;
                }
            }
            // need to check now that the other argument is constant
        }else{ // now we have a an inequality of the form a<=x<=b, a<x<=b, a<=x<b or a<x<b
            // the values a and b are the first and last arguments of the inequality
            // console.log(ineq.toString()," ",ineq.conditionals.length);
            //const keysIneq = Object.keys(ineq);
            //if (!(keysIneq[0]=="conditionals" && keysIneq[1]=="params" && keysIneq.length==2)){
            if (!(ineq.type=="RelationalNode")){
                console.log("Invalid input, not a valid inequality", ineq.toString());
                return false;
            }
            if (!(ineq.conditionals.length==2)){
                console.log("Invalid input, not a valid chain of inequalities (more than two)", ineq.toString());
                return false;
            }
            if (!ineq.conditionals.every((e)=> e=="smaller" || e=="smallerEq")){
                console.log("Invalid input, not a valid chain of inequalities (only < and <= are allowed)", ineq.toString());
                return false;
            }
            // we check that the arguments of the inequality are valid
            // the first and third must be constant and the second a variable
            //console.log(ineq.params);
            if (!(isMathConstant(ineq.params[0].toString()) && 
                  ineq.params[1].type=="SymbolNode") && 
                  isMathConstant(ineq.params[2].toString())){ // the middle parameter must be a symbol a op1 x op2 b
                console.log("Invalid input, not a valid inequality; two constant params and a symbol", ineq.toString());
                return false;
            }
        }
    }        
    return true;
}

// the output is a translation of the input string into a javascript expression "C ? A : B"
// the input has already been checked with isPiecewise
function parsePiecewise(txt){
    // simplifyConstant is a function that simplifies the constants in the expression
    // it also uses implicit multiplication  
    // for instance, 2 x is translated into 2*x
    function simplify(it){
        return math.simplifyConstant(it.toString()).toString({implicit: 'show'});
    }
    function items2expr(its){ //its is a list of items, each item is a pair [expr,ineq]
        if (its.length==0){
            return "NaN";
        }
        const it=its[0]; // the first item
        const fn = simplify(it.items[0]); // the expression of the function
        const ineq=transformAssingnments(it.items[1]); // the inequality or equality where the function is defined, we change assignments to equalities
        let cond; // the condition of "C ? A : B"
        // inequalities of the form a op1 x op2 b are translate into a op1 x && x op2 b 
        if ("op" in ineq){ //that is a single inequality or an equality
            if (ineq.op =="!="){ // this is a not equal
                cond = "!("+simplify(ineq.args[0]) + "==" + simplify(ineq.args[1])+")";
            }else{
                cond = ineq.toString();
            }
        }else{
            cond = simplify(ineq.params[0])
            cond += ineq.conditionals[0]=="smallerEq" ? "<=" : "<";
            cond += ineq.params[1].toString() + " && " + simplify(ineq.params[1]); 
            cond += ineq.conditionals[1]=="smallerEq" ? "<=" : "<";
            cond += simplify(ineq.params[2]);
        } 
        return cond + " ? (" + fn.toString() + ") : (" + items2expr(its.slice(1)) + ")";
    }
    return items2expr(math.parse(txt).items);
};

// this function checks that the input is a valid function expression
// either single or piecewise
// if the txt is not a valid expression, it returns "0", otherwise it returns the input string parsed (if piecewise)
export function checkMathSpell(txt_input){
    // we are allowing ** to be used as a power operator, so we replace it with ^
    const txt = txt_input.replace(/\*\*/g, '^'); // replace ** with ^
    console.log("Checking math spell: ", txt);
    // check if its a function of one variable
    if(isOneVariableFunction(txt)){
        // jessiecode does does not understand E, e, pi, we translate them to mathjs constants
        return transformMathConstants(math.parse(txt)).toString({implicit: 'show'});
    }
    // we check if the input is a piecewise function
    if (isPiecewise(txt)){
        // jessiecode does does not understand E, e, pi, we translate them to mathjs constants
        const expr = transformMathConstants(math.parse(txt)).toString();        
        return parsePiecewise(expr);
    }
    //no more options
    return "0";
}