class MathParser {
    constructor() {
        this.isDegree = true;
    }

    setDegreeMode(isDeg) {
        this.isDegree = isDeg;
    }

    // Helper to convert deg to rad if needed
    toRad(val) {
        return this.isDegree ? val * (Math.PI / 180) : val;
    }

    fromRad(val) {
        return this.isDegree ? val * (180 / Math.PI) : val;
    }

    factorial(n) {
        if (n < 0) throw new Error("Factorial of negative number");
        if (n % 1 !== 0) throw new Error("Factorial of non-integer");
        let res = 1;
        for (let i = 2; i <= n; i++) res *= i;
        return res;
    }

    tokenize(expr) {
        // Replace spaces and special symbols
        expr = expr.replace(/\s+/g, '')
                   .replace(/π/g, 'pi')
                   .replace(/√/g, 'sqrt')
                   .replace(/∛/g, 'cbrt')
                   .replace(/×/g, '*')
                   .replace(/÷/g, '/');

        const tokens = [];
        let i = 0;

        while (i < expr.length) {
            const char = expr[i];

            if (/[0-9.]/.test(char)) {
                let numStr = char;
                i++;
                while (i < expr.length && /[0-9.]/.test(expr[i])) {
                    numStr += expr[i];
                    i++;
                }
                if (numStr.split('.').length > 2) throw new Error("Invalid number format");
                tokens.push({ type: 'number', value: parseFloat(numStr) });
                continue;
            }

            if (/[a-zA-Z]/.test(char)) {
                let funcStr = char;
                i++;
                while (i < expr.length && /[a-zA-Z]/.test(expr[i])) {
                    funcStr += expr[i];
                    i++;
                }
                if (funcStr === 'pi') {
                    tokens.push({ type: 'number', value: Math.PI });
                } else if (funcStr === 'e') {
                    tokens.push({ type: 'number', value: Math.E });
                } else {
                    tokens.push({ type: 'function', value: funcStr });
                }
                continue;
            }

            if ('+-*/%^!'.includes(char)) {
                if (char === '-' && (tokens.length === 0 || '+(*/%^'.includes(tokens[tokens.length - 1].value) || tokens[tokens.length - 1].value === ',')) {
                    tokens.push({ type: 'function', value: 'unary_minus' });
                } else {
                    tokens.push({ type: 'operator', value: char });
                }
                i++;
                continue;
            }

            if (char === '(' || char === ')') {
                tokens.push({ type: 'paren', value: char });
                i++;
                continue;
            }
            
            if (char === ',') {
                tokens.push({ type: 'comma', value: char});
                i++;
                continue;
            }

            throw new Error(`Unknown character: ${char}`);
        }

        // Implicit multiplication
        const processedTokens = [];
        for (let j = 0; j < tokens.length; j++) {
            const token = tokens[j];
            const prevToken = processedTokens[processedTokens.length - 1];

            if (prevToken) {
                if (
                    (prevToken.type === 'number' && (token.type === 'function' || token.value === '(')) ||
                    (prevToken.value === ')' && (token.type === 'number' || token.type === 'function' || token.value === '(')) ||
                    (prevToken.type === 'number' && token.type === 'number' && token.value === Math.PI) // eg. 2pi
                ) {
                    processedTokens.push({ type: 'operator', value: '*' });
                }
            }
            processedTokens.push(token);
        }

        return processedTokens;
    }

    shuntingYard(tokens) {
        const precedence = {
            '+': 1, '-': 1,
            '*': 2, '/': 2, '%': 2,
            '^': 3,
            '!': 4
        };
        const associativity = {
            '+': 'L', '-': 'L',
            '*': 'L', '/': 'L', '%': 'L',
            '^': 'R',
            '!': 'L'
        };

        const outputQueue = [];
        const operatorStack = [];

        for (const token of tokens) {
            if (token.type === 'number') {
                outputQueue.push(token);
            } else if (token.type === 'function') {
                operatorStack.push(token);
            } else if (token.type === 'operator') {
                while (
                    operatorStack.length > 0 &&
                    operatorStack[operatorStack.length - 1].value !== '(' &&
                    (
                        operatorStack[operatorStack.length - 1].type === 'function' ||
                        (precedence[operatorStack[operatorStack.length - 1].value] > precedence[token.value]) ||
                        (precedence[operatorStack[operatorStack.length - 1].value] === precedence[token.value] && associativity[token.value] === 'L')
                    )
                ) {
                    outputQueue.push(operatorStack.pop());
                }
                operatorStack.push(token);
            } else if (token.value === '(') {
                operatorStack.push(token);
            } else if (token.value === ')') {
                while (operatorStack.length > 0 && operatorStack[operatorStack.length - 1].value !== '(') {
                    outputQueue.push(operatorStack.pop());
                }
                if (operatorStack.length === 0) {
                    throw new Error("Mismatched parentheses");
                }
                operatorStack.pop();
                if (operatorStack.length > 0 && operatorStack[operatorStack.length - 1].type === 'function') {
                    outputQueue.push(operatorStack.pop());
                }
            }
        }

        while (operatorStack.length > 0) {
            const op = operatorStack.pop();
            if (op.value === '(' || op.value === ')') {
                throw new Error("Mismatched parentheses");
            }
            outputQueue.push(op);
        }

        return outputQueue;
    }

    evaluateRPN(rpn) {
        const stack = [];

        for (const token of rpn) {
            if (token.type === 'number') {
                stack.push(token.value);
            } else if (token.type === 'operator') {
                if (token.value === '!') {
                    if (stack.length < 1) throw new Error("Invalid expression");
                    const a = stack.pop();
                    stack.push(this.factorial(a));
                    continue;
                }

                if (stack.length < 2) throw new Error("Invalid expression");
                const b = stack.pop();
                const a = stack.pop();
                switch (token.value) {
                    case '+': stack.push(a + b); break;
                    case '-': stack.push(a - b); break;
                    case '*': stack.push(a * b); break;
                    case '/': 
                        if (b === 0) throw new Error("Division by zero");
                        stack.push(a / b); 
                        break;
                    case '%': stack.push(a % b); break;
                    case '^': stack.push(Math.pow(a, b)); break;
                }
            } else if (token.type === 'function') {
                if (stack.length < 1) throw new Error("Invalid expression");
                const a = stack.pop();
                switch (token.value) {
                    case 'sin': stack.push(Math.sin(this.toRad(a))); break;
                    case 'cos': stack.push(Math.cos(this.toRad(a))); break;
                    case 'tan': stack.push(Math.tan(this.toRad(a))); break;
                    case 'asin': stack.push(this.fromRad(Math.asin(a))); break;
                    case 'acos': stack.push(this.fromRad(Math.acos(a))); break;
                    case 'atan': stack.push(this.fromRad(Math.atan(a))); break;
                    case 'log': stack.push(Math.log10(a)); break;
                    case 'ln': stack.push(Math.log(a)); break;
                    case 'sqrt': stack.push(Math.sqrt(a)); break;
                    case 'cbrt': stack.push(Math.cbrt(a)); break;
                    case 'abs': stack.push(Math.abs(a)); break;
                    case 'exp': stack.push(Math.exp(a)); break;
                    case 'unary_minus': stack.push(-a); break;
                    default: throw new Error(`Unknown function: ${token.value}`);
                }
            }
        }

        if (stack.length !== 1) {
            throw new Error("Invalid expression");
        }

        return stack[0];
    }

    evaluate(expr) {
        if (!expr) return "";
        try {
            const tokens = this.tokenize(expr);
            const rpn = this.shuntingYard(tokens);
            const result = this.evaluateRPN(rpn);
            
            // Fix floating point precision
            return parseFloat(result.toPrecision(12)).toString();
        } catch (e) {
            return "Error";
        }
    }
}
